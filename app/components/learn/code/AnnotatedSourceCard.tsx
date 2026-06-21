import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { AnnotatedExplanation, QuestionType } from "~/lib/learn/types";
import { locateSnippetLines } from "~/lib/learn/locateSnippet";
import { AnnotatedCode } from "~/components/learn/code/AnnotatedCode";

type SourceData =
  | { ok: true; path: string; code: string; language: string | null; lineCount: number | null }
  | { ok: false; error: string };

type AnnoData =
  | { ok: true; feature: "code_orientation" | "explanation"; annotated: AnnotatedExplanation; fromCache?: boolean }
  | { ok: false; error: string; code?: string };

type AnnotatedSourceCardProps = {
  /** 当前题目关联的源码文件(相对 remix 路径); null 表示无源码。 */
  sourceFilePath: string | null;
  /** 题目代码片段, 用于在全文里高亮定位。 */
  questionCode?: string;
  questionId: string;
  questionType: QuestionType;
  /** 是否已提交本题(决定导读 vs 结合答案讲解)。 */
  answered: boolean;
};

const sparkle = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
  </svg>
);

export function AnnotatedSourceCard({
  sourceFilePath,
  questionCode,
  questionId,
  questionType,
  answered,
}: AnnotatedSourceCardProps) {
  const sourceFetcher = useFetcher<SourceData>();
  const annoFetcher = useFetcher<AnnoData>();

  const [annotated, setAnnotated] = useState<AnnotatedExplanation | null>(null);
  // 当前注释的来源阶段, 用于决定是否需要在 answered 翻转后重新拉。
  const [annoStage, setAnnoStage] = useState<"none" | "orientation" | "explanation">("none");
  const [showAnnotations, setShowAnnotations] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 切换文件/题目时: 重新拉源码 + 清空注释。
  useEffect(() => {
    setAnnotated(null);
    setAnnoStage("none");
    if (sourceFilePath) {
      sourceFetcher.load(`/learn/source?path=${encodeURIComponent(sourceFilePath)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFilePath, questionId]);

  const source = sourceFetcher.data;
  const hasSource = source?.ok === true;

  // 拉注释: 未提交→导读(ai_orientation); 已提交→结合答案讲解(ai_explanation)。
  // 用 annoStage 防重复触发; answered 翻转后会从 orientation 升级到 explanation。
  useEffect(() => {
    if (!hasSource || !sourceFilePath) return;
    if (!answered && annoStage === "none") {
      setAnnoStage("orientation");
      annoFetcher.submit(
        { intent: "ai_orientation", path: sourceFilePath },
        { method: "post" },
      );
    } else if (answered && annoStage !== "explanation") {
      setAnnoStage("explanation");
      annoFetcher.submit(
        { intent: "ai_explanation", questionId, questionType },
        { method: "post" },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSource, answered, sourceFilePath, questionId]);

  // 接住注释返回
  useEffect(() => {
    if (annoFetcher.state !== "idle") return;
    const d = annoFetcher.data;
    if (d?.ok) setAnnotated(d.annotated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annoFetcher.state, annoFetcher.data]);

  const highlightLines = useMemo(() => {
    if (!hasSource || !questionCode) return [];
    return locateSnippetLines(source.code, questionCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSource, questionCode, source]);

  // 注释/高亮就绪后, 滚动定位到首个相关行。
  useEffect(() => {
    if (!hasSource) return;
    const target =
      highlightLines[0] ?? annotated?.annotations[0]?.startLine ?? null;
    if (target == null) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`#ac-line-${target}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSource, annotated, highlightLines.join(",")]);

  const annoLoading = annoFetcher.state !== "idle";
  const annoError = annoFetcher.data && !annoFetcher.data.ok ? annoFetcher.data : null;

  function regenerate() {
    if (!sourceFilePath) return;
    if (answered) {
      annoFetcher.submit(
        { intent: "ai_explanation", questionId, questionType },
        { method: "post" },
      );
    } else {
      annoFetcher.submit(
        { intent: "ai_orientation", path: sourceFilePath, force: "1" },
        { method: "post" },
      );
    }
  }

  return (
    <section className="studio-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[var(--brand-fg)]" aria-hidden>{sparkle}</span>
          <h3 className="truncate text-sm font-semibold text-[var(--fg-primary)]">
            代码 + AI 讲解
            <span className="ml-2 text-xs font-normal text-[var(--fg-soft)]">
              {answered ? "结合你的答案" : "读前导读"}
              {annoLoading && " · 生成中…"}
            </span>
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowAnnotations((v) => !v)}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-0.5 text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-sunken)]"
          >
            {showAnnotations ? "隐藏讲解" : "显示讲解"}
          </button>
          <button
            type="button"
            onClick={regenerate}
            disabled={annoLoading || !hasSource}
            className="font-medium text-[var(--brand-fg)] hover:underline disabled:opacity-50"
          >
            {annoLoading ? "生成中…" : "重新生成"}
          </button>
        </div>
      </header>

      {annotated?.summary && showAnnotations && (
        <p className="border-b border-[var(--border-subtle)] bg-[var(--brand-soft)]/40 px-4 py-2 text-[13px] text-[var(--fg-primary)]">
          {annotated.summary}
        </p>
      )}

      <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto p-3">
        {!sourceFilePath ? (
          <p className="px-1 py-6 text-sm text-[var(--fg-muted)]">本题暂无关联源码文件。</p>
        ) : sourceFetcher.state !== "idle" && !source ? (
          <p className="px-1 py-6 text-sm text-[var(--fg-muted)]">加载源码中…</p>
        ) : hasSource ? (
          <AnnotatedCode
            code={source.code}
            language={source.language ?? undefined}
            filePath={`remix/${source.path}`}
            highlightLines={highlightLines}
            annotations={annotated?.annotations ?? []}
            showAnnotations={showAnnotations}
          />
        ) : (
          <p className="px-1 py-6 text-sm text-[var(--fg-muted)]">
            {source && !source.ok ? source.error : "该文件未收录源码"}
          </p>
        )}
        {annoError && (
          <p className="mt-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
            {annoError.error}
          </p>
        )}
      </div>
    </section>
  );
}
