import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import type { QuestionType } from "~/lib/learn/types";
import { MermaidDiagram } from "~/components/learn/ui/MermaidDiagram";

type DiagramData =
  | { ok: true; feature: "lesson_diagram" | "question_diagram"; text: string }
  | { ok: false; error: string; code?: string };

type DiagramCardProps = {
  questionId: string;
  questionType: QuestionType;
  /** 已提交→出"错vs对路径"题图; 未提交→出课级结构图。 */
  answered: boolean;
};

const brain = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-1.5 5.5A3 3 0 0 0 7 18a3 3 0 0 0 5 1 3 3 0 0 0 5-1 3 3 0 0 0 2.5-4.5A3 3 0 0 0 18 8V7a3 3 0 0 0-3-3 3 3 0 0 0-3 1.5A3 3 0 0 0 9 4z" />
    <path d="M12 5.5v14" />
  </svg>
);

export function DiagramCard({ questionId, questionType, answered }: DiagramCardProps) {
  const fetcher = useFetcher<DiagramData>();
  const [source, setSource] = useState<string | null>(null);

  // 切题清空
  useEffect(() => {
    setSource(null);
  }, [questionId]);

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    const d = fetcher.data;
    if (d?.ok) setSource(d.text);
  }, [fetcher.state, fetcher.data]);

  const loading = fetcher.state !== "idle";
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data : null;

  function generate() {
    if (answered) {
      fetcher.submit(
        { intent: "ai_question_diagram", questionId, questionType },
        { method: "post" },
      );
    } else {
      fetcher.submit({ intent: "ai_lesson_diagram" }, { method: "post" });
    }
  }

  return (
    <section className="studio-card p-4">
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--fg-primary)]">
          <span className="text-[var(--brand-fg)]" aria-hidden>{brain}</span>
          思维导图
        </h3>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="text-xs font-medium text-[var(--brand-fg)] hover:underline disabled:opacity-50"
        >
          {loading ? "生成中…" : source ? "重新生成" : "生成思维导图"}
        </button>
      </header>

      {source ? (
        <MermaidDiagram source={source} />
      ) : loading ? (
        <p className="text-sm text-[var(--fg-soft)]">AI 正在画思维导图…</p>
      ) : (
        <p className="text-sm text-[var(--fg-soft)]">
          {answered
            ? "把这道题的「错误路径 vs 正确路径」画成图。"
            : "把这节课的角色边界 / 因果链 / 请求时序画成图。"}
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
          {error.error}
        </p>
      )}
    </section>
  );
}
