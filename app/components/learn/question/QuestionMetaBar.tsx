import type { Question } from "~/lib/learn/types";
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
} from "~/lib/learn/questionLabels";

const LAYER_LABELS: Record<string, string> = {
  basic: "基础",
  "code-reading": "代码阅读",
  "state-reasoning": "状态推演",
  "ai-review": "AI 评审",
  "typescript-review": "TS 审查",
  "production-debugging": "生产排障",
  "free-response": "自由复述",
};

const SCOPE_LABELS: Record<string, string> = {
  "one-line": "改 1 行",
  "single-function": "改单函数",
  "single-file": "改单文件",
  "cross-file": "跨文件",
};

const BOUNDARY_LABELS: Record<string, string> = {
  server: "服务端",
  client: "客户端",
  shared: "共享",
  "mixed-risk": "边界风险",
};

const tagBase =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-none";

export function QuestionMetaBar({
  question,
  onOpenSource,
}: {
  question: Question;
  /** 提供后, 来源文件徽章变成可点按钮, 点击在源码阅读器打开该文件。 */
  onOpenSource?: (path: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <span
        className={`${tagBase} border-[var(--border-soft-brand)] bg-[var(--brand-soft)] text-[var(--brand-fg)]`}
      >
        {QUESTION_TYPE_LABELS[question.type]}
      </span>
      <span
        className={`${tagBase} border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--fg-muted)]`}
      >
        {DIFFICULTY_LABELS[question.difficulty]}
      </span>
      {question.layer && (
        <span
          className={`${tagBase} border-[var(--accent-fg)]/25 bg-[var(--accent-soft)] text-[var(--accent-fg)]`}
        >
          层 · {LAYER_LABELS[question.layer] ?? question.layer}
        </span>
      )}
      {question.expectedFixScope && (
        <span
          className={`${tagBase} border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--fg-muted)]`}
        >
          范围 · {SCOPE_LABELS[question.expectedFixScope] ?? question.expectedFixScope}
        </span>
      )}
      {question.serverClientBoundary && (
        <span
          className={`${tagBase} border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--fg-muted)]`}
        >
          边界 · {BOUNDARY_LABELS[question.serverClientBoundary] ??
            question.serverClientBoundary}
        </span>
      )}
      {question.sourceFilePath &&
        (onOpenSource ? (
          <button
            type="button"
            onClick={() => onOpenSource(question.sourceFilePath!)}
            title="在源码阅读器中打开"
            className={`${tagBase} border-[var(--border-soft-brand)] bg-[var(--brand-soft)] font-mono text-[var(--brand-fg)] transition-colors hover:bg-[var(--brand-soft-strong)]`}
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            remix/{question.sourceFilePath}
          </button>
        ) : (
          <span
            className={`${tagBase} border-[var(--border-subtle)] bg-[var(--surface-sunken)] font-mono text-[var(--fg-muted)]`}
          >
            remix/{question.sourceFilePath}
          </span>
        ))}
      {question.abilityTags.slice(0, 2).map((tag) => (
        <span
          key={tag}
          className={`${tagBase} border-[var(--border-soft-brand)] bg-[var(--brand-soft)] text-[var(--brand-fg)]`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
