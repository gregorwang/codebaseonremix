/**
 * LessonAiTeachingCard
 *
 * 课级"AI 知识点讲解"卡片。挂在 TeachingPhase 顶部 + LessonPractice 顶部, 共享同一份 fetcher。
 *
 * 状态机:
 *  - 初始 (initialText 和 initialDiagramSource 都没): 显示一颗大按钮, 点一下并发触发两个 AI 调用
 *  - 任意一个有内容 (loader 预查 KV 命中, 或 fetcher 已返回): 切换到 tab 视图
 *
 * 并发模型 (重点):
 *  - 用户点"让 AI 讲解本课", 同时 fire 两个 useFetcher: ai_lesson_teaching + ai_lesson_diagram
 *  - 两个 fetcher 各自的 loading/error/data 互不影响。谁先回来谁先渲染, 切到那个 tab 就能看到。
 *  - 想换一份: 当前 tab 的"重新生成"只重跑当前 tab 的 fetcher (force=1 跳过 KV 缓存)。
 *
 * Tab 切换:
 *  - 默认进入"📖 文字讲解"tab。点"🧠 思维导图"切到 mermaid 渲染。
 *  - 切 tab 不会重新发请求, 只是显示不同的状态。
 */
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import type { AiErrorCode } from "~/lib/learn/aiErrorCode";
import { AiErrorBox } from "~/components/learn/ui/AiErrorBox";
import { AiMarkdown } from "~/components/learn/ui/AiMarkdown";
import { MermaidDiagram } from "~/components/learn/ui/MermaidDiagram";
import { usePersistedCollapsed } from "~/components/learn/ui/usePersistedCollapsed";
import {
  AiLoadingPhases,
  AI_DIAGRAM_PHASES,
  AI_LESSON_COMBO_PHASES,
  AI_LESSON_TEACHING_PHASES,
} from "~/components/learn/ui/AiLoadingPhases";

type TeachingActionData =
  | {
      ok: true;
      feature: "lesson_teaching";
      text: string;
      fromCache: boolean;
    }
  | {
      ok: false;
      error: string;
      code?: AiErrorCode;
    };

type DiagramActionData =
  | {
      ok: true;
      feature: "lesson_diagram";
      text: string;
      fromCache: boolean;
    }
  | {
      ok: false;
      error: string;
      code?: AiErrorCode;
    };

type TabKey = "teaching" | "diagram";

type Props = {
  /** loader 预查 KV cache 命中的 markdown 讲解; 没命中则 null。 */
  initialText?: string | null;
  /** loader 预查 KV cache 命中的 mermaid 思维导图源码; 没命中则 null。 */
  initialDiagramSource?: string | null;
  /** 用于持久化「已折叠」状态的 lesson slug。 */
  lessonSlug?: string;
};

const sparkle = (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
    <path d="M19 4l.7 1.6L21 6l-1.3.4L19 8l-.7-1.6L17 6l1.3-.4z" />
  </svg>
);

const bookIcon = (
  <svg
    className="h-3.5 w-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5a1.5 1.5 0 0 0 0 3H20" />
    <path d="M8 7h8M8 11h8" />
  </svg>
);

const brainIcon = (
  <svg
    className="h-3.5 w-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-1.5 5.5A3 3 0 0 0 7 18a3 3 0 0 0 5 1 3 3 0 0 0 5-1 3 3 0 0 0 2.5-4.5A3 3 0 0 0 18 8V7a3 3 0 0 0-3-3 3 3 0 0 0-3 1.5A3 3 0 0 0 9 4z" />
    <path d="M12 5.5v14" />
  </svg>
);

