import type { AbilityTag } from "~/lib/learn/abilityTags";
import type {
  CourseOrigin,
  Difficulty,
  Exam,
  ExamBriefing,
  ExamResult,
  ExamResultRow,
  ExamRow,
  ExamTask,
  Question,
} from "~/lib/learn/types";
import { gradeExamSubmission } from "./examGrading.server";
import { boolToInt, newId, nowIso, parseJsonField, stringifyJsonField } from "./db-json.server";
import { getCourseBySlug } from "./courses.server";
import { getLessonBySlug } from "./lessons.server";
import { getQuestionById, getQuestionsByLesson } from "./questions.server";
import { mapExamRow } from "./mappers.server";
import type { UserAnswer } from "~/lib/learn/types";

export type CreateExamParams = {
  slug: string;
  courseId?: string;
  title: string;
  description: string;
  scenario: string;
  briefing?: ExamBriefing;
  tasks: ExamTask[];
  passingScore: number;
  abilityTags: AbilityTag[];
  difficulty: Difficulty;
  isPublished?: boolean;
  origin?: CourseOrigin;
  sourceId?: string;
  blueprintId?: string;
};

function mapExamResultRow(row: ExamResultRow): ExamResult {
  return {
    id: row.id,
    userId: row.user_id,
    examId: row.exam_id,
    answers: parseJsonField(row.answers_json, {}),
    score: row.score,
    weakAbilities: row.weak_abilities_json
      ? (parseJsonField(row.weak_abilities_json, []) as ExamResult["weakAbilities"])
      : undefined,
    feedback: parseJsonField(row.feedback_json, {}),
    isPassed: row.is_passed === 1,
    createdAt: row.created_at,
  };
}

export async function createExam(
  db: D1Database,
  params: CreateExamParams,
): Promise<Exam> {
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO exams (
        id, slug, course_id, title, description, scenario,
        tasks_json, exam_briefing_json, passing_score, ability_tags_json, difficulty,
        is_published, source_id, origin, blueprint_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      params.slug,
      params.courseId ?? null,
      params.title,
      params.description,
      params.scenario,
      stringifyJsonField(params.tasks),
      params.briefing ? stringifyJsonField(params.briefing) : null,
      params.passingScore,
      stringifyJsonField(params.abilityTags),
      params.difficulty,
      boolToInt(params.isPublished ?? true),
      params.sourceId ?? null,
      params.origin ?? "sample",
      params.blueprintId ?? null,
      now,
      now,
    )
    .run();

  const exam = await getExamBySlug(db, params.slug);
  if (!exam) throw new Error(`Failed to create exam: ${params.slug}`);
  return exam;
}

export async function getExams(
  db: D1Database,
  options?: { publishedOnly?: boolean; preferProjectFirst?: boolean },
): Promise<Exam[]> {
  const publishedOnly = options?.publishedOnly ?? false;
  const where = publishedOnly ? "WHERE is_published = 1" : "";
  const order = options?.preferProjectFirst
    ? "ORDER BY CASE WHEN origin = 'project' THEN 0 ELSE 1 END, created_at ASC"
    : "ORDER BY created_at ASC";
  const query = `SELECT * FROM exams ${where} ${order}`;
  const result = await db.prepare(query).all<ExamRow>();
  return (result.results ?? []).map(mapExamRow);
}

export async function countPublishedExams(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) as count FROM exams WHERE is_published = 1")
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function getExamBySlug(
  db: D1Database,
  slug: string,
): Promise<Exam | null> {
  const row = await db
    .prepare("SELECT * FROM exams WHERE slug = ?")
    .bind(slug)
    .first<ExamRow>();
  return row ? mapExamRow(row) : null;
}

export async function resolveExamQuestions(
  db: D1Database,
  exam: Exam,
): Promise<Question[]> {
  const questions: Question[] = [];
  for (const task of exam.tasks) {
    if (!task.questionId) continue;
    const question = await getQuestionById(db, task.questionId);
    if (question) questions.push(question);
  }
  return questions;
}

export async function getUserExamResults(
  db: D1Database,
  userId: string,
  examId?: string,
): Promise<ExamResult[]> {
  const query = examId
    ? "SELECT * FROM exam_results WHERE user_id = ? AND exam_id = ? ORDER BY created_at DESC"
    : "SELECT * FROM exam_results WHERE user_id = ? ORDER BY created_at DESC";
  const result = examId
    ? await db.prepare(query).bind(userId, examId).all<ExamResultRow>()
    : await db.prepare(query).bind(userId).all<ExamResultRow>();
  return (result.results ?? []).map(mapExamResultRow);
}

export async function getLatestExamResult(
  db: D1Database,
  userId: string,
  examId: string,
): Promise<ExamResult | null> {
  const row = await db
    .prepare(
      `SELECT * FROM exam_results
       WHERE user_id = ? AND exam_id = ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(userId, examId)
    .first<ExamResultRow>();
  return row ? mapExamResultRow(row) : null;
}

export async function submitExamResult(
  db: D1Database,
  params: {
    userId: string;
    examId: string;
    answers: unknown;
    score: number;
    weakAbilities?: string[];
    feedback: unknown;
    isPassed: boolean;
  },
): Promise<ExamResult> {
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO exam_results (
        id, user_id, exam_id, answers_json, score,
        weak_abilities_json, feedback_json, is_passed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      params.userId,
      params.examId,
      stringifyJsonField(params.answers),
      params.score,
      params.weakAbilities ? stringifyJsonField(params.weakAbilities) : null,
      stringifyJsonField(params.feedback),
      params.isPassed ? 1 : 0,
      now,
    )
    .run();
  return {
    id,
    userId: params.userId,
    examId: params.examId,
    answers: params.answers,
    score: params.score,
    weakAbilities: params.weakAbilities as ExamResult["weakAbilities"],
    feedback: params.feedback,
    isPassed: params.isPassed,
    createdAt: now,
  };
}

export async function submitExam(
  db: D1Database,
  params: {
    userId: string;
    exam: Exam;
    questions: Question[];
    answers: Record<string, UserAnswer | undefined>;
  },
): Promise<ExamResult> {
  const grade = gradeExamSubmission({
    exam: params.exam,
    questions: params.questions,
    answers: params.answers,
  });

  return submitExamResult(db, {
    userId: params.userId,
    examId: params.exam.id,
    answers: params.answers,
    score: grade.score,
    weakAbilities: grade.weakAbilities,
    feedback: grade.feedback,
    isPassed: grade.isPassed,
  });
}

export async function resolveQuestionIdFromRef(
  db: D1Database,
  ref: {
    courseSlug: string;
    lessonSlug: string;
    questionIndex: number;
  },
): Promise<string | null> {
  const course = await getCourseBySlug(db, ref.courseSlug);
  if (!course) return null;

  const lesson = await getLessonBySlug(db, course.id, ref.lessonSlug);
  if (!lesson) return null;

  const questions = await getQuestionsByLesson(db, lesson.id);
  const question = questions[ref.questionIndex];
  return question?.id ?? null;
}
