/**
 * CopyAiTextButton — 「复制并追问」按钮
 *
 * 用户做错题后看 AI 讲解，常常因为基础薄弱看不懂一整段。这个按钮把 AI 讲解正文
 * 和一段预置的「请把我当成基础薄弱的初学者，拆解 + 举例 + 反问」提示词拼装在一起，
 * 一键复制到剪贴板，用户直接粘到别的对话式 AI 里就能开始多轮追问，不用自己写开场白。
 *
 * 只带 AI 讲解正文（不含题干/错误答案），保持复制内容干净。
 */
import { useState } from "react";

/** 拼装提示词 + AI 讲解正文。导出以便单测/复用。 */
export function buildAiFollowUpPrompt(aiText: string): string {
  return `我正在学习如何读懂代码，下面这段是 AI 给我的讲解，但我基础比较薄弱，有些地方看不懂。

请你：
1. 把它拆解成更通俗、更基础的解释，遇到术语先解释术语；
2. 必要时举一个最小的例子帮我理解；
3. 解释完后，反问我一两个问题确认我是否真的懂了，我会继续追问。

下面是 AI 的原始讲解：

${aiText.trim()}`;
}

/** 剪贴板写入，带非安全上下文的降级方案。 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 落到下面的降级方案
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

type CopyAiTextButtonProps = {
  /** AI 讲解正文（原始 markdown 文本）。 */
  text: string;
  className?: string;
};

export function CopyAiTextButton({ text, className }: CopyAiTextButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(buildAiFollowUpPrompt(text));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="复制讲解并附带追问提示词，粘到别的 AI 里继续提问"
      aria-label={copied ? "已复制到剪贴板" : "复制并追问"}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors ${
        copied
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fg-muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-fg)]"
      } ${className ?? ""}`}
    >
      {copied ? (
        <>
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l5 5 9-11" />
          </svg>
          已复制
        </>
      ) : (
        <>
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
          复制并追问
        </>
      )}
    </button>
  );
}