export function LessonAiTeachingCard({
  initialText,
  initialDiagramSource,
  lessonSlug,
}: Props) {
  const teachingFetcher = useFetcher<TeachingActionData>();
  const diagramFetcher = useFetcher<DiagramActionData>();

  const [text, setText] = useState<string | null>(initialText ?? null);
  const [textFromCache, setTextFromCache] = useState<boolean>(
    initialText ? true : false,
  );
  const [diagramSource, setDiagramSource] = useState<string | null>(
    initialDiagramSource ?? null,
  );
  const [diagramFromCache, setDiagramFromCache] = useState<boolean>(
    initialDiagramSource ? true : false,
  );
  const [activeTab, setActiveTab] = useState<TabKey>("teaching");
  const [collapsed, setCollapsed] = usePersistedCollapsed(
    `code-coach:ai-teaching-collapsed:${lessonSlug ?? "global"}`,
    false,
  );

  // teachingFetcher 完成后接住返回的 text
  useEffect(() => {
    if (teachingFetcher.state !== "idle") return;
    const d = teachingFetcher.data;
    if (d?.ok) {
      setText(d.text);
      setTextFromCache(d.fromCache);
    }
  }, [teachingFetcher.state, teachingFetcher.data]);

  // diagramFetcher 完成后接住返回的 mermaid 源码
  useEffect(() => {
    if (diagramFetcher.state !== "idle") return;
    const d = diagramFetcher.data;
    if (d?.ok) {
      setDiagramSource(d.text);
      setDiagramFromCache(d.fromCache);
    }
  }, [diagramFetcher.state, diagramFetcher.data]);

  const teachingLoading = teachingFetcher.state !== "idle";
  const diagramLoading = diagramFetcher.state !== "idle";
  const teachingError =
    teachingFetcher.data && !teachingFetcher.data.ok ? teachingFetcher.data : null;
  const diagramError =
    diagramFetcher.data && !diagramFetcher.data.ok ? diagramFetcher.data : null;

  // 整张卡的"loading"宏观态: 只要任一 fetcher 还没回, 入口按钮就 disable, 防止用户重复点。
  const anyLoading = teachingLoading || diagramLoading;
  // 当前是不是还啥内容都没拿到 — 决定渲染"大按钮入口"还是"tab 卡片"。
  const hasAnyContent = Boolean(text) || Boolean(diagramSource);

  /** 并发触发两个 AI 调用。force=true 强制跳过 KV 缓存。 */
  function generateBoth(force = false) {
    teachingFetcher.submit(
      {
        intent: "ai_lesson_teaching",
        ...(force ? { force: "1" } : {}),
      },
      { method: "post" },
    );
    diagramFetcher.submit(
      {
        intent: "ai_lesson_diagram",
        ...(force ? { force: "1" } : {}),
      },
      { method: "post" },
    );
  }

  /** 只重跑当前 tab。 */
  function regenerateActive() {
    if (activeTab === "teaching") {
      teachingFetcher.submit(
        { intent: "ai_lesson_teaching", force: "1" },
        { method: "post" },
      );
    } else {
      diagramFetcher.submit(
        { intent: "ai_lesson_diagram", force: "1" },
        { method: "post" },
      );
    }
  }

  // 入口态: 还没生成任何内容
  if (!hasAnyContent) {
    return (
      <section className="relative overflow-hidden rounded-[var(--radius-card-lg)] border border-violet-200/60 p-5 dark:border-violet-500/30">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50/60 dark:from-violet-950/40 dark:via-[var(--surface-raised)] dark:to-indigo-950/40"
        />
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-violet-400/30 to-indigo-400/20 blur-3xl"
        />
        <div className="relative flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md"
            aria-hidden
          >
            {sparkle}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-tight text-violet-900 dark:text-violet-100">
              AI 知识点讲解
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-violet-800/80 dark:text-violet-300/80">
              围绕本课锚点文件，**同时**生成「文字讲解」和「思维导图」两份内容 (并发调用,
              结果分两个 tab 展示)。生成后所有用户共享 (KV 缓存 7 天)。
            </p>
            <button
              type="button"
              onClick={() => generateBoth(false)}
              disabled={anyLoading}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
              </svg>
              {anyLoading ? "AI 生成中…" : "让 AI 讲解 + 画思维导图"}
            </button>
            {anyLoading && (
              <div className="mt-2">
                <AiLoadingPhases phases={AI_LESSON_COMBO_PHASES} />
              </div>
            )}
            {(teachingError || diagramError) && (
              <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
                {teachingError?.error ?? diagramError?.error}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  // 已生成 (至少一个 tab 有内容)
  return (
    <section className="rounded-[var(--radius-card-lg)] border border-violet-200/60 bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-card)] dark:border-violet-500/30">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
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
              <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
            </svg>
          </span>
          <h3 className="text-base font-semibold tracking-tight text-violet-900 dark:text-violet-100">
            AI 知识点讲解
          </h3>
          {((activeTab === "teaching" && textFromCache && text) ||
            (activeTab === "diagram" && diagramFromCache && diagramSource)) && (
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--fg-soft)]">
              已缓存
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <button
              type="button"
              onClick={regenerateActive}
              disabled={
                activeTab === "teaching" ? teachingLoading : diagramLoading
              }
              className="text-xs font-medium text-violet-600 hover:underline disabled:opacity-50 dark:text-violet-300"
            >
              {(() => {
                const loading =
                  activeTab === "teaching" ? teachingLoading : diagramLoading;
                if (loading) return "生成中…";
                const hasContent =
                  activeTab === "teaching" ? Boolean(text) : Boolean(diagramSource);
                const label = activeTab === "teaching" ? "讲解" : "思维导图";
                return `${hasContent ? "重新生成" : "生成"}${label}`;
              })()}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-200/60 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-violet-700 transition-colors hover:bg-white dark:border-violet-500/40 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/70"
          >
            {collapsed ? "展开讲解" : "收起讲解"}
            <svg
              className={`h-3 w-3 transition-transform ${collapsed ? "" : "rotate-180"}`}
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
          </button>
        </div>
      </header>

      {!collapsed && (
        <>
          {/* Tab 切换条 */}
          <div
            className="mt-4 inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-0.5"
            role="tablist"
          >
            <TabButton
              active={activeTab === "teaching"}
              onClick={() => setActiveTab("teaching")}
              icon={bookIcon}
              loading={teachingLoading && !text}
            >
              文字讲解
            </TabButton>
            <TabButton
              active={activeTab === "diagram"}
              onClick={() => setActiveTab("diagram")}
              icon={brainIcon}
              loading={diagramLoading && !diagramSource}
            >
              思维导图
            </TabButton>
          </div>

          {/* Tab 内容 */}
          <div className="mt-4">
            {activeTab === "teaching" ? (
              <TeachingTabBody
                text={text}
                loading={teachingLoading}
                error={teachingError}
                onGenerate={() =>
                  teachingFetcher.submit(
                    { intent: "ai_lesson_teaching" },
                    { method: "post" },
                  )
                }
              />
            ) : (
              <DiagramTabBody
                source={diagramSource}
                loading={diagramLoading}
                error={diagramError}
                onGenerate={() =>
                  diagramFetcher.submit(
                    { intent: "ai_lesson_diagram" },
                    { method: "post" },
                  )
                }
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- 子组件 ---------- */

function TabButton({
  active,
  onClick,
  icon,
  loading,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--surface-raised)] text-violet-900 shadow-sm dark:text-violet-100"
          : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
      }`}
    >
      {icon}
      {children}
      {loading && (
        <svg
          className="h-3 w-3 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

function TeachingTabBody({
  text,
  loading,
  error,
  onGenerate,
}: {
  text: string | null;
  loading: boolean;
  error: { error: string; code?: AiErrorCode } | null;
  onGenerate: () => void;
}) {
  if (text) {
    return (
      <>
        <AiMarkdown text={text} />
        {error && <AiErrorBox error={error} onRetry={onGenerate} />}
      </>
    );
  }
  if (loading) {
    return (
      <div className="rounded-lg border border-violet-200/40 bg-violet-50/30 p-3 dark:border-violet-500/20 dark:bg-violet-950/20">
        <AiLoadingPhases phases={AI_LESSON_TEACHING_PHASES} />
      </div>
    );
  }
  return (
    <EmptyTabCallout
      title="尚未生成文字讲解"
      hint="点这里让 AI 围绕本课锚点文件写一份结构化讲解。生成后所有用户共享 (KV 缓存 7 天)。"
      cta="生成文字讲解"
      icon="book"
      onClick={onGenerate}
      error={error}
    />
  );
}

function DiagramTabBody({
  source,
  loading,
  error,
  onGenerate,
}: {
  source: string | null;
  loading: boolean;
  error: { error: string; code?: AiErrorCode } | null;
  onGenerate: () => void;
}) {
  if (source) {
    return (
      <>
        <MermaidDiagram source={source} />
        {error && <AiErrorBox error={error} onRetry={onGenerate} />}
      </>
    );
  }
  if (loading) {
    return (
      <div className="rounded-lg border border-violet-200/40 bg-violet-50/30 p-3 dark:border-violet-500/20 dark:bg-violet-950/20">
        <AiLoadingPhases phases={AI_DIAGRAM_PHASES} />
      </div>
    );
  }
  return (
    <EmptyTabCallout
      title="尚未生成思维导图"
      hint="让 AI 把本课的角色边界 / 因果链 / 请求时序画成 Mermaid 图，更适合视觉阅读。"
      cta="生成思维导图"
      icon="brain"
      onClick={onGenerate}
      error={error}
    />
  );
}

/**
 * 空 tab 的 CTA: 一颗显眼的按钮 + 一句解释。
 * 当 lesson 的 KV cache 只有半边内容时 (老用户已生成讲解, 但还没生成图),
 * 没有这个 CTA 用户根本不知道该点哪里触发另一边的 AI 生成。
 */
function EmptyTabCallout({
  title,
  hint,
  cta,
  icon,
  onClick,
  error,
}: {
  title: string;
  hint: string;
  cta: string;
  icon: "book" | "brain";
  onClick: () => void;
  error?: { error: string; code?: AiErrorCode } | null;
}) {
  return (
    <div className="rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/40 p-5 dark:border-violet-500/30 dark:from-violet-950/30 dark:via-[var(--surface-raised)] dark:to-indigo-950/30">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
          {icon === "brain" ? (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-1.5 5.5A3 3 0 0 0 7 18a3 3 0 0 0 5 1 3 3 0 0 0 5-1 3 3 0 0 0 2.5-4.5A3 3 0 0 0 18 8V7a3 3 0 0 0-3-3 3 3 0 0 0-3 1.5A3 3 0 0 0 9 4z" />
              <path d="M12 5.5v14" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5a1.5 1.5 0 0 0 0 3H20" />
              <path d="M8 7h8M8 11h8" />
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold tracking-tight text-violet-900 dark:text-violet-100">
            {title}
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-violet-800/80 dark:text-violet-300/80">
            {hint}
          </p>
          <button
            type="button"
            onClick={onClick}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
            </svg>
            {cta}
          </button>
          {error && <AiErrorBox error={error} onRetry={onClick} small />}
        </div>
      </div>
    </div>
  );
}
