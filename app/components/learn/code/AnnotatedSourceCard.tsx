import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { QuestionType } from "~/lib/learn/types";
import type {
  CodeBlockNote,
  CodeLineNote,
} from "~/lib/learn/codeExplainTypes";
import { InlineCodeExplainView } from "~/components/learn/code/InlineCodeExplainView";

/**
 * 「代码 + AI 讲解」卡片 (v5 单栏精读讲义版)。
 *
 * v3: AI 直接返一整段 markdown 成品, 前端用 AiMarkdown 整块渲染 —— 像聊天记录,
 *     行号与代码段关联全丢。
 * v4: AI 返结构化批注 JSON, 前端「左源码 + 右卡片栏」绝对定位对齐 ——
 *     右侧空白带 + 双向滚动看起来像 IDE 审稿, 不像讲义。
 * v5 (当前): AI 返 {lineNotes, blockNotes}, 前端 InlineCodeExplainView 把行注释
 *     塞到代码行下面, 把段讲解块插到 endLine 后, 全部在同一个垂直流里。
 *
 * 两个 stage:
 *  - "orientation" (未提交本题): 中性导读, 不剧透答案。
 *  - "explanation" (已提交本题): 结合作答, 给针对性批注。
 *
 * 缓存逻辑保留: 切回某文件不重拉; 用户点「重新生成」走 force=1 跳过 KV。
 */
type CodeExplainData =
  | {
      ok: true;
      feature: "code_explain";
      stage: "orientation" | "explanation";
      filePath: string;
      language: string | null;
      code: string;
      summary: string;
      lineNotes: CodeLineNote[];
      blockNotes: CodeBlockNote[];
      fromCache?: boolean;
    }
  | { ok: false; error: string; code?: string };

type AnnotatedSourceCardProps = {
  /** 本题相关的源码文件(相对 remix 路径), 第一个为默认激活。空数组表示无源码。 */
  files: string[];
  questionId: string;
  /** 仅做日志/未来扩展, v5 不再依赖 questionType。 */
  questionType: QuestionType;
  /** 是否已提交本题(决定 orientation vs explanation)。 */
  answered: boolean;
};

const sparkle = (
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
);

