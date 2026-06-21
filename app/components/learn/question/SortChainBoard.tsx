import type { SortItem } from "~/lib/learn/types";
import { SORT_CATEGORY_LABELS } from "~/lib/learn/questionLabels";

type SortChainBoardProps = {
  items: SortItem[];
  itemIds: string[];
  onChange: (itemIds: string[]) => void;
  disabled?: boolean;
  feedback?: { tooEarly?: string[]; tooLate?: string[] };
};

export function SortChainBoard({
  items,
  itemIds,
  onChange,
  disabled,
  feedback,
}: SortChainBoardProps) {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const orderedItems = itemIds
    .map((id) => itemsById.get(id))
    .filter((item): item is SortItem => !!item);

  function move(index: number, direction: -1 | 1) {
    const next = [...itemIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  function handleDragStart(index: number) {
    return (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
    };
  }

  function handleDrop(targetIndex: number) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      const fromIndex = Number(e.dataTransfer.getData("text/plain"));
      if (Number.isNaN(fromIndex) || fromIndex === targetIndex) return;
      const next = [...itemIds];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return;
      next.splice(targetIndex, 0, moved);
      onChange(next);
    };
  }

  return (
    <ol className="mt-4 space-y-2.5">
      {orderedItems.map((item, index) => {
        const category = item.category ? SORT_CATEGORY_LABELS[item.category] : null;
        const tooEarly = feedback?.tooEarly?.includes(item.id);
        const tooLate = feedback?.tooLate?.includes(item.id);
        const isWrong = tooEarly || tooLate;

        return (
          <li
            key={item.id}
            draggable={!disabled}
            onDragStart={handleDragStart(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop(index)}
            className={`group rounded-xl border p-4 transition-all ${
              isWrong
                ? "border-rose-300 bg-rose-50/60 ring-1 ring-rose-300/40 dark:border-rose-500/50 dark:bg-rose-500/10"
                : "border-[var(--border-subtle)] bg-[var(--surface-raised)] hover:border-[var(--border-soft-brand)]"
            } ${!disabled ? "cursor-grab active:cursor-grabbing active:shadow-[var(--shadow-pop)]" : "cursor-default"}`}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-sm font-bold text-white shadow"
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--fg-primary)]">
                    {item.title ?? item.text}
                  </p>
                  {category && (
                    <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--fg-soft)]">
                      {category}
                    </span>
                  )}
                </div>
                {(item.description || item.title) && item.description && (
                  <p className="mt-1 text-sm text-[var(--fg-muted)]">
                    {item.description}
                  </p>
                )}
                {!item.title && (
                  <p className="mt-1 text-sm text-[var(--fg-muted)]">{item.text}</p>
                )}
                {isWrong && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-300">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 8v5M12 17h.01" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                    {tooEarly ? "这一步放早了" : "这一步放晚了"}
                  </p>
                )}
              </div>
              {!disabled && (
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="上移"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand-fg)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 14l6-6 6 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === orderedItems.length - 1}
                    aria-label="下移"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand-fg)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 10l6 6 6-6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
