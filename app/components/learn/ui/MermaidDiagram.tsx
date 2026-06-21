/**
 * MermaidDiagram
 *
 * 客户端渲染 Mermaid 源码 → SVG。
 *
 * 设计要点:
 *  - mermaid 库 ~1MB, 只在浏览器环境用动态 import 拉, 不进 worker bundle, 不阻塞首屏。
 *  - 渲染失败 (源码语法错) 不能让卡片整个炸, 退化为「展开看 mermaid 源码」可读 fallback,
 *    用户至少能复制到 https://mermaid.live 自己 debug 或反馈给 AI 重新生成。
 *  - 暗色模式: 通过监听 documentElement.classList ('dark') 切换 mermaid theme, 颜色与全站一致。
 *  - 多个组件同时渲染时, mermaid.render 接收的 id 必须唯一, 这里用 useId + 计数。
 *  - 父容器宽度变化时不需要重画 (mermaid 输出 SVG 是 vector, viewBox 自适应即可)。
 */
import { useEffect, useId, useRef, useState } from "react";

type MermaidDiagramProps = {
  /** Mermaid 源码 (mindmap / flowchart / sequenceDiagram 之类), 不要带 ```mermaid 围栏。 */
  source: string;
  className?: string;
};

type RenderState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; svg: string }
  | { kind: "error"; message: string };

/** 模块级单例: 只 import 一次 mermaid, 后续渲染共用同一个实例。 */
let mermaidPromise: Promise<typeof import("mermaid")["default"]> | null = null;

async function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        // securityLevel: "strict" 会过滤 HTML 标签, 防止 AI 输出里夹 <script> 之类。
        securityLevel: "strict",
        // 默认情况下 mermaid.render 解析失败时会往 <body> 追加一张「炸弹」错误 SVG,
        // 飘在页面最下方。我们自己有 fallback 卡片 (展开看源码), 不需要它那张图,
        // 所以关掉, 避免页面底部出现孤立的 "Syntax error in text" 炸弹。
        suppressErrorRendering: true,
        theme: detectTheme(),
        fontFamily: "inherit",
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

function detectTheme(): "default" | "dark" {
  if (typeof document === "undefined") return "default";
  return document.documentElement.classList.contains("dark") ? "dark" : "default";
}

export function MermaidDiagram({ source, className }: MermaidDiagramProps) {
  const reactId = useId();
  // mermaid 要求 id 不含冒号; React 17+ 的 useId 会带 :r0:, 替换掉。
  const baseId = `mmd-${reactId.replace(/:/g, "")}`;
  const renderCountRef = useRef(0);
  const [state, setState] = useState<RenderState>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    if (!source.trim()) {
      setState({ kind: "idle" });
      return;
    }
    setState({ kind: "loading" });

    (async () => {
      try {
        const mermaid = await loadMermaid();
        if (cancelled) return;
        renderCountRef.current += 1;
        const id = `${baseId}-${renderCountRef.current}`;
        const { svg } = await mermaid.render(id, source);
        if (cancelled) return;
        setState({ kind: "ready", svg });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Mermaid 渲染失败";
        setState({ kind: "error", message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, baseId]);

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <div
        className={
          className ??
          "flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-4 py-6 text-sm text-[var(--fg-soft)]"
        }
      >
        <span className="inline-flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
          </svg>
          正在渲染思维导图…
        </span>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        className={
          className ??
          "rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger-fg)]"
        }
      >
        <p className="font-medium">思维导图渲染失败</p>
        <p className="mt-1 text-xs opacity-80">{state.message}</p>
        <details className="mt-3 cursor-pointer text-xs opacity-90">
          <summary>查看原始 mermaid 源码 (可粘贴到 mermaid.live 调试)</summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-[var(--surface-sunken)] p-3 text-[11px] leading-relaxed text-[var(--fg-muted)]">
            {source}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div
      className={
        className ??
        "overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4"
      }
      // SVG 来自 mermaid + securityLevel:strict, 已经做过 HTML 过滤。
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}
