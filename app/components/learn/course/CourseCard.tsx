import { Link } from "react-router";
import type { Course } from "~/lib/learn/types";
import type { CourseProgressSummary } from "~/lib/server/learn/progress.server";
import { ABILITY_TAG_LABELS } from "~/lib/learn/abilityTags";
import { ProgressBar } from "~/components/learn/ui/ProgressBar";
import { Badge } from "~/components/learn/ui/Badge";

type CourseCardProps = {
  course: Course;
  progress?: CourseProgressSummary;
};

export function CourseCard({ course, progress }: CourseCardProps) {
  const completed = progress?.completedLessons ?? 0;
  const total = progress?.totalLessons ?? 0;
  const isComplete = total > 0 && completed >= total;
  const isSample = course.origin === "sample";
  const extraTagCount = course.abilityTags.length - 3;

  const stripGradient = isComplete
    ? "from-emerald-400 via-emerald-500 to-emerald-600"
    : isSample
      ? "from-slate-300 via-slate-400 to-slate-500"
      : "from-[var(--color-brand-400)] via-[var(--color-brand-500)] to-[var(--color-accent-500)]";

  return (
    <Link
      to={`/learn/courses/${course.slug}`}
      className="studio-card studio-card-interactive group relative block overflow-hidden p-0 focus-visible:outline-none focus-visible:[box-shadow:var(--shadow-focus)]"
    >
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stripGradient}`}
      />
      <div className="p-5 pt-6">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
            {course.title}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {isSample && (
              <Badge variant="muted" dot>
                示例
              </Badge>
            )}
            {isComplete && (
              <Badge variant="success" dot>
                已完成
              </Badge>
            )}
          </div>
        </div>
        {course.subtitle && (
          <p className="mt-1 text-sm font-medium text-[var(--brand-fg)]">
            {course.subtitle}
          </p>
        )}
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--fg-muted)]">
          {course.description}
        </p>

        {progress && total > 0 && (
          <div className="mt-4">
            <ProgressBar
              value={completed}
              max={total}
              label={`已完成 ${completed}/${total} 关`}
              tone={isComplete ? "emerald" : "indigo"}
              size="sm"
              showPercent
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Badge variant="muted">{course.difficulty}</Badge>
          {course.abilityTags.slice(0, 3).map((tag) => (
            <Badge key={tag}>{ABILITY_TAG_LABELS[tag]}</Badge>
          ))}
          {extraTagCount > 0 && (
            <Badge variant="muted">+{extraTagCount}</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
