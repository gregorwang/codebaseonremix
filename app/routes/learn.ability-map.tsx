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
        description="主视图：解题技能标签；副视图：Remix 项目模块读懂进度。"
      />

      {/* AbilityMap 提到首屏: 用户来这页最想看的是"我具体哪些能力在长"。 */}
      <section className="mt-6" aria-labelledby="ability-tags-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2
            id="ability-tags-heading"
            className="text-lg font-semibold text-[var(--fg-primary)]"
          >
            解题技能标签
          </h2>
          <p className="text-xs text-[var(--fg-soft)]">
            按 15 个能力维度展示掌握度
          </p>
        </div>
        <AbilityOverviewRing
          scoreByTag={scoreByTag}
          curriculumTags={curriculumTags}
        />
        <div className="mt-6">
          <AbilityMap scoreByTag={scoreByTag} curriculumTags={curriculumTags} />
        </div>
      </section>

      <div className="mt-8">
        <AbilitySummary
          weakAbilities={weakAbilities}
          recommendations={recommendations}
        />
      </div>

      <section className="mt-10" aria-labelledby="remix-modules-heading">
        <h2
          id="remix-modules-heading"
          className="mb-4 text-lg font-semibold text-[var(--fg-primary)]"
        >
          Remix 项目地图（辅助视图）
        </h2>
        <RemixModuleMap modules={remixModules} />
      </section>
    </div>
  );
}
