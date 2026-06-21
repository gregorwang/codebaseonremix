import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { inferCodeLanguage } from "~/lib/learn/inferCodeLanguage";
import { getLearnTheme, subscribeLearnTheme } from "~/lib/learn/theme.client";

export type CodeBlockProps = {
  code: string;
  language?: string;
  filePath?: string;
  highlightLines?: number[];
  collapsible?: boolean;
  maxLines?: number;
  className?: string;
  /** 给每个行号 div 加 id=`${lineAnchorPrefix}-${行号}`, 供外部 scrollIntoView 定位。 */
  lineAnchorPrefix?: string;
};

export function CodeBlock({
  code,
  language,
  filePath,
  highlightLines = [],
  collapsible = false,
  maxLines = 24,
  className = "",
  lineAnchorPrefix,
}: CodeBlockProps) {
  const isDark = useSyncExternalStore(
    subscribeLearnTheme,
    getLearnTheme,
    () => false,
  );
  const [expanded, setExpanded] = useState(!collapsible);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const lang = language ?? inferCodeLanguage(filePath, code);
  const lines = useMemo(() => code.split("\n"), [code]);
  const shouldCollapse = collapsible && lines.length > maxLines;
  const visibleLines =
    expanded || !shouldCollapse ? lines : lines.slice(0, maxLines);
  const visibleCode = visibleLines.join("\n");
  const highlightSet = useMemo(() => new Set(highlightLines), [highlightLines]);

  useEffect(() => {
    let cancelled = false;

    import("./shikiHighlight.client")
      .then((mod) => mod.highlightCode(visibleCode, lang, isDark))
      .then((html) => {
        if (!cancelled) setHighlightedHtml(html);
      })
      .catch(() => {
        if (!cancelled) setHighlightedHtml(null);
      });

    return () => {
      cancelled = true;
    };
  }, [visibleCode, lang, isDark]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className={`learn-code-panel overflow-hidden rounded-[var(--radius-card)] border ${className}`}
      style={{ borderColor: "var(--code-border)" }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--code-border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="hidden items-center gap-1 sm:inline-flex"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </span>
          <span className="truncate font-mono text-[var(--fg-muted)]">
            {filePath ?? "代码片段"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-soft)]">
            {lang}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors ${
              copied
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fg-muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-fg)]"
            }`}
            aria-label={copied ? "已复制到剪贴板" : "复制代码"}
          >
            {copied ? (
              <>
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12l5 5 9-11" />
                </svg>
                已复制
              </>
            ) : (
              <>
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                </svg>
                复制
              </>
            )}
          </button>
        </div>
      </div>

      <div className="learn-code-panel-body flex overflow-x-auto bg-[var(--code-bg)]">
        <div className="select-none border-r border-[var(--code-border)] bg-[var(--surface-sunken)] px-2 py-3 text-right font-mono text-xs leading-6 text-[var(--code-gutter-fg)]">
          {visibleLines.map((_, index) => {
            const lineNumber = index + 1;
            const highlighted = highlightSet.has(lineNumber);
            return (
              <div
                key={lineNumber}
                id={
                  lineAnchorPrefix
                    ? `${lineAnchorPrefix}-${lineNumber}`
                    : undefined
                }
                className={
                  highlighted
                    ? "rounded-l bg-[var(--brand-soft-strong)] text-[var(--brand-fg-strong)] font-semibold"
                    : ""
                }
              >
                {lineNumber}
              </div>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 py-3 pr-3">
          {highlightedHtml ? (
            <div
              className="learn-shiki text-sm leading-6 [&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-0"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <pre className="m-0 overflow-x-auto p-0 font-mono text-sm leading-6 text-[var(--code-fg)]">
              <code>{visibleCode}</code>
            </pre>
          )}
        </div>
      </div>

      {shouldCollapse && (
        <div className="border-t border-[var(--code-border)] bg-[var(--surface-sunken)] px-3 py-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-medium text-[var(--brand-fg)] hover:text-[var(--brand-fg-strong)]"
          >
            {expanded ? "收起代码" : `展开全部（${lines.length} 行）`}
          </button>
        </div>
      )}
    </div>
  );
}
