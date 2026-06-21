import type { QuestionComponentProps } from "./types";
import { CodeBlock } from "~/components/learn/code/CodeBlock";
import type { LinePickLine } from "~/lib/learn/types";

/**
 * line_pick: the user picks the single line that best answers the prompt.
 * We render the snippet (or the explicit linePickLines if no snippet) and
 * each candidate line is a clickable row below.
 */
export function LinePickQuestion({
  question,
  value,
  onChange,
  disabled,
}: QuestionComponentProps) {
  const selectedLineId = value?.type === "line_pick" ? value.lineId : undefined;
  const lines: LinePickLine[] = question.linePickLines ?? [];
  const filePath = question.sourceFilePath
    ? `remix/${question.sourceFilePath}`
    : undefined;

  return (
    <div>
      <p className="text-base leading-relaxed text-[var(--fg-primary)]">
        {question.prompt}
      </p>
      {question.code && (
        <div className="mt-4">
          <CodeBlock
            code={question.code}
            filePath={filePath}
            highlightLines={lines.map((l) => l.lineNumber)}
            collapsible={false}
          />
        </div>
      )}
      {lines.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-[var(--fg-muted)]">
            点击定位关键行（单选）：
          </p>
          {lines.map((line) => {
            const isSelected = selectedLineId === line.id;
            return (
              <button
                key={line.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ type: "line_pick", lineId: line.id })}
                className={`w-full rounded-xl border bg-[var(--surface-raised)] px-4 py-3 text-left transition-all ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-50/70 ring-1 ring-cyan-400/40 dark:border-cyan-500/60 dark:bg-cyan-500/10"
                    : "border-[var(--border-subtle)] hover:border-cyan-300 hover:bg-[var(--surface-sunken)]"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className={`inline-flex h-6 min-w-[3rem] shrink-0 items-center justify-center rounded-md px-2 font-mono text-xs ${
                      isSelected
                        ? "bg-cyan-500 text-white"
                        : "bg-[var(--surface-sunken)] text-[var(--fg-soft)]"
                    }`}
                  >
                    L{line.lineNumber}
                  </span>
                  <code className="font-mono text-sm text-[var(--fg-primary)]">
                    {line.text}
                  </code>
                </div>
                {line.explanation && (
                  <p className="mt-1.5 pl-[3.75rem] text-xs text-[var(--fg-soft)]">
                    {line.explanation}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
