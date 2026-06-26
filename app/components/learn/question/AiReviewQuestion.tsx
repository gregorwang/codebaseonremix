import type { QuestionComponentProps } from "./types";
import { CodeBlock } from "~/components/learn/code/CodeBlock";
import { AI_RISK_TYPES } from "~/lib/learn/questionLabels";

const LETTERS = "ABCDEFGHIJ";

export function AiReviewQuestion({
  question,
  value,
  onChange,
  disabled,
}: QuestionComponentProps) {
  const choiceId = value?.type === "ai_review" ? value.choiceId : undefined;
  const riskIds = value?.type === "ai_review" ? (value.riskIds ?? []) : [];
  const riskOptions =
    question.aiReviewMeta?.riskTypeOptions ??
    AI_RISK_TYPES.map((r) => ({ id: r.id, label: r.label }));

  function toggleRisk(id: string) {
    const next = riskIds.includes(id)
      ? riskIds.filter((r) => r !== id)
      : [...riskIds, id];
    onChange({ type: "ai_review", choiceId, riskIds: next });
  }

  return (
    <div>
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
          collapsible
          className="mt-4"
        />
      )}

      {question.options && question.options.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-[var(--fg-muted)]">
            这个 AI 改法是否合格？
          </p>
          {question.options.map((option, index) => {
            const isSelected = choiceId === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-[var(--surface-raised)] px-4 py-3 transition-all ${
                  isSelected
                    ? "border-fuchsia-400 bg-fuchsia-50/70 ring-1 ring-fuchsia-400/40 dark:border-fuchsia-500/60 dark:bg-fuchsia-500/10"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-soft-brand)] hover:bg-[var(--surface-sunken)]"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}-choice`}
                  value={option.id}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() =>
                    onChange({ type: "ai_review", choiceId: option.id, riskIds })
                  }
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isSelected
                      ? "bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 text-white shadow"
                      : "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-200"
                  }`}
                >
                  {LETTERS[index] ?? index + 1}
                </span>
                <span className="flex-1 text-sm leading-relaxed text-[var(--fg-primary)]">
                  {option.text}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        <p className="text-sm font-medium text-[var(--fg-muted)]">
          指出风险类型（可多选）
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {riskOptions.map((risk) => {
            const isSelected = riskIds.includes(risk.id);
            return (
              <label
                key={risk.id}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border bg-[var(--surface-raised)] px-3 py-2 text-sm transition-all ${
                  isSelected
                    ? "border-fuchsia-400 bg-fuchsia-50/70 ring-1 ring-fuchsia-400/30 dark:border-fuchsia-500/60 dark:bg-fuchsia-500/10"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-soft-brand)] hover:bg-[var(--surface-sunken)]"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => toggleRisk(risk.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                    isSelected
                      ? "bg-fuchsia-500 text-white"
                      : "border border-[var(--border-strong)] bg-[var(--surface-raised)]"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12l5 5 9-11" />
                    </svg>
                  )}
                </span>
                <span className="text-[var(--fg-primary)]">{risk.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
