import { useEffect, useState } from "react";
import type { QuestionComponentProps } from "./types";
import { CodeBlock } from "~/components/learn/code/CodeBlock";

/**
 * code_fix: show a broken baseline; the user edits it inside a textarea and
 * submits. We keep the editor's state local so it survives re-renders, and
 * mirror the latest value into the parent answer on every keystroke.
 */
export function CodeFixQuestion({
  question,
  value,
  onChange,
  disabled,
}: QuestionComponentProps) {
  const baseline = question.codeFixBaseline ?? question.code ?? "";
  const initial = value?.type === "code_fix" ? value.patchedCode : baseline;
  const [text, setText] = useState(initial);
  const filePath = question.sourceFilePath
    ? `remix/${question.sourceFilePath}`
    : undefined;

  // When the question changes, reset editor.
  useEffect(() => {
    setText(initial);
    // We intentionally do not depend on `initial` here — we only want to
    // reset when the question identity changes, so the user's in-progress
    // edits aren't blown away by their own onChange triggering a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  function handle(next: string) {
    setText(next);
    onChange({ type: "code_fix", patchedCode: next });
  }

  return (
    <div>
      <p className="text-base leading-relaxed text-[var(--fg-primary)]">
        {question.prompt}
      </p>
      {question.codeFixBaseline && (
        <div className="mt-4">
          <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Baseline（有 bug）
          </p>
          <CodeBlock code={question.codeFixBaseline} filePath={filePath} />
        </div>
      )}
      {question.expectedFixScope && (
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--fg-soft)]">
          预期改动范围：
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-[var(--fg-muted)]">
            {question.expectedFixScope}
          </span>
        </p>
      )}
      <div className="mt-4">
        <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          你的修复
        </p>
        <textarea
          value={text}
          onChange={(e) => handle(e.target.value)}
          disabled={disabled}
          aria-label="你的代码修复"
          spellCheck={false}
          rows={Math.max(6, baseline.split("\n").length + 2)}
          className="w-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--code-bg)] p-3 font-mono text-sm leading-6 text-[var(--code-fg)] shadow-inner transition-colors focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 disabled:opacity-60"
        />
      </div>
    </div>
  );
}
