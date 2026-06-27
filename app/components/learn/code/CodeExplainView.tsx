import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { inferCodeLanguage } from "~/lib/learn/inferCodeLanguage";
import { getLearnTheme, subscribeLearnTheme } from "~/lib/learn/theme.client";
import type {
  CodeAnnotation,
  CodeAnnotationLevel,
} from "~/lib/learn/codeExplainTypes";

/**
 * @deprecated v4 「左源码 + 右批注栏」视图。
 *
 * 已被 v5 `InlineCodeExplainView` 替换 —— 后者把所有讲解塞进同一个垂直流,
 * 不再有右侧空白栏 / 二级滚动条 / 绝对定位对齐, 阅读体验更像「源码精读讲义」。
 * 本文件暂时保留, 仅作为参考实现; AnnotatedSourceCard 已不再 import。
 *
 * 旧设计:
 *   - 左: 带行号 / 语法高亮的源码; 右: 一栏卡片化批注。
 *   - 卡片用绝对定位试图对齐 startLine, 但行少 + 卡片多时会强行下移, 反而割裂阅读。
 *   - 双向点击联动 (line ↔ card 滚动)。
 */

export type CodeExplainViewProps = {
  filePath: string;
  language?: string;
  code: string;
  annotations: CodeAnnotation[];
  /** 默认激活的批注 id (例如从搜索结果跳进来)。 */
  defaultActiveAnnotationId?: string;
  /** 整体最大高度, 控制何时出现纵向滚动条; 默认 80vh。 */
  maxHeight?: string;
};

/** 行高(px), 左侧 code row 与右侧 rail 共用同一刻度才能对齐。 */
const LINE_HEIGHT = 24;
/** 行号列宽度。 */
const GUTTER_WIDTH = 56;
/** 卡片之间至少留多少 gap。 */
const CARD_GAP = 8;

/** level → 配色 / 文案配置, 卡片和左侧 range 共用。 */
const LEVEL_STYLES: Record<
  CodeAnnotationLevel,
  {
    label: string;
    /** 卡片左侧 accent bar 颜色 / 浅底 / 边框 / 字色。 */
    cardClass: string;
    /** 左侧覆盖行的"软高亮"底色。 */
    rangeSoft: string;
    /** 选中时左侧覆盖行的"强高亮"底色。 */
    rangeStrong: string;
    /** 选中行的行号字体颜色。 */
    gutterActive: string;
    /** 卡片顶部小徽章配色。 */
    badgeClass: string;
  }
> = {
  basic: {
    label: "说明",
    cardClass:
      "border-l-[var(--info-fg)] bg-[var(--info-soft)]/30 hover:bg-[var(--info-soft)]/55",
    rangeSoft: "bg-[var(--info-soft)]/35",
    rangeStrong: "bg-[var(--info-soft)]",
    gutterActive: "text-[var(--info-fg)]",
    badgeClass:
      "bg-[var(--info-soft)] text-[var(--info-fg)] border border-[var(--info-border)]",
  },
  important: {
    label: "重点",
    cardClass:
      "border-l-[var(--brand-fg)] bg-[var(--brand-soft)]/40 hover:bg-[var(--brand-soft)]/70",
    rangeSoft: "bg-[var(--brand-soft)]/40",
    rangeStrong: "bg-[var(--brand-soft-strong)]",
    gutterActive: "text-[var(--brand-fg-strong)] font-semibold",
    badgeClass:
      "bg-[var(--brand-soft)] text-[var(--brand-fg)] border border-[var(--brand-fg)]/30",
  },
  risk: {
    label: "风险",
    cardClass:
      "border-l-[var(--danger-fg)] bg-[var(--danger-soft)]/40 hover:bg-[var(--danger-soft)]/70",
    rangeSoft: "bg-[var(--danger-soft)]/35",
    rangeStrong: "bg-[var(--danger-soft)]",
    gutterActive: "text-[var(--danger-fg)] font-semibold",
    badgeClass:
      "bg-[var(--danger-soft)] text-[var(--danger-fg)] border border-[var(--danger-border)]",
  },
  suggestion: {
    label: "建议",
    cardClass:
      "border-l-[var(--success-fg)] bg-[var(--success-soft)]/40 hover:bg-[var(--success-soft)]/70",
    rangeSoft: "bg-[var(--success-soft)]/30",
    rangeStrong: "bg-[var(--success-soft)]",
    gutterActive: "text-[var(--success-fg)] font-semibold",
    badgeClass:
      "bg-[var(--success-soft)] text-[var(--success-fg)] border border-[var(--success-border)]",
  },
};

