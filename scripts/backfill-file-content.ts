import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { walkProjectSource } from "./lib/fsProjectWalk";
import { shouldSkipFileContent } from "../app/lib/server/project-curriculum/projectScanner.server";
import { nowIso } from "../app/lib/server/learn/db-json.server";

/**
 * 非破坏性回填: 把 remix/ 源码全文写进已存在的 project_files 行(按 file_path 匹配)。
 * 不 DELETE/INSERT, 因此不会触发 code_assets -> project_files 的外键约束,
 * 可在 extract 之后随时重跑。含密文件(validateAiSecurityContent 不过)跳过。
 */
const repoRoot = path.resolve(process.cwd());

const { env, dispose } = await getPlatformProxy<Env>({
  configPath: "./wrangler.jsonc",
});

try {
  const files = walkProjectSource(repoRoot);
  const now = nowIso();
  let updated = 0;
  let skippedSecret = 0;
  let noRow = 0;

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
    if (changes > 0) updated += changes;
    else noRow++;
  }

  console.log("Backfill completed:", {
    walked: files.length,
    updated,
    skippedSecret,
    noMatchingRow: noRow,
  });
} finally {
  await dispose();
}
