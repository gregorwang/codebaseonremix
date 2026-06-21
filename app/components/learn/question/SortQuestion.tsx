import type { QuestionComponentProps } from "./types";
import { QuestionCode } from "./QuestionCode";
import { SortChainBoard } from "./SortChainBoard";

export function SortQuestion({
  question,
  value,
  onChange,
  disabled,
  feedback,
}: QuestionComponentProps) {
  const itemIds =
    value?.type === "sort"
      ? value.itemIds
      : (question.sortItems?.map((item) => item.id) ?? []);

  return (
    <div>
      <p className="text-base leading-relaxed text-[var(--fg-primary)]">
        {question.prompt}
      </p>
      <QuestionCode
        code={question.code}
        filePath={
          question.sourceFilePath ? `remix/${question.sourceFilePath}` : undefined
        }
      />
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--fg-soft)]">
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6L5 10l4 4M15 6l4 4-4 4M5 10h14" />
        </svg>
        拖拽卡片或使用上下按钮调整执行顺序
      </p>
      {question.sortItems && (
        <SortChainBoard
          items={question.sortItems}
          itemIds={itemIds}
          onChange={(next) => onChange({ type: "sort", itemIds: next })}
          disabled={disabled}
          feedback={feedback?.sort}
        />
      )}
    </div>
  );
}
