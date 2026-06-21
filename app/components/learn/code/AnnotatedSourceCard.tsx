import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { QuestionType } from "~/lib/learn/types";
import { AiMarkdown } from "~/components/learn/ui/AiMarkdown";

/**
 * v3 数据形态: AI 直接返一整段 markdown 成品(含 ```代码块``` + 讲解),
 * 前端用 AiMarkdown 整块渲染。前端不再做"按行号插注释"那种二次拼装,
 * 也不再单独 GET /learn/source —— 全文是后端从 D1 取了塞进 AI prompt 的。
 */
type AnnoData =
  | {
      ok: true;
      feature: "code_orientation" | "explanation";
      markdown: string;
      fromCache?: boolean;
    }
  | { ok: false; error: string; code?: string };

type AnnotatedSourceCardProps = {
  /** 本题相关的源码文件(相对 remix 路径), 第一个为默认激活。空数组表示无源码。 */
  files: string[];
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

/** 路径以 / 结尾 = 题目锚定的是目录(如 app/routes/) 而非单一文件, 不去拉全文。 */
function isDirectoryPath(path: string): boolean {
  return path.endsWith("/");
}

export function AnnotatedSourceCard({
  files,
  questionId,
  questionType,
  answered,
}: AnnotatedSourceCardProps) {
  const annoFetcher = useFetcher<AnnoData>();

  // 只把"看起来是文件"的路径放入 Tab; 目录型路径不进 Tab。
  const fileTabs = files.filter((f) => !isDirectoryPath(f));
  const directoryHints = files.filter(isDirectoryPath);

  const [activeFile, setActiveFile] = useState<string | null>(fileTabs[0] ?? null);
  // markdown 缓存: key = `${stage}:${path}`, 切回不重拉。
  const [mdCache, setMdCache] = useState<Record<string, string>>({});
  // 已发起过的请求 key(去重)。
  const requestedRef = useRef<Set<string>>(new Set());
  // 当前在途请求归属的 cacheKey(响应回来时写到这里)。
  const pendingKeyRef = useRef<string | null>(null);

  const stage = answered ? "explanation" : "orientation";

  // 题目切换: 重置激活文件 + 清空缓存。
  useEffect(() => {
    setActiveFile(fileTabs[0] ?? null);
    setMdCache({});
    requestedRef.current = new Set();
    pendingKeyRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, files.join("|")]);

  const cacheKey = activeFile ? `${stage}:${activeFile}` : null;
  const markdown = cacheKey ? (mdCache[cacheKey] ?? null) : null;

  // 拉讲解: 未提交→导读; 已提交→结合答案讲解。按 (stage, file) 缓存 + 去重。
  useEffect(() => {
    if (!activeFile || !cacheKey) return;
    if (mdCache[cacheKey] || requestedRef.current.has(cacheKey)) return;
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
  }, [activeFile, cacheKey, stage]);

  // 接住返回, 归属到发起时记录的 cacheKey。
  useEffect(() => {
    if (annoFetcher.state !== "idle") return;
    const d = annoFetcher.data;
    const key = pendingKeyRef.current;
    if (d?.ok && key) {
      setMdCache((prev) => ({ ...prev, [key]: d.markdown }));
      pendingKeyRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annoFetcher.state, annoFetcher.data]);

  const loading = annoFetcher.state !== "idle";
  const error = annoFetcher.data && !annoFetcher.data.ok ? annoFetcher.data : null;

  function regenerate() {
    if (!activeFile || !cacheKey) return;
    // 清掉本 key 的缓存与去重标记, 强制重拉。
    setMdCache((prev) => {
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

  // 卡顶部 path 提示用的 active file 显示名。
  const activeFileLabel = activeFile
    ? `remix/${activeFile}`
    : directoryHints[0]
      ? `remix/${directoryHints[0]} (目录评审)`
      : null;

  return (
    <section className="studio-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[var(--brand-fg)]" aria-hidden>{sparkle}</span>
          <h3 className="truncate text-sm font-semibold text-[var(--fg-primary)]">
            代码 + AI 讲解
            <span className="ml-2 text-xs font-normal text-[var(--fg-soft)]">
              {answered ? "结合你的答案" : "读前导读"}
              {loading && " · 生成中…"}
            </span>
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <button
            type="button"
            onClick={regenerate}
            disabled={loading || !activeFile}
            className="font-medium text-[var(--brand-fg)] hover:underline disabled:opacity-50"
          >
            {loading ? "生成中…" : "重新生成"}
          </button>
        </div>
      </header>

      {/* 多文件 Tab(只列真实文件; 目录型不进 Tab) */}
      {fileTabs.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-1.5">
          {fileTabs.map((f) => (
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

      {/* 当前讲解的文件标签 */}
      {activeFileLabel && (
        <p className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]/60 px-4 py-1.5 font-mono text-[11px] text-[var(--fg-soft)]">
          {activeFileLabel}
        </p>
      )}

      <div className="max-h-[70vh] overflow-y-auto p-4">
        {fileTabs.length === 0 && directoryHints.length === 0 ? (
          <p className="px-1 py-6 text-sm text-[var(--fg-muted)]">本题暂无关联源码文件。</p>
        ) : fileTabs.length === 0 && directoryHints.length > 0 ? (
          // 纯目录型: 没有可拉全文的文件, 提示用户这是目录评审题
          <div className="space-y-3 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-sunken)]/40 p-4 text-sm text-[var(--fg-muted)]">
            <p>
              本题的关注范围是整个目录 <code className="rounded bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs">{directoryHints[0]}</code>，没有单一源码文件可以展示全文。
            </p>
            <p>请结合下方"题目"卡里的代码片段作答；提交后这里会出现"结合你的答案"的目录评审讲解。</p>
          </div>
        ) : !markdown && loading ? (
          <p className="px-1 py-6 text-sm text-[var(--fg-muted)]">AI 生成中…</p>
        ) : markdown ? (
          <AiMarkdown text={markdown} />
        ) : (
          <p className="px-1 py-6 text-sm text-[var(--fg-muted)]">
            {error?.error ?? "等待 AI 讲解…"}
          </p>
        )}
        {error && markdown && (
          <p className="mt-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
            {error.error}
          </p>
        )}
      </div>
    </section>
  );
}
