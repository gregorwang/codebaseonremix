import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { walkProjectSource } from "./lib/fsProjectWalk";
import {
  getOrCreateProjectSource,
  updateProjectSourceStatus,
} from "../app/lib/server/project-curriculum/projectSources.server";
import { persistScannedFiles } from "../app/lib/server/project-curriculum/projectScanner.server";
import { getCodeCoachConfig } from "../app/lib/server/project-curriculum/config.server";

function parseArgs(argv: string[]) {
  let sourceDir = getCodeCoachConfig().projectSourceDir;
  let name = "个人网站 Remix";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source" && argv[i + 1]) sourceDir = argv[++i]!;
    if (argv[i] === "--name" && argv[i + 1]) name = argv[++i]!;
  }
  return { sourceDir, name };
}

const { sourceDir, name } = parseArgs(process.argv.slice(2));
const repoRoot = path.resolve(process.cwd());

const { env, dispose } = await getPlatformProxy<Env>({
  configPath: "./wrangler.jsonc",
});

try {
  const source = await getOrCreateProjectSource(env.DB, {
    sourcePath: sourceDir,
    displayName: name,
  });
  await updateProjectSourceStatus(env.DB, source.id, "scanning");

  const files = walkProjectSource(repoRoot);
  const count = await persistScannedFiles(env.DB, source.id, files);

  console.log("Scan completed:", {
    sourceId: source.id,
    sourcePath: sourceDir,
    filesScanned: count,
  });
} finally {
  await dispose();
}
