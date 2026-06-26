/**
 * AiLoadingPhases — 分阶段 loading 文案
 *
 * AI 调用 (讲解 / 思维导图 / 复盘) 当前完全阻塞: 用户点完按钮看到的是一段
 * 静态 "AI 正在写讲解…", 持续 3-8 秒。spinner + 一行不变的文案非常容易被
 * 误认为页面卡死, 用户开始刷新。
 *
 * 这里不改后端流式 (那是中期方案), 先在 UI 上给一组"会进展"的文案:
 * 每隔 1.4s 切换到下一句, 让用户看到事情还在动。文案设计成"承诺感"递进:
 *
 *   阶段 1: 已连接 AI Gateway…       (链路打通)
 *   阶段 2: 正在分析代码…            (在做活)
 *   阶段 3: 正在生成讲解…            (临门一脚)
 *
 * 用法:
 *   <AiLoadingPhases phases={EXPLANATION_PHASES} />
 *
 * 内部用 setInterval 自增 index, 走到最后一句就停在那里 (clamp 而不是循环),
 * 因为再循环回去会让用户以为"又重来一遍, 是不是真的卡死了"。
 *
 * SSR 安全: 仅在客户端注册 interval, 服务端渲染第一帧文案。
 */
import { useEffect, useState } from "react";

type AiLoadingPhasesProps = {
  /** 至少给两句, 否则就退化为静态文案 (没必要用这个组件)。 */
  phases: readonly string[];
  /** 切换间隔 (ms), 默认 1400。 */
  intervalMs?: number;
  className?: string;
  /** 是否带前缀的 ✨ 闪光图标, 默认 true。 */
  withSparkle?: boolean;
};

export function AiLoadingPhases({
  phases,
  intervalMs = 1400,
  className,
  withSparkle = true,
}: AiLoadingPhasesProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (phases.length <= 1) return;
    const id = setInterval(() => {
      // clamp 到最后一句, 不循环 — 详见组件头部说明。
      setIndex((i) => (i >= phases.length - 1 ? i : i + 1));
    }, intervalMs);
    return () => clearInterval(id);
  }, [phases, intervalMs]);

  const text = phases[Math.min(index, phases.length - 1)] ?? "";

  return (
    <span
      className={
        className ?? "inline-flex items-center gap-1.5 text-sm text-[var(--fg-soft)]"
      }
      // 屏幕阅读器: 文案在变, 但不要打断用户; 用 polite。
      role="status"
      aria-live="polite"
    >
      {withSparkle && (
        <svg
          className="h-3.5 w-3.5 animate-pulse text-[var(--brand-fg)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
        </svg>
      )}
      <span className="tabular-nums">{text}</span>
    </span>
  );
}

/* ---- 预设文案 ---- */

export const AI_EXPLANATION_PHASES = [
  "已连接 AI Gateway…",
  "正在分析你的作答与代码…",
  "正在生成讲解…",
] as const;

export const AI_DIAGRAM_PHASES = [
  "已连接 AI Gateway…",
  "正在分析代码上下文…",
  "正在画思维导图…",
] as const;

export const AI_LESSON_TEACHING_PHASES = [
  "已连接 AI Gateway…",
  "正在读锚点文件…",
  "正在生成本课讲解…",
] as const;

export const AI_LESSON_COMBO_PHASES = [
  "已连接 AI Gateway…",
  "正在读锚点文件…",
  "正在并行生成讲解 + 思维导图…",
] as const;

export const AI_EXAM_REVIEW_PHASES = [
  "已连接 AI Gateway…",
  "正在汇总你的考试结果…",
  "正在生成考试复盘…",
] as const;

export const AI_CODE_ORIENTATION_PHASES = [
  "已连接 AI Gateway…",
  "正在读取源码全文…",
  "正在生成读前导读…",
] as const;
