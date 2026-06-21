import type { AbilityTag } from "~/lib/learn/abilityTags";
import { checkAnswer } from "~/lib/learn/questionCheck";
import { classifyMistake } from "~/lib/learn/mistakeClassifier";
import type { AnswerAttemptRow } from "~/lib/learn/types";
import type { AnswerResult, Question, UserAnswer } from "~/lib/learn/types";
import { updateAbilityFromAttempt } from "~/lib/learn/abilityScore";
import { newId, nowIso, stringifyJsonField } from "./db-json.server";
import { getLessonById } from "./lessons.server";
import { upsertMistake } from "./mistakes.server";
import { getQuestionById } from "./questions.server";
import {
  updateCourseProgressAfterAttempt,
  updateLessonProgressAfterAttempt,
  getLessonProgressSummary,
} from "./progress-write.server";

export type SubmitAnswerResult = {
  attemptId: string;
  result: AnswerResult;
};

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
  const mistakeType = result.isCorrect || pendingAiGrading
    ? undefined
    : classifyMistake(question, params.userAnswer, result);

  const attemptId = newId();
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO answer_attempts (
        id, user_id, question_id, lesson_id, course_id,
        user_answer_json, normalized_answer_json, is_correct,
        mistake_type, ability_tags_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      attemptId,
      params.userId,
      question.id,
      lesson.id,
      lesson.courseId,
      stringifyJsonField(params.userAnswer),
      stringifyJsonField(result.normalizedUserAnswer),
      result.isCorrect ? 1 : 0,
      mistakeType ?? null,
      stringifyJsonField(result.abilityTags),
      now,
    )
    .run();

  if (!result.isCorrect && !pendingAiGrading) {
    await upsertMistake(db, {
      userId: params.userId,
      questionId: question.id,
      courseId: lesson.courseId,
      lessonId: lesson.id,
      lastAnswer: params.userAnswer,
      correctAnswer: result.correctAnswer,
      mistakeType,
      abilityTags: result.abilityTags,
    });
  }

  if (!pendingAiGrading) {
    await updateAbilityFromAttempt(
      db,
      params.userId,
      result.abilityTags as AbilityTag[],
      result.isCorrect,
    );
  }

  await updateLessonProgressAfterAttempt(
    db,
    params.userId,
    lesson.id,
    lesson.courseId,
  );
  await updateCourseProgressAfterAttempt(db, params.userId, lesson.courseId);

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
