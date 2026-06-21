import fs from "node:fs";
import path from "node:path";
import {
  assertSafeRemixPath,
  isSourceExtension,
} from "../app/lib/learn/remixPath";

const REMIX_ROOT = path.resolve(process.cwd(), "remix");
const MAX_FILE_BYTES = 200 * 1024;
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".wrangler", ".git"]);

export { assertSafeRemixPath };

export function getRemixRoot(): string {
  return REMIX_ROOT;
}

function shouldSkipDir(name: string): boolean {
  return SKIP_DIRS.has(name) || name.startsWith(".");
}

export function listRemixSourceFiles(subDir = "app"): string[] {
  const startDir = path.resolve(REMIX_ROOT, subDir.replace(/\\/g, "/").replace(/^\/+/, ""));
  if (!startDir.startsWith(REMIX_ROOT + path.sep) && startDir !== REMIX_ROOT) {
    throw new Error("Directory is outside remix folder");
  }
  if (!fs.existsSync(startDir)) {
    return [];
  }

  const files: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) continue;
        walk(path.join(dir, entry.name));
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!isSourceExtension(ext)) continue;
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(REMIX_ROOT, absolute).replace(/\\/g, "/");
      files.push(relative);
    }
  }

  walk(startDir);
  return files.sort();
}

export function readRemixSourceFile(relativePath: string): string {
  const safePath = assertSafeRemixPath(relativePath);
  const absolute = path.join(REMIX_ROOT, safePath);
  if (!absolute.startsWith(REMIX_ROOT + path.sep) && absolute !== REMIX_ROOT) {
    throw new Error("Path is outside remix directory");
  }
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    throw new Error("File not found");
  }
  const size = fs.statSync(absolute).size;
  if (size > MAX_FILE_BYTES) {
    throw new Error(`File exceeds ${MAX_FILE_BYTES / 1024}KB limit`);
  }
  return fs.readFileSync(absolute, "utf8");
}
