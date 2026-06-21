import { Link } from "react-router";
import { ABILITY_TAG_LABELS } from "~/lib/learn/abilityTags";
import type { LearningOverview } from "~/lib/server/learn/progress.server";
import { ProgressBar } from "~/components/learn/ui/ProgressBar";

type LearningOverviewProps = {
  overview: LearningOverview;
};

export function LearningOverview({ overview }: LearningOverviewProps) {
  const { overall, continueLesson, recentMistakes } = overview;

  return (
    <section className="mt-6 space-y-4">
      <div className="relative overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-soft-brand)] p-6 sm:p-8">
        {/* Brand → accent gradient surface */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand-50)] via-white to-[var(--color-accent-400)]/10 dark:from-[var(--color-brand-950)] dark:via-[var(--surface-raised)] dark:to-[var(--color-accent-600)]/10"
        />
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-[var(--color-brand-400)]/30 to-[var(--color-accent-500)]/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-6 top-6 hidden h-32 w-32 opacity-30 sm:block"
        >
          <svg viewBox="0 0 120 120" fill="none">
            <defs>
              <pattern
                id="dots"
                x="0"
                y="0"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect
              width="120"
              height="120"
              fill="url(#dots)"
              className="text-[var(--color-brand-500)]"
            />
          </svg>
        </div>

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-fg)]">
              学习总进度
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-4xl font-bold tabular-nums tracking-tight text-[var(--fg-primary)]">
                {overall.completedLessons}
              </p>
              <p className="text-base font-medium text-[var(--fg-soft)]">
                / {overall.totalLessons} 关
              </p>
            </div>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              已作答 <span className="tabular-nums">{overall.totalQuestionsAttempted}</span> 题
            </p>
            <div className="mt-5 max-w-md">
              <ProgressBar
                value={overall.completedLessons}
                max={overall.totalLessons || 1}
                tone="indigo"
                size="lg"
                showPercent
              />
            </div>
          </div>

          {continueLesson ? (
            <Link
              to={`/learn/courses/${continueLesson.courseSlug}/lessons/${continueLesson.lessonSlug}`}
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-pop)] transition-transform hover:-translate-y-0.5"
            >
              <span className="truncate max-w-[16rem]">
                继续学习 · {continueLesson.lessonTitle}
              </span>
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <Link
              to="/learn/courses"
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft-brand)] bg-[var(--surface-raised)] px-5 py-3 text-sm font-semibold text-[var(--brand-fg)] transition-colors hover:bg-[var(--brand-soft)]"
            >
              浏览全部课程
            </Link>
          )}
        </div>
      </div>

      {recentMistakes.length > 0 && (
        <div className="studio-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold tracking-tight text-[var(--fg-primary)]">
              最近错题
            </h3>
            <Link
              to="/learn/review"
              className="text-sm font-medium text-[var(--brand-fg)] hover:underline"
            >
              查看全部 →
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {recentMistakes.map((mistake) => (
              <li key={mistake.id}>
                <Link
                  to={`/learn/courses/${mistake.courseSlug}/lessons/${mistake.lessonSlug}?q=${mistake.questionIndex}`}
                  className="group relative block overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 transition-colors hover:border-[var(--danger-border)] hover:bg-[var(--danger-soft)]"
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-400 to-rose-600"
                  />
                  <span className="block pl-2 text-sm font-medium text-[var(--fg-primary)]">
                    {mistake.questionTitle}
                  </span>
                  <span className="mt-0.5 block pl-2 text-xs text-[var(--fg-soft)]">
                    {mistake.courseTitle} · 错 {mistake.wrongCount} 次
                    {mistake.abilityTags[0] &&
                      ` · ${ABILITY_TAG_LABELS[mistake.abilityTags[0]]}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
