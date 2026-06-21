import { ABILITY_TAG_LABELS } from "~/lib/learn/abilityTags";
import { QuestionCode } from "~/components/learn/question/QuestionCode";
import type { CodeSnippet } from "~/lib/learn/types";
import { Badge } from "~/components/learn/ui/Badge";
import { DraftList } from "./DraftList";
import { GenerateDraftPanel } from "./GenerateDraftPanel";
import type { AiQuestionDraft } from "~/lib/learn/types";

type SnippetDetailProps = {
  snippet: CodeSnippet;
  drafts: AiQuestionDraft[];
  isAdmin?: boolean;
};

export function SnippetDetail({
  snippet,
  drafts,
  isAdmin,
}: SnippetDetailProps) {
  return (
    <div className="space-y-6">
      <section className="studio-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--fg-primary)]">
              {snippet.title}
            </h2>
            {snippet.sourceFilePath && (
              <p className="mt-1 font-mono text-sm text-[var(--fg-soft)]">
                {snippet.sourceFilePath}
              </p>
            )}
          </div>
          <form method="post">
            <input type="hidden" name="intent" value="archive_snippet" />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--fg-primary)]"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="5" rx="1" />
                <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" />
              </svg>
              归档
            </button>
          </form>
        </div>

        {snippet.abilityTags && snippet.abilityTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {snippet.abilityTags.map((tag) => (
              <Badge key={tag}>{ABILITY_TAG_LABELS[tag]}</Badge>
            ))}
          </div>
        )}

        {snippet.projectContext && (
          <div className="mt-5">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]">
              项目背景
            </h3>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--fg-muted)]">
              {snippet.projectContext}
            </p>
          </div>
        )}

        {snippet.userConfusion && (
          <div className="mt-5">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]">
              我的困惑
            </h3>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--fg-muted)]">
              {snippet.userConfusion}
            </p>
          </div>
        )}

        <QuestionCode code={snippet.code} />
      </section>

      {isAdmin && <GenerateDraftPanel snippetId={snippet.id} />}

      <section>
        <h3 className="text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
          关联题目草稿
        </h3>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          由本片段生成的 AI 草稿；管理员可在{" "}
          <a
            href="/learn/admin/drafts"
            className="font-medium text-[var(--brand-fg)] hover:underline"
          >
            草稿审核
          </a>{" "}
          中批准并发布。
        </p>
        <div className="mt-4">
          <DraftList drafts={drafts} />
        </div>
      </section>
    </div>
  );
}
