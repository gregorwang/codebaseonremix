import { useSearchParams } from "react-router";
import {
  ABILITY_TAGS,
  ABILITY_TAG_LABELS,
  type AbilityTag,
  isAbilityTag,
} from "~/lib/learn/abilityTags";

type ReviewFiltersProps = {
  abilityTag: string | null;
  showResolved: boolean;
};

export function ReviewFilters({
  abilityTag,
  showResolved,
}: ReviewFiltersProps) {
  const [, setSearchParams] = useSearchParams();

  function updateFilters(next: { tag?: string | null; resolved?: boolean }) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      const tag = next.tag !== undefined ? next.tag : abilityTag;
      const resolved =
        next.resolved !== undefined ? next.resolved : showResolved;

      if (tag && isAbilityTag(tag)) {
        params.set("tag", tag);
      } else {
        params.delete("tag");
      }

      if (resolved) {
        params.set("resolved", "1");
      } else {
        params.delete("resolved");
      }

      return params;
    });
  }

  function pillClass(active: boolean) {
    return `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      active
        ? "border-[var(--color-brand-500)] bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-white shadow-sm"
        : "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fg-muted)] hover:border-[var(--border-soft-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-fg)]"
    }`;
  }

  return (
    <div className="studio-card space-y-4 p-4">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]">
          按能力标签筛选
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => updateFilters({ tag: null })}
            className={pillClass(!abilityTag)}
          >
            全部
          </button>
          {ABILITY_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => updateFilters({ tag })}
              className={pillClass(abilityTag === tag)}
            >
              {ABILITY_TAG_LABELS[tag]}
            </button>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--fg-muted)]">
        <input
          type="checkbox"
          checked={showResolved}
          onChange={(e) => updateFilters({ resolved: e.target.checked })}
          className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--color-brand-600)] focus:ring-2 focus:ring-[var(--color-brand-500)]/30"
        />
        含已解决
      </label>
    </div>
  );
}

export type { AbilityTag };
