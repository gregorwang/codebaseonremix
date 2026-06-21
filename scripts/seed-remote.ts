import { execSync } from "node:child_process";
import { getPlatformProxy } from "wrangler";
import { seedLearningData } from "../app/lib/server/learn/seed.server";

const force = process.argv.includes("--force");
const exportPath = ".tmp-d1-content.sql";
const tables = ["courses", "lessons", "questions", "exams"];

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
