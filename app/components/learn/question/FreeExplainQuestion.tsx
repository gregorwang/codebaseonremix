import type { QuestionComponentProps } from "./types";
import { QuestionCode } from "./QuestionCode";

/**
 * free_explain: the user is asked to explain the snippet / concept in their
 * own words. AI grades substance in Phase 7; locally we just check that
 * they wrote *something*.
 */
export function FreeExplainQuestion({
  question,
  value,
  onChange,
  disabled,
}: QuestionComponentProps) {
  const text = value?.type === "free_explain" ? value.text : "";

  return (
    <div>
      <p className="text-base leading-relaxed text-[var(--fg-primary)]">
        {question.prompt}
      </p>
      <QuestionCode code={question.code} />
      {question.codeFixBaseline && (
        <p className="mt-3 text-xs text-[var(--fg-soft)]">
          参考 baseline 已显示在上方；用自己的话解释这段代码为什么这样写。
        </p>
      )}
      <div className="mt-4">
        <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-300">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          你的复述
        </p>
        <textarea
          value={text}
          onChange={(e) =>
            onChange({ type: "free_explain", text: e.target.value })
          }
          disabled={disabled}
          rows={5}
          placeholder="用 2–4 句中文说明：这段代码的输入、输出、关键控制流，以及它和上下游的边界。"
          className="w-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 text-sm leading-relaxed text-[var(--fg-primary)] shadow-inner transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20 disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-[var(--fg-faint)]">
          提交后由 AI 给出 0–5 分反馈；空文本会被拒绝。
        </p>
      </div>
    </div>
  );
}
