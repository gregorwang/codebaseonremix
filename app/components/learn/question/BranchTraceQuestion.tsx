import type { QuestionComponentProps } from "./types";
import { QuestionCode } from "./QuestionCode";

export function BranchTraceQuestion({
  question,
  value,
  onChange,
  disabled,
}: QuestionComponentProps) {
  const pathIds = value?.type === "branch_trace" ? value.pathIds : [];

  function select(optionId: string) {
    if (pathIds.includes(optionId)) return;
    onChange({ type: "branch_trace", pathIds: [...pathIds, optionId] });
  }

  function undo() {
    onChange({ type: "branch_trace", pathIds: pathIds.slice(0, -1) });
  }

  function reset() {
    onChange({ type: "branch_trace", pathIds: [] });
  }

  return (
    <div>
      {question.branchScenario && (
        <p className="mb-3 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2 text-sm text-orange-900 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-200">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12h7M11 8l4 4-4 4M14 4h6v6M14 20h6v-6" />
          </svg>
          <span>
            <span className="font-semibold">请求场景：</span>
            {question.branchScenario}
          </span>
        </p>
      )}
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
        按执行顺序依次点击步骤；用撤销修正，不要跳步。
      </p>
      <div
        className="mt-3 space-y-2"
        role="group"
        aria-label="按执行顺序排列的步骤选项"
      >
        {question.options?.map((option) => {
          const order = pathIds.indexOf(option.id);
          const selected = order >= 0;
          const isNext =
            !selected && pathIds.length < (question.options?.length ?? 0);

          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled || (!selected && !isNext)}
              onClick={() => select(option.id)}
              aria-pressed={selected}
              aria-label={
                selected
                  ? `第 ${order + 1} 步：${option.text}`
                  : isNext
                    ? `下一步可选：${option.text}`
                    : `已锁定：${option.text}`
              }
              className={`flex w-full items-center gap-3 rounded-xl border bg-[var(--surface-raised)] px-4 py-3 text-left transition-all ${
                selected
                  ? "border-[var(--color-brand-500)] bg-[var(--brand-soft)] ring-1 ring-[var(--color-brand-500)]/40"
                  : isNext
                    ? "border-[var(--border-subtle)] hover:border-[var(--border-soft-brand)] hover:bg-[var(--surface-sunken)]"
                    : "border-[var(--border-subtle)] opacity-50"
              } ${disabled ? "cursor-not-allowed" : "disabled:cursor-not-allowed"}`}
            >
              <span
                aria-hidden
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  selected
                    ? "bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-white shadow"
                    : "bg-[var(--surface-sunken)] text-[var(--fg-soft)]"
                }`}
              >
                {selected ? order + 1 : "·"}
              </span>
              <span className="text-sm leading-relaxed text-[var(--fg-primary)]">
                {option.text}
              </span>
            </button>
          );
        })}
      </div>
      {pathIds.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2">
          <p className="text-sm text-[var(--fg-muted)]">
            <span className="font-medium text-[var(--fg-primary)]">已选路径：</span>
            {pathIds
              .map((id) => question.options?.find((o) => o.id === id)?.text)
              .join(" → ")}
          </p>
          {!disabled && (
            <>
              <button
                type="button"
                onClick={undo}
                className="rounded-md border border-[var(--border-soft-brand)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium text-[var(--brand-fg)] hover:bg-[var(--brand-soft)]"
              >
                撤销上一步
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs text-[var(--fg-soft)] hover:bg-[var(--surface-sunken)]"
              >
                清空
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
