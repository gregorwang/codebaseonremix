/**
 * AiHintPanel — 错题后的「✨ AI 辅助」面板
 *
 * 模式与课级 LessonAiTeachingCard 对齐:
 *  - 用户做错一道题, 提交后这块面板默认折叠, 展开看到一颗主按钮 "AI 分析这道错题"
 *  - 点一下并发触发两个 fetcher: ai_explanation + ai_question_diagram
 *  - 任意一边返回后, 切换到 tab 视图: 📖 讲解 / 🧠 思维导图
 *  - 每个 tab 自己的 loading / 已生成 / 错误 状态独立, 谁先回来谁先渲染
 *  - 单 tab 里有 "重新生成" 按钮, 只重跑当前 tab 的 fetcher
 *
 * 历史: 之前还有 L1-L4 渐进提示按钮 (generateHint), 用户嫌点击次数太多,
 * 已改为单按钮并发模式。后端的 ai_hint intent 仍在 (没有 UI 调用),
 * 想恢复时只需把它接回 UI 即可。
 */
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import type { Question, UserAnswer } from "~/lib/learn/types";
import { CollapsibleSection } from "~/components/learn/ui/CollapsibleSection";
import { AiMarkdown } from "~/components/learn/ui/AiMarkdown";
import { MermaidDiagram } from "~/components/learn/ui/MermaidDiagram";

type ExplanationActionData =
  | {
      ok: true;
      feature: "explanation";
      text: string;
    }
  | {
      ok: false;
      error: string;
      code?: "rate_limited" | "not_configured" | "ai_failed" | "forbidden";
    };

type DiagramActionData =
  | {
      ok: true;
      feature: "question_diagram";
      text: string;
    }
  | {
      ok: false;
      error: string;
      code?: "rate_limited" | "not_configured" | "ai_failed" | "forbidden";
    };

type TabKey = "explanation" | "diagram";

type AiHintPanelProps = {
  question: Question;
  // 保留 prop 以兼容现有调用点 (LessonPractice / ExamPractice 都传了它),
  // 当前实现里其实用不到 — server 已经从最近一次错答 attempt 取 userAnswer。
  userAnswer: UserAnswer | null;
  disabled?: boolean;
};

