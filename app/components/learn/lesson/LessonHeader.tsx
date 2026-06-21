import type { Lesson } from "~/lib/learn/types";
import { usePersistedCollapsed } from "~/components/learn/ui/usePersistedCollapsed";

type LessonHeaderProps = {
  lesson: Lesson;
  questionCount: number;
};

const tagBase =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-none";

export function LessonHeader({ lesson, questionCount }: LessonHeaderProps) {
  const abilityTags = lesson.lessonMeta?.abilityTags?.length
    ? lesson.lessonMeta.abilityTags
    : undefined;
  const trainingFocus = lesson.lessonMeta?.trainingFocus ?? [];

  // iPad/手机用户每提交一题刷新都要滚过这张卡, 折叠状态按 lesson slug 持久化
  const [collapsed, setCollapsed] = usePersistedCollapsed(
    `code-coach:lesson-header-collapsed:${lesson.slug}`,
    false,
  );

  return (
    <header className="relative mb-6 overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-soft-brand)] p-6">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[var(--brand-soft)] via-[var(--surface-raised)] to-[var(--accent-soft)]"
      />
      <div
        aria-hidden
        className="absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-gradient-to-br from-[var(--color-brand-400)]/20 to-[var(--color-accent-500)]/15 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-fg)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-500)]" />
            本节课目标
          </p>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 px-2.5 py-1 text-[11px] font-medium text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--fg-primary)]"
          >
            {collapsed ? "展开" : "收起"}
            <svg
              className={`h-3 w-3 transition-transform ${collapsed ? "" : "rotate-180"}`}
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
          </button>
        </div>

        {collapsed ? (
          <p className="mt-2 line-clamp-1 text-sm text-[var(--fg-muted)]">
            {lesson.learningGoal}
          </p>
        ) : (
          <>
            <p className="mt-2 text-base leading-relaxed text-[var(--fg-primary)]">
              {lesson.learningGoal}
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {lesson.sourceFilePath && (
                <span
                  className={`${tagBase} border-[var(--border-subtle)] bg-[var(--surface-raised)] font-mono text-[var(--fg-muted)]`}
                >
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 3h8l4 4v14H6z" />
                  </svg>
                  remix/{lesson.sourceFilePath}
                </span>
              )}
              <span
                className={`${tagBase} border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fg-muted)]`}
              >
                {questionCount} 道练习题
              </span>
              {lesson.teachingBlocks && lesson.teachingBlocks.length > 0 && (
                <span
                  className={`${tagBase} border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fg-muted)]`}
                >
                  {lesson.teachingBlocks.length} 个教学块
                </span>
              )}
            </div>

            {(abilityTags || trainingFocus.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {abilityTags?.map((tag) => (
                  <span
                    key={tag}
                    className={`${tagBase} border-[var(--border-soft-brand)] bg-[var(--brand-soft)] text-[var(--brand-fg)]`}
                  >
                    {tag}
                  </span>
                ))}
                {trainingFocus.map((item) => (
                  <span
                    key={item}
                    className={`${tagBase} border-[var(--accent-fg)]/25 bg-[var(--accent-soft)] text-[var(--accent-fg)]`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}

            {lesson.description && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
                {lesson.description}
              </p>
            )}
          </>
        )}
      </div>
    </header>
  );
}
