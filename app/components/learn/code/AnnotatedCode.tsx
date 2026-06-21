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
  /** 行锚定讲解, 渲染在各自 endLine 之后的注释行里。 */
  annotations?: CodeAnnotation[];
  /** 是否显示讲解注释行(关掉=纯代码)。 */
  showAnnotations?: boolean;
  /** 行号 div 的 id 前缀, 供外部 scrollIntoView 定位。 */
  lineAnchorPrefix?: string;
};

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

  const highlightSet = useMemo(() => new Set(highlightLines), [highlightLines]);

  // endLine -> 该行之后要插入的注释
  const annotationsByEndLine = useMemo(() => {
    const map = new Map<number, CodeAnnotation[]>();
    for (const a of annotations) {
      const arr = map.get(a.endLine) ?? [];
      arr.push(a);
      map.set(a.endLine, arr);
    }
    return map;
  }, [annotations]);

  // 注释覆盖的行(背景轻提示)
  const annotatedLineSet = useMemo(() => {
    const s = new Set<number>();
    for (const a of annotations) {
      for (let n = a.startLine; n <= a.endLine; n++) s.add(n);
    }
    return s;
  }, [annotations]);

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

  const rows: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const highlighted = highlightSet.has(lineNumber);
    const annotatedBg = showAnnotations && annotatedLineSet.has(lineNumber);
    const html = lineHtml?.[i];

    rows.push(
      <div
        key={`line-${lineNumber}`}
        className={`flex ${
          highlighted
            ? "bg-[var(--brand-soft-strong)]"
            : annotatedBg
              ? "bg-[var(--brand-soft)]/40"
              : ""
        }`}
      >
        <div
          id={`${lineAnchorPrefix}-${lineNumber}`}
          className={`shrink-0 select-none border-r border-[var(--code-border)] px-2 text-right font-mono text-xs leading-6 ${
            highlighted
              ? "text-[var(--brand-fg-strong)] font-semibold"
              : "text-[var(--code-gutter-fg)]"
          }`}
          style={{ minWidth: "3rem" }}
        >
          {lineNumber}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto whitespace-pre px-3 font-mono text-sm leading-6 text-[var(--code-fg)]">
          {html ? (
            <span
              className="learn-shiki"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <span>{lines[i] || " "}</span>
          )}
        </div>
      </div>,
    );

    if (showAnnotations) {
      const notes = annotationsByEndLine.get(lineNumber);
      if (notes) {
        for (let k = 0; k < notes.length; k++) {
          rows.push(
            <div
              key={`note-${lineNumber}-${k}`}
              className="flex bg-[var(--brand-soft)]/60"
            >
              <div
                className="flex shrink-0 select-none items-start justify-end border-r border-[var(--code-border)] px-2 pt-1 text-[var(--brand-fg)]"
                style={{ minWidth: "3rem" }}
                aria-hidden
              >
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
              </div>
              <div className="learn-annotation-note min-w-0 flex-1 border-l-2 border-[var(--brand-fg)]/40 px-3 py-1.5 text-[13px] leading-relaxed text-[var(--fg-primary)]">
                <AiMarkdown text={notes[k]!.note} />
              </div>
            </div>,
          );
        }
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
