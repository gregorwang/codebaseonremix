import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { inferCodeLanguage } from "~/lib/learn/inferCodeLanguage";
import { getLearnTheme, subscribeLearnTheme } from "~/lib/learn/theme.client";
import type {
  CodeAnnotationLevel,
  CodeBlockNote,
  CodeExplainedLine,
} from "~/lib/learn/codeExplainTypes";

/**
 * 单栏「源码精读讲义」视图 (v6)。
 *
 * 数据流变更 (v5 → v6):
 *   v5: 前端拿 D1 的源码字符串 + AI 的 lineNotes/blockNotes, 在前端拼装。
 *       问题: AI 数行号容易飘, 即便加了行号前缀 prompt, 仍然依赖 AI 自己数。
 *   v6: AI 同步输出 lines 数组 [{line, code, note?}] + blockNotes 数组。
 *       关键: 由 AI 同一次输出里既给代码又给行号, 内部一致, 不存在锚错位的可能。
 *       前端**完全按 AI 给的 lines 渲染**, 不再依赖外部源码 (源码作为 prompt 输入,
 *       但不再作为渲染输入)。
 *
 * 渲染顺序 (按 AI 给的 lines 顺序遍历):
 *   1. 这一行代码 (行号 + shiki 高亮 + 落入 blockNote 范围时的浅色背景)
 *   2. 这一行的 note (若有, 渲染为 // 风格的浅色小注释)
 *   3. 凡 endLine === 当前 line 的 blockNote, 全部依次插入到代码流
 *
 * level 配色与 v5 一致, 保持视觉语言统一。
 */

export type InlineCodeExplainViewProps = {
  filePath: string;
  /** 不传则按 filePath + 代码内容自动推断。 */
  language?: string;
  /** AI 同步输出的"代码行 + 可选旁批"列表, 已按 line 升序。 */
  lines: CodeExplainedLine[];
  /** 多层级讲解块, 插入到 endLine 后。 */
  blockNotes: CodeBlockNote[];
};

/** 行高 (px), 行号与代码内容共用一套刻度。 */
const LINE_HEIGHT = 24;
/** 行号列宽度。 */
const GUTTER_WIDTH = 56;

/** 4 个 level 的视觉配置 (与 v5 共用同一组颜色变量)。 */
const LEVEL_STYLES: Record<
  CodeAnnotationLevel,
  {
    label: string;
    blockClass: string;
    headingClass: string;
    rangeSoft: string;
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

function rangeLabel(b: { startLine: number; endLine: number }): string {
  if (b.startLine === b.endLine) return `L${b.startLine}`;
  return `L${b.startLine}-L${b.endLine}`;
}

export function InlineCodeExplainView({
  filePath,
  language,
  lines,
  blockNotes,
}: InlineCodeExplainViewProps) {
  // 把 AI 给的 lines 数组拼成完整源码, 用来传给 shiki 一次性高亮 (保留跨行模板字符串等上下文)。
  const fullCode = useMemo(() => lines.map((l) => l.code).join("\n"), [lines]);
  const lang = useMemo(
    () => language ?? inferCodeLanguage(filePath, fullCode),
    [language, filePath, fullCode],
  );

  // 计数: 有 note 的行数 + blockNote 个数。
  const noteCount = useMemo(
    () => lines.filter((l) => l.note && l.note.trim()).length,
    [lines],
  );

  // line -> 这一行所在 blockNote 的最高 level (用于软高亮代码行背景)。
  const lineToLevel = useMemo(() => {
    const map = new Map<number, CodeAnnotationLevel>();
    for (const b of blockNotes) {
      const start = Math.max(1, b.startLine);
      const end = Math.max(b.startLine, b.endLine);
      for (let n = start; n <= end; n++) {
        const prev = map.get(n);
        if (!prev || LEVEL_PRIORITY[b.level] > LEVEL_PRIORITY[prev]) {
          map.set(n, b.level);
        }
      }
    }
    return map;
  }, [blockNotes]);

  // line -> 在这一行后展示的 blockNote 列表 (按 startLine 升序, 再按 id 稳定排序)。
  const endLineToBlocks = useMemo(() => {
    const map = new Map<number, CodeBlockNote[]>();
    const sorted = [...blockNotes].sort((a, b) => {
      if (a.startLine !== b.startLine) return a.startLine - b.startLine;
      return a.id.localeCompare(b.id);
    });
    for (const b of sorted) {
      const at = Math.max(b.startLine, b.endLine);
      const arr = map.get(at) ?? [];
      arr.push(b);
      map.set(at, arr);
    }
    return map;
  }, [blockNotes]);

  // shiki 一次性高亮 fullCode → 拆成每行 HTML; 首次拉 shiki 前先 fallback 到纯文本。
  const isDark = useSyncExternalStore(
    subscribeLearnTheme,
    getLearnTheme,
    () => false,
  );
  const [lineHtml, setLineHtml] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("./shikiHighlight.client")
      .then((mod) => mod.highlightToLines(fullCode, lang, isDark))
      .then((arr) => {
        if (!cancelled) setLineHtml(arr);
      })
      .catch(() => {
        if (!cancelled) setLineHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fullCode, lang, isDark]);

  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullCode);
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
            {noteCount} 行旁批 · {blockNotes.length} 段讲解
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
        {lines.map((entry, idx) => {
          const lineNumber = entry.line;
          const level = lineToLevel.get(lineNumber);
          const bgClass = level ? LEVEL_STYLES[level].rangeSoft : "";
          const html = lineHtml?.[idx];
          const note = entry.note?.trim();
          const blocks = endLineToBlocks.get(lineNumber);

          return (
            <div key={`${lineNumber}-${idx}`}>
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
                    <span>{entry.code || " "}</span>
                  )}
                </div>
              </div>

              {/* 行内旁批: 行号列显示 └─ 连接符, 浅色背景跟纯代码区分开, 一眼看出
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
      <div className="flex flex-wrap items-center gap-2 border-b border-current/15 pb-1.5">
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
