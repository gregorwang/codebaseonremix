import type { AbilityTag } from "~/lib/learn/abilityTags";
import type { CodeSnippet, CodeSnippetRow } from "~/lib/learn/types";
import { newId, nowIso, stringifyJsonField } from "./db-json.server";
import { mapCodeSnippetRow } from "./mappers.server";

export async function createSnippet(
  db: D1Database,
  params: {
    userId: string;
    title: string;
    code: string;
    sourceFilePath?: string;
    projectContext?: string;
    userConfusion?: string;
    abilityTags?: AbilityTag[];
  },
): Promise<CodeSnippet> {
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO code_snippets (
        id, user_id, title, source_file_path, code,
        project_context, user_confusion, ability_tags_json,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    )
    .bind(
      id,
      params.userId,
      params.title,
      params.sourceFilePath ?? null,
      params.code,
      params.projectContext ?? null,
      params.userConfusion ?? null,
      params.abilityTags ? stringifyJsonField(params.abilityTags) : null,
      now,
      now,
    )
    .run();
  const row = await db
    .prepare("SELECT * FROM code_snippets WHERE id = ?")
    .bind(id)
    .first<CodeSnippetRow>();
  if (!row) throw new Error("Failed to create snippet");
  return mapCodeSnippetRow(row);
}

export async function getSnippetsByUser(
  db: D1Database,
  userId: string,
): Promise<CodeSnippet[]> {
  const result = await db
    .prepare(
      "SELECT * FROM code_snippets WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC",
    )
    .bind(userId)
    .all<CodeSnippetRow>();
  return (result.results ?? []).map(mapCodeSnippetRow);
}

export async function countSnippetsByUser(
  db: D1Database,
  userId: string,
): Promise<number> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) as count FROM code_snippets WHERE user_id = ? AND status = 'active'",
    )
    .bind(userId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function listActiveSnippets(
  db: D1Database,
): Promise<CodeSnippet[]> {
  const result = await db
    .prepare(
      "SELECT * FROM code_snippets WHERE status = 'active' ORDER BY created_at DESC",
    )
    .all<CodeSnippetRow>();
  return (result.results ?? []).map(mapCodeSnippetRow);
}

export async function getSnippetById(
  db: D1Database,
  snippetId: string,
  userId: string,
): Promise<CodeSnippet | null> {
  const row = await db
    .prepare("SELECT * FROM code_snippets WHERE id = ? AND user_id = ?")
    .bind(snippetId, userId)
    .first<CodeSnippetRow>();
  return row ? mapCodeSnippetRow(row) : null;
}

export async function getActiveSnippetById(
  db: D1Database,
  snippetId: string,
): Promise<CodeSnippet | null> {
  const row = await db
    .prepare(
      "SELECT * FROM code_snippets WHERE id = ? AND status = 'active'",
    )
    .bind(snippetId)
    .first<CodeSnippetRow>();
  return row ? mapCodeSnippetRow(row) : null;
}

export async function getSnippetDraftCounts(
  db: D1Database,
  userId: string,
): Promise<Record<string, number>> {
  const result = await db
    .prepare(
      `SELECT snippet_id, COUNT(*) AS count
       FROM ai_question_drafts
       WHERE created_by = ? AND snippet_id IS NOT NULL
       GROUP BY snippet_id`,
    )
    .bind(userId)
    .all<{ snippet_id: string; count: number }>();

  const counts: Record<string, number> = {};
  for (const row of result.results ?? []) {
    counts[row.snippet_id] = row.count;
  }
  return counts;
}

export async function archiveSnippet(
  db: D1Database,
  snippetId: string,
  userId: string,
): Promise<CodeSnippet> {
  const existing = await getSnippetById(db, snippetId, userId);
  if (!existing) {
    throw new Error(`Snippet not found: ${snippetId}`);
  }

  const now = nowIso();
  await db
    .prepare(
      `UPDATE code_snippets SET status = 'archived', updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
    .bind(now, snippetId, userId)
    .run();

  const row = await db
    .prepare("SELECT * FROM code_snippets WHERE id = ?")
    .bind(snippetId)
    .first<CodeSnippetRow>();
  if (!row) throw new Error(`Snippet not found: ${snippetId}`);
  return mapCodeSnippetRow(row);
}
