import { ABILITY_TAG_LABELS } from "~/lib/learn/abilityTags";
import type { AbilityScore } from "~/lib/learn/types";
import { Badge } from "~/components/learn/ui/Badge";
import { getAbilityLevelLabel } from "./AbilityOverviewRing";

type AbilityNodeProps = {
  tag: AbilityScore["abilityTag"];
  score?: AbilityScore;
  inCurriculum?: boolean;
};

export function AbilityNode({ tag, score, inCurriculum }: AbilityNodeProps) {
  const practiced = score && score.totalCount > 0;
  const percent = practiced ? Math.round(score.score * 100) : 0;
  const isWeak = practiced && score.score < 0.7;
  const levelLabel = practiced ? getAbilityLevelLabel(score.score) : null;

  const containerClass = practiced
    ? isWeak
      ? "border-[var(--warning-border)] bg-[var(--warning-soft)]"
      : "border-[var(--border-subtle)] bg-[var(--surface-raised)]"
    : "border-dashed border-[var(--border-subtle)] bg-[var(--surface-sunken)]";

  return (
    <div className={`rounded-xl border p-3 transition-colors ${containerClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[var(--fg-primary)]">
          {ABILITY_TAG_LABELS[tag]}
        </span>
        <div className="flex items-center gap-2">
          {inCurriculum && <Badge variant="muted">课程中</Badge>}
          {levelLabel && (
            <Badge variant={isWeak ? "warning" : "success"} dot>
              {levelLabel}
            </Badge>
          )}
          <span className="text-xs tabular-nums text-[var(--fg-soft)]">
            {practiced ? `${percent}%` : "未练习"}
          </span>
        </div>
      </div>

      {practiced && (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-inset)] shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isWeak
                  ? "bg-gradient-to-r from-[var(--color-accent-400)] to-[var(--color-accent-600)]"
                  : "bg-gradient-to-r from-[var(--color-brand-400)] to-[var(--color-brand-600)]"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs tabular-nums text-[var(--fg-soft)]">
            对 {score.correctCount} · 错 {score.wrongCount} · 共{" "}
            {score.totalCount}
          </p>
        </>
      )}
    </div>
  );
}
