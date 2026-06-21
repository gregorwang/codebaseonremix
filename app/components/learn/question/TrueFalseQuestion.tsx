import type { QuestionComponentProps } from "./types";
import { QuestionCode } from "./QuestionCode";

/**
 * True / false judgement. Uses Question.prompt for the statement and
 * Question.correctAnswer = { value: boolean }. Two large radio buttons.
 */
export function TrueFalseQuestion({
  question,
  value,
  onChange,
  disabled,
}: QuestionComponentProps) {
  const selected = value?.type === "true_false" ? value.value : undefined;

  const opts = [
    {
      value: true,
      label: "正确",
      activeClass:
        "border-emerald-400 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400/40 dark:border-emerald-500/60 dark:bg-emerald-500/15 dark:text-emerald-200",
      icon: (
        <svg
          className="h-5 w-5"
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
    },
    {
      value: false,
      label: "错误",
      activeClass:
        "border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-400/40 dark:border-rose-500/60 dark:bg-rose-500/15 dark:text-rose-200",
      icon: (
        <svg
          className="h-5 w-5"
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
    },
  ];

  return (
    <div>
      <p className="text-base leading-relaxed text-[var(--fg-primary)]">
        {question.prompt}
      </p>
      <QuestionCode code={question.code} />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {opts.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <label
              key={opt.label}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border bg-[var(--surface-raised)] px-4 py-4 text-base font-semibold transition-all ${
                isSelected
                  ? opt.activeClass
                  : "border-[var(--border-subtle)] text-[var(--fg-muted)] hover:border-[var(--border-soft-brand)] hover:bg-[var(--surface-sunken)]"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={isSelected}
                disabled={disabled}
                onChange={() =>
                  onChange({ type: "true_false", value: opt.value })
                }
                className="sr-only"
              />
              {opt.icon}
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