/** 排序后给每行算: 这行覆盖了哪些 annotation id (按 startLine 升序)。 */
function buildLineToAnnotationIds(
  annotations: CodeAnnotation[],
  totalLines: number,
): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const a of annotations) {
    const start = Math.max(1, a.startLine);
    const end = Math.min(totalLines, Math.max(a.startLine, a.endLine));
    for (let n = start; n <= end; n++) {
      const arr = map.get(n) ?? [];
      arr.push(a.id);
      map.set(n, arr);
    }
  }
  return map;
}

/** 给某一行选一个「代表 annotation」: 优先点击时定位到最先开始的那条。 */
function firstAnnotationForLine(
  line: number,
  annotations: CodeAnnotation[],
): CodeAnnotation | undefined {
  for (const a of annotations) {
    if (line >= a.startLine && line <= a.endLine) return a;
  }
  return undefined;
}

/** L13-L23 / L13 这种行号区间显示。 */
function rangeLabel(a: CodeAnnotation): string {
  if (a.startLine === a.endLine) return `L${a.startLine}`;
  return `L${a.startLine}-L${a.endLine}`;
}

// ============================================================================
// CodeAnnotationRail: 右侧批注栏 (绝对定位 + 贪心避免重叠)
// ============================================================================

type CardLayout = {
  /** 实际渲染的 top (经过避撞)。 */
  top: number;
  /** 期望的 top (= (startLine - 1) * LINE_HEIGHT)。 */
  targetTop: number;
};

type CodeAnnotationRailProps = {
  annotations: CodeAnnotation[];
  activeId: string | null;
  onActivate: (id: string) => void;
  /** 卡片 dom id 前缀, 供 scrollIntoView。 */
  anchorPrefix: string;
  /** 容器最小高度: 让 rail 至少跟代码列一样高。 */
  minHeight: number;
};

