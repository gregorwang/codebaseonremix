import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { CodeAnnotation } from "~/lib/learn/types";
import { inferCodeLanguage } from "~/lib/learn/inferCodeLanguage";
import { getLearnTheme, subscribeLearnTheme } from "~/lib/learn/theme.client";
import { AiMarkdown } from "~/components/learn/ui/AiMarkdown";

export type AnnotatedCodeProps = {
  code: string;
  language?: string;
  filePath?: string;
  /** 题目片段对应的行(高亮背景)。 */
  highlightLines?: number[];
  /** 行锚定讲解, 按 placement 分流渲染(inline 行尾 / block 下方 / highlight 高亮行)。 */
  annotations?: CodeAnnotation[];
  /** 是否显示讲解注释(关掉=纯代码)。 */
  showAnnotations?: boolean;
  /** 行号 div 的 id 前缀, 供外部 scrollIntoView 定位。 */
  lineAnchorPrefix?: string;
};

/** 取注释 placement, 缺省视为 block。 */
function placementOf(a: CodeAnnotation): "inline" | "block" | "highlight" {
  return a.placement ?? "block";
}

/** 注释稳定 key(供 highlight 展开/收起)。 */
function annoKey(a: CodeAnnotation, idx: number): string {
  return `${a.startLine}-${a.endLine}-${idx}`;
}

