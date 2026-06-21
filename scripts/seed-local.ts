import { getPlatformProxy } from "wrangler";
import { seedLearningData } from "../app/lib/server/learn/seed.server";

const force = process.argv.includes("--force");

const { env, dispose } = await getPlatformProxy<Env>({
  configPath: "./wrangler.jsonc",
});

try {
  const result = await seedLearningData(env.DB, {
    force,
    cache: env.LEARN_CACHE,
  });
  console.log("Seed completed:", result);
} finally {
  await dispose();
}
