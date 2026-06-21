import type { AbilityTag } from "~/lib/learn/abilityTags";
import type { Mistake, MistakeRow, QuestionType } from "~/lib/learn/types";
import { newId, nowIso, stringifyJsonField } from "./db-json.server";
import { mapMistakeRow } from "./mappers.server";

export async function upsertMistake(
  db: D1Database,
  params: {
    userId: string;
    questionId: string;
    courseId: string;
    lessonId: string;
    lastAnswer: unknown;
    correctAnswer: unknown;
    mistakeType?: string;
    abilityTags: AbilityTag[];
  },
): Promise<Mistake> {
  const now = nowIso();
  const existing = await db
    .prepare("SELECT * FROM mistakes WHERE user_id = ? AND question_id = ?")
    .bind(params.userId, params.questionId)
    .first<MistakeRow>();

  if (existing) {
    await db
      .prepare(
        `UPDATE mistakes SET
          last_answer_json = ?, correct_answer_json = ?,
          wrong_count = wrong_count + 1, mistake_type = ?,
          ability_tags_json = ?, is_resolved = 0,
          last_wrong_at = ?, updated_at = ?
        WHERE id = ?`,
      )
      .bind(
        stringifyJsonField(params.lastAnswer),
        stringifyJsonField(params.correctAnswer),
        params.mistakeType ?? null,
        stringifyJsonField(params.abilityTags),
        now,
        now,
        existing.id,
      )
      .run();
    const updated = await db
      .prepare("SELECT * FROM mistakes WHERE id = ?")
      .bind(existing.id)
      .first<MistakeRow>();
    if (!updated) throw new Error("Failed to update mistake");
    return mapMistakeRow(updated);
  }

  const id = newId();
  await db
    .prepare(
      `INSERT INTO mistakes (
        id, user_id, question_id, course_id, lesson_id,
        last_answer_json, correct_answer_json, wrong_count,
        mistake_type, ability_tags_json, is_resolved,
        last_wrong_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, ?, ?, ?)`,
    )
    .bind(
      id,
      params.userId,
      params.questionId,
      params.courseId,
      params.lessonId,
      stringifyJsonField(params.lastAnswer),
      stringifyJsonField(params.correctAnswer),
      params.mistakeType ?? null,
      stringifyJsonField(params.abilityTags),
      now,
      now,
      now,
    )
    .run();

  const row = await db
    .prepare("SELECT * FROM mistakes WHERE id = ?")
    .bind(id)
    .first<MistakeRow>();
  if (!row) throw new Error("Failed to create mistake");
  return mapMistakeRow(row);
}