/** 把 markdown 大致压成单行纯文本, 供 inline 注释 truncate 显示。 */
function toPlainOneLine(md: string): string {
  return md
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const infoIcon = (
  <svg
    className="h-3.5 w-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-5M12 8h.01" />
  </svg>
);

export function AnnotatedCode({
  code,
  language,
  filePath,
  highlightLines = [],
  annotations = [],
  showAnnotations = true,
  lineAnchorPrefix = "ac-line",
}: AnnotatedCodeProps) {
  const isDark = useSyncExternalStore(
    subscribeLearnTheme,
    getLearnTheme,
    () => false,
  );
  const lang = language ?? inferCodeLanguage(filePath, code);
  const lines = useMemo(() => code.split("\n"), [code]);
  const [lineHtml, setLineHtml] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  // 已展开的 highlight 注释(点行尾 ⓘ 切换)。
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const highlightSet = useMemo(() => new Set(highlightLines), [highlightLines]);

  // 给每条注释一个稳定 key, 并按 placement 分桶。
  const keyed = useMemo(
    () => annotations.map((a, idx) => ({ a, key: annoKey(a, idx) })),
    [annotations],
  );

  // endLine -> 行尾内联注释。
  const inlineByEndLine = useMemo(() => {
    const map = new Map<number, Array<{ a: CodeAnnotation; key: string }>>();
    for (const item of keyed) {
      if (placementOf(item.a) !== "inline") continue;
      const arr = map.get(item.a.endLine) ?? [];
      arr.push(item);
      map.set(item.a.endLine, arr);
    }
    return map;
  }, [keyed]);

  // endLine -> 下方块注释(block 始终 + 已展开的 highlight)。
  const blockByEndLine = useMemo(() => {
    const map = new Map<number, Array<{ a: CodeAnnotation; key: string }>>();
    for (const item of keyed) {
      const p = placementOf(item.a);
      const isExpandedHighlight = p === "highlight" && expanded.has(item.key);
      if (p !== "block" && !isExpandedHighlight) continue;
      const arr = map.get(item.a.endLine) ?? [];
      arr.push(item);
      map.set(item.a.endLine, arr);
    }
    return map;
  }, [keyed, expanded]);

  // endLine -> highlight 注释(行尾放 ⓘ 切换)。
  const highlightTogglesByEndLine = useMemo(() => {
    const map = new Map<number, Array<{ a: CodeAnnotation; key: string }>>();
    for (const item of keyed) {
      if (placementOf(item.a) !== "highlight") continue;
      const arr = map.get(item.a.endLine) ?? [];
      arr.push(item);
      map.set(item.a.endLine, arr);
    }
    return map;
  }, [keyed]);

  // 行级底色提示: block/inline 覆盖的行 vs highlight 覆盖的行(不同色)。
  const { softLineSet, highlightAnnoLineSet } = useMemo(() => {
    const soft = new Set<number>();
    const hl = new Set<number>();
    for (const { a } of keyed) {
      const target = placementOf(a) === "highlight" ? hl : soft;
      for (let n = a.startLine; n <= a.endLine; n++) target.add(n);
    }
    return { softLineSet: soft, highlightAnnoLineSet: hl };
  }, [keyed]);

  useEffect(() => {
    let cancelled = false;
    import("./shikiHighlight.client")
      .then((mod) => mod.highlightToLines(code, lang, isDark))
      .then((arr) => {
        if (!cancelled) setLineHtml(arr);
      })
      .catch(() => {
        if (!cancelled) setLineHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, lang, isDark]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code); // 只复制纯代码, 不含注释
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const rows: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const highlighted = highlightSet.has(lineNumber);
    const annoHighlight = showAnnotations && highlightAnnoLineSet.has(lineNumber);
    const annoSoft =
      showAnnotations && !annoHighlight && softLineSet.has(lineNumber);
    const html = lineHtml?.[i];

    const inlineNotes = showAnnotations ? inlineByEndLine.get(lineNumber) : undefined;
    const toggleNotes = showAnnotations
      ? highlightTogglesByEndLine.get(lineNumber)
      : undefined;

    // 代码内容区底色(只染内容区, 不染行号列, 避免整行大片留白被染成色块)。
    const codeBg = highlighted
      ? "bg-[var(--brand-soft-strong)]"
      : annoHighlight
        ? "bg-[var(--warning-soft)]"
        : annoSoft
          ? "bg-[var(--brand-soft)]/40"
          : "";

    rows.push(
      <div key={`line-${lineNumber}`} className="flex">
        <div
          id={`${lineAnchorPrefix}-${lineNumber}`}
          className={`shrink-0 select-none border-r border-[var(--code-border)] px-2 text-right font-mono text-xs leading-6 ${
            highlighted
              ? "text-[var(--brand-fg-strong)] font-semibold"
              : annoHighlight
                ? "text-[var(--warning-fg)] font-semibold"
                : "text-[var(--code-gutter-fg)]"
          }`}
          style={{ minWidth: "3rem" }}
        >
          {lineNumber}
        </div>
        <div className={`flex min-w-0 flex-1 items-center ${codeBg}`}>
          <div className="min-w-0 flex-1 overflow-x-auto whitespace-pre px-3 font-mono text-sm leading-6 text-[var(--code-fg)]">
            {html ? (
              <span
                className="learn-shiki"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <span>{lines[i] || " "}</span>
            )}
          </div>
          {/* 行尾 highlight ⓘ 切换 */}
          {toggleNotes?.map(({ key }) => (
            <button
              key={`tg-${key}`}
              type="button"
              onClick={() => toggleExpand(key)}
              className={`mr-1.5 inline-flex shrink-0 items-center rounded-md border px-1 py-0.5 transition-colors ${
                expanded.has(key)
                  ? "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-fg)]"
                  : "border-transparent text-[var(--warning-fg)]/70 hover:bg-[var(--warning-soft)]"
              }`}
              aria-label={expanded.has(key) ? "收起讲解" : "展开讲解"}
            >
              {infoIcon}
            </button>
          ))}
          {/* 行尾内联短点评 */}
          {inlineNotes?.map(({ a, key }) => {
            const text = toPlainOneLine(a.note);
            return (
              <span
                key={`il-${key}`}
                className="ml-3 shrink-0 truncate pr-3 font-mono text-xs italic leading-6 text-[var(--brand-fg)]/80"
                style={{ maxWidth: "45%" }}
                title={a.note}
              >
                ◂ {text}
              </span>
            );
          })}
        </div>
      </div>,
    );

    // 下方块注释(block + 展开的 highlight)
    const blockNotes = showAnnotations ? blockByEndLine.get(lineNumber) : undefined;
    if (blockNotes) {
      for (const { a, key } of blockNotes) {
        const isHl = placementOf(a) === "highlight";
        rows.push(
          <div
            key={`note-${key}`}
            className={`flex ${
              isHl ? "bg-[var(--warning-soft)]/60" : "bg-[var(--brand-soft)]/60"
            }`}
          >
            <div
              className={`flex shrink-0 select-none items-start justify-end border-r border-[var(--code-border)] px-2 pt-1.5 ${
                isHl ? "text-[var(--warning-fg)]" : "text-[var(--brand-fg)]"
              }`}
              style={{ minWidth: "3rem" }}
              aria-hidden
            >
              {infoIcon}
            </div>
            <div
              className={`learn-annotation-note min-w-0 flex-1 border-l-2 px-3 py-2 text-[13px] leading-relaxed text-[var(--fg-primary)] ${
                isHl
                  ? "border-[var(--warning-fg)]/40"
                  : "border-[var(--brand-fg)]/40"
              }`}
            >
              <AiMarkdown text={a.note} />
            </div>
          </div>,
        );
      }
    }
  }

  return (
    <div className="learn-code-panel overflow-hidden rounded-[var(--radius-card)] border border-[var(--code-border)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--code-border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs">
        <span className="truncate font-mono text-[var(--fg-muted)]">
          {filePath ?? "代码"}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-soft)]">
            {lang}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs text-[var(--fg-muted)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand-fg)]"
            aria-label={copied ? "已复制" : "复制纯代码"}
          >
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      </div>
      <div className="bg-[var(--code-bg)] py-2">{rows}</div>
    </div>
  );
}
