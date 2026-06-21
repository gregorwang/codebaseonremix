import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { getCodeCoachConfig } from "../../app/lib/server/project-curriculum/config.server";
import { isSourceExtension } from "../../app/lib/learn/remixPath";
import type { ScannedFileInput } from "../../app/lib/server/project-curriculum/projectScanner.server";

function shouldSkipDir(name: string, ignoreDirs: string[]): boolean {
  if (name.startsWith(".") && name !== ".") return true;
  return ignoreDirs.includes(name);
}

function shouldSkipFile(name: string, ignoreFiles: string[]): boolean {
  const lower = name.toLowerCase();
  if (ignoreFiles.some((p) => lower === p || lower.startsWith(p))) return true;
  if (lower.endsWith(".pem") || lower.endsWith(".key")) return true;
  return false;
}

export function walkProjectSource(repoRoot: string): ScannedFileInput[] {
  const cfg = getCodeCoachConfig();
  const root = path.resolve(repoRoot, cfg.projectSourceDir);
  if (!fs.existsSync(root)) {
    throw new Error(`Project source not found: ${root}`);
  }

  const files: ScannedFileInput[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name, cfg.ignoreDirPatterns)) continue;
        walk(path.join(dir, entry.name));
        continue;
      }

      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute).replace(/\\/g, "/");
      if (shouldSkipFile(entry.name, cfg.ignoreFilePatterns)) continue;

      const ext = path.extname(entry.name).toLowerCase();
      const isJson = ext === ".json" || entry.name === "wrangler.jsonc";
      if (isJson) {
        if (!cfg.allowedJsonFiles.some((a) => relative.endsWith(a))) continue;
      } else if (!isSourceExtension(ext)) {
        continue;
      }

      const stat = fs.statSync(absolute);
      if (stat.size > cfg.maxFileSizeBytes) continue;

      const content = fs.readFileSync(absolute, "utf8");
      const hash = createHash("sha256").update(content).digest("hex");

      files.push({
        filePath: relative,
        sizeBytes: stat.size,
        contentHash: hash,
        content,
      });
    }
  }

  walk(root);
  return files.sort((a, b) => a.filePath.localeCompare(b.filePath));
}
