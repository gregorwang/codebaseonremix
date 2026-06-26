import { useRef } from "react";
import type { FillBlank } from "~/lib/learn/types";
import { parseInlineBlankTemplate } from "~/lib/learn/inlineBlank";
import { CodeBlock } from "~/components/learn/code/CodeBlock";

type InlineCodeBlankRendererProps = {
  code: string;
  blanks: FillBlank[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  disabled?: boolean;
  filePath?: string;
  feedback?: Record<string, boolean>;
  correctValues?: Record<string, string>;
};

export function InlineCodeBlankRenderer({
  code,
  blanks,
  values,
  onChange,
  disabled,
  filePath,
  feedback,
  correctValues,
}: InlineCodeBlankRendererProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const segments = parseInlineBlankTemplate(code, blanks);
  const blankIds = blanks.map((b) => b.id);

  function focusBlank(index: number) {
    const id = blankIds[index];
    if (id) inputRefs.current[id]?.focus();
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    blankIndex: number,
  ) {
    // Only intercept Enter — Tab MUST stay as native tab order so users can
    // escape the blank chain (e.g. tab on to the submit button). We previously
    // hijacked Tab here, which created a keyboard trap for assistive-tech
    // users and was flagged in the WCAG audit.
    if (e.key === "Enter" && !e.shiftKey && blankIndex < blankIds.length - 1) {
      e.preventDefault();
      focusBlank(blankIndex + 1);
    }
  }

  return (
    <div className="learn-inline-blank mt-4 overflow-hidden rounded-[var(--radius-card)] border border-[var(--code-border)] bg-[var(--code-bg)]">
      {filePath && (
        <div className="flex items-center gap-2 border-b border-[var(--code-border)] bg-[var(--surface-sunken)] px-3 py-2 font-mono text-xs text-[var(--fg-muted)]">
          <span aria-hidden className="hidden items-center gap-1 sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-rose-400/70" />
            <span className="h-2 w-2 rounded-full bg-amber-400/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          </span>
          {filePath}
        </div>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-7 text-[var(--code-fg)]">
        <code>
          {segments.map((segment, index) => {
            if (segment.type === "text") {
              return <span key={index}>{segment.value}</span>;
            }

            const blankIndex = blankIds.indexOf(segment.blankId);
            const isCorrect = feedback?.[segment.blankId];
            const hasFeedback = feedback && segment.blankId in feedback;
            const stateClass = hasFeedback
              ? isCorrect
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-rose-500 bg-rose-50 text-rose-700 studio-shake dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200"
              : "border-[var(--border-soft-brand)] bg-[var(--surface-raised)] text-[var(--fg-primary)] focus:border-[var(--color-brand-500)]";

            return (
              <span
                key={segment.blankId}
                className="inline-flex items-center px-0.5"
              >
                <input
                  ref={(el) => {
                    inputRefs.current[segment.blankId] = el;
                  }}
                  type="text"
                  value={values[segment.blankId] ?? ""}
                  disabled={disabled}
                  placeholder={segment.placeholder}
                  onChange={(e) =>
                    onChange({ ...values, [segment.blankId]: e.target.value })
                  }
                  onKeyDown={(e) => handleKeyDown(e, blankIndex)}
                  className={`mx-0.5 inline-block min-w-[6rem] rounded border px-2 py-0.5 font-mono text-sm shadow-sm transition-colors focus:outline-none ${stateClass}`}
                  style={{
                    width: `${Math.max(segment.placeholder.length + 2, 8)}ch`,
                  }}
                />
                {feedback && !isCorrect && correctValues?.[segment.blankId] && (
                  <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                    →&nbsp;{correctValues[segment.blankId]}
                  </span>
                )}
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

export function InlineCodeBlankPreview({
  code,
  filePath,
}: {
  code: string;
  filePath?: string;
}) {
  return <CodeBlock code={code} filePath={filePath} collapsible />;
}
