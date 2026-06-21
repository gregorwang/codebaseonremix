import { getPlatformProxy } from "wrangler";
import { seedSampleLearningData } from "../app/lib/server/learn/seed.server";

const force = process.argv.includes("--force");

const { env, dispose } = await getPlatformProxy<Env>({
  configPath: "./wrangler.jsonc",
});

try {
  const result = await seedSampleLearningData(env.DB, {
    force,
    cache: env.LEARN_CACHE,
  });
  console.log("Sample seed completed:", result);
} finally {
  await dispose();
}
