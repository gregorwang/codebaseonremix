import type { AbilityTag } from "~/lib/learn/abilityTags";
import { checkAnswer } from "~/lib/learn/questionCheck";
import { classifyMistake } from "~/lib/learn/mistakeClassifier";
import type { AnswerAttemptRow, MistakeRow } from "~/lib/learn/types";
import type { AnswerResult, Question, UserAnswer } from "~/lib/learn/types";
import { calculateAbilityScore } from "~/lib/learn/abilityScore";
import { newId, nowIso, stringifyJsonField } from "./db-json.server";
import { getLessonById, getLessonsByCourse } from "./lessons.server";
import { getQuestionById } from "./questions.server";
import { getLessonProgressSummary } from "./progress-write.server";

export type SubmitAnswerResult = {
  attemptId: string;
  result: AnswerResult;
};

/**
 * submitAnswer is the single source of truth for "user answered question X".
 * It used to chain ~6 sequential awaits — INSERT attempt, upsert mistake,
 * update ability_scores, update lesson_progress, update course_progress —
 * each its own .run(). A failure halfway through left attempts recorded
 * but progress stale, or vice-versa.
 *
 * Now: gather every read in parallel, compute the post-attempt state
 * locally, then ship ALL writes through a single `db.batch([...])` so D1
 * commits them as one implicit transaction. Reads and writes are split by
 * design — D1 batches don't support reading prior statements' results, so
 * we read once, decide, then write atomically.
 */
