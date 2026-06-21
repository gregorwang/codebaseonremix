import type { AbilityTag } from "~/lib/learn/abilityTags";
import type { CodeAsset, CodeAssetRow } from "~/lib/learn/types";
import { validateAiSecurityContent } from "../ai/aiSchemas.server";
import { newId, nowIso, stringifyJsonField } from "../learn/db-json.server";
import { classifyFileKind } from "./fileKind.server";
import { mapCodeAssetRow } from "./mappers.server";
import { listProjectFiles } from "./projectScanner.server";

export type ExtractedAssetDraft = {
  fileId: string;
  title: string;
  filePath: string;
  code: string;
  startLine?: number;
  endLine?: number;
  assetType: string;
  businessContext: string;
  userLearningValue: string;
  detectedConcepts: string[];
  abilityTags: AbilityTag[];
};

function detectConcepts(filePath: string, code: string): string[] {
  const concepts: string[] = [];
  const p = filePath.toLowerCase();
  if (p.includes("auth") || code.includes("betterAuth")) concepts.push("Better Auth");
  if (code.includes("loader") || code.includes("action")) concepts.push("Loader/Action");
  if (code.includes("useState")) concepts.push("useState");
  if (code.includes("useEffect")) concepts.push("useEffect");
  if (code.includes("theme") || code.includes("dark")) concepts.push("主题切换");
  if (code.includes("rateLimit") || p.includes("rate-limit")) concepts.push("限流");
  if (code.includes("gateway") || p.includes("nemesis")) concepts.push("AI Gateway");
  if (code.includes("D1") || code.includes("d1")) concepts.push("D1 数据库");
  if (code.includes("cookie") || code.includes("session")) concepts.push("Session/Cookie");
  return [...new Set(concepts)];
}

function mapAbilityTags(filePath: string, code: string): AbilityTag[] {
  const tags: AbilityTag[] = [];
  const p = filePath.toLowerCase();
  if (code.includes("useState") || code.includes("useEffect"))
    tags.push("frontend.state.local");
  if (p.includes("theme") || code.includes("Theme"))
    tags.push("frontend.state.global");
  if (code.includes("loader")) tags.push("bridge.reactRouter.loader");
  if (code.includes("action")) tags.push("bridge.reactRouter.action");
  if (p.includes("auth")) tags.push("backend.auth.required");
  if (p.includes("rate-limit")) tags.push("backend.rateLimit");
  if (p.includes("nemesis") || p.includes("gateway"))
    tags.push("ai.review.architecture");
  if (tags.length === 0) tags.push("code.position.handler");
  return [...new Set(tags)];
}

function extractFromFile(
  fileId: string,
  filePath: string,
  content: string,
  importance: number,
): ExtractedAssetDraft[] {
  if (importance < 0.5) return [];
  const security = validateAiSecurityContent(content);
  if (!security.valid) return [];

  const kind = classifyFileKind(filePath);
  const lines = content.split("\n");
  const maxLines = Math.min(lines.length, 120);
  const code = lines.slice(0, maxLines).join("\n");
  const concepts = detectConcepts(filePath, content);

  return [
    {
      fileId,
      title: `${kind}: ${filePath.split("/").pop()}`,
      filePath,
      code,
      startLine: 1,
      endLine: maxLines,
      assetType: kind,
      businessContext: `来自真实项目文件 ${filePath}`,
      userLearningValue: `理解该文件中与 ${concepts.join("、") || "项目结构"} 相关的因果链`,
      detectedConcepts: concepts,
      abilityTags: mapAbilityTags(filePath, content),
    },
  ];
}

export async function extractCodeAssetsForSource(
  db: D1Database,
  sourceId: string,
  fileContents: Map<string, string>,
): Promise<number> {
  const files = await listProjectFiles(db, sourceId, { minImportance: 0.5 });
  const now = nowIso();
  await db.prepare("DELETE FROM code_assets WHERE source_id = ?").bind(sourceId).run();

  let count = 0;
  for (const file of files) {
    const content = fileContents.get(file.filePath);
    if (!content) continue;
    const drafts = extractFromFile(file.id, file.filePath, content, file.importanceScore);
    for (const draft of drafts) {
      await db
        .prepare(
          `INSERT INTO code_assets (
            id, source_id, file_id, title, file_path, code, start_line, end_line,
            asset_type, business_context, user_learning_value,
            detected_concepts_json, ability_tags_json, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
        )
        .bind(
          newId(),
          sourceId,
          draft.fileId,
          draft.title,
          draft.filePath,
          draft.code,
          draft.startLine ?? null,
          draft.endLine ?? null,
          draft.assetType,
          draft.businessContext,
          draft.userLearningValue,
          stringifyJsonField(draft.detectedConcepts),
          stringifyJsonField(draft.abilityTags),
          now,
          now,
        )
        .run();
      count++;
    }
  }
  return count;
}

export async function listCodeAssets(
  db: D1Database,
  sourceId: string,
  options?: { status?: string },
): Promise<CodeAsset[]> {
  let query = "SELECT * FROM code_assets WHERE source_id = ?";
  const bindings: string[] = [sourceId];
  if (options?.status) {
    query += " AND status = ?";
    bindings.push(options.status);
  }
  query += " ORDER BY created_at DESC";
  const result = await db.prepare(query).bind(...bindings).all<CodeAssetRow>();
  return (result.results ?? []).map(mapCodeAssetRow);
}

export async function listPublishedCodeAssets(db: D1Database): Promise<CodeAsset[]> {
  const result = await db
    .prepare("SELECT * FROM code_assets WHERE status = 'published' ORDER BY created_at DESC")
    .all<CodeAssetRow>();
  return (result.results ?? []).map(mapCodeAssetRow);
}

export async function publishCodeAssets(
  db: D1Database,
  sourceId: string,
): Promise<number> {
  const now = nowIso();
  const result = await db
    .prepare(
      "UPDATE code_assets SET status = 'published', updated_at = ? WHERE source_id = ? AND status = 'draft'",
    )
    .bind(now, sourceId)
    .run();
  return result.meta.changes ?? 0;
}
