import { ABILITY_TREE_GROUPS } from "~/lib/learn/abilityTree";
import type { AbilityScore } from "~/lib/learn/types";
import { AbilityNode } from "./AbilityNode";

type AbilityMapProps = {
  scoreByTag: Partial<Record<AbilityScore["abilityTag"], AbilityScore>>;
  curriculumTags?: AbilityScore["abilityTag"][];
};

export function AbilityMap({
  scoreByTag,
  curriculumTags = [],
}: AbilityMapProps) {
  const curriculumSet = new Set(curriculumTags);
  const practicedTags = Object.keys(scoreByTag).filter(
    (tag) => scoreByTag[tag as AbilityScore["abilityTag"]]?.totalCount,
  ) as AbilityScore["abilityTag"][];
  const activeTagSet = new Set<AbilityScore["abilityTag"]>([
    ...curriculumTags,
    ...practicedTags,
  ]);
  const hasCurriculumFilter = curriculumTags.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {ABILITY_TREE_GROUPS.map((group) => {
        const visibleSubGroups = group.subGroups
          .map((subGroup) => {
            const visibleTags = subGroup.tags.filter((tag) =>
              activeTagSet.has(tag),
            );
            return {
              ...subGroup,
              tags: hasCurriculumFilter ? visibleTags : subGroup.tags,
            };
          })
          .filter(
            (subGroup) => !hasCurriculumFilter || subGroup.tags.length > 0,
          );

        if (hasCurriculumFilter && visibleSubGroups.length === 0) return null;

        return (
          <section key={group.id} className="studio-card p-5">
            <h3 className="mb-4 inline-flex items-center gap-2 pl-3 relative text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
              <span
                aria-hidden
                className="absolute left-0 top-1.5 h-5 w-1 rounded-full bg-gradient-to-b from-[var(--color-brand-400)] to-[var(--color-accent-500)]"
              />
              {group.label}
            </h3>
            <div className="space-y-5">
              {visibleSubGroups.map((subGroup) => (
                <div key={subGroup.id} className="space-y-2.5">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-soft)]">
                    <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                    <span>{subGroup.label}</span>
                    <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                  </div>
                  {subGroup.tags.map((tag) => (
                    <AbilityNode
                      key={tag}
                      tag={tag}
                      score={scoreByTag[tag]}
                      inCurriculum={curriculumSet.has(tag)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
