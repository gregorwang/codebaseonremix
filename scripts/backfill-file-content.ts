import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { walkProjectSource } from "./lib/fsProjectWalk";
import { shouldSkipFileContent } from "../app/lib/server/project-curriculum/projectScanner.server";
import {
  classifyFileKind,
  languageFromPath,
  scoreFileImportance,
} from "../app/lib/server/project-curriculum/fileKind.server";
import { newId, nowIso } from "../app/lib/server/learn/db-json.server";

/**
 * 非破坏性回填: 把 remix/ 源码全文写进 project_files。
 * - 已存在的行: UPDATE(按 file_path 匹配)
 * - 不存在的行: INSERT 新行(扩展名白名单放开后, 新增的 .css/.sql/.md 等会走这条路)
 *
 * 不 DELETE/INSERT 旧行, 因此不会触发 code_assets -> project_files 的外键约束,
 * 可在 extract 之后随时重跑。含硬凭证文件(sk-/api_key= 字面量, 见 containsHardSecret)跳过。
 */
const repoRoot = path.resolve(process.cwd());

const { env, dispose } = await getPlatformProxy<Env>({
  configPath: "./wrangler.jsonc",
});

try {
  // 取最近一次的 source_id 作为新行的归属(本地通常只有 1 行 project_sources)
  const src = await env.DB.prepare(
    `SELECT id FROM project_sources ORDER BY updated_at DESC LIMIT 1`,
  ).first<{ id: string }>();
  if (!src) {
    throw new Error(
      "project_sources 为空, 请先跑一次 curriculum-scan (允许 DELETE/INSERT 的场景)。",
    );
  }
  const sourceId = src.id;

  const files = walkProjectSource(repoRoot);
  const now = nowIso();
  let updated = 0;
  let inserted = 0;
  let skippedSecret = 0;

  for (const file of files) {
    if (!file.content) continue;
    if (shouldSkipFileContent(file.content)) {
      skippedSecret++;
      continue;
    }
    const lineCount = file.content.split("\n").length;
    const res = await env.DB.prepare(
      `UPDATE project_files
       SET content = ?, line_count = ?, updated_at = ?
       WHERE file_path = ?`,
    )
      .bind(file.content, lineCount, now, file.filePath)
      .run();
    const changes = res.meta?.changes ?? 0;
    if (changes > 0) {
      updated += changes;
      continue;
    }

    // 行不存在 → 新插入
    const fileKind = classifyFileKind(file.filePath);
    const language = languageFromPath(file.filePath);
    const importance = scoreFileImportance(file.filePath, file.sizeBytes);
    const summary = `${fileKind} · ${lineCount} 行`;
    await env.DB.prepare(
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
        fileKind,
        language,
        file.sizeBytes,
        file.contentHash,
        summary,
        importance,
        file.content,
        lineCount,
        now,
        now,
      )
      .run();
    inserted++;
  }

  console.log("Backfill completed:", {
    walked: files.length,
    updated,
    inserted,
    skippedSecret,
  });
} finally {
  await dispose();
}
