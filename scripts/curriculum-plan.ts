import { getPlatformProxy } from "wrangler";
import { planAndDraftCurriculum } from "../app/lib/server/project-curriculum/curriculumDrafts.server";

const sourceId = process.argv.find((a, i) => process.argv[i - 1] === "--source-id");
if (!sourceId) {
  console.error("Usage: npm run curriculum:plan -- --source-id <id>");
  process.exit(1);
}

const { env, dispose } = await getPlatformProxy<Env>({
  configPath: "./wrangler.jsonc",
});

try {
  const result = await planAndDraftCurriculum(env.DB, sourceId);
  console.log("Curriculum planned:", result);
} finally {
  await dispose();
}
