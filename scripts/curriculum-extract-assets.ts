import { getPlatformProxy } from "wrangler";
import path from "node:path";
import { walkProjectSource } from "./lib/fsProjectWalk";
import { extractCodeAssetsForSource } from "../app/lib/server/project-curriculum/codeAssetExtractor.server";

const sourceId = process.argv.find((a, i) => process.argv[i - 1] === "--source-id");
if (!sourceId) {
  console.error("Usage: npm run curriculum:extract-assets -- --source-id <id>");
  process.exit(1);
}

const repoRoot = path.resolve(process.cwd());
const files = walkProjectSource(repoRoot);
const contentMap = new Map(files.map((f) => [f.filePath, f.content ?? ""]));

const { env, dispose } = await getPlatformProxy<Env>({
  configPath: "./wrangler.jsonc",
});

try {
  const count = await extractCodeAssetsForSource(env.DB, sourceId, contentMap);
  console.log("Assets extracted:", count);
} finally {
  await dispose();
}
