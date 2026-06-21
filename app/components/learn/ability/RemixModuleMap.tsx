import { UNIT_LABELS } from "~/lib/learn/remixModules";
import type { RemixModuleProgress } from "~/lib/server/learn/ability.server";

type RemixModuleMapProps = {
  modules: RemixModuleProgress[];
};

function ProgressRing({ percent, idSuffix }: { percent: number; idSuffix: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const gradId = `ring-grad-${idSuffix}`;
  return (
    <svg width="48" height="48" className="-rotate-90" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-400)" />
          <stop offset="100%" stopColor="var(--color-accent-500)" />
        </linearGradient>
      </defs>
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="var(--surface-inset)"
        strokeWidth="4"
      />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-700"
      />
    </svg>
  );
}

export function RemixModuleMap({ modules }: RemixModuleMapProps) {
  const byUnit = UNIT_LABELS.map((label, unitIndex) => ({
    label,
    unitIndex,
    nodes: modules.filter((m) => m.unitIndex === unitIndex),
  }));

  return (
    <div className="space-y-6">
      {byUnit.map((unit) => {
        if (unit.nodes.length === 0) return null;
        const unitTotal = unit.nodes.reduce((s, n) => s + n.totalLessons, 0);
        const unitDone = unit.nodes.reduce(
          (s, n) => s + n.completedLessons,
          0,
        );
        const unitPercent =
          unitTotal === 0 ? 0 : Math.round((unitDone / unitTotal) * 100);

        return (
          <section key={unit.unitIndex} className="studio-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 pl-3 relative">
              <span
                aria-hidden
                className="absolute left-0 top-1.5 h-5 w-1 rounded-full bg-gradient-to-b from-[var(--color-brand-400)] to-[var(--color-accent-500)]"
              />
              <h3 className="text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
                {unit.label}
              </h3>
              <span className="text-sm tabular-nums text-[var(--fg-soft)]">
                单元进度 {unitDone}/{unitTotal} 关 ·{" "}
                <span className="font-semibold text-[var(--brand-fg)]">
                  {unitPercent}%
                </span>
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {unit.nodes.map((node, idx) => (
                <article
                  key={node.moduleId}
                  className="flex gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 transition-colors hover:border-[var(--border-soft-brand)]"
                >
                  <div className="relative flex shrink-0 items-center justify-center">
                    <ProgressRing
                      percent={node.percent}
                      idSuffix={`${unit.unitIndex}-${idx}`}
                    />
                    <span className="absolute text-[11px] font-bold tabular-nums text-[var(--fg-primary)]">
                      {node.percent}%
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-[var(--fg-primary)]">
                      {node.label}
                    </h4>
                    <p className="mt-0.5 text-sm text-[var(--fg-muted)]">
                      {node.description}
                    </p>
                    <p className="mt-1 truncate font-mono text-[11px] text-[var(--fg-soft)]">
                      {node.paths.join(" · ")}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {node.percent >= 100 && node.totalLessons > 0 && (
                        <svg
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12l5 5 9-11" />
                        </svg>
                      )}
                      {node.completedLessons}/{node.totalLessons} 关已读懂
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
