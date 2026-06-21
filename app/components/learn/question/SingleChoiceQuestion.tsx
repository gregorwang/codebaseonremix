import type { QuestionComponentProps } from "./types";
import { QuestionCode } from "./QuestionCode";

const LETTERS = "ABCDEFGHIJ";

export function SingleChoiceQuestion({
  question,
  value,
  onChange,
  disabled,
}: QuestionComponentProps) {
  const selected =
    value?.type === "single_choice" ? value.choiceId : undefined;

  return (
    <div>
      <p className="text-base leading-relaxed text-[var(--fg-primary)]">
        {question.prompt}
      </p>
      <QuestionCode code={question.code} />
      <div className="mt-4 space-y-2">
        {question.options?.map((option, index) => {
          const isSelected = selected === option.id;
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
                type="radio"
                name={`q-${question.id}`}
                value={option.id}
                checked={isSelected}
                disabled={disabled}
                onChange={() =>
                  onChange({ type: "single_choice", choiceId: option.id })
                }
                className="sr-only"
              />
              <span
                aria-hidden
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isSelected
                    ? "bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-white shadow"
                    : "bg-[var(--brand-soft)] text-[var(--brand-fg)] group-hover:bg-[var(--brand-soft-strong)]"
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
    </div>
  );
}
