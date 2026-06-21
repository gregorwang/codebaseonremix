import { Link } from "react-router";
import type { Lesson } from "~/lib/learn/types";
import type { LessonProgressSummary } from "~/lib/server/learn/attempts.server";
import { ProgressBar } from "~/components/learn/ui/ProgressBar";
import { Badge } from "~/components/learn/ui/Badge";

type LessonListProps = {
  courseSlug: string;
  lessons: Lesson[];
  progressByLessonId: Record<string, LessonProgressSummary>;
};

export function LessonList({
  courseSlug,
  lessons,
  progressByLessonId,
}: LessonListProps) {
  return (
    <ul className="space-y-2.5">
      {lessons.map((lesson) => {
        const progress = progressByLessonId[lesson.id];
        const completed = progress?.isCompleted ?? false;
        const attempted = progress?.attemptedQuestions ?? 0;
        const total = progress?.totalQuestions ?? 0;

        const indicatorClass = completed
          ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
          : attempted > 0
            ? "border-[var(--color-accent-500)] bg-[var(--accent-soft)] text-[var(--accent-fg)]"
            : "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--fg-soft)]";

        return (
          <li key={lesson.id}>
            <Link
              to={`/learn/courses/${courseSlug}/lessons/${lesson.slug}`}
              className="group studio-card studio-card-interactive flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums ${indicatorClass}`}
                  aria-hidden
                >
                  {completed ? (
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12l5 5 9-11" />
                    </svg>
                  ) : (
                    lesson.orderIndex + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium tracking-tight text-[var(--fg-primary)]">
                    {lesson.title}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--fg-muted)]">
                    {lesson.learningGoal}
                  </p>
                  {total > 0 && (
                    <div className="mt-2 max-w-sm">
                      <ProgressBar
                        value={attempted}
                        max={total}
                        size="sm"
                        tone={completed ? "emerald" : "amber"}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                <Badge
                  variant={
                    completed ? "success" : attempted > 0 ? "warning" : "muted"
                  }
                  dot
                >
                  {completed
                    ? "已完成"
                    : total > 0
                      ? `${attempted}/${total} 题`
                      : "未开始"}
                </Badge>
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-3 py-1 text-xs font-semibold text-white shadow-sm transition-transform group-hover:translate-x-0.5">
                  {completed ? "复习一下" : attempted > 0 ? "继续练习" : "开始练习"}
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
