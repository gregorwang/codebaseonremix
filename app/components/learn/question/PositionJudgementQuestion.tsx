import type { QuestionComponentProps } from "./types";
import { QuestionCode } from "./QuestionCode";

const LETTERS = "ABCDEFGHIJ";

export function PositionJudgementQuestion({
  question,
  value,
  onChange,
  disabled,
}: QuestionComponentProps) {
  const selected =
    value?.type === "position_judgement" ? value.positionId : undefined;

  return (
    <div>
      <p className="text-base leading-relaxed text-[var(--fg-primary)]">
        {question.prompt}
      </p>
      <QuestionCode
        code={question.code}
        filePath={
          question.sourceFilePath
            ? `remix/${question.sourceFilePath}`
            : undefined
        }
      />
      <p className="mt-3 text-xs text-[var(--fg-soft)]">
        选择代码最应该落在的位置：
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {question.options?.map((option, index) => {
          const isSelected = selected === option.id;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer flex-col rounded-xl border bg-[var(--surface-raised)] px-4 py-4 transition-all ${
                isSelected
                  ? "border-violet-400 bg-violet-50/70 ring-1 ring-violet-400/40 dark:border-violet-500/60 dark:bg-violet-500/10"
                  : "border-[var(--border-subtle)] hover:border-[var(--border-soft-brand)] hover:bg-[var(--surface-sunken)]"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isSelected
                      ? "bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow"
                      : "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
                  }`}
                >
                  {LETTERS[index] ?? index + 1}
                </span>
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={option.id}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() =>
                    onChange({
                      type: "position_judgement",
                      positionId: option.id,
                    })
                  }
                  className="sr-only"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-[var(--fg-primary)]">
                    {option.text}
                  </span>
                  {option.locationHint && (
                    <p className="mt-1 font-mono text-xs text-[var(--fg-soft)]">
                      {option.locationHint}
                    </p>
                  )}
                  {option.explanation && (
                    <p className="mt-1 text-xs text-[var(--fg-soft)]">
                      {option.explanation}
                    </p>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