function fileLabel(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

/** 路径以 / 结尾 = 题目锚定的是目录(如 app/routes/) 而非单一文件, 不去拉全文。 */
function isDirectoryPath(path: string): boolean {
  return path.endsWith("/");
}

type CachedPayload = {
  code: string;
  language: string | null;
  filePath: string;
  summary: string;
  lineNotes: CodeLineNote[];
  blockNotes: CodeBlockNote[];
};

export function AnnotatedSourceCard({
  files,
  questionId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  questionType: _questionType,
  answered,
}: AnnotatedSourceCardProps) {
  const annoFetcher = useFetcher<CodeExplainData>();

  // 只把"看起来是文件"的路径放入 Tab; 目录型路径不进 Tab。
  const fileTabs = files.filter((f) => !isDirectoryPath(f));
  const directoryHints = files.filter(isDirectoryPath);

  const [activeFile, setActiveFile] = useState<string | null>(fileTabs[0] ?? null);
  // 已生成的批注缓存: key = `${stage}:${path}`, 切回不重拉。
  const [cache, setCache] = useState<Record<string, CachedPayload>>({});
  // 已发起过的请求 key(去重)。
  const requestedRef = useRef<Set<string>>(new Set());
  // 当前在途请求归属的 cacheKey(响应回来时写到这里)。
  const pendingKeyRef = useRef<string | null>(null);

  const stage: "orientation" | "explanation" = answered
    ? "explanation"
    : "orientation";

  // 题目切换: 重置激活文件 + 清空缓存。
  useEffect(() => {
    setActiveFile(fileTabs[0] ?? null);
    setCache({});
    requestedRef.current = new Set();
    pendingKeyRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, files.join("|")]);

  const cacheKey = activeFile ? `${stage}:${activeFile}` : null;
  const payload = cacheKey ? cache[cacheKey] ?? null : null;

  // 拉批注: 未提交→orientation; 已提交→explanation。按 (stage, file) 缓存 + 去重。
  useEffect(() => {
    if (!activeFile || !cacheKey) return;
    if (cache[cacheKey] || requestedRef.current.has(cacheKey)) return;
    requestedRef.current.add(cacheKey);
    pendingKeyRef.current = cacheKey;
    annoFetcher.submit(
      {
        intent: "ai_code_explain",
        stage,
        path: activeFile,
        questionId,
      },
      { method: "post" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, cacheKey, stage]);

  // 接住返回, 归属到发起时记录的 cacheKey。
  useEffect(() => {
    if (annoFetcher.state !== "idle") return;
    const d = annoFetcher.data;
    const key = pendingKeyRef.current;
    if (d?.ok && key) {
      setCache((prev) => ({
        ...prev,
        [key]: {
          code: d.code,
          language: d.language,
          filePath: d.filePath,
          summary: d.summary,
          lineNotes: d.lineNotes,
          blockNotes: d.blockNotes,
        },
      }));
      pendingKeyRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annoFetcher.state, annoFetcher.data]);

  const loading = annoFetcher.state !== "idle";
  const error = annoFetcher.data && !annoFetcher.data.ok ? annoFetcher.data : null;

  function regenerate() {
    if (!activeFile || !cacheKey) return;
    // 清掉本 key 的缓存与去重标记, 强制重拉。
    setCache((prev) => {
      const next = { ...prev };
      delete next[cacheKey];
      return next;
    });
    requestedRef.current.delete(cacheKey);
    requestedRef.current.add(cacheKey);
    pendingKeyRef.current = cacheKey;
    annoFetcher.submit(
      {
        intent: "ai_code_explain",
        stage,
        path: activeFile,
        questionId,
        force: "1",
      },
      { method: "post" },
    );
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
          <span className="text-[var(--brand-fg)]" aria-hidden>
            {sparkle}
          </span>
          <h3 className="truncate text-sm font-semibold text-[var(--fg-primary)]">
            代码 + AI 讲解
            <span className="ml-2 text-xs font-normal text-[var(--fg-soft)]">
              {answered ? "结合你的答案" : "读前导读"}
              {loading && " · 生成中…"}
              {payload &&
                ` · ${payload.lineNotes.length} 行旁批 · ${payload.blockNotes.length} 段讲解`}
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

      {/* 顶部一句话总览(AI 给的 summary) */}
      {payload?.summary && (
        <p className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]/30 px-4 py-2 text-[13px] leading-relaxed text-[var(--fg-primary)]">
          {payload.summary}
        </p>
      )}

      <div className="p-3 md:p-4">
        {fileTabs.length === 0 && directoryHints.length === 0 ? (
          <p className="px-1 py-6 text-sm text-[var(--fg-muted)]">
            本题暂无关联源码文件。
          </p>
        ) : fileTabs.length === 0 && directoryHints.length > 0 ? (
          // 纯目录型: 没有可拉全文的文件, 提示用户这是目录评审题
          <div className="space-y-3 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-sunken)]/40 p-4 text-sm text-[var(--fg-muted)]">
            <p>
              本题的关注范围是整个目录{" "}
              <code className="rounded bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-xs">
                {directoryHints[0]}
              </code>
              , 没有单一源码文件可以展示全文。
            </p>
            <p>
              请结合下方"题目"卡里的代码片段作答; 提交后这里会出现"结合你的答案"的目录评审批注。
            </p>
          </div>
        ) : !payload && loading ? (
          <p className="px-1 py-6 text-sm text-[var(--fg-muted)]">AI 生成中…</p>
        ) : payload ? (
          <InlineCodeExplainView
            filePath={payload.filePath}
            language={payload.language ?? undefined}
            code={payload.code}
            lineNotes={payload.lineNotes}
            blockNotes={payload.blockNotes}
          />
        ) : (
          <p className="px-1 py-6 text-sm text-[var(--fg-muted)]">
            {error?.error ?? "等待 AI 讲解…"}
          </p>
        )}
        {error && payload && (
          <p className="mt-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
            {error.error}
          </p>
        )}
      </div>
    </section>
  );
}
