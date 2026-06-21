import { newId, nowIso } from "./db-json.server";
import { getLessonsByCourse } from "./lessons.server";
import type { LessonProgressSummary } from "./attempts.server";
import type { CourseProgressSummary } from "./progress.server";

type LessonProgressRow = {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  completed_question_count: number;
  total_question_count: number;
  correct_count: number;
  wrong_count: number;
  is_completed: number;
  completed_at: string | null;
  updated_at: string;
};

type CourseProgressRow = {
  id: string;
  user_id: string;
  course_id: string;
  completed_lesson_count: number;
  total_lesson_count: number;
  correct_count: number;
  wrong_count: number;
  is_completed: number;
  completed_at: string | null;
  updated_at: string;
};

function mapLessonProgressRow(row: LessonProgressRow): LessonProgressSummary {
  return {
    lessonId: row.lesson_id,
    totalQuestions: row.total_question_count,
    attemptedQuestions: row.completed_question_count,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    isCompleted: row.is_completed === 1,
  };
}

function mapCourseProgressRow(
  courseId: string,
  row: CourseProgressRow,
  questionTotals?: { totalQuestions: number; attemptedQuestions: number },
): CourseProgressSummary {
  const totalLessons = row.total_lesson_count;
  const completedLessons = row.completed_lesson_count;
  const percentComplete =
    totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 1000) / 10
      : 0;

  return {
    courseId,
    totalLessons,
    completedLessons,
    totalQuestions: questionTotals?.totalQuestions ?? 0,
    attemptedQuestions: questionTotals?.attemptedQuestions ?? 0,
    percentComplete,
  };
}

async function computeLessonProgressFromAttempts(
  db: D1Database,
  userId: string,
  lessonId: string,
  courseId: string,
): Promise<LessonProgressSummary> {
  const totalResult = await db
    .prepare(
      "SELECT COUNT(*) as count FROM questions WHERE lesson_id = ? AND is_published = 1",
    )
    .bind(lessonId)
    .first<{ count: number }>();

  const attemptResult = await db
    .prepare(
      `SELECT
        COUNT(DISTINCT question_id) as attempted,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
        SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as wrong
      FROM answer_attempts
      WHERE user_id = ? AND lesson_id = ?`,
    )
    .bind(userId, lessonId)
    .first<{ attempted: number; correct: number; wrong: number }>();

  const totalQuestions = totalResult?.count ?? 0;
  const attemptedQuestions = attemptResult?.attempted ?? 0;
  const correctCount = attemptResult?.correct ?? 0;
  const wrongCount = attemptResult?.wrong ?? 0;
  const isCompleted = totalQuestions > 0 && attemptedQuestions >= totalQuestions;

  return {
    lessonId,
    totalQuestions,
    attemptedQuestions,
    correctCount,
    wrongCount,
    isCompleted,
  };
}

async function upsertLessonProgressRow(
  db: D1Database,
  userId: string,
  courseId: string,
  summary: LessonProgressSummary,
): Promise<void> {
  const now = nowIso();
  const existing = await db
    .prepare(
      "SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?",
    )
    .bind(userId, summary.lessonId)
    .first<{ id: string }>();

  const completedAt = summary.isCompleted ? now : null;

  if (existing) {
    await db
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
        summary.attemptedQuestions,
        summary.totalQuestions,
        summary.correctCount,
        summary.wrongCount,
        summary.isCompleted ? 1 : 0,
        summary.isCompleted ? 1 : 0,
        now,
        now,
        existing.id,
      )
      .run();
    return;
  }

  await db
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
      summary.lessonId,
      summary.attemptedQuestions,
      summary.totalQuestions,
      summary.correctCount,
      summary.wrongCount,
      summary.isCompleted ? 1 : 0,
      completedAt,
      now,
    )
    .run();
}

export async function updateLessonProgressAfterAttempt(
  db: D1Database,
  userId: string,
  lessonId: string,
  courseId: string,
): Promise<LessonProgressSummary> {
  const summary = await computeLessonProgressFromAttempts(
    db,
    userId,
    lessonId,
    courseId,
  );
  await upsertLessonProgressRow(db, userId, courseId, summary);
  return summary;
}

export async function updateCourseProgressAfterAttempt(
  db: D1Database,
  userId: string,
  courseId: string,
): Promise<CourseProgressSummary> {
  const lessons = await getLessonsByCourse(db, courseId, {
    publishedOnly: true,
  });
  const totalLessons = lessons.length;

  const agg = await db
    .prepare(
      `SELECT
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_lessons,
        SUM(correct_count) as correct_count,
        SUM(wrong_count) as wrong_count,
        SUM(total_question_count) as total_questions,
        SUM(completed_question_count) as attempted_questions
      FROM lesson_progress
      WHERE user_id = ? AND course_id = ?`,
    )
    .bind(userId, courseId)
    .first<{
      completed_lessons: number | null;
      correct_count: number | null;
      wrong_count: number | null;
      total_questions: number | null;
      attempted_questions: number | null;
    }>();

  const completedLessons = agg?.completed_lessons ?? 0;
  const isCompleted = totalLessons > 0 && completedLessons >= totalLessons;
  const now = nowIso();

  const existing = await db
    .prepare(
      "SELECT id FROM course_progress WHERE user_id = ? AND course_id = ?",
    )
    .bind(userId, courseId)
    .first<{ id: string }>();

  if (existing) {
    await db
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
        agg?.correct_count ?? 0,
        agg?.wrong_count ?? 0,
        isCompleted ? 1 : 0,
        isCompleted ? 1 : 0,
        now,
        now,
        existing.id,
      )
      .run();
  } else {
    await db
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
        agg?.correct_count ?? 0,
        agg?.wrong_count ?? 0,
        isCompleted ? 1 : 0,
        isCompleted ? now : null,
        now,
      )
      .run();
  }

  return {
    courseId,
    totalLessons,
    completedLessons,
    totalQuestions: agg?.total_questions ?? 0,
    attemptedQuestions: agg?.attempted_questions ?? 0,
    percentComplete:
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 1000) / 10
        : 0,
  };
}

