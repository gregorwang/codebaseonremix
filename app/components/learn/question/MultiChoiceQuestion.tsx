import type { QuestionComponentProps } from "./types";
import { QuestionCode } from "./QuestionCode";

const LETTERS = "ABCDEFGHIJ";

export function MultiChoiceQuestion({
  question,
  value,
  onChange,
  disabled,
}: QuestionComponentProps) {
  const selected =
    value?.type === "multi_choice"
      ? new Set(value.choiceIds)
      : new Set<string>();

  function toggle(choiceId: string) {
    const next = new Set(selected);
    if (next.has(choiceId)) next.delete(choiceId);
    else next.add(choiceId);
    onChange({ type: "multi_choice", choiceIds: [...next] });
  }

  return (
    <div>
      <p className="text-base leading-relaxed text-[var(--fg-primary)]">
        {question.prompt}
      </p>
      <QuestionCode code={question.code} />
      <p className="mt-3 text-xs text-[var(--fg-soft)]">可多选</p>
      <div className="mt-2 space-y-2">
        {question.options?.map((option, index) => {
          const isSelected = selected.has(option.id);
          return (
            <label
              key={option.id}
              className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border bg-[var(--surface-raised)] px-4 py-3 transition-all ${
                isSelected
                  ? "border-[var(--color-brand-500)] bg-[var(--brand-soft)] ring-1 ring-[var(--color-brand-500)]/40 shadow-sm"
                  : "border-[var(--border-subtle)] hover:border-[var(--border-soft-brand)] hover:bg-[var(--surface-sunken)]"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => toggle(option.id)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                  isSelected
                    ? "bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-white shadow"
                    : "bg-[var(--brand-soft)] text-[var(--brand-fg)] group-hover:bg-[var(--brand-soft-strong)]"
                }`}
              >
                {isSelected ? (
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
                  (LETTERS[index] ?? index + 1)
                )}
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
