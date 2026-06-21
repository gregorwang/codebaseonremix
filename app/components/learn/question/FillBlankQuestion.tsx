import { Fragment } from "react";
import type { QuestionComponentProps } from "./types";
import { InlineCodeBlankRenderer } from "./InlineCodeBlankRenderer";
import { parseInlineBlankTemplate } from "~/lib/learn/inlineBlank";

export function FillBlankQuestion({
  question,
  value,
  onChange,
  disabled,
  feedback,
}: QuestionComponentProps) {
  const values = value?.type === "fill_blank" ? value.values : {};
  const blanks = question.blanks ?? [];
  const correctValues =
    feedback && question.correctAnswer
      ? (question.correctAnswer as { values: Record<string, string> }).values
      : undefined;

  // 有 code 字段 → 走代码块内嵌输入框 (常见: "把 import xxx from ____ 补全")
  if (question.code && blanks.length > 0) {
    return (
      <div>
        <p className="text-base leading-relaxed">{question.prompt}</p>
        <InlineCodeBlankRenderer
          code={question.code}
          blanks={blanks}
          values={values}
          onChange={(next) => onChange({ type: "fill_blank", values: next })}
          disabled={disabled}
          filePath={
            question.sourceFilePath ? `remix/${question.sourceFilePath}` : undefined
          }
          feedback={feedback?.fillBlank}
          correctValues={correctValues}
        />
      </div>
    );
  }

  // 没有 code 但有 blanks → 题干本身就是模板, 把 prompt 里的 ____/{{id}} 替换成行内 input
  // (例: 第一章 Q8「构建产物打包到 ____ 目录」, 没有代码片段, 直接在中文句子里挖空)
  if (blanks.length > 0) {
    const segments = parseInlineBlankTemplate(question.prompt, blanks);
    const fillFeedback = feedback?.fillBlank;
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
        <p className="text-base leading-loose text-[var(--fg-primary)]">
          {segments.map((segment, index) => {
            if (segment.type === "text") {
              return <Fragment key={index}>{segment.value}</Fragment>;
            }
            const isCorrect = fillFeedback?.[segment.blankId];
            const hasFeedback =
              fillFeedback && segment.blankId in fillFeedback;
            const stateClass = hasFeedback
              ? isCorrect
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-rose-500 bg-rose-50 text-rose-700 studio-shake dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-200"
              : "border-[var(--border-soft-brand)] bg-[var(--surface-raised)] text-[var(--fg-primary)] focus:border-[var(--color-brand-500)]";
            return (
              <span
                key={segment.blankId}
                className="mx-1 inline-flex items-center align-middle"
              >
                <input
                  type="text"
                  value={values[segment.blankId] ?? ""}
                  disabled={disabled}
                  placeholder={segment.placeholder}
                  onChange={(e) =>
                    onChange({
                      type: "fill_blank",
                      values: { ...values, [segment.blankId]: e.target.value },
                    })
                  }
                  className={`min-w-[6rem] rounded border px-2 py-0.5 font-mono text-sm shadow-sm transition-colors focus:outline-none ${stateClass}`}
                  style={{
                    width: `${Math.max(segment.placeholder.length + 2, 10)}ch`,
                  }}
                />
                {fillFeedback &&
                  !isCorrect &&
                  correctValues?.[segment.blankId] && (
                    <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-xs text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                      →&nbsp;{correctValues[segment.blankId]}
                    </span>
                  )}
              </span>
            );
          })}
        </p>
      </div>
    );
  }

  // 没 code 也没 blanks: 异常配置, 至少把题干显示出来, 不给用户一片空白
  return <p className="text-base leading-relaxed">{question.prompt}</p>;
}
