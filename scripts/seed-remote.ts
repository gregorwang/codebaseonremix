import { execSync } from "node:child_process";
import { getPlatformProxy } from "wrangler";
import { seedLearningData } from "../app/lib/server/learn/seed.server";

const force = process.argv.includes("--force");
const exportPath = ".tmp-d1-content.sql";
const tables = [
  "courses",
  "lessons",
  "questions",
  "exams",
  // v3: 把源码全文表也一起推, 否则远程做题卡的 AI 讲解永远拿不到全文,
  // 静默退回 question.code 小片段。
  "project_sources",
  "project_files",
];

const { env, dispose } = await getPlatformProxy<Env>({
  configPath: "./wrangler.jsonc",
  remoteBindings: false,
});

try {
  const result = await seedLearningData(env.DB, { force, warmCache: false });
  console.log("Local seed completed:", result);
} finally {
  await dispose();
}

const tableArgs = tables.flatMap((table) => ["--table", table]).join(" ");
execSync(
  `npx wrangler d1 export code-coach-db --local --no-schema ${tableArgs} --output ${exportPath} -y`,
  { stdio: "inherit", env: { ...process.env, CI: "true" } },
);

// 先清远程的 project_files / project_sources, 避免 import 时 PK 冲突。
// code_assets 在远程目前是 0 行(本仓库 v3 起未启用 extract 流程), 因此 DELETE 安全。
execSync(
  `npx wrangler d1 execute code-coach-db --remote --command "DELETE FROM project_files; DELETE FROM project_sources;"`,
  { stdio: "inherit", env: { ...process.env, CI: "true" } },
);

execSync(`npx wrangler d1 execute code-coach-db --remote --file ${exportPath}`, {
  stdio: "inherit",
  env: { ...process.env, CI: "true" },
});

const verify = execSync(
  `npx wrangler d1 execute code-coach-db --remote --command "SELECT COUNT(*) as n FROM courses WHERE is_published = 1;"`,
  { encoding: "utf8", env: { ...process.env, CI: "true" } },
);
console.log(verify);
console.log("Remote D1 import finished. Visit /learn/courses to confirm.");
