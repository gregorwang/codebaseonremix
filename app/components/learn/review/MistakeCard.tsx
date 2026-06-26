import { Link } from "react-router";
import { ABILITY_TAG_LABELS } from "~/lib/learn/abilityTags";
import type { MistakeReviewItem } from "~/lib/server/learn/mistakes.server";
import { Badge } from "~/components/learn/ui/Badge";
import { AiMarkdown } from "~/components/learn/ui/AiMarkdown";
import {
  AiLoadingPhases,
  AI_EXPLANATION_PHASES,
} from "~/components/learn/ui/AiLoadingPhases";

type MistakeCardProps = {
  mistake: MistakeReviewItem;
  onResolve: (mistakeId: string) => void;
  onGenerateSummary: (mistakeId: string) => void;
  isResolving: boolean;
  isGeneratingSummary: boolean;
  aiError?: string | null;
};

const tagAccent: Record<string, string> = {
  "frontend.state": "from-indigo-400 to-indigo-600",
  "frontend.event": "from-sky-400 to-sky-600",
  "frontend.effect": "from-cyan-400 to-cyan-600",
  "backend.": "from-amber-400 to-amber-600",
  bridge: "from-violet-400 to-violet-600",
  code: "from-slate-400 to-slate-600",
  ai: "from-rose-400 to-rose-600",
  project: "from-emerald-400 to-emerald-600",
};

function accentForTag(tag: string): string {
  const prefix = Object.keys(tagAccent).find((p) => tag.startsWith(p));
  return prefix ? tagAccent[prefix]! : "from-slate-400 to-slate-500";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const sparkle = (
  <svg
    className="h-3.5 w-3.5"
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

export function MistakeCard({
  mistake,
  onResolve,
  onGenerateSummary,
  isResolving,
  isGeneratingSummary,
  aiError,
}: MistakeCardProps) {
  const practiceUrl = `/learn/courses/${mistake.courseSlug}/lessons/${mistake.lessonSlug}?q=${mistake.questionIndex}`;
  const primaryTag = mistake.abilityTags[0];
  const accent = primaryTag ? accentForTag(primaryTag) : "from-rose-400 to-rose-600";

  return (
    <article className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-card)] transition-colors hover:border-[var(--border-soft-brand)]">
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${accent}`}
      />
      <div className="pl-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--fg-soft)]">
              {mistake.courseTitle} / {mistake.lessonTitle}
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
              {mistake.questionTitle}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="danger" dot>
              错 {mistake.wrongCount} 次
            </Badge>
            {mistake.isResolved && (
              <Badge variant="success" dot>
                已解决
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {mistake.abilityTags.map((tag) => (
            <Badge key={tag}>{ABILITY_TAG_LABELS[tag]}</Badge>
          ))}
        </div>

        {mistake.mistakeType && (
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            <span className="font-medium text-[var(--fg-primary)]">错误类型：</span>
            {mistake.mistakeType}
          </p>
        )}

        <p className="mt-1 text-xs text-[var(--fg-faint)]">
          最近错误：{formatDate(mistake.lastWrongAt)}
        </p>

        <div className="mt-4 rounded-xl border border-[var(--border-soft-brand)] bg-[var(--brand-soft)] p-3 text-sm">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-fg)]">
            {sparkle}
            AI 总结
          </p>
          <div className="mt-1.5">
            {mistake.aiSummary ? (
              <AiMarkdown
                text={mistake.aiSummary}
                className="space-y-2 text-sm leading-[1.7] text-[var(--fg-primary)]"
              />
            ) : (
              <>
                <p className="text-[var(--fg-soft)]">暂无 AI 总结</p>
                <p className="mt-1 text-[var(--fg-muted)]">
                  规则提示：重点复习
                  {mistake.abilityTags
                    .map((t) => ABILITY_TAG_LABELS[t])
                    .join("、")}
                </p>
              </>
            )}
          </div>
        </div>

        {aiError && (
          <p className="mt-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
            {aiError}
          </p>
        )}

        {isGeneratingSummary && !mistake.aiSummary && (
          <div className="mt-2 rounded-lg border border-[var(--border-soft-brand)] bg-[var(--brand-soft)]/40 p-2.5">
            <AiLoadingPhases phases={AI_EXPLANATION_PHASES} />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to={practiceUrl}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
          >
            重新练习 →
          </Link>
          {!mistake.aiSummary && (
            <button
              type="button"
              onClick={() => onGenerateSummary(mistake.id)}
              disabled={isGeneratingSummary}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-soft-brand)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-medium text-[var(--brand-fg)] transition-colors hover:bg-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sparkle}
              {isGeneratingSummary ? "AI 生成中…" : "生成 AI 总结"}
            </button>
          )}
          {!mistake.isResolved && (
            <button
              type="button"
              onClick={() => onResolve(mistake.id)}
              disabled={isResolving}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-medium text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--fg-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResolving ? "处理中…" : "标记已解决"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