export async function getLessonProgressSummary(
  db: D1Database,
  userId: string,
  lessonId: string,
  courseId?: string,
): Promise<LessonProgressSummary> {
  const row = await db
    .prepare(
      "SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?",
    )
    .bind(userId, lessonId)
    .first<LessonProgressRow>();

  if (row) {
    return mapLessonProgressRow(row);
  }

  if (!courseId) {
    const lessonRow = await db
      .prepare("SELECT course_id FROM lessons WHERE id = ?")
      .bind(lessonId)
      .first<{ course_id: string }>();
    courseId = lessonRow?.course_id;
  }

  if (!courseId) {
    return {
      lessonId,
      totalQuestions: 0,
      attemptedQuestions: 0,
      correctCount: 0,
      wrongCount: 0,
      isCompleted: false,
    };
  }

  const summary = await computeLessonProgressFromAttempts(
    db,
    userId,
    lessonId,
    courseId,
  );
  return summary;
}

export async function getLessonProgressByCourse(
  db: D1Database,
  userId: string,
  courseId: string,
): Promise<Record<string, LessonProgressSummary>> {
  const result = await db
    .prepare(
      "SELECT * FROM lesson_progress WHERE user_id = ? AND course_id = ?",
    )
    .bind(userId, courseId)
    .all<LessonProgressRow>();

  const byLessonId: Record<string, LessonProgressSummary> = {};
  for (const row of result.results ?? []) {
    byLessonId[row.lesson_id] = mapLessonProgressRow(row);
  }
  return byLessonId;
}

export async function getAllLessonProgressForUser(
  db: D1Database,
  userId: string,
): Promise<Map<string, LessonProgressSummary>> {
  const result = await db
    .prepare("SELECT * FROM lesson_progress WHERE user_id = ?")
    .bind(userId)
    .all<LessonProgressRow>();

  const map = new Map<string, LessonProgressSummary>();
  for (const row of result.results ?? []) {
    map.set(row.lesson_id, mapLessonProgressRow(row));
  }
  return map;
}

export async function getCourseProgressSummary(
  db: D1Database,
  userId: string,
  courseId: string,
  curriculumTotals?: { totalLessons: number; totalQuestions: number },
): Promise<CourseProgressSummary> {
  const row = await db
    .prepare(
      "SELECT * FROM course_progress WHERE user_id = ? AND course_id = ?",
    )
    .bind(userId, courseId)
    .first<CourseProgressRow>();

  const lessonAgg = await db
    .prepare(
      `SELECT
        SUM(total_question_count) as total_questions,
        SUM(completed_question_count) as attempted_questions
      FROM lesson_progress
      WHERE user_id = ? AND course_id = ?`,
    )
    .bind(userId, courseId)
    .first<{
      total_questions: number | null;
      attempted_questions: number | null;
    }>();

  const questionTotals = {
    totalQuestions:
      lessonAgg?.total_questions ?? curriculumTotals?.totalQuestions ?? 0,
    attemptedQuestions: lessonAgg?.attempted_questions ?? 0,
  };

  if (row) {
    return mapCourseProgressRow(courseId, row, questionTotals);
  }

  const totalLessons =
    curriculumTotals?.totalLessons ??
    (
      await db
        .prepare(
          "SELECT COUNT(*) as count FROM lessons WHERE course_id = ? AND is_published = 1",
        )
        .bind(courseId)
        .first<{ count: number }>()
    )?.count ??
    0;

  return {
    courseId,
    totalLessons,
    completedLessons: 0,
    totalQuestions: questionTotals.totalQuestions,
    attemptedQuestions: 0,
    percentComplete: 0,
  };
}

export async function getAllCourseProgressForUser(
  db: D1Database,
  userId: string,
): Promise<Map<string, CourseProgressRow>> {
  const result = await db
    .prepare("SELECT * FROM course_progress WHERE user_id = ?")
    .bind(userId)
    .all<CourseProgressRow>();

  const map = new Map<string, CourseProgressRow>();
  for (const row of result.results ?? []) {
    map.set(row.course_id, row);
  }
  return map;
}

export async function rebuildUserProgress(
  db: D1Database,
  userId: string,
): Promise<{ lessons: number; courses: number }> {
  const attemptLessons = await db
    .prepare(
      `SELECT DISTINCT lesson_id, course_id
       FROM answer_attempts
       WHERE user_id = ?`,
    )
    .bind(userId)
    .all<{ lesson_id: string; course_id: string }>();

  const courseIds = new Set<string>();
  let lessonCount = 0;

  for (const row of attemptLessons.results ?? []) {
    await updateLessonProgressAfterAttempt(
      db,
      userId,
      row.lesson_id,
      row.course_id,
    );
    courseIds.add(row.course_id);
    lessonCount += 1;
  }

  for (const courseId of courseIds) {
    await updateCourseProgressAfterAttempt(db, userId, courseId);
  }

  return { lessons: lessonCount, courses: courseIds.size };
}
