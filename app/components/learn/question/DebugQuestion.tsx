import type { QuestionComponentProps } from "./types";
import { CodeBlock } from "~/components/learn/code/CodeBlock";

export function DebugQuestion({
  question,
  value,
  onChange,
  disabled,
}: QuestionComponentProps) {
  const selected = value?.type === "debug" ? value.issueId : undefined;
  const highlightLines: number[] = [];
  if (question.debugMeta?.suspiciousLineStart) {
    const end =
      question.debugMeta.suspiciousLineEnd ??
      question.debugMeta.suspiciousLineStart;
    for (let i = question.debugMeta.suspiciousLineStart; i <= end; i++) {
      highlightLines.push(i);
    }
  }

  return (
    <div>
      {question.debugMeta?.scenario && (
        <p className="mb-3 flex items-start gap-2 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-soft)] px-3 py-2 text-sm text-[var(--warning-fg)]">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v3M12 15h.01" />
            <path d="M10.3 3.86l-7.39 12.79A2 2 0 0 0 4.62 20h14.76a2 2 0 0 0 1.71-3.05L13.7 3.86a2 2 0 0 0-3.4 0z" />
          </svg>
          <span>
            <span className="font-semibold">审查场景：</span>
            {question.debugMeta.scenario}
          </span>
        </p>
      )}
      <p className="text-base leading-relaxed text-[var(--fg-primary)]">
        {question.prompt}
      </p>
      {question.code && (
        <CodeBlock
          code={question.code}
          filePath={
            question.sourceFilePath
              ? `remix/${question.sourceFilePath}`
              : undefined
          }
          highlightLines={highlightLines}
          collapsible
          className="mt-4"
        />
      )}
      <p className="mt-3 text-xs text-[var(--fg-soft)]">
        选择错误类型或最可疑的问题：
      </p>
      <div className="mt-2 space-y-2">
        {question.options?.map((option, index) => {
          const isSelected = selected === option.id;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-[var(--surface-raised)] px-4 py-3 transition-all ${
                isSelected
                  ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400/40 dark:border-amber-500/60 dark:bg-amber-500/10"
                  : "border-[var(--border-subtle)] hover:border-[var(--border-soft-brand)] hover:bg-[var(--surface-sunken)]"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                value={option.id}
                checked={isSelected}
                disabled={disabled}
                onChange={() =>
                  onChange({ type: "debug", issueId: option.id })
                }
                className="sr-only"
              />
              <span
                aria-hidden
                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isSelected
                    ? "bg-amber-500 text-white"
                    : "bg-[var(--accent-soft)] text-[var(--accent-fg)]"
                }`}
              >
                {index + 1}
              </span>
              <span className="flex-1 text-sm leading-relaxed text-[var(--fg-primary)]">
                {option.text}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