const sparkle = (
  <svg
    aria-hidden
    className="h-4 w-4"
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
    aria-hidden
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
    aria-hidden
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

export function AiHintPanel({
  question,
  disabled,
}: AiHintPanelProps) {
  const explanationFetcher = useFetcher<ExplanationActionData>();
  const diagramFetcher = useFetcher<DiagramActionData>();

  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [diagramSource, setDiagramSource] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("explanation");

  // 切到下一道题: 把上一题积累的所有 AI 输出清掉。
  useEffect(() => {
    setExplanationText(null);
    setDiagramSource(null);
    setActiveTab("explanation");
  }, [question.id]);

  // explanationFetcher 完成
  useEffect(() => {
    if (explanationFetcher.state !== "idle") return;
    const d = explanationFetcher.data;
    if (d?.ok) setExplanationText(d.text);
  }, [explanationFetcher.state, explanationFetcher.data]);

  // diagramFetcher 完成
  useEffect(() => {
    if (diagramFetcher.state !== "idle") return;
    const d = diagramFetcher.data;
    if (d?.ok) setDiagramSource(d.text);
  }, [diagramFetcher.state, diagramFetcher.data]);

  const explanationLoading = explanationFetcher.state !== "idle";
  const diagramLoading = diagramFetcher.state !== "idle";
  const explanationError =
    explanationFetcher.data && !explanationFetcher.data.ok
      ? explanationFetcher.data
      : null;
  const diagramError =
    diagramFetcher.data && !diagramFetcher.data.ok ? diagramFetcher.data : null;

  const anyLoading = explanationLoading || diagramLoading;
  const hasAnyContent = Boolean(explanationText) || Boolean(diagramSource);

  /** 并发触发讲解 + 思维导图。 */
  function generateBoth() {
    explanationFetcher.submit(
      {
        intent: "ai_explanation",
        questionId: question.id,
        questionType: question.type,
      },
      { method: "post" },
    );
    diagramFetcher.submit(
      {
        intent: "ai_question_diagram",
        questionId: question.id,
        questionType: question.type,
      },
      { method: "post" },
    );
  }

  function regenerateExplanation() {
    explanationFetcher.submit(
      {
        intent: "ai_explanation",
        questionId: question.id,
        questionType: question.type,
      },
      { method: "post" },
    );
  }

  function regenerateDiagram() {
    diagramFetcher.submit(
      {
        intent: "ai_question_diagram",
        questionId: question.id,
        questionType: question.type,
      },
      { method: "post" },
    );
  }

  return (
    <CollapsibleSection
      title="✨ AI 辅助（可选）"
      description="一键并发生成讲解 + 思维导图，需要时再展开"
      tone="brand"
      defaultOpen={false}
    >
      {!hasAnyContent ? (
        // 入口态: 一颗主按钮, 点一下并发触发两个 AI 调用
        <div>
          <button
            type="button"
            onClick={generateBoth}
            disabled={disabled || anyLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sparkle}
            {anyLoading
              ? "AI 正在写讲解 + 画思维导图…"
              : "AI 分析这道错题"}
          </button>
          <p className="mt-2 text-xs text-[var(--fg-soft)]">
            一键并发生成「文字讲解」和「思维导图」两份内容，结果分两个 tab 展示。
          </p>
          {(explanationError || diagramError) && (
            <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
              {explanationError?.error ?? diagramError?.error}
            </p>
          )}
        </div>
      ) : (
        // 已生成态: tab 切换
        <div>
          <div
            className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-0.5"
            role="tablist"
          >
            <TabButton
              active={activeTab === "explanation"}
              onClick={() => setActiveTab("explanation")}
              icon={bookIcon}
              loading={explanationLoading && !explanationText}
            >
              讲解
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

          <div className="mt-3">
            {activeTab === "explanation" ? (
              <ExplanationTabBody
                text={explanationText}
                loading={explanationLoading}
                error={explanationError}
                onGenerate={regenerateExplanation}
              />
            ) : (
              <DiagramTabBody
                source={diagramSource}
                loading={diagramLoading}
                error={diagramError}
                onGenerate={regenerateDiagram}
              />
            )}
          </div>
        </div>
      )}
    </CollapsibleSection>
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
          ? "bg-[var(--surface-raised)] text-[var(--brand-fg)] shadow-sm"
          : "text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
      }`}
    >
      {icon}
      {children}
      {loading && (
        <svg
          aria-hidden
          className="h-3 w-3 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

function ExplanationTabBody({
  text,
  loading,
  error,
  onGenerate,
}: {
  text: string | null;
  loading: boolean;
  error: { error: string } | null;
  onGenerate: () => void;
}) {
  if (text) {
    return (
      <div className="rounded-lg border border-[var(--border-soft-brand)] bg-[var(--surface-raised)] p-3 text-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-fg)]">
            {sparkle}
            AI 讲解
          </p>
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="text-xs font-medium text-[var(--brand-fg)] hover:underline disabled:opacity-50"
          >
            {loading ? "生成中…" : "重新生成"}
          </button>
        </div>
        <AiMarkdown text={text} />
        {error && (
          <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
            {error.error}
          </p>
        )}
      </div>
    );
  }
  if (loading) {
    return (
      <p className="text-sm text-[var(--fg-soft)]">AI 正在写文字讲解…</p>
    );
  }
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-4 text-sm">
      <p className="text-[var(--fg-soft)]">尚未生成文字讲解。</p>
      <button
        type="button"
        onClick={onGenerate}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
      >
        {sparkle}
        生成文字讲解
      </button>
      {error && (
        <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger-fg)]">
          {error.error}
        </p>
      )}
    </div>
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
  error: { error: string } | null;
  onGenerate: () => void;
}) {
  if (source) {
    return (
      <div className="rounded-lg border border-[var(--border-soft-brand)] bg-[var(--surface-raised)] p-3 text-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-fg)]">
            {brainIcon}
            AI 思维导图 · 错在哪 vs 正确路径
          </p>
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="text-xs font-medium text-[var(--brand-fg)] hover:underline disabled:opacity-50"
          >
            {loading ? "生成中…" : "重新生成"}
          </button>
        </div>
        <MermaidDiagram source={source} />
        {error && (
          <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
            {error.error}
          </p>
        )}
      </div>
    );
  }
  if (loading) {
    return (
      <p className="text-sm text-[var(--fg-soft)]">AI 正在画思维导图…</p>
    );
  }
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-4 text-sm">
      <p className="text-[var(--fg-soft)]">尚未生成思维导图。</p>
      <button
        type="button"
        onClick={onGenerate}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
      >
        {brainIcon}
        生成思维导图
      </button>
      {error && (
        <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger-fg)]">
          {error.error}
        </p>
      )}
    </div>
  );
}
