import { ABILITY_TREE_GROUPS, getAllTagsInGroup } from "~/lib/learn/abilityTree";
import type { AbilityScore } from "~/lib/learn/types";
import { Badge } from "~/components/learn/ui/Badge";
import { ProgressBar } from "~/components/learn/ui/ProgressBar";

type AbilityOverviewRingProps = {
  scoreByTag: Partial<Record<AbilityScore["abilityTag"], AbilityScore>>;
  curriculumTags?: AbilityScore["abilityTag"][];
};

function getGrowthLevel(avgPercent: number): {
  label: string;
  variant: "muted" | "warning" | "success";
} {
  if (avgPercent < 40) return { label: "入门", variant: "muted" };
  if (avgPercent < 70) return { label: "练习中", variant: "warning" };
  return { label: "熟练", variant: "success" };
}

export function AbilityOverviewRing({
  scoreByTag,
  curriculumTags = [],
}: AbilityOverviewRingProps) {
  const practiced = Object.values(scoreByTag).filter(
    (s): s is AbilityScore => !!s && s.totalCount > 0,
  );
  const curriculumCount = curriculumTags.length;
  const avgPercent =
    practiced.length > 0
      ? Math.round(
          (practiced.reduce((sum, s) => sum + s.score, 0) / practiced.length) *
            1000,
        ) / 10
      : 0;
  const level = getGrowthLevel(avgPercent);
  const groupSummaries = ABILITY_TREE_GROUPS.map((group) => {
    const tags = getAllTagsInGroup(group.id);
    const practicedInGroup = tags
      .map((tag) => scoreByTag[tag])
      .filter(
        (score): score is AbilityScore => !!score && score.totalCount > 0,
      );
    const percent =
      practicedInGroup.length > 0
        ? Math.round(
            (practicedInGroup.reduce((sum, score) => sum + score.score, 0) /
              practicedInGroup.length) *
              100,
          )
        : 0;
    return {
      id: group.id,
      label: group.label,
      practiced: practicedInGroup.length,
      total: tags.length,
      percent,
    };
  });

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-soft-brand)] p-6">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand-50)] via-white to-[var(--color-accent-400)]/10 dark:from-[var(--color-brand-950)] dark:via-[var(--surface-raised)] dark:to-[var(--color-accent-600)]/10"
      />
      <div
        aria-hidden
        className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-[var(--color-brand-400)]/25 to-[var(--color-accent-500)]/15 blur-3xl"
      />
      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-fg)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)]" />
              综合能力
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-[var(--fg-primary)]">
              {avgPercent}%
            </p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              已练习 <span className="tabular-nums">{practiced.length}</span>{" "}
              项 · 课程覆盖{" "}
              <span className="tabular-nums">{curriculumCount}</span>{" "}
              项能力标签
            </p>
          </div>
          <Badge variant={level.variant} dot>
            {level.label}
          </Badge>
        </div>
        <div className="mt-5">
          <ProgressBar value={avgPercent} max={100} tone="indigo" size="lg" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groupSummaries.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 transition-colors hover:border-[var(--border-soft-brand)]"
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-[var(--fg-primary)]">
                  {group.label}
                </span>
                <span className="tabular-nums text-[var(--fg-soft)]">
                  {group.practiced}/{group.total}
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar
                  value={group.percent}
                  max={100}
                  tone="indigo"
                  size="sm"
                />
              </div>
              <p className="mt-1 text-right text-xs font-medium tabular-nums text-[var(--brand-fg)]">
                {group.percent}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function getAbilityLevelLabel(score: number): string {
  const percent = Math.round(score * 100);
  if (percent < 40) return "入门";
  if (percent < 70) return "练习中";
  return "熟练";
}
