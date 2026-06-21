import { data } from "react-router";
import { AbilityMap } from "~/components/learn/ability/AbilityMap";
import { AbilityOverviewRing } from "~/components/learn/ability/AbilityOverviewRing";
import { AbilitySummary } from "~/components/learn/ability/AbilitySummary";
import { RemixModuleMap } from "~/components/learn/ability/RemixModuleMap";
import { PageHeader } from "~/components/learn/ui/PageHeader";
import {
  getAbilityMap,
  getPublishedAbilityTagsFromCurriculum,
  getRemixModuleProgress,
  getWeakAbilities,
  recommendNextLessons,
} from "~/lib/server/learn/ability.server";
import { ensureLearnUser, mergeHeaders } from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn.ability-map";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { DB: db, LEARN_CACHE: cache } = context.cloudflare.env;
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);

  const [scores, weakAbilities, recommendations, curriculumTags, remixModules] =
    await Promise.all([
      getAbilityMap(db, userId),
      getWeakAbilities(db, userId),
      recommendNextLessons(db, userId),
      getPublishedAbilityTagsFromCurriculum(db, cache),
      getRemixModuleProgress(db, userId, cache),
    ]);

  const scoreByTag = Object.fromEntries(
    scores.map((s) => [s.abilityTag, s]),
  );

  return data(
    { scoreByTag, weakAbilities, recommendations, curriculumTags, remixModules },
    cookieHeaders ? { headers: mergeHeaders(null, cookieHeaders) } : undefined,
  );
}

export default function AbilityMapPage({ loaderData }: Route.ComponentProps) {
  const { scoreByTag, weakAbilities, recommendations, curriculumTags, remixModules } =
    loaderData;

  return (
    <div>
      <PageHeader
        title="能力树"
        description="主视图：Remix 项目模块读懂进度；副视图：解题技能标签。"
      />

      <section className="mt-6">
        <h2 className="mb-4 text-xl font-semibold">Remix 项目地图</h2>
        <RemixModuleMap modules={remixModules} />
      </section>

      <div className="mt-10">
        <AbilityOverviewRing scoreByTag={scoreByTag} curriculumTags={curriculumTags} />
      </div>

      <div className="mt-6">
        <AbilitySummary
          weakAbilities={weakAbilities}
          recommendations={recommendations}
        />
      </div>

      <details className="mt-8">
        <summary className="cursor-pointer text-lg font-semibold text-slate-700 dark:text-slate-300">
          解题技能标签（折叠）
        </summary>
        <div className="mt-4">
          <AbilityMap scoreByTag={scoreByTag} curriculumTags={curriculumTags} />
        </div>
      </details>
    </div>
  );
}
