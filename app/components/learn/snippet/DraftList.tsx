import type { AiQuestionDraft } from "~/lib/learn/types";
import { Badge } from "~/components/learn/ui/Badge";
import { EmptyState } from "~/components/learn/ui/EmptyState";

type DraftListProps = {
  drafts: AiQuestionDraft[];
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

export function DraftList({ drafts }: DraftListProps) {
  if (drafts.length === 0) {
    return <EmptyState message="还没有题目草稿，可在上方生成。" />;
  }

  return (
    <ul className="space-y-2.5">
      {drafts.map((draft) => (
        <li key={draft.id} className="studio-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs text-[var(--fg-soft)]">{draft.id}</p>
            <Badge variant={statusVariant[draft.status] ?? "muted"} dot>
              {draft.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            创建于 {new Date(draft.createdAt).toLocaleString("zh-CN")}
          </p>
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
        </li>
      ))}
    </ul>
  );
}
