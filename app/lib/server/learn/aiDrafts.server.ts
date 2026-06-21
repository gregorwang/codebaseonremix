import type { AbilityTag } from "~/lib/learn/abilityTags";
import type {
  AiDraftStatus,
  AiQuestionDraft,
  AiQuestionDraftRow,
  AiQuestionGenerationOutput,
  AiValidationResult,
  Question,
  QuestionType,
} from "~/lib/learn/types";
import {
  mapGeneratedQuestionToCreateInput,
  validateAiQuestionGenerationOutput,
} from "../ai/aiSchemas.server";
import { createQuestion } from "./questions.server";
import { newId, nowIso, stringifyJsonField } from "./db-json.server";
import { mapAiQuestionDraftRow } from "./mappers.server";

export class AiDraftValidationError extends Error {
  errors: string[];

  constructor(errors: string[]) {
    super(errors.join("; ") || "AI 草稿校验失败");
    this.name = "AiDraftValidationError";
    this.errors = errors;
  }
}

export async function createAiDraft(
  db: D1Database,
  params: {
    createdBy: string;
    sourceTitle: string;
    sourceCode: string;
    generationGoal: string;
    targetAbilities: AbilityTag[];
    preferredQuestionTypes: QuestionType[];
    generated: unknown;
    snippetId?: string;
    sourceFilePath?: string;
    projectContext?: string;
    validationResult?: AiValidationResult;
    status?: AiDraftStatus;
  },
): Promise<AiQuestionDraft> {
  const id = newId();
  const now = nowIso();
  const status = params.status ?? "draft";
  await db
    .prepare(
      `INSERT INTO ai_question_drafts (
        id, snippet_id, created_by, source_title, source_file_path,
        source_code, project_context, generation_goal,
        target_abilities_json, preferred_question_types_json,
        generated_json, validation_result_json, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      params.snippetId ?? null,
      params.createdBy,
      params.sourceTitle,
      params.sourceFilePath ?? null,
      params.sourceCode,
      params.projectContext ?? null,
      params.generationGoal,
      stringifyJsonField(params.targetAbilities),
      stringifyJsonField(params.preferredQuestionTypes),
      stringifyJsonField(params.generated),
      params.validationResult
        ? stringifyJsonField(params.validationResult)
        : null,
      status,
      now,
      now,
    )
    .run();
  const row = await db
    .prepare("SELECT * FROM ai_question_drafts WHERE id = ?")
    .bind(id)
    .first<AiQuestionDraftRow>();
  if (!row) throw new Error("Failed to create AI draft");
  return mapAiQuestionDraftRow(row);
}

export async function createValidatedAiDraft(
  db: D1Database,
  params: {
    createdBy: string;
    sourceTitle: string;
    sourceCode: string;
    generationGoal: string;
    targetAbilities: AbilityTag[];
    preferredQuestionTypes: QuestionType[];
    generated: unknown;
    snippetId?: string;
    sourceFilePath?: string;
    projectContext?: string;
  },
): Promise<AiQuestionDraft> {
  const validation = validateAiQuestionGenerationOutput(params.generated);
  if (!validation.valid || !validation.output) {
    throw new AiDraftValidationError(validation.errors);
  }

  return createAiDraft(db, {
    ...params,
    generated: validation.output,
    validationResult: {
      valid: true,
      errors: validation.errors,
      warnings: validation.warnings,
    },
    status: "draft",
  });
}

export async function getDraftsBySnippetId(
  db: D1Database,
  snippetId: string,
  userId: string,
): Promise<AiQuestionDraft[]> {
  const result = await db
    .prepare(
      `SELECT * FROM ai_question_drafts
       WHERE snippet_id = ? AND created_by = ?
       ORDER BY created_at DESC`,
    )
    .bind(snippetId, userId)
    .all<AiQuestionDraftRow>();
  return (result.results ?? []).map(mapAiQuestionDraftRow);
}

export async function getAiDraftById(
  db: D1Database,
  draftId: string,
  userId: string,
): Promise<AiQuestionDraft | null> {
  const row = await db
    .prepare(
      "SELECT * FROM ai_question_drafts WHERE id = ? AND created_by = ?",
    )
    .bind(draftId, userId)
    .first<AiQuestionDraftRow>();
  return row ? mapAiQuestionDraftRow(row) : null;
}

export async function getAiDraftByIdAdmin(
  db: D1Database,
  draftId: string,
): Promise<AiQuestionDraft | null> {
  const row = await db
    .prepare("SELECT * FROM ai_question_drafts WHERE id = ?")
    .bind(draftId)
    .first<AiQuestionDraftRow>();
  return row ? mapAiQuestionDraftRow(row) : null;
}

export async function listDraftsForAdmin(
  db: D1Database,
  options?: { status?: AiDraftStatus },
): Promise<AiQuestionDraft[]> {
  const status = options?.status;
  const query = status
    ? "SELECT * FROM ai_question_drafts WHERE status = ? ORDER BY created_at DESC"
    : "SELECT * FROM ai_question_drafts ORDER BY created_at DESC";
  const result = status
    ? await db.prepare(query).bind(status).all<AiQuestionDraftRow>()
    : await db.prepare(query).all<AiQuestionDraftRow>();
  return (result.results ?? []).map(mapAiQuestionDraftRow);
}

export async function validateAiDraft(
  draft: AiQuestionDraft,
): Promise<AiValidationResult> {
  return validateAiQuestionGenerationOutput(draft.generated);
}

export async function approveAiDraft(
  db: D1Database,
  draftId: string,
  reviewedBy: string,
  reviewNote?: string,
): Promise<AiQuestionDraft> {
  const now = nowIso();
  await db
    .prepare(
      `UPDATE ai_question_drafts SET
        status = 'approved', reviewed_by = ?, reviewed_at = ?,
        review_note = ?, updated_at = ?
      WHERE id = ?`,
    )
    .bind(reviewedBy, now, reviewNote ?? null, now, draftId)
    .run();
  const row = await db
    .prepare("SELECT * FROM ai_question_drafts WHERE id = ?")
    .bind(draftId)
    .first<AiQuestionDraftRow>();
  if (!row) throw new Error(`Draft not found: ${draftId}`);
  return mapAiQuestionDraftRow(row);
}

export async function rejectAiDraft(
  db: D1Database,
  draftId: string,
  reviewedBy: string,
  reviewNote?: string,
): Promise<AiQuestionDraft> {
  const now = nowIso();
  await db
    .prepare(
      `UPDATE ai_question_drafts SET
        status = 'rejected', reviewed_by = ?, reviewed_at = ?,
        review_note = ?, updated_at = ?
      WHERE id = ?`,
    )
    .bind(reviewedBy, now, reviewNote ?? null, now, draftId)
    .run();
  const row = await db
    .prepare("SELECT * FROM ai_question_drafts WHERE id = ?")
    .bind(draftId)
    .first<AiQuestionDraftRow>();
  if (!row) throw new Error(`Draft not found: ${draftId}`);
  return mapAiQuestionDraftRow(row);
}

export async function publishAiDraftAsQuestions(
  db: D1Database,
  draftId: string,
  lessonId: string,
): Promise<{ draft: AiQuestionDraft; questions: Question[] }> {
  const draft = await getAiDraftByIdAdmin(db, draftId);
  if (!draft) {
    throw new Error(`Draft not found: ${draftId}`);
  }
  if (draft.status !== "approved") {
    throw new Error("只有已批准的草稿才能发布");
  }

  const validation = validateAiQuestionGenerationOutput(draft.generated);
  if (!validation.valid || !validation.output) {
    throw new AiDraftValidationError(validation.errors);
  }

  const output = validation.output as AiQuestionGenerationOutput;
  const maxOrder = await db
    .prepare(
      "SELECT COALESCE(MAX(order_index), -1) AS max_order FROM questions WHERE lesson_id = ?",
    )
    .bind(lessonId)
    .first<{ max_order: number }>();
  let orderIndex = (maxOrder?.max_order ?? -1) + 1;

  const questions: Question[] = [];
  for (const generated of output.questions) {
    const created = await createQuestion(
      db,
      mapGeneratedQuestionToCreateInput(
        generated,
        lessonId,
        orderIndex,
        draft.sourceFilePath,
      ),
    );
    questions.push(created);
    orderIndex += 1;
  }

  const now = nowIso();
  await db
    .prepare(
      `UPDATE ai_question_drafts SET status = 'published', updated_at = ? WHERE id = ?`,
    )
    .bind(now, draftId)
    .run();

  if (draft.snippetId) {
    await db
      .prepare(
        `UPDATE code_snippets SET status = 'converted_to_questions', updated_at = ? WHERE id = ?`,
      )
      .bind(now, draft.snippetId)
      .run();
  }

  const updated = await getAiDraftByIdAdmin(db, draftId);
  if (!updated) throw new Error(`Draft not found: ${draftId}`);
  return { draft: updated, questions };
}
