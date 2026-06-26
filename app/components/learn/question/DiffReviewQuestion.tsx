import { CodeBlock } from "~/components/learn/code/CodeBlock";
import type { QuestionComponentProps } from "./types";

/**
 * diff_review: render a unified diff and ask the user to accept or reject
 * the change, with a reason. The reason is graded by AI in Phase 7; the
 * verdict is graded locally by checkAnswer.
 */
export function DiffReviewQuestion({
  question,
  value,
  onChange,
  disabled,
}: QuestionComponentProps) {
  const verdict = value?.type === "diff_review" ? value.verdict : undefined;
  const reason = value?.type === "diff_review" ? (value.reason ?? "") : "";

  function setVerdict(v: "accept" | "reject") {
    onChange({ type: "diff_review", verdict: v, reason });
  }
  function setReason(next: string) {
    onChange({
      type: "diff_review",
      verdict: verdict ?? "reject",
      reason: next,
    });
  }

  const opts = [
    {
      v: "accept" as const,
      label: "接受",
      icon: (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12l5 5 9-11" />
        </svg>
      ),
      activeClass:
        "border-emerald-400 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400/40 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200",
    },
    {
      v: "reject" as const,
      label: "拒绝",
      icon: (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      ),
      activeClass:
        "border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-400/40 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200",
    },
  ];

  return (
    <div>
      <p className="text-base leading-relaxed text-[var(--fg-primary)]">
        {question.prompt}
      </p>
      {question.diffSnippet && (
        <div className="mt-4">
          <CodeBlock
            code={question.diffSnippet}
            filePath={
              question.sourceFilePath
                ? `remix/${question.sourceFilePath}`
                : "AI 提案"
            }
            language="diff"
            collapsible={false}
          />
        </div>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {opts.map((opt) => {
          const isSelected = verdict === opt.v;
          return (
            <label
              key={opt.v}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border bg-[var(--surface-raised)] px-4 py-3 text-sm font-semibold transition-all ${
                isSelected
                  ? opt.activeClass
                  : "border-[var(--border-subtle)] text-[var(--fg-muted)] hover:border-[var(--border-soft-brand)] hover:bg-[var(--surface-sunken)]"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name={`q-${question.id}-verdict`}
                checked={isSelected}
                disabled={disabled}
                onChange={() => setVerdict(opt.v)}
                className="sr-only"
              />
              {opt.icon}
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]">
          评审理由
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={disabled}
          aria-label="评审理由"
          rows={3}
          placeholder="例如：AI 漏掉了 session 守门，会让未登录用户看到受保护 UI。"
          className="w-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 text-sm leading-relaxed text-[var(--fg-primary)] shadow-inner transition-colors focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 disabled:opacity-60"
        />
      </div>
    </div>
  );
}
