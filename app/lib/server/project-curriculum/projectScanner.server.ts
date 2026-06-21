import type { ProjectFileRow } from "~/lib/learn/types";
import { assertSafeRemixPath } from "~/lib/learn/remixPath";
import { containsHardSecret } from "../ai/aiSchemas.server";
import { newId, nowIso } from "../learn/db-json.server";
import {
  classifyFileKind,
  languageFromPath,
  scoreFileImportance,
} from "./fileKind.server";
import { mapProjectFileRow } from "./mappers.server";
import { updateProjectSourceStatus } from "./projectSources.server";

export type ScannedFileInput = {
  filePath: string;
  sizeBytes: number;
  contentHash: string;
  content?: string;
};

/**
 * 项目扫描器判定文件是否含**硬凭证**, 进而跳过入库。
 *
 * v3 起只检测真正高置信度的硬凭证特征(sk- key、api_key=xxx 字面赋值),
 * 不再用 validateAiSecurityContent 那套宽松规则(它含 Bearer 正则和"绕过登录"关键词)——
 * 那些规则适合校验 AI 输出/用户输入(防 AI 教唆绕过), 但用在"扫描真实源码并决定是否入库"
 * 上会误伤 auth.server.ts 之类的鉴权文件(里面有 'Bearer ' 字面量做 token 解析),
 * 导致整文件被跳过、做题卡讲解卡变小片段。
 */
export function shouldSkipFileContent(content: string): boolean {
  return containsHardSecret(content);
}

export async function persistScannedFiles(
  db: D1Database,
  sourceId: string,
  files: ScannedFileInput[],
): Promise<number> {
  const now = nowIso();
  await db.prepare("DELETE FROM project_files WHERE source_id = ?").bind(sourceId).run();

  let inserted = 0;
  for (const file of files) {
    const kind = classifyFileKind(file.filePath);
    const importance = scoreFileImportance(file.filePath, kind);
    let summary: string | null = null;
    let content: string | null = null;
    let lineCount: number | null = null;

    if (file.content && !shouldSkipFileContent(file.content)) {
      lineCount = file.content.split("\n").length;
      summary = `${kind} · ${lineCount} 行`;
      content = file.content;
    } else if (file.content) {
      continue;
    }

    await db
      .prepare(
        `INSERT INTO project_files (
          id, source_id, file_path, file_kind, language, size_bytes,
          content_hash, summary, importance_score, content, line_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newId(),
        sourceId,
        file.filePath,
        kind,
        languageFromPath(file.filePath),
        file.sizeBytes,
        file.contentHash,
        summary,
        importance,
        content,
        lineCount,
        now,
        now,
      )
      .run();
    inserted++;
  }

  await updateProjectSourceStatus(db, sourceId, "scanned", inserted);
  return inserted;
}

export async function listProjectFiles(
  db: D1Database,
  sourceId: string,
  options?: { minImportance?: number; limit?: number },
) {
  let query =
    "SELECT * FROM project_files WHERE source_id = ? ORDER BY importance_score DESC, file_path ASC";
  const bindings: (string | number)[] = [sourceId];

  if (options?.minImportance !== undefined) {
    query =
      "SELECT * FROM project_files WHERE source_id = ? AND importance_score >= ? ORDER BY importance_score DESC, file_path ASC";
    bindings.push(options.minImportance);
  }

  const result = await db.prepare(query).bind(...bindings).all<ProjectFileRow>();
  let rows = result.results ?? [];
  if (options?.limit) rows = rows.slice(0, options.limit);
  return rows.map(mapProjectFileRow);
}

export async function countProjectFiles(
  db: D1Database,
  sourceId: string,
): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) as count FROM project_files WHERE source_id = ?")
    .bind(sourceId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export type SourceFileContent = {
  path: string;
  code: string;
  language: string | null;
  lineCount: number | null;
};

/**
 * 按 file_path 取被扫描源码文件的完整内容(不绑 source_id),
 * 这样 seed 题与管线生成题只要 sourceFilePath 命中扫描过的文件就都能展示。
 * 路径先过 assertSafeRemixPath 校验(挡 `..` 与非源码扩展名)。
 * 找不到/被跳过(content 为 NULL)返回 null。
 */
export async function getSourceFileContent(
  db: D1Database,
  filePath: string,
): Promise<SourceFileContent | null> {
  let safePath: string;
  try {
    safePath = assertSafeRemixPath(filePath);
  } catch {
    return null;
  }

  const row = await db
    .prepare(
      `SELECT file_path, language, content, line_count
       FROM project_files
       WHERE file_path = ? AND content IS NOT NULL
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .bind(safePath)
    .first<Pick<ProjectFileRow, "file_path" | "language" | "content" | "line_count">>();

  if (!row || row.content == null) return null;

  return {
    path: row.file_path,
    code: row.content,
    language: row.language,
    lineCount: row.line_count,
  };
}
