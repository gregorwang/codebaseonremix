import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { inferCodeLanguage } from "~/lib/learn/inferCodeLanguage";
import { getLearnTheme, subscribeLearnTheme } from "~/lib/learn/theme.client";
import type {
  CodeAnnotationLevel,
  CodeBlockNote,
  CodeLineNote,
} from "~/lib/learn/codeExplainTypes";

/**
 * 单栏「源码精读讲义」视图。
 *
 * 设计目标 (相对 v4 右栏卡片版的反思):
 *  - v4 右栏卡片 + 行号绝对定位本质上是个翻译版的 figma, 看起来像审稿 IDE 不像讲义,
 *    碰到一行只有 1 条批注 + 中间大片空白时, 右栏会出现大片空白带, 反而割裂阅读。
 *  - 这一版回归"老师在源码上加批注"的物理隐喻: 代码、行注释、段讲解全在同一个垂直流里,
 *    页面整体滚动, 不再有独立的二级滚动条, 也不再用绝对定位玩对齐。
 *
 * 渲染顺序 (按行号 1..N 顺序遍历):
 *   1. 这一行代码 (行号 + shiki 高亮 + 落入 blockNote 范围时的浅色背景)
 *   2. 这一行的 lineNote (若有, 渲染为 // 风格的浅色小注释)
 *   3. 凡 endLine === 当前行的 blockNote, 全部依次插入到代码流
 *
 * level 配色与 v4 共享同一组 CSS 变量, 保持视觉语言统一。
 */

export type InlineCodeExplainViewProps = {
  filePath: string;
  /** 不传则按 filePath + 代码内容自动推断。 */
  language?: string;
  code: string;
  /** 一行一条短注释 (≤ 30 字), 同一行多条时取首条。 */
  lineNotes: CodeLineNote[];
  /** 多层级讲解块, 插入到 endLine 后。 */
  blockNotes: CodeBlockNote[];
};

/** 行高 (px), 行号与代码内容共用一套刻度。 */
const LINE_HEIGHT = 24;
/** 行号列宽度。 */
const GUTTER_WIDTH = 56;

/** 4 个 level 的视觉配置, 跟 v4 CodeExplainView 共用同一组颜色变量。 */
const LEVEL_STYLES: Record<
  CodeAnnotationLevel,
  {
    label: string;
    /** 讲解块整体外观 (左 accent + 浅底)。 */
    blockClass: string;
    /** "重点解释 / 风险提示" 标题字色。 */
    headingClass: string;
    /** 代码行落入这个 level 区间时的软高亮底色。 */
    rangeSoft: string;
    /** 小标签 (顶部 badge) 配色。 */
    badgeClass: string;
  }
> = {
  basic: {
    label: "说明",
    blockClass:
      "border-l-4 border-l-[var(--info-fg)] bg-[var(--info-soft)]/30",
    headingClass: "text-[var(--info-fg)]",
    rangeSoft: "bg-[var(--info-soft)]/25",
    badgeClass:
      "bg-[var(--info-soft)] text-[var(--info-fg)] border border-[var(--info-border)]",
  },
  important: {
    label: "重点解释",
    blockClass:
      "border-l-4 border-l-[var(--brand-fg)] bg-[var(--brand-soft)]/35",
    headingClass: "text-[var(--brand-fg-strong)]",
    rangeSoft: "bg-[var(--brand-soft)]/30",
    badgeClass:
      "bg-[var(--brand-soft)] text-[var(--brand-fg)] border border-[var(--brand-fg)]/30",
  },
  risk: {
    label: "风险提示",
    blockClass:
      "border-l-4 border-l-[var(--danger-fg)] bg-[var(--danger-soft)]/35",
    headingClass: "text-[var(--danger-fg)]",
    rangeSoft: "bg-[var(--danger-soft)]/30",
    badgeClass:
      "bg-[var(--danger-soft)] text-[var(--danger-fg)] border border-[var(--danger-border)]",
  },
  suggestion: {
    label: "修改建议",
    blockClass:
      "border-l-4 border-l-[var(--success-fg)] bg-[var(--success-soft)]/35",
    headingClass: "text-[var(--success-fg)]",
    rangeSoft: "bg-[var(--success-soft)]/30",
    badgeClass:
      "bg-[var(--success-soft)] text-[var(--success-fg)] border border-[var(--success-border)]",
  },
};