export async function resolveMistake(
  db: D1Database,
  userId: string,
  mistakeId: string,
): Promise<Mistake> {
  const now = nowIso();
  await db
    .prepare(
      "UPDATE mistakes SET is_resolved = 1, resolved_at = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    )
    .bind(now, now, mistakeId, userId)
    .run();
  const row = await db
    .prepare("SELECT * FROM mistakes WHERE id = ? AND user_id = ?")
    .bind(mistakeId, userId)
    .first<MistakeRow>();
  if (!row) throw new Error(`Mistake not found: ${mistakeId}`);
  return mapMistakeRow(row);
}

export async function getMistakesByUser(
  db: D1Database,
  userId: string,
  options?: { resolved?: boolean },
): Promise<Mistake[]> {
  let query = "SELECT * FROM mistakes WHERE user_id = ?";
  const bindings: (string | number)[] = [userId];
  if (options?.resolved !== undefined) {
    query += " AND is_resolved = ?";
    bindings.push(options.resolved ? 1 : 0);
  }
  query += " ORDER BY wrong_count DESC, last_wrong_at DESC";
  const result = await db.prepare(query).bind(...bindings).all<MistakeRow>();
  return (result.results ?? []).map(mapMistakeRow);
}

export async function getReviewQueue(
  db: D1Database,
  userId: string,
): Promise<Mistake[]> {
  const now = nowIso();
  const result = await db
    .prepare(
      `SELECT * FROM mistakes
       WHERE user_id = ? AND is_resolved = 0
       AND (next_review_at IS NULL OR next_review_at <= ?)
       ORDER BY wrong_count DESC, last_wrong_at DESC`,
    )
    .bind(userId, now)
    .all<MistakeRow>();
  return (result.results ?? []).map(mapMistakeRow);
}

export type MistakeReviewItem = Mistake & {
  questionTitle: string;
  questionType: QuestionType;
  courseSlug: string;
  courseTitle: string;
  lessonSlug: string;
  lessonTitle: string;
  questionIndex: number;
};

type MistakeJoinRow = MistakeRow & {
  question_title: string;
  question_type: string;
  question_order_index: number;
  lesson_slug: string;
  lesson_title: string;
  course_slug: string;
  course_title: string;
  question_index: number;
};

function mapMistakeJoinRow(row: MistakeJoinRow): MistakeReviewItem {
  const mistake = mapMistakeRow(row);
  return {
    ...mistake,
    questionTitle: row.question_title,
    questionType: row.question_type as QuestionType,
    courseSlug: row.course_slug,
    courseTitle: row.course_title,
    lessonSlug: row.lesson_slug,
    lessonTitle: row.lesson_title,
    questionIndex: row.question_index >= 0 ? row.question_index : 0,
  };
}

export async function countOpenMistakes(
  db: D1Database,
  userId: string,
): Promise<number> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) as count FROM mistakes WHERE user_id = ? AND is_resolved = 0",
    )
    .bind(userId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function getMistakesForReview(
  db: D1Database,
  userId: string,
  options?: {
    resolved?: boolean;
    abilityTag?: AbilityTag;
    limit?: number;
  },
): Promise<MistakeReviewItem[]> {
  const bindings: (string | number)[] = [userId];
  const conditions = ["m.user_id = ?"];

  if (options?.resolved !== undefined) {
    conditions.push("m.is_resolved = ?");
    bindings.push(options.resolved ? 1 : 0);
  }

  if (options?.abilityTag) {
    conditions.push("m.ability_tags_json LIKE ?");
    bindings.push(`%"${options.abilityTag}"%`);
  }

  let query = `
    SELECT
      m.*,
      q.title AS question_title,
      q.type AS question_type,
      q.order_index AS question_order_index,
      l.slug AS lesson_slug,
      l.title AS lesson_title,
      c.slug AS course_slug,
      c.title AS course_title,
      (
        SELECT COUNT(*)
        FROM questions q2
        WHERE q2.lesson_id = m.lesson_id
          AND q2.is_published = 1
          AND q2.order_index < q.order_index
      ) AS question_index
    FROM mistakes m
    INNER JOIN questions q ON q.id = m.question_id
    INNER JOIN lessons l ON l.id = m.lesson_id
    INNER JOIN courses c ON c.id = m.course_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY m.wrong_count DESC, m.last_wrong_at DESC`;

  if (options?.limit !== undefined) {
    query += " LIMIT ?";
    bindings.push(options.limit);
  }

  const result = await db.prepare(query).bind(...bindings).all<MistakeJoinRow>();
  return (result.results ?? []).map(mapMistakeJoinRow);
}

export async function updateMistakeAiSummary(
  db: D1Database,
  userId: string,
  mistakeId: string,
  aiSummary: string,
): Promise<Mistake> {
  const now = nowIso();
  await db
    .prepare(
      "UPDATE mistakes SET ai_summary = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    )
    .bind(aiSummary, now, mistakeId, userId)
    .run();
  const row = await db
    .prepare("SELECT * FROM mistakes WHERE id = ? AND user_id = ?")
    .bind(mistakeId, userId)
    .first<MistakeRow>();
  if (!row) throw new Error(`Mistake not found: ${mistakeId}`);
  return mapMistakeRow(row);
}
