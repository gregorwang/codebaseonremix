import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { CodeBlock } from "~/components/learn/code/CodeBlock";
import { locateSnippetLines } from "~/lib/learn/locateSnippet";

type SourceData =
  | {
      ok: true;
      path: string;
      code: string;
      language: string | null;
      lineCount: number | null;
    }
  | { ok: false; error: string };

const ANCHOR_PREFIX = "src-line";

type SourceViewerPanelProps = {
  /** 题目/课程引用的源码文件路径(remix 相对路径); null 表示无源码可看。 */
  path: string | null;
  /** 当前题目的代码片段, 用于在全文里高亮定位。 */
  highlightSnippet?: string;
  /** 移动端抽屉模式: 顶部显示关闭按钮。 */
  asDrawer?: boolean;
  onClose?: () => void;
};

export function SourceViewerPanel({
  path,
  highlightSnippet,
  asDrawer = false,
  onClose,
}: SourceViewerPanelProps) {
  const fetcher = useFetcher<SourceData>();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // 已打开的文件 tab 列表(去重, 保序)。
  const [tabs, setTabs] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  // path prop 变化时: 加入 tab 列表并设为选中。
  useEffect(() => {
    if (!path) return;
    setTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setSelected(path);
  }, [path]);

  // 选中文件变化时拉取内容。
  useEffect(() => {
    if (!selected) return;
    fetcher.load(`/learn/source?path=${encodeURIComponent(selected)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const loaded = fetcher.data;
  const isLoading = fetcher.state !== "idle";
  // 只有当前题目对应的文件(selected === path)才用片段高亮。
  const highlightLines =
    loaded?.ok && selected === path && highlightSnippet
      ? locateSnippetLines(loaded.code, highlightSnippet)
      : [];

  // 内容加载完成后, 把首个高亮行滚动到可视区中央(在面板自己的滚动容器内)。
  useEffect(() => {
    if (!loaded?.ok || highlightLines.length === 0) return;
    const first = highlightLines[0]!;
    const el = scrollRef.current?.querySelector<HTMLElement>(
      `#${ANCHOR_PREFIX}-${first}`,
    );
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, highlightLines.join(",")]);

  const header = (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border-subtle)] px-2 py-1.5">
      <span className="shrink-0 px-1 text-xs font-medium text-[var(--fg-soft)]">
        源码
      </span>
      {tabs.map((t) => {
        const name = t.split("/").pop() ?? t;
        const active = t === selected;
        return (
          <button
            key={t}
            type="button"
            onClick={() => setSelected(t)}
            title={`remix/${t}`}
            className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] transition-colors ${
              active
                ? "bg-[var(--brand-soft)] text-[var(--brand-fg)]"
                : "text-[var(--fg-muted)] hover:bg-[var(--surface-sunken)]"
            }`}
          >
            {name}
          </button>
        );
      })}
      {asDrawer && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-auto shrink-0 rounded-md px-2 py-0.5 text-xs text-[var(--fg-muted)] hover:bg-[var(--surface-sunken)]"
          aria-label="关闭源码面板"
        >
          关闭 ✕
        </button>
      )}
    </div>
  );

  let body: React.ReactNode;
  if (!selected) {
    body = (
      <p className="px-3 py-6 text-sm text-[var(--fg-muted)]">
        本题暂无关联源码文件。
      </p>
    );
  } else if (isLoading && !loaded) {
    body = (
      <p className="px-3 py-6 text-sm text-[var(--fg-muted)]">加载源码中…</p>
    );
  } else if (loaded?.ok) {
    body = (
      <CodeBlock
        code={loaded.code}
        language={loaded.language ?? undefined}
        filePath={`remix/${loaded.path}`}
        highlightLines={highlightLines}
        lineAnchorPrefix={ANCHOR_PREFIX}
        collapsible={false}
        className="border-0"
      />
    );
  } else {
    body = (
      <p className="px-3 py-6 text-sm text-[var(--fg-muted)]">
        {loaded?.error ?? "该文件未收录源码"}
      </p>
    );
  }

  return (
    <div className="studio-card flex h-full min-h-0 flex-col overflow-hidden p-0">
      {header}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {body}
      </div>
    </div>
  );
}