function CodeAnnotationRail({
  annotations,
  activeId,
  onActivate,
  anchorPrefix,
  minHeight,
}: CodeAnnotationRailProps) {
  // 按 startLine 排序, 同 startLine 时短的在前(让短卡片更贴近行)。
  const sorted = useMemo(
    () =>
      [...annotations].sort((a, b) => {
        if (a.startLine !== b.startLine) return a.startLine - b.startLine;
        return a.endLine - b.endLine;
      }),
    [annotations],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [layouts, setLayouts] = useState<Map<string, CardLayout>>(new Map());

  /** 测量每张卡片的真实高度, 贪心算 top, 避免相邻卡片重叠。 */
  const relayout = useCallback(() => {
    const next = new Map<string, CardLayout>();
    let cursor = 0;
    for (const a of sorted) {
      const target = (a.startLine - 1) * LINE_HEIGHT;
      const top = Math.max(target, cursor);
      const el = cardRefs.current.get(a.id);
      const h = el?.offsetHeight ?? 120; // 估一个 fallback
      next.set(a.id, { top, targetTop: target });
      cursor = top + h + CARD_GAP;
    }
    setLayouts(next);
  }, [sorted]);

  useLayoutEffect(() => {
    relayout();
  }, [relayout]);

  // 卡片高度可能在 hover / active 时变化(展开), 监听窗口和容器尺寸变化重排。
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(() => relayout());
    cardRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [relayout, sorted]);

  // 容器高度 = max(minHeight, 最后一张卡片底 + padding)
  const totalHeight = useMemo(() => {
    let max = minHeight;
    for (const a of sorted) {
      const l = layouts.get(a.id);
      const el = cardRefs.current.get(a.id);
      const bottom = (l?.top ?? 0) + (el?.offsetHeight ?? 120);
      if (bottom > max) max = bottom;
    }
    return max + 16;
  }, [layouts, sorted, minHeight]);

  return (
    <div
      ref={containerRef}
      className="relative px-3 py-2"
      style={{ height: `${totalHeight}px` }}
    >
      {sorted.map((a) => {
        const isActive = a.id === activeId;
        const styles = LEVEL_STYLES[a.level];
        const layout = layouts.get(a.id);
        const top = layout?.top ?? 0;
        const offset = layout ? layout.top - layout.targetTop : 0;
        return (
          <div
            key={a.id}
            ref={(el) => {
              if (el) cardRefs.current.set(a.id, el);
              else cardRefs.current.delete(a.id);
            }}
            id={`${anchorPrefix}-${a.id}`}
            className="absolute left-0 right-0"
            style={{ top: `${top}px`, transition: "top 160ms ease" }}
          >
            <button
              type="button"
              onClick={() => onActivate(a.id)}
              className={`block w-full rounded-md border border-[var(--border-subtle)] border-l-4 px-3 py-2 text-left transition-colors ${
                styles.cardClass
              } ${
                isActive
                  ? "ring-2 ring-offset-1 ring-offset-[var(--surface-raised)] ring-[var(--brand-fg)]/40 shadow-sm"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${styles.badgeClass}`}
                >
                  {styles.label}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[var(--fg-soft)]">
                  {rangeLabel(a)}
                </span>
                {offset > 4 ? (
                  <span
                    className="ml-auto shrink-0 text-[10px] text-[var(--fg-soft)]"
                    title={`期望对齐到 L${a.startLine}, 因卡片堆叠下移 ${offset}px`}
                  >
                    ↓
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--fg-primary)]">
                {a.title}
              </div>
              <div className="mt-1 text-[13px] leading-relaxed text-[var(--fg-primary)]">
                {a.summary}
              </div>
              {(isActive || a.details) && (
                <div
                  className={`mt-2 text-[12.5px] leading-relaxed text-[var(--fg-muted)] ${
                    isActive ? "" : "line-clamp-3"
                  }`}
                >
                  {a.details}
                </div>
              )}
              {a.risk && (
                <div className="mt-2 rounded-sm border-l-2 border-[var(--danger-fg)]/60 bg-[var(--danger-soft)]/40 px-2 py-1 text-[12px] leading-relaxed text-[var(--fg-primary)]">
                  <span className="mr-1 font-semibold text-[var(--danger-fg)]">
                    风险
                  </span>
                  {a.risk}
                </div>
              )}
              {a.suggestion && (
                <div className="mt-2 rounded-sm border-l-2 border-[var(--success-fg)]/60 bg-[var(--success-soft)]/40 px-2 py-1 text-[12px] leading-relaxed text-[var(--fg-primary)]">
                  <span className="mr-1 font-semibold text-[var(--success-fg)]">
                    建议
                  </span>
                  {a.suggestion}
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// CodeExplainView: 主组件 (聚合 + 联动)
// ============================================================================

const LINE_ANCHOR = "ce-line";
const CARD_ANCHOR = "ce-card";

export function CodeExplainView({
  filePath,
  language,
  code,
  annotations,
  defaultActiveAnnotationId,
  maxHeight = "80vh",
}: CodeExplainViewProps) {
  const lang = useMemo(
    () => language ?? inferCodeLanguage(filePath, code),
    [language, filePath, code],
  );
  const lines = useMemo(() => code.split("\n"), [code]);
  const totalLines = lines.length;

  // 排序后的 annotations: 行号映射、查找均基于这个顺序。
  const sortedAnnotations = useMemo(
    () =>
      [...annotations].sort((a, b) => {
        if (a.startLine !== b.startLine) return a.startLine - b.startLine;
        return a.endLine - b.endLine;
      }),
    [annotations],
  );

  // 行号 -> annotation id 列表 (供左侧底色 + 点击查找用)。
  const lineToAnnoIds = useMemo(
    () => buildLineToAnnotationIds(sortedAnnotations, totalLines),
    [sortedAnnotations, totalLines],
  );
  // annotation id -> level (供左侧底色软高亮选色)。
  const idToLevel = useMemo(() => {
    const map = new Map<string, CodeAnnotationLevel>();
    for (const a of sortedAnnotations) map.set(a.id, a.level);
    return map;
  }, [sortedAnnotations]);

  const [activeId, setActiveId] = useState<string | null>(
    defaultActiveAnnotationId ?? sortedAnnotations[0]?.id ?? null,
  );

  // 当 annotations 变化时, 若当前 activeId 不再存在, 落到第一条。
  useEffect(() => {
    if (!activeId) return;
    if (sortedAnnotations.some((a) => a.id === activeId)) return;
    setActiveId(sortedAnnotations[0]?.id ?? null);
  }, [sortedAnnotations, activeId]);

  const active = useMemo(
    () => sortedAnnotations.find((a) => a.id === activeId) ?? null,
    [sortedAnnotations, activeId],
  );

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // 区分 active 切换是由用户操作触发, 还是初次渲染默认值; 默认值不滚动, 避免页面跳。
  const lastUserAction = useRef<"line" | "card" | null>(null);

  /** 切换 active 时把左侧 / 右侧都滚到对应位置; 仅当用户主动触发时才滚动。 */
  useEffect(() => {
    if (!active) return;
    const action = lastUserAction.current;
    lastUserAction.current = null;
    if (!action) return; // 初次渲染 / 受控更新, 不抢用户滚动焦点
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (action === "line") {
      // 点击左侧行: 行已经在视区, 只把右侧卡片滚到可见。
      const card = scroller.querySelector<HTMLElement>(
        `#${CARD_ANCHOR}-${active.id}`,
      );
      card?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else {
      // 点击右侧卡片: 把左侧行滚到容器中部, 同时让卡片自身可见。
      const lineEl = scroller.querySelector<HTMLElement>(
        `#${LINE_ANCHOR}-${active.startLine}`,
      );
      lineEl?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [active]);

  const handleLineClick = useCallback(
    (line: number) => {
      const hit = firstAnnotationForLine(line, sortedAnnotations);
      if (!hit) return;
      lastUserAction.current = "line";
      setActiveId(hit.id);
    },
    [sortedAnnotations],
  );

  const handleActivateCard = useCallback((id: string) => {
    lastUserAction.current = "card";
    setActiveId(id);
  }, []);

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

  // 代码列的最小高度 = 行数 * lineHeight, rail 至少这么高才能覆盖整段。
  const codeHeight = totalLines * LINE_HEIGHT;

  return (
    <div
      className="learn-code-panel overflow-hidden rounded-[var(--radius-card)] border border-[var(--code-border)]"
      style={{ background: "var(--surface-raised)" }}
    >
      {/* 顶栏 */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--code-border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs">
        <span className="truncate font-mono text-[var(--fg-muted)]">
          {filePath}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-soft)]">
            {lang}
          </span>
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[10px] text-[var(--fg-soft)]">
            {annotations.length} 条批注
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

      {/* 主体: 共享纵向滚动容器 (左 code / 右 rail 同步) */}
      <div
        ref={scrollerRef}
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {/* 桌面: 双栏; 移动端: 代码在上, 批注列表在下。 */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_380px]">
          {/* 左: 代码 */}
          <div
            className="min-w-0 overflow-x-auto bg-[var(--code-bg)] py-2"
            style={{ borderRight: "1px solid var(--code-border)" }}
          >
            <CodeLineViewWithLevels
              code={code}
              language={lang}
              lineToAnnoIds={lineToAnnoIds}
              idToLevel={idToLevel}
              active={active}
              anchorPrefix={LINE_ANCHOR}
              onLineClick={handleLineClick}
            />
          </div>

          {/* 右: 批注栏 */}
          {/* 桌面: 绝对定位对齐 startLine */}
          <aside className="hidden border-l border-[var(--code-border)] bg-[var(--surface-sunken)]/40 md:block">
            <CodeAnnotationRail
              annotations={sortedAnnotations}
              activeId={activeId}
              onActivate={handleActivateCard}
              anchorPrefix={CARD_ANCHOR}
              minHeight={codeHeight}
            />
          </aside>

          {/* 移动端: 顺序展开为列表(不做绝对对齐, 优先保证桌面端) */}
          <div className="block border-t border-[var(--code-border)] bg-[var(--surface-sunken)]/40 px-3 py-3 md:hidden">
            <div className="flex flex-col gap-2">
              {sortedAnnotations.map((a) => {
                const styles = LEVEL_STYLES[a.level];
                const isActive = a.id === activeId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    id={`${CARD_ANCHOR}-mobile-${a.id}`}
                    onClick={() => handleActivateCard(a.id)}
                    className={`rounded-md border border-[var(--border-subtle)] border-l-4 px-3 py-2 text-left transition-colors ${
                      styles.cardClass
                    } ${
                      isActive
                        ? "ring-2 ring-[var(--brand-fg)]/40 shadow-sm"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${styles.badgeClass}`}
                      >
                        {styles.label}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-[var(--fg-soft)]">
                        {rangeLabel(a)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[var(--fg-primary)]">
                      {a.title}
                    </div>
                    <div className="mt-1 text-[13px] leading-relaxed text-[var(--fg-primary)]">
                      {a.summary}
                    </div>
                    {a.details && (
                      <div
                        className={`mt-2 text-[12.5px] leading-relaxed text-[var(--fg-muted)] ${
                          isActive ? "" : "line-clamp-3"
                        }`}
                      >
                        {a.details}
                      </div>
                    )}
                    {a.risk && (
                      <div className="mt-2 rounded-sm border-l-2 border-[var(--danger-fg)]/60 bg-[var(--danger-soft)]/40 px-2 py-1 text-[12px] leading-relaxed text-[var(--fg-primary)]">
                        <span className="mr-1 font-semibold text-[var(--danger-fg)]">
                          风险
                        </span>
                        {a.risk}
                      </div>
                    )}
                    {a.suggestion && (
                      <div className="mt-2 rounded-sm border-l-2 border-[var(--success-fg)]/60 bg-[var(--success-soft)]/40 px-2 py-1 text-[12px] leading-relaxed text-[var(--fg-primary)]">
                        <span className="mr-1 font-semibold text-[var(--success-fg)]">
                          建议
                        </span>
                        {a.suggestion}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CodeLineViewWithLevels: 左侧源码视图(行号 + shiki 高亮 + range 染色 + 点击)
// 把 id→level 表带进来给软高亮选色; 自身独立, 没有外部 closure 依赖。
// ============================================================================

type CodeLineViewWithLevelsProps = {
  code: string;
  language: string;
  /** 行 -> 命中的 annotation id 列表(已按 startLine 排序)。 */
  lineToAnnoIds: Map<number, string[]>;
  /** annotation id -> level, 给软高亮选色。 */
  idToLevel: Map<string, CodeAnnotationLevel>;
  /** 当前选中的 annotation, 用来给覆盖行加"强高亮"。 */
  active: CodeAnnotation | null;
  /** 行号锚 id 前缀, 供 scrollIntoView。 */
  anchorPrefix: string;
  /** 行被点击时回调: 拿到 1-based 行号。 */
  onLineClick: (line: number) => void;
};

function CodeLineViewWithLevels(props: CodeLineViewWithLevelsProps) {
  // 这里把 idToLevel 用 closure 注入 CodeLineView 内部的 lineToAnnoIdLevel。
  // 直接复制一份带正确 closure 的实现, 保持 CodeLineView 自身可独立测试。
  const {
    code,
    language,
    lineToAnnoIds,
    active,
    anchorPrefix,
    onLineClick,
    idToLevel,
  } = props;
  const isDark = useSyncExternalStore(
    subscribeLearnTheme,
    getLearnTheme,
    () => false,
  );
  const lines = useMemo(() => code.split("\n"), [code]);
  const [lineHtml, setLineHtml] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("./shikiHighlight.client")
      .then((mod) => mod.highlightToLines(code, language, isDark))
      .then((arr) => {
        if (!cancelled) setLineHtml(arr);
      })
      .catch(() => {
        if (!cancelled) setLineHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, language, isDark]);

  const activeId = active?.id ?? null;
  const activeStart = active?.startLine ?? -1;
  const activeEnd = active?.endLine ?? -1;

  return (
    <div className="min-w-0 font-mono text-sm text-[var(--code-fg)]">
      {lines.map((raw, idx) => {
        const lineNumber = idx + 1;
        const hitIds = lineToAnnoIds.get(lineNumber);
        const inActiveRange =
          activeId !== null &&
          lineNumber >= activeStart &&
          lineNumber <= activeEnd;
        const softLevel: CodeAnnotationLevel | null = hitIds?.[0]
          ? idToLevel.get(hitIds[0]) ?? null
          : null;
        const styleLevel: CodeAnnotationLevel | null = inActiveRange
          ? active!.level
          : softLevel;
        const bgClass = !styleLevel
          ? ""
          : inActiveRange
            ? LEVEL_STYLES[styleLevel].rangeStrong
            : LEVEL_STYLES[styleLevel].rangeSoft;

        const html = lineHtml?.[idx];
        const clickable = !!hitIds && hitIds.length > 0;

        return (
          <div
            key={lineNumber}
            id={`${anchorPrefix}-${lineNumber}`}
            className={`group flex ${bgClass} ${
              clickable ? "cursor-pointer" : ""
            }`}
            style={{
              height: `${LINE_HEIGHT}px`,
              lineHeight: `${LINE_HEIGHT}px`,
            }}
            onClick={() => {
              if (clickable) onLineClick(lineNumber);
            }}
          >
            <div
              className={`shrink-0 select-none border-r border-[var(--code-border)] px-3 text-right font-mono text-xs ${
                inActiveRange && styleLevel
                  ? LEVEL_STYLES[styleLevel].gutterActive
                  : "text-[var(--code-gutter-fg)]"
              }`}
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
        );
      })}
    </div>
  );
}
