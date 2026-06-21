import { useSearchParams } from "react-router";
import type { Lesson } from "~/lib/learn/types";
import { TeachingBlockRenderer } from "~/components/learn/teaching/TeachingBlockRenderer";
import { LessonAiTeachingCard } from "./LessonAiTeachingCard";

type TeachingPhaseProps = {
  lesson: Lesson;
  initialAiTeachingText?: string | null;
  initialAiDiagramSource?: string | null;
};

const arrow = (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

/**
 * 一颗醒目的"开始练习" CTA 横幅, 让用户在读完任意一段讲解后都能直接点。
 * 用 button + 满宽渐变, 视觉上是独立条目, 不会被当成卡片装饰被忽略。
 */
function StartPracticeBanner({
  onClick,
  hint,
}: {
  onClick: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-[var(--radius-card-lg)] bg-gradient-to-r from-[var(--color-brand-500)] via-[var(--color-brand-600)] to-[var(--color-brand-700)] px-6 py-5 text-left shadow-[var(--shadow-pop)] transition-transform hover:-translate-y-0.5"
    >
      <span aria-hidden className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
      <span className="relative flex flex-col">
        <span className="text-base font-semibold text-white sm:text-lg">
          开始练习这一课
        </span>
        <span className="mt-1 text-xs text-white/85 sm:text-sm">
          {hint ?? "看完讲解直接做题, 用真实代码题验证你是否真的读懂了。"}
        </span>
      </span>
      <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white shadow-inner transition-transform group-hover:translate-x-1">
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  );
}

/**
 * 屏幕右下角的悬浮 FAB — 用 fixed 而非 sticky, 不依赖父容器 scroll 上下文,
 * 用户无论滚到哪里, 始终能看到「开始练习」入口。lg+ 屏才显示,
 * 移动端避开侧边栏抽屉触发位置。
 */
function StartPracticeFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="开始练习这一课"
      className="fixed bottom-6 right-6 z-30 hidden items-center gap-2 rounded-full bg-gradient-to-r from-[var(--color-brand-500)] via-[var(--color-brand-600)] to-[var(--color-brand-700)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-pop)] transition-transform hover:-translate-y-0.5 lg:inline-flex"
    >
      开始练习
      {arrow}
    </button>
  );
}

export function TeachingPhase({
  lesson,
  initialAiTeachingText,
  initialAiDiagramSource,
}: TeachingPhaseProps) {
  const [, setSearchParams] = useSearchParams();
  const blocks = lesson.teachingBlocks ?? [];

  function startPractice() {
    // 不带 q= 让 loader 自己决定跳到第一道未答题; 带了 q=0 反而会覆盖断点续做
    setSearchParams({ phase: "practice" });
  }

  // 即使没有 hand-written 教学块, AI 讲解卡片也应该展示, 让用户至少能拿到 AI 版讲解。
  if (blocks.length === 0) {
    return (
      <div className="space-y-4">
        <LessonAiTeachingCard
          initialText={initialAiTeachingText}
          initialDiagramSource={initialAiDiagramSource}
          lessonSlug={lesson.slug}
        />
        <StartPracticeBanner
          onClick={startPractice}
          hint="本课没有结构化教学块, 直接进入题目练习。"
        />
        <StartPracticeFab onClick={startPractice} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LessonAiTeachingCard
        initialText={initialAiTeachingText}
        initialDiagramSource={initialAiDiagramSource}
        lessonSlug={lesson.slug}
      />
      {/* 紧贴 AI 讲解卡之后, 用户读完讲解第一眼就看到的入口。 */}
      <StartPracticeBanner onClick={startPractice} />
      <div className="mb-4 mt-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
          想再读一遍结构化教学块?
        </h3>
        <span className="text-sm text-[var(--fg-soft)] tabular-nums">
          {blocks.length} 个教学块
        </span>
      </div>
      <TeachingBlockRenderer blocks={blocks} />
      {/* 底部再放一颗, 读完最后一块在原位看到。 */}
      <StartPracticeBanner
        onClick={startPractice}
        hint="读完了? 立刻进入做题环节, 一边做一边查漏。"
      />
      {/* 右下角浮动按钮, 始终可见。 */}
      <StartPracticeFab onClick={startPractice} />
    </div>
  );
}