export async function submitAnswer(
  db: D1Database,
  params: {
    userId: string;
    questionId: string;
    userAnswer: UserAnswer;
  },
): Promise<SubmitAnswerResult> {
  const question = await getQuestionById(db, params.questionId);
  if (!question) throw new Error(`Question not found: ${params.questionId}`);

  const lesson = await getLessonById(db, question.lessonId);
  if (!lesson) throw new Error(`Lesson not found: ${question.lessonId}`);

  const result = checkAnswer(question, params.userAnswer);
  // Free-form answers (free_explain / review_comment / open ai_review)
  // can't be graded locally — the attempt is recorded for completion
  // tracking but does NOT count as correct or wrong, doesn't classify
  // as a mistake, and doesn't move the ability score until AI grades.
  const pendingAiGrading = result.needsAiGrading === true;
  const mistakeType =
    result.isCorrect || pendingAiGrading
      ? undefined
      : classifyMistake(question, params.userAnswer, result);

  const attemptId = newId();
  const now = nowIso();
  const userId = params.userId;
  const courseId = lesson.courseId;
  const shouldRecordMistake = !result.isCorrect && !pendingAiGrading;
  const shouldMoveAbility = !pendingAiGrading;
  const uniqueTags = shouldMoveAbility
    ? [...new Set(result.abilityTags as AbilityTag[])]
    : [];

  // ---- Phase 1: gather every read needed for the write plan ----
  const abilityPlaceholders = uniqueTags.map(() => "?").join(", ");
  const [
    existingMistake,
    abilityRowsResult,
    totalQuestionsRow,
    priorAttemptStats,
    priorAttemptOnThisQuestion,
    existingLessonProgress,
    courseLessons,
    otherLessonProgressRowsResult,
    existingCourseProgress,
  ] = await Promise.all([
    shouldRecordMistake
      ? db
          .prepare(
            "SELECT id FROM mistakes WHERE user_id = ? AND question_id = ?",
          )
          .bind(userId, question.id)
          .first<Pick<MistakeRow, "id">>()
      : Promise.resolve(null),
    uniqueTags.length > 0
      ? db
          .prepare(
            `SELECT id, ability_tag, correct_count, wrong_count
             FROM ability_scores
             WHERE user_id = ? AND ability_tag IN (${abilityPlaceholders})`,
          )
          .bind(userId, ...uniqueTags)
          .all<{
            id: string;
            ability_tag: string;
            correct_count: number;
            wrong_count: number;
          }>()
      : Promise.resolve({ results: [] as Array<{
          id: string;
          ability_tag: string;
          correct_count: number;
          wrong_count: number;
        }> }),
    db
      .prepare(
        "SELECT COUNT(*) as count FROM questions WHERE lesson_id = ? AND is_published = 1",
      )
      .bind(lesson.id)
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT
          COUNT(DISTINCT question_id) as attempted,
          SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
          SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as wrong
        FROM answer_attempts
        WHERE user_id = ? AND lesson_id = ?`,
      )
      .bind(userId, lesson.id)
      .first<{
        attempted: number | null;
        correct: number | null;
        wrong: number | null;
      }>(),
    db
      .prepare(
        "SELECT 1 as found FROM answer_attempts WHERE user_id = ? AND question_id = ? LIMIT 1",
      )
      .bind(userId, question.id)
      .first<{ found: number }>(),
    db
      .prepare(
        "SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?",
      )
      .bind(userId, lesson.id)
      .first<{ id: string }>(),
    getLessonsByCourse(db, courseId, { publishedOnly: true }),
    db
      .prepare(
        `SELECT correct_count, wrong_count, is_completed,
                total_question_count, completed_question_count
         FROM lesson_progress
         WHERE user_id = ? AND course_id = ? AND lesson_id != ?`,
      )
      .bind(userId, courseId, lesson.id)
      .all<{
        correct_count: number;
        wrong_count: number;
        is_completed: number;
        total_question_count: number;
        completed_question_count: number;
      }>(),
    db
      .prepare(
        "SELECT id FROM course_progress WHERE user_id = ? AND course_id = ?",
      )
      .bind(userId, courseId)
      .first<{ id: string }>(),
  ]);

  // ---- Phase 2: compute the post-attempt lesson_progress for THIS lesson ----
  // The new attempt row stores `is_correct = result.isCorrect ? 1 : 0`, so a
  // pending-AI-grading row currently counts as wrong=1 — that matches the
  // legacy behavior of computeLessonProgressFromAttempts.
  const isFirstAttemptOnQuestion = !priorAttemptOnThisQuestion;
  const newCorrectDelta = result.isCorrect ? 1 : 0;
  const newWrongDelta = result.isCorrect ? 0 : 1;

  const totalLessonQuestions = totalQuestionsRow?.count ?? 0;
  const attemptedLessonQuestions =
    (priorAttemptStats?.attempted ?? 0) + (isFirstAttemptOnQuestion ? 1 : 0);
  const lessonCorrectCount =
    (priorAttemptStats?.correct ?? 0) + newCorrectDelta;
  const lessonWrongCount = (priorAttemptStats?.wrong ?? 0) + newWrongDelta;
  const lessonIsCompleted =
    totalLessonQuestions > 0 &&
    attemptedLessonQuestions >= totalLessonQuestions;

  // ---- Phase 3: compute the post-attempt course_progress aggregates ----
  // The course agg is sum(other lessons') + (this lesson's new state).
  const otherLessons = otherLessonProgressRowsResult.results ?? [];
  const otherCompleted = otherLessons.filter((r) => r.is_completed === 1)
    .length;
  const otherCorrect = otherLessons.reduce((s, r) => s + r.correct_count, 0);
  const otherWrong = otherLessons.reduce((s, r) => s + r.wrong_count, 0);

  const totalLessons = courseLessons.length;
  const completedLessons = otherCompleted + (lessonIsCompleted ? 1 : 0);
  const courseCorrectCount = otherCorrect + lessonCorrectCount;
  const courseWrongCount = otherWrong + lessonWrongCount;
  const courseIsCompleted =
    totalLessons > 0 && completedLessons >= totalLessons;

  // ---- Phase 4: build prepared statements for the atomic batch ----
  const writes: D1PreparedStatement[] = [];

  // 4a) answer_attempts insert
  writes.push(
    db
      .prepare(
        `INSERT INTO answer_attempts (
          id, user_id, question_id, lesson_id, course_id,
          user_answer_json, normalized_answer_json, is_correct,
          mistake_type, ability_tags_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        attemptId,
        userId,
        question.id,
        lesson.id,
        courseId,
        stringifyJsonField(params.userAnswer),
        stringifyJsonField(result.normalizedUserAnswer),
        result.isCorrect ? 1 : 0,
        mistakeType ?? null,
        stringifyJsonField(result.abilityTags),
        now,
      ),
  );

  // 4b) mistakes upsert
  if (shouldRecordMistake) {
    if (existingMistake) {
      writes.push(
        db
          .prepare(
            `UPDATE mistakes SET
              last_answer_json = ?, correct_answer_json = ?,
              wrong_count = wrong_count + 1, mistake_type = ?,
              ability_tags_json = ?, is_resolved = 0,
              last_wrong_at = ?, updated_at = ?
            WHERE id = ?`,
          )
          .bind(
            stringifyJsonField(params.userAnswer),
            stringifyJsonField(result.correctAnswer),
            mistakeType ?? null,
            stringifyJsonField(result.abilityTags),
            now,
            now,
            existingMistake.id,
          ),
      );
    } else {
      writes.push(
        db
          .prepare(
            `INSERT INTO mistakes (
              id, user_id, question_id, course_id, lesson_id,
              last_answer_json, correct_answer_json, wrong_count,
              mistake_type, ability_tags_json, is_resolved,
              last_wrong_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, ?, ?, ?)`,
          )
          .bind(
            newId(),
            userId,
            question.id,
            courseId,
            lesson.id,
            stringifyJsonField(params.userAnswer),
            stringifyJsonField(result.correctAnswer),
            mistakeType ?? null,
            stringifyJsonField(result.abilityTags),
            now,
            now,
            now,
          ),
      );
    }
  }

  // 4c) ability_scores upsert (one row per unique ability tag)
  if (uniqueTags.length > 0) {
    const abilityByTag = new Map<
      string,
      { id: string; correct_count: number; wrong_count: number }
    >();
    for (const row of abilityRowsResult.results ?? []) {
      abilityByTag.set(row.ability_tag, row);
    }
    for (const tag of uniqueTags) {
      const existing = abilityByTag.get(tag);
      if (existing) {
        const newCorrect = existing.correct_count + newCorrectDelta;
        const newWrong = existing.wrong_count + newWrongDelta;
        const newTotal = newCorrect + newWrong;
        const newScore = calculateAbilityScore(newCorrect, newWrong);
        writes.push(
          db
            .prepare(
              `UPDATE ability_scores SET
                correct_count = ?, wrong_count = ?, total_count = ?,
                score = ?, last_practiced_at = ?, updated_at = ?
              WHERE id = ?`,
            )
            .bind(
              newCorrect,
              newWrong,
              newTotal,
              newScore,
              now,
              now,
              existing.id,
            ),
        );
      } else {
        const newCorrect = newCorrectDelta;
        const newWrong = newWrongDelta;
        const newScore = calculateAbilityScore(newCorrect, newWrong);
        writes.push(
          db
            .prepare(
              `INSERT INTO ability_scores (
                id, user_id, ability_tag, correct_count, wrong_count,
                total_count, score, last_practiced_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              newId(),
              userId,
              tag,
              newCorrect,
              newWrong,
              1,
              newScore,
              now,
              now,
            ),
        );
      }
    }
  }

  // 4d) lesson_progress upsert
  if (existingLessonProgress) {
    writes.push(
      db
        .prepare(
          `UPDATE lesson_progress SET
            course_id = ?,
            completed_question_count = ?,
            total_question_count = ?,
            correct_count = ?,
            wrong_count = ?,
            is_completed = ?,
            completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, ?) ELSE NULL END,
            updated_at = ?
          WHERE id = ?`,
        )
        .bind(
          courseId,
          attemptedLessonQuestions,
          totalLessonQuestions,
          lessonCorrectCount,
          lessonWrongCount,
          lessonIsCompleted ? 1 : 0,
          lessonIsCompleted ? 1 : 0,
          now,
          now,
          existingLessonProgress.id,
        ),
    );
  } else {
    writes.push(
      db
        .prepare(
          `INSERT INTO lesson_progress (
            id, user_id, course_id, lesson_id,
            completed_question_count, total_question_count,
            correct_count, wrong_count, is_completed,
            completed_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          newId(),
          userId,
          courseId,
          lesson.id,
          attemptedLessonQuestions,
          totalLessonQuestions,
          lessonCorrectCount,
          lessonWrongCount,
          lessonIsCompleted ? 1 : 0,
          lessonIsCompleted ? now : null,
          now,
        ),
    );
  }

  // 4e) course_progress upsert
  if (existingCourseProgress) {
    writes.push(
      db
        .prepare(
          `UPDATE course_progress SET
            completed_lesson_count = ?,
            total_lesson_count = ?,
            correct_count = ?,
            wrong_count = ?,
            is_completed = ?,
            completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, ?) ELSE NULL END,
            updated_at = ?
          WHERE id = ?`,
        )
        .bind(
          completedLessons,
          totalLessons,
          courseCorrectCount,
          courseWrongCount,
          courseIsCompleted ? 1 : 0,
          courseIsCompleted ? 1 : 0,
          now,
          now,
          existingCourseProgress.id,
        ),
    );
  } else {
    writes.push(
      db
        .prepare(
          `INSERT INTO course_progress (
            id, user_id, course_id,
            completed_lesson_count, total_lesson_count,
            correct_count, wrong_count, is_completed,
            completed_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          newId(),
          userId,
          courseId,
          completedLessons,
          totalLessons,
          courseCorrectCount,
          courseWrongCount,
          courseIsCompleted ? 1 : 0,
          courseIsCompleted ? now : null,
          now,
        ),
    );
  }

  // ---- Phase 5: atomic commit ----
  await db.batch(writes);

  return { attemptId, result: { ...result, mistakeType } };
}

export async function getUserAttempts(
  db: D1Database,
  userId: string,
  options?: { questionId?: string; limit?: number },
): Promise<AnswerAttemptRow[]> {
  const limit = options?.limit ?? 50;
  if (options?.questionId) {
    const result = await db
      .prepare(
        "SELECT * FROM answer_attempts WHERE user_id = ? AND question_id = ? ORDER BY created_at DESC LIMIT ?",
      )
      .bind(userId, options.questionId, limit)
      .all<AnswerAttemptRow>();
    return result.results ?? [];
  }
  const result = await db
    .prepare(
      "SELECT * FROM answer_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    )
    .bind(userId, limit)
    .all<AnswerAttemptRow>();
  return result.results ?? [];
}

export type LessonProgressSummary = {
  lessonId: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctCount: number;
  wrongCount: number;
  isCompleted: boolean;
};

export async function calculateLessonProgress(
  db: D1Database,
  userId: string,
  lessonId: string,
): Promise<LessonProgressSummary> {
  return getLessonProgressSummary(db, userId, lessonId);
}

export type { Question };
