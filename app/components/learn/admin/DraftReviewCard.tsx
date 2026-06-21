import type { AiQuestionDraft, Course, Lesson } from "~/lib/learn/types";
import { Badge } from "~/components/learn/ui/Badge";
import { DraftPublishForm } from "./DraftPublishForm";

type DraftReviewCardProps = {
  draft: AiQuestionDraft;
  courses: Array<Course & { lessons: Lesson[] }>;
};

const statusVariant: Record<
  string,
  "default" | "success" | "danger" | "warning" | "info" | "muted"
> = {
  draft: "info",
  needs_fix: "warning",
  approved: "success",
  rejected: "danger",
  published: "default",
};

export function DraftReviewCard({ draft, courses }: DraftReviewCardProps) {
  const questionCount =
    typeof draft.generated === "object" &&
    draft.generated !== null &&
    "questions" in draft.generated &&
    Array.isArray((draft.generated as { questions: unknown[] }).questions)
      ? (draft.generated as { questions: unknown[] }).questions.length
      : 0;

  return (
    <article className="studio-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold tracking-tight text-[var(--fg-primary)]">
            {draft.sourceTitle}
          </h3>
          {draft.sourceFilePath && (
            <p className="mt-1 truncate font-mono text-xs text-[var(--fg-soft)]">
              {draft.sourceFilePath}
            </p>
          )}
        </div>
        <Badge variant={statusVariant[draft.status] ?? "muted"} dot>
          {draft.status}
        </Badge>
      </div>

      <p className="mt-2 text-sm tabular-nums text-[var(--fg-muted)]">
        {questionCount} 道题 · 创建于{" "}
        {new Date(draft.createdAt).toLocaleString("zh-CN")}
      </p>

      {draft.reviewNote && (
        <p className="mt-2 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-soft)] px-3 py-2 text-sm text-[var(--warning-fg)]">
          <span className="font-semibold">审核备注：</span>
          {draft.reviewNote}
        </p>
      )}

      <details className="group mt-3">
        <summary className="cursor-pointer list-none">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-fg)] hover:underline">
            <svg
              className="h-3 w-3 transition-transform group-open:rotate-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
            查看生成 JSON
          </span>
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-[var(--code-border)] bg-[var(--code-bg)] p-3 text-xs text-[var(--code-fg)]">
          {JSON.stringify(draft.generated, null, 2)}
        </pre>
      </details>

      <div className="mt-4 flex flex-wrap gap-2">
        {draft.status === "draft" && (
          <>
            <form method="post">
              <input type="hidden" name="intent" value="approve" />
              <input type="hidden" name="draftId" value={draft.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12l5 5 9-11" />
                </svg>
                批准
              </button>
            </form>
            <form method="post" className="flex items-center gap-2">
              <input type="hidden" name="intent" value="reject" />
              <input type="hidden" name="draftId" value={draft.id} />
              <input
                name="reviewNote"
                placeholder="拒绝原因（可选）"
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-1 text-sm shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-500/10"
              >
                拒绝
              </button>
            </form>
          </>
        )}

        {draft.status === "approved" && (
          <DraftPublishForm draftId={draft.id} courses={courses} />
        )}
      </div>
    </article>
  );
}
