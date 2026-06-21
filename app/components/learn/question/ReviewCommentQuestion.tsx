import { CodeBlock } from "~/components/learn/code/CodeBlock";
import type { QuestionComponentProps } from "./types";

/**
 * review_comment: free-form PR review. The user types a multi-line review
 * of the diff. AI grades substance in Phase 7; locally we just check that
 * they wrote *something*.
 */
export function ReviewCommentQuestion({
  question,
  value,
  onChange,
  disabled,
}: QuestionComponentProps) {
  const comment = value?.type === "review_comment" ? value.comment : "";

  return (
    <div>
      <p className="text-base leading-relaxed text-[var(--fg-primary)]">
        {question.prompt}
      </p>
      {question.diffSnippet && (
        <div className="mt-4">
          <CodeBlock
            code={question.diffSnippet}
            filePath={
              question.sourceFilePath
                ? `remix/${question.sourceFilePath}`
                : "待评审 Diff"
            }
            language="diff"
            collapsible={false}
          />
        </div>
      )}
      <div className="mt-4">
        <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-pink-600 dark:text-pink-300">
          <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
          你的 PR Review 评语
        </p>
        <textarea
          value={comment}
          onChange={(e) =>
            onChange({ type: "review_comment", comment: e.target.value })
          }
          disabled={disabled}
          rows={6}
          placeholder="指出修改的具体问题：哪一行要改、为什么改、改成什么样。"
          className="w-full rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 text-sm leading-relaxed text-[var(--fg-primary)] shadow-inner transition-colors focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/20 disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-[var(--fg-faint)]">
          提交后由 AI 给出 0–5 分反馈；空文本会被拒绝。
        </p>
      </div>
    </div>
  );
}
