import type { CreateQuestionInput, Question, QuestionRow } from "~/lib/learn/types";
import { boolToInt, newId, nowIso, stringifyJsonField } from "./db-json.server";
import { refreshLearnPublicCache } from "./cache-public.server";
import { mapQuestionRow } from "./mappers.server";

export async function getQuestionsByLesson(
  db: D1Database,
  lessonId: string,
  options?: { publishedOnly?: boolean },
): Promise<Question[]> {
  const publishedOnly = options?.publishedOnly ?? false;
  const query = publishedOnly
    ? "SELECT * FROM questions WHERE lesson_id = ? AND is_published = 1 ORDER BY order_index ASC"
    : "SELECT * FROM questions WHERE lesson_id = ? ORDER BY order_index ASC";
  const result = await db.prepare(query).bind(lessonId).all<QuestionRow>();
  return (result.results ?? []).map(mapQuestionRow);
}

export async function getQuestionById(
  db: D1Database,
  id: string,
): Promise<Question | null> {
  const row = await db
    .prepare("SELECT * FROM questions WHERE id = ?")
    .bind(id)
    .first<QuestionRow>();
  return row ? mapQuestionRow(row) : null;
}

/**
 * Pure helper: maps a CreateQuestionInput to a QuestionRow shape suitable
 * for unit testing the round-trip without hitting D1. Mirrors the column
 * layout of `INSERT INTO questions ...` in `createQuestion`.
 */
export function questionInputToRow(
  id: string,
  input: CreateQuestionInput,
  now: string,
): QuestionRow {
  return {
    id,
    lesson_id: input.lessonId,
    type: input.type,
    title: input.title,
    prompt: input.prompt,
    code: input.code ?? null,
    options_json: input.options ? stringifyJsonField(input.options) : null,
    blanks_json: input.blanks ? stringifyJsonField(input.blanks) : null,
    sort_items_json: input.sortItems ? stringifyJsonField(input.sortItems) : null,
    correct_answer_json: stringifyJsonField(input.correctAnswer),
    explanation_json: stringifyJsonField(input.explanation),
    ability_tags_json: stringifyJsonField(input.abilityTags),
    mistake_types_json: input.mistakeTypes ? stringifyJsonField(input.mistakeTypes) : null,
    difficulty: input.difficulty,
    source_file_path: input.sourceFilePath ?? null,
    source_note: input.sourceNote ?? null,
    debug_meta_json: input.debugMeta ? stringifyJsonField(input.debugMeta) : null,
    ai_review_meta_json: input.aiReviewMeta ? stringifyJsonField(input.aiReviewMeta) : null,
    branch_scenario: input.branchScenario ?? null,
    source_id: null,
    asset_id: null,
    diff_snippet: input.diffSnippet ?? null,
    line_pick_lines_json: input.linePickLines ? stringifyJsonField(input.linePickLines) : null,
    code_fix_baseline: input.codeFixBaseline ?? null,
    expected_fix_scope: input.expectedFixScope ?? null,
    server_client_boundary: input.serverClientBoundary ?? null,
    touched_files_json: input.touchedFiles ? stringifyJsonField(input.touchedFiles) : null,
    wrong_answer_feedback_json: input.wrongAnswerFeedback
      ? stringifyJsonField(input.wrongAnswerFeedback)
      : null,
    real_world_impact: input.realWorldImpact ?? null,
    ai_review_risk: input.aiReviewRisk ?? null,
    type_safety_risk: input.typeSafetyRisk ?? null,
    layer: input.layer ?? null,
    order_index: input.orderIndex,
    is_published: boolToInt(input.isPublished),
    created_at: now,
    updated_at: now,
  };
}

