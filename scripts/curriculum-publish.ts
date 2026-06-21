import { getPlatformProxy } from "wrangler";
import { publishCurriculumDraft } from "../app/lib/server/project-curriculum/curriculumDrafts.server";

const draftId = process.argv.find((a, i) => process.argv[i - 1] === "--draft-id");
if (!draftId) {
  console.error("Usage: npm run curriculum:publish -- --draft-id <id>");
  process.exit(1);
}

const { env, dispose } = await getPlatformProxy<Env>({
  configPath: "./wrangler.jsonc",
});

try {
  const result = await publishCurriculumDraft(env.DB, draftId);
  console.log("Published:", result);
} finally {
  await dispose();
}