/** level 优先级: risk > important > suggestion > basic, 同一行被多 block 覆盖时取最重的。 */
const LEVEL_PRIORITY: Record<CodeAnnotationLevel, number> = {
  risk: 3,
  important: 2,
  suggestion: 1,
  basic: 0,
};

/** L13-L23 / L13 这种行号区间显示。 */
function rangeLabel(b: { startLine: number; endLine: number }): string {
  if (b.startLine === b.endLine) return `L${b.startLine}`;
  return `L${b.startLine}-L${b.endLine}`;
}

export function InlineCodeExplainView({
  filePath,
  language,
  code,
  lineNotes,
  blockNotes,
}: InlineCodeExplainViewProps) {
  const lang = useMemo(
    () => language ?? inferCodeLanguage(filePath, code),
    [language, filePath, code],
  );
  const lines = useMemo(() => code.split("\n"), [code]);
  const totalLines = lines.length;

  // line -> 这一行的注释 (同一行多条时取首条, AI prompt 也只允许一条)。
  const lineToNote = useMemo(() => {
    const map = new Map<number, string>();
    for (const n of lineNotes) {
      if (!n.text?.trim()) continue;
      if (map.has(n.line)) continue;
      map.set(n.line, n.text.trim());
    }
    return map;
  }, [lineNotes]);

  // line -> 这一行所在 blockNote 的最高 level (用于软高亮代码行背景)。
  const lineToLevel = useMemo(() => {
    const map = new Map<number, CodeAnnotationLevel>();
    for (const b of blockNotes) {
      const start = Math.max(1, b.startLine);
      const end = Math.min(totalLines, Math.max(b.startLine, b.endLine));
      for (let n = start; n <= end; n++) {
        const prev = map.get(n);
        if (!prev || LEVEL_PRIORITY[b.level] > LEVEL_PRIORITY[prev]) {
          map.set(n, b.level);
        }
      }
    }
    return map;
  }, [blockNotes, totalLines]);

  // line -> 在这一行后展示的 blockNote 列表 (按 startLine 升序, 再按 id 稳定排序)。
  const endLineToBlocks = useMemo(() => {
    const map = new Map<number, CodeBlockNote[]>();
    const sorted = [...blockNotes].sort((a, b) => {
      if (a.startLine !== b.startLine) return a.startLine - b.startLine;
      return a.id.localeCompare(b.id);
    });
    for (const b of sorted) {
      const at = Math.min(totalLines, Math.max(b.startLine, b.endLine));
      const arr = map.get(at) ?? [];
      arr.push(b);
      map.set(at, arr);
    }
    return map;
  }, [blockNotes, totalLines]);

  // shiki 行级 HTML; 首次拉 shiki 前先 fallback 到纯文本, 不阻塞首屏布局。
  const isDark = useSyncExternalStore(
    subscribeLearnTheme,
    getLearnTheme,
    () => false,
  );
  const [lineHtml, setLineHtml] = useState<string[] | null>(null);
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

  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="learn-code-panel overflow-hidden rounded-[var(--radius-card)] border border-[var(--code-border)]"
      style={{ background: "var(--surface-raised)" }}
    >
      {/* 顶栏: 文件路径 + 语言 / 注释数 / 复制 */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--code-border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs">
        <span className="truncate font-mono text-[var(--fg-muted)]">
          {filePath}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-soft)]">
            {lang}
          </span>
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[10px] text-[var(--fg-soft)]">
            {lineNotes.length} 行旁批 · {blockNotes.length} 段讲解
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

      {/* 主体: 单栏垂直流, 不再有独立纵向滚动条, 页面整体滚动即可。 */}
      <div className="overflow-x-auto bg-[var(--code-bg)] py-2 font-mono text-sm text-[var(--code-fg)]">
        {lines.map((raw, idx) => {
          const lineNumber = idx + 1;
          const level = lineToLevel.get(lineNumber);
          const bgClass = level ? LEVEL_STYLES[level].rangeSoft : "";
          const html = lineHtml?.[idx];
          const note = lineToNote.get(lineNumber);
          const blocks = endLineToBlocks.get(lineNumber);

          return (
            <div key={lineNumber}>
              {/* 代码行 */}
              <div
                className={`flex ${bgClass}`}
                style={{
                  minHeight: `${LINE_HEIGHT}px`,
                  lineHeight: `${LINE_HEIGHT}px`,
                }}
              >
                <div
                  className="shrink-0 select-none border-r border-[var(--code-border)] px-3 text-right font-mono text-xs text-[var(--code-gutter-fg)]"
                  style={{
                    width: `${GUTTER_WIDTH}px`,
                    lineHeight: `${LINE_HEIGHT}px`,
                  }}
                >
                  {lineNumber}
                </div>
                <div
                  className="min-w-0 flex-1 whitespace-pre pl-3 pr-4 font-mono text-sm"
                  style={{ lineHeight: `${LINE_HEIGHT}px` }}
                >
                  {html ? (
                    <span
                      className="learn-shiki"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  ) : (
                    <span>{raw || " "}</span>
                  )}
                </div>
              </div>

              {/* 行内旁批 (// 风格, 浅色, 小字号)
                  视觉绑定: 行号列显示 └─ 连接符, 浅色背景跟纯代码区分开, 让用户一眼看出
                  "这条是上一行代码的旁批", 不会跟代码本身混淆。`//` 前缀**不加** select-none
                  以便复制粘贴时能带走它。长 note 自动 wrap, 不再 truncate。 */}
              {note && (
                <div className="flex bg-[var(--surface-sunken)]/55">
                  <div
                    className="shrink-0 select-none border-r border-[var(--code-border)] px-3 text-right font-mono text-[10px] leading-[1] text-[var(--fg-soft)]/70"
                    style={{ width: `${GUTTER_WIDTH}px`, paddingTop: 4 }}
                    aria-hidden
                  >
                    └─
                  </div>
                  <div
                    className="min-w-0 flex-1 break-words pl-3 pr-4 font-mono text-[12px] italic leading-[1.55] text-[var(--fg-muted)]"
                    style={{ paddingTop: 2, paddingBottom: 4 }}
                    title={note}
                  >
                    <span className="mr-1 opacity-60">//</span>
                    {note}
                  </div>
                </div>
              )}

              {/* 落在本行结尾的讲解块 */}
              {blocks?.map((b) => (
                <BlockNoteCard key={b.id} note={b} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// BlockNoteCard: 嵌入代码流的多层级讲解块
// ============================================================================

function BlockNoteCard({ note }: { note: CodeBlockNote }) {
  const styles = LEVEL_STYLES[note.level];
  return (
    <div
      // 缩进到行号列右侧, 视觉上像在代码上批注 (而不是单独一段卡片)。
      // 父容器是 font-mono (代码区), 这里明确切回 sans 让讲解文本不再像代码。
      className={`my-2 ml-[68px] mr-3 rounded-r-md font-sans ${styles.blockClass} px-3 py-2.5`}
    >
      {/* 标题行: badge + 行号区间 + 加粗标题, 用底部细线跟下方正文分开,
          让用户一眼区分"这是一段讲解块"而不是"飘进代码流里的几个 <p>" */}
      <div
        className="flex flex-wrap items-center gap-2 border-b border-current/15 pb-1.5"
      >
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${styles.badgeClass}`}
        >
          {styles.label}
        </span>
        <span className="shrink-0 rounded bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-soft)]">
          {rangeLabel(note)}
        </span>
        <span className={`text-[14px] font-semibold ${styles.headingClass}`}>
          {note.title}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-primary)]">
        {note.summary}
      </p>
      {note.why && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
          <span className="mr-1 font-semibold text-[var(--fg-primary)]">
            为什么:
          </span>
          {note.why}
        </p>
      )}
      {note.risk && (
        <div className="mt-2 rounded-sm border-l-2 border-[var(--danger-fg)]/60 bg-[var(--danger-soft)]/40 px-2 py-1 text-[12px] leading-relaxed text-[var(--fg-primary)]">
          <span className="mr-1 font-semibold text-[var(--danger-fg)]">
            AI 易改坏:
          </span>
          {note.risk}
        </div>
      )}
      {note.suggestion && (
        <div className="mt-2 rounded-sm border-l-2 border-[var(--success-fg)]/60 bg-[var(--success-soft)]/40 px-2 py-1 text-[12px] leading-relaxed text-[var(--fg-primary)]">
          <span className="mr-1 font-semibold text-[var(--success-fg)]">
            修改建议:
          </span>
          {note.suggestion}
        </div>
      )}
    </div>
  );
}