export async function createQuestion(
  db: D1Database,
  input: CreateQuestionInput,
): Promise<Question> {
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO questions (
        id, lesson_id, type, title, prompt, code,
        options_json, blanks_json, sort_items_json,
        correct_answer_json, explanation_json, ability_tags_json,
        mistake_types_json, difficulty, source_file_path, source_note,
        debug_meta_json, ai_review_meta_json, branch_scenario,
        source_id, asset_id,
        diff_snippet, line_pick_lines_json, code_fix_baseline,
        expected_fix_scope, server_client_boundary, touched_files_json,
        wrong_answer_feedback_json, real_world_impact, ai_review_risk,
        type_safety_risk, layer,
        order_index, is_published, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.lessonId,
      input.type,
      input.title,
      input.prompt,
      input.code ?? null,
      input.options ? stringifyJsonField(input.options) : null,
      input.blanks ? stringifyJsonField(input.blanks) : null,
      input.sortItems ? stringifyJsonField(input.sortItems) : null,
      stringifyJsonField(input.correctAnswer),
      stringifyJsonField(input.explanation),
      stringifyJsonField(input.abilityTags),
      input.mistakeTypes ? stringifyJsonField(input.mistakeTypes) : null,
      input.difficulty,
      input.sourceFilePath ?? null,
      input.sourceNote ?? null,
      input.debugMeta ? stringifyJsonField(input.debugMeta) : null,
      input.aiReviewMeta ? stringifyJsonField(input.aiReviewMeta) : null,
      input.branchScenario ?? null,
      null,
      null,
      input.diffSnippet ?? null,
      input.linePickLines ? stringifyJsonField(input.linePickLines) : null,
      input.codeFixBaseline ?? null,
      input.expectedFixScope ?? null,
      input.serverClientBoundary ?? null,
      input.touchedFiles ? stringifyJsonField(input.touchedFiles) : null,
      input.wrongAnswerFeedback ? stringifyJsonField(input.wrongAnswerFeedback) : null,
      input.realWorldImpact ?? null,
      input.aiReviewRisk ?? null,
      input.typeSafetyRisk ?? null,
      input.layer ?? null,
      input.orderIndex,
      boolToInt(input.isPublished),
      now,
      now,
    )
    .run();
  const question = await getQuestionById(db, id);
  if (!question) throw new Error("Failed to create question");
  return question;
}

export async function publishQuestion(
  db: D1Database,
  id: string,
  cache?: KVNamespace,
): Promise<Question> {
  const now = nowIso();
  await db
    .prepare("UPDATE questions SET is_published = 1, updated_at = ? WHERE id = ?")
    .bind(now, id)
    .run();
  const question = await getQuestionById(db, id);
  if (!question) throw new Error(`Question not found: ${id}`);
  await refreshLearnPublicCache(db, cache);
  return question;
}

export async function archiveQuestion(
  db: D1Database,
  id: string,
  cache?: KVNamespace,
): Promise<Question> {
  const now = nowIso();
  await db
    .prepare("UPDATE questions SET is_published = 0, updated_at = ? WHERE id = ?")
    .bind(now, id)
    .run();
  const question = await getQuestionById(db, id);
  if (!question) throw new Error(`Question not found: ${id}`);
  await refreshLearnPublicCache(db, cache);
  return question;
}

export type AdminQuestionListItem = Question & {
  lessonTitle: string;
  lessonSlug: string;
  courseTitle: string;
  courseSlug: string;
};

export async function listQuestionsForAdmin(
  db: D1Database,
): Promise<AdminQuestionListItem[]> {
  const result = await db
    .prepare(
      `SELECT q.*, l.title AS lesson_title, l.slug AS lesson_slug,
              c.title AS course_title, c.slug AS course_slug
       FROM questions q
       JOIN lessons l ON l.id = q.lesson_id
       JOIN courses c ON c.id = l.course_id
       ORDER BY c.order_index ASC, l.order_index ASC, q.order_index ASC`,
    )
    .all<
      QuestionRow & {
        lesson_title: string;
        lesson_slug: string;
        course_title: string;
        course_slug: string;
      }
    >();

  return (result.results ?? []).map((row) => ({
    ...mapQuestionRow(row),
    lessonTitle: row.lesson_title,
    lessonSlug: row.lesson_slug,
    courseTitle: row.course_title,
    courseSlug: row.course_slug,
  }));
}
