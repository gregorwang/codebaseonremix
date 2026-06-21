import { getPlatformProxy } from "wrangler";
import { rebuildUserProgress } from "../app/lib/server/learn/progress-write.server";

const userIdArg = process.argv.find((arg) => arg.startsWith("--user="));
const userId = userIdArg?.split("=")[1];

const { env, dispose } = await getPlatformProxy<Env>({
  configPath: "./wrangler.jsonc",
});

try {
  if (userId) {
    const result = await rebuildUserProgress(env.DB, userId);
    console.log(`Rebuilt progress for user ${userId}:`, result);
  } else {
    const users = await env.DB.prepare(
      "SELECT DISTINCT user_id FROM answer_attempts",
    ).all<{ user_id: string }>();

    const ids = (users.results ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      console.log("No answer_attempts found; nothing to rebuild.");
    }

    for (const id of ids) {
      const result = await rebuildUserProgress(env.DB, id);
      console.log(`Rebuilt progress for user ${id}:`, result);
    }
  }
} finally {
  await dispose();
}
