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
  /** 本题相关的源码文件(相对 remix 路径), 第一个为默认激活。空数组表示无源码。 */
  files: string[];
  /** 题目代码片段, 用于在全文里高亮定位(匹配不上的文件自动不高亮)。 */
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

function fileLabel(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

export function AnnotatedSourceCard({
  files,
  questionCode,
  questionId,
  questionType,
  answered,
}: AnnotatedSourceCardProps) {
  const sourceFetcher = useFetcher<SourceData>();
  const annoFetcher = useFetcher<AnnoData>();

  const [activeFile, setActiveFile] = useState<string | null>(files[0] ?? null);
  // 注释缓存: key = `${stage}:${path}`, 切回不重拉。
  const [annoCache, setAnnoCache] = useState<Record<string, AnnotatedExplanation>>({});
  const [showAnnotations, setShowAnnotations] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // 已发起过的注释请求 key(去重)。
  const requestedRef = useRef<Set<string>>(new Set());
  // 当前在途请求归属的 cacheKey(响应回来时写到这里)。
  const pendingKeyRef = useRef<string | null>(null);

  const stage = answered ? "explanation" : "orientation";

  // 题目切换: 重置激活文件 + 清空注释缓存。
  useEffect(() => {
    setActiveFile(files[0] ?? null);
    setAnnoCache({});
    requestedRef.current = new Set();
    pendingKeyRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, files.join("|")]);

  // 激活文件变化: 拉该文件源码。
  useEffect(() => {
    if (activeFile) {
      sourceFetcher.load(`/learn/source?path=${encodeURIComponent(activeFile)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  const source =
    sourceFetcher.data?.ok && sourceFetcher.data.path === activeFile
      ? sourceFetcher.data
      : null;
  const hasSource = source !== null;
  const sourceLoading = sourceFetcher.state !== "idle" && !source;

  const cacheKey = activeFile ? `${stage}:${activeFile}` : null;
  const annotated = cacheKey ? (annoCache[cacheKey] ?? null) : null;

  // 拉注释: 未提交→导读; 已提交→结合答案讲解。按 (stage, file) 缓存 + 去重。
  useEffect(() => {
    if (!hasSource || !activeFile || !cacheKey) return;
    if (annoCache[cacheKey] || requestedRef.current.has(cacheKey)) return;
    requestedRef.current.add(cacheKey);
    pendingKeyRef.current = cacheKey;
    if (stage === "orientation") {
      annoFetcher.submit(
        { intent: "ai_orientation", path: activeFile },
        { method: "post" },
      );
    } else {
      annoFetcher.submit(
        { intent: "ai_explanation", questionId, questionType, path: activeFile },
        { method: "post" },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSource, activeFile, cacheKey, stage]);

  // 接住注释返回, 归属到发起时记录的 cacheKey。
  useEffect(() => {
    if (annoFetcher.state !== "idle") return;
    const d = annoFetcher.data;
    const key = pendingKeyRef.current;
    if (d?.ok && key) {
      setAnnoCache((prev) => ({ ...prev, [key]: d.annotated }));
      pendingKeyRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annoFetcher.state, annoFetcher.data]);

  const highlightLines = useMemo(() => {
    if (!source || !questionCode) return [];
    return locateSnippetLines(source.code, questionCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, questionCode]);

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
    if (!activeFile || !cacheKey) return;
    // 清掉本 key 的缓存与去重标记, 强制重拉。
    setAnnoCache((prev) => {
      const next = { ...prev };
      delete next[cacheKey];
      return next;
    });
    requestedRef.current.delete(cacheKey);
    requestedRef.current.add(cacheKey);
    pendingKeyRef.current = cacheKey;
    if (stage === "orientation") {
      annoFetcher.submit(
        { intent: "ai_orientation", path: activeFile, force: "1" },
        { method: "post" },
      );
    } else {
      annoFetcher.submit(
        { intent: "ai_explanation", questionId, questionType, path: activeFile },
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

      {/* 多文件 Tab */}
      {files.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-1.5">
          {files.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFile(f)}
              title={f}
              className={`max-w-[16rem] truncate rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                f === activeFile
                  ? "bg-[var(--brand-soft)] font-semibold text-[var(--brand-fg)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--surface-raised)]"
              }`}
            >
              {fileLabel(f)}
            </button>
          ))}
        </div>
      )}

      {annotated?.summary && showAnnotations && (
        <p className="border-b border-[var(--border-subtle)] bg-[var(--brand-soft)]/40 px-4 py-2 text-[13px] text-[var(--fg-primary)]">
          {annotated.summary}
        </p>
      )}

      <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto p-3">
        {!activeFile ? (
          <p className="px-1 py-6 text-sm text-[var(--fg-muted)]">本题暂无关联源码文件。</p>
        ) : sourceLoading ? (
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
            {sourceFetcher.data && !sourceFetcher.data.ok
              ? sourceFetcher.data.error
              : "该文件未收录源码"}
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
