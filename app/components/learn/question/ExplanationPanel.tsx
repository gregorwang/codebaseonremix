import type { Explanation, Question } from "~/lib/learn/types";

type ExplanationPanelProps = {
  isCorrect: boolean;
  explanation: Explanation;
  mistakeType?: string;
  sortFeedback?: string;
  fillBlankFeedback?: Record<string, { user: string; correct: string }>;
  /** Used to render wrongAnswerFeedback keyed by the chosen distractor id. */
  question?: Question;
  /** The id the user actually picked (for wrongAnswerFeedback lookup). */
  userChoiceId?: string;
  /**
   * True when the answer is free-form (free_explain / review_comment /
   * open ai_review) and is waiting for the AI grader. The panel renders a
   * neutral "已提交，等待 AI 评分" state instead of "回答正确"/"回答错误".
   */
  needsAiGrading?: boolean;
};

type Tone = "pending" | "ok" | "bad";

const accentBar: Record<Tone, string> = {
  pending: "from-sky-400 to-sky-600",
  ok: "from-emerald-400 to-emerald-600",
  bad: "from-rose-400 to-rose-600",
};

const containerBg: Record<Tone, string> = {
  pending: "bg-sky-50/70 border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/30",
  ok: "bg-[var(--success-soft)] border-[var(--success-border)]",
  bad: "bg-[var(--danger-soft)] border-[var(--danger-border)]",
};

const headlineColor: Record<Tone, string> = {
  pending: "text-sky-700 dark:text-sky-300",
  ok: "text-[var(--success-fg)]",
  bad: "text-[var(--danger-fg)]",
};

const iconBg: Record<Tone, string> = {
  pending: "bg-sky-200/70 text-sky-800 dark:bg-sky-500/30 dark:text-sky-200",
  ok: "bg-emerald-200/70 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-200",
  bad: "bg-rose-200/70 text-rose-800 dark:bg-rose-500/30 dark:text-rose-200",
};

function ToneIcon({ tone }: { tone: Tone }) {
  if (tone === "ok") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12l5 5 9-11" />
      </svg>
    );
  }
  if (tone === "bad") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4 animate-pulse"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  );
}

export function ExplanationPanel({
  isCorrect,
  explanation,
  mistakeType,
  sortFeedback,
  fillBlankFeedback,
  question,
  userChoiceId,
  needsAiGrading,
}: ExplanationPanelProps) {
  const tone: Tone = needsAiGrading ? "pending" : isCorrect ? "ok" : "bad";
  const headline =
    tone === "pending"
      ? "已提交，等待 AI 评分"
      : tone === "ok"
        ? "回答正确"
        : "回答错误";

  return (
    <div
      id="answer-feedback"
      className={`relative mt-6 overflow-hidden rounded-[var(--radius-card)] border p-5 transition-all duration-300 ${containerBg[tone]}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${accentBar[tone]}`}
      />
      <div className="relative pl-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${iconBg[tone]}`}
            aria-hidden
          >
            <ToneIcon tone={tone} />
          </span>
          <p className={`font-semibold tracking-tight ${headlineColor[tone]}`}>
            {headline}
          </p>
        </div>

        {tone === "bad" && mistakeType && (
          <p className="mt-2 text-sm text-[var(--danger-fg)]">
            错误类型：{mistakeType}
          </p>
        )}

        {tone === "pending" && (
          <p className="mt-2 text-sm text-sky-700 dark:text-sky-300">
            这是开放题，本地无法判分。点击下方「AI 讲解 / AI 评分」按钮让 AI
            给出反馈。
          </p>
        )}

        <div className="mt-4 space-y-3">
          <FeedbackSection label="结果">
            <p className="font-medium text-[var(--fg-primary)]">
              {explanation.short}
            </p>
          </FeedbackSection>

          {explanation.detail.trim() !== explanation.short.trim() && (
            <FeedbackSection label="为什么">
              <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
                {explanation.detail}
              </p>
            </FeedbackSection>
          )}

          {explanation.realProjectNote && (
            <InfoBox label="真实项目注意点">
              {explanation.realProjectNote}
            </InfoBox>
          )}

          {explanation.commonMistake && (
            <FeedbackSection label="常见误区">
              <p className="text-sm text-[var(--fg-soft)]">
                {explanation.commonMistake}
              </p>
            </FeedbackSection>
          )}

          {explanation.aiReviewNote && (
            <InfoBox label="常见 AI 错法" tone="fuchsia">
              {explanation.aiReviewNote}
            </InfoBox>
          )}

          {!isCorrect &&
            userChoiceId &&
            question?.wrongAnswerFeedback?.[userChoiceId] && (
              <InfoBox label="为什么这个选项错" tone="amber">
                {question.wrongAnswerFeedback[userChoiceId]}
              </InfoBox>
            )}

          {question?.realWorldImpact && (
            <InfoBox label="真实世界影响" tone="rose">
              {question.realWorldImpact}
            </InfoBox>
          )}

          {question?.aiReviewRisk && (
            <InfoBox label="AI 评审风险" tone="fuchsia">
              {question.aiReviewRisk}
            </InfoBox>
          )}

          {question?.typeSafetyRisk && (
            <InfoBox label="类型安全风险" tone="blue">
              {question.typeSafetyRisk}
            </InfoBox>
          )}

          {question?.touchedFiles && question.touchedFiles.length > 0 && (
            <InfoBox label="涉及文件" tone="neutral">
              <ul className="space-y-0.5 font-mono text-xs">
                {question.touchedFiles.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </InfoBox>
          )}

          {sortFeedback && (
            <InfoBox label="顺序反馈" tone="neutral">
              {sortFeedback}
            </InfoBox>
          )}

          {fillBlankFeedback && Object.keys(fillBlankFeedback).length > 0 && (
            <FeedbackSection label="填空对比">
              <div className="space-y-2">
                {Object.entries(fillBlankFeedback).map(([id, fb]) => (
                  <div
                    key={id}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 p-3 text-sm"
                  >
                    <p>
                      你的答案：
                      <code className="ml-1 rounded bg-rose-50 px-1.5 py-0.5 font-mono text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                        {fb.user || "（空）"}
                      </code>
                    </p>
                    <p className="mt-1">
                      正确答案：
                      <code className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                        {fb.correct}
                      </code>
                    </p>
                  </div>
                ))}
              </div>
            </FeedbackSection>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </section>
  );
}

const infoTones: Record<string, string> = {
  neutral:
    "border-[var(--border-subtle)] bg-[var(--surface-raised)]/70 text-[var(--fg-muted)]",
  fuchsia:
    "border-fuchsia-200 bg-fuchsia-50/70 text-fuchsia-900 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-100",
  amber:
    "border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100",
  rose: "border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100",
  blue: "border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-100",
};

const infoLabel: Record<string, string> = {
  neutral: "text-[var(--fg-soft)]",
  fuchsia: "text-fuchsia-700 dark:text-fuchsia-300",
  amber: "text-amber-700 dark:text-amber-300",
  rose: "text-rose-700 dark:text-rose-300",
  blue: "text-blue-700 dark:text-blue-300",
};

function InfoBox({
  label,
  children,
  tone = "neutral",
}: {
  label: string;
  children: React.ReactNode;
  tone?: keyof typeof infoTones;
}) {
  return (
    <section
      className={`rounded-lg border p-3 text-sm ${infoTones[tone] ?? infoTones.neutral}`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${infoLabel[tone] ?? infoLabel.neutral}`}
      >
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </section>
  );
}
