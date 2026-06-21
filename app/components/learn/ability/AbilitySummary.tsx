import { Link } from "react-router";
import { ABILITY_TAG_LABELS } from "~/lib/learn/abilityTags";
import type { AbilityScore } from "~/lib/learn/types";
import type { LessonRecommendation } from "~/lib/server/learn/ability.server";

type AbilitySummaryProps = {
  weakAbilities: AbilityScore[];
  recommendations: LessonRecommendation[];
};

export function AbilitySummary({
  weakAbilities,
  recommendations,
}: AbilitySummaryProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-[var(--radius-card)] border border-[var(--warning-border)] bg-[var(--warning-soft)] p-5">
        <h3 className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-[var(--warning-fg)]">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.3 3.86l-7.39 12.79A2 2 0 0 0 4.62 20h14.76a2 2 0 0 0 1.71-3.05L13.7 3.86a2 2 0 0 0-3.4 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          薄弱能力
        </h3>
        {weakAbilities.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--warning-fg)]">
            暂无明确薄弱项，继续保持练习。
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {weakAbilities.map((item) => (
              <li
                key={item.abilityTag}
                className="flex items-center justify-between rounded-lg border border-[var(--warning-border)] bg-[var(--surface-raised)]/60 px-3 py-1.5 text-sm"
              >
                <span className="text-[var(--fg-primary)]">
                  {ABILITY_TAG_LABELS[item.abilityTag]}
                </span>
                <span className="font-semibold tabular-nums text-[var(--warning-fg)]">
                  {Math.round(item.score * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recommendations.length > 0 && (
        <section className="rounded-[var(--radius-card)] border border-[var(--border-soft-brand)] bg-[var(--brand-soft)] p-5">
          <h3 className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-[var(--brand-fg-strong)]">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 11l9-9 9 9-9 9z" />
              <path d="M9 12l3 3 3-3" />
            </svg>
            推荐下一课
          </h3>
          <ul className="mt-3 space-y-2">
            {recommendations.map((rec) => (
              <li key={`${rec.courseSlug}-${rec.lessonSlug}`}>
                <Link
                  to={`/learn/courses/${rec.courseSlug}/lessons/${rec.lessonSlug}`}
                  className="group block rounded-xl border border-[var(--border-soft-brand)] bg-[var(--surface-raised)] p-3 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]"
                >
                  <p className="font-medium text-[var(--fg-primary)]">
                    {rec.lessonTitle}
                  </p>
                  <p className="text-xs text-[var(--fg-soft)]">{rec.courseTitle}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--brand-fg)]">
                    <span>{rec.reason}</span>
                    <svg
                      className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
