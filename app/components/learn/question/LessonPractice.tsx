import { useEffect, useMemo, useState } from "react";
import { Link, useFetcher, useSearchParams } from "react-router";
import type { Question, UserAnswer } from "~/lib/learn/types";
import { serializeUserAnswer } from "~/lib/learn/parseUserAnswer";
import {
  buildFillBlankFeedback,
  buildSortFeedback,
  buildSortFeedbackMessage,
} from "~/lib/learn/questionFeedback";
import type { LessonProgressSummary } from "~/lib/server/learn/attempts.server";
import type { CachedQuestionSummary } from "~/lib/server/learn/cache-lesson.server";
import { ProgressBar } from "~/components/learn/ui/ProgressBar";
import { useBeforeUnloadGuard } from "~/components/learn/ui/useBeforeUnloadGuard";
import { AnnotatedSourceCard } from "~/components/learn/code/AnnotatedSourceCard";
import { DiagramCard } from "~/components/learn/code/DiagramCard";
import { ExplanationPanel } from "./ExplanationPanel";
import { QuestionRenderer } from "./QuestionRenderer";
import { QuestionMetaBar } from "./QuestionMetaBar";
import type { QuestionFeedback } from "./types";

/**
 * Pull a string id out of the various user answer shapes so ExplanationPanel
 * can look up `wrongAnswerFeedback[userChoiceId]`. Returns undefined for
 * free-form answer types (free_explain, review_comment, code_fix, …) where
 * there's no single "choice".
 */
function extractUserChoiceId(answer: UserAnswer | null): string | undefined {
  if (!answer) return undefined;
  switch (answer.type) {
    case "single_choice":
      return answer.choiceId;
    case "position_judgement":
      return answer.positionId;
    case "debug":
      return answer.issueId;
    case "true_false":
      return answer.value ? "true" : "false";
    case "line_pick":
      return answer.lineId;
    case "diff_review":
      return answer.verdict;
    default:
      return undefined;
  }
}

type SubmitActionData = {
  ok: true;
  questionId: string;
  isCorrect: boolean;
  needsAiGrading?: boolean;
  explanation: Question["explanation"];
  mistakeType?: string;
  progress: LessonProgressSummary;
  nextQuestionIndex: number;
  totalQuestions: number;
};

type LessonPracticeProps = {
  courseSlug: string;
  lessonSlug: string;
  questionSummaries: CachedQuestionSummary[];
  currentQuestion: Question | null;
  questionIndex: number;
  initialProgress: LessonProgressSummary;
  /** 课程锚点文件; 题目没有 sourceFilePath 时作为卡1 源码回退。 */
  lessonSourceFilePath?: string;
};

export function LessonPractice({
  courseSlug,
  lessonSlug,
  questionSummaries,
  currentQuestion,
  questionIndex,
  initialProgress,
  lessonSourceFilePath,
}: LessonPracticeProps) {
  const fetcher = useFetcher<SubmitActionData>();
  const [, setSearchParams] = useSearchParams();
  const [answer, setAnswer] = useState<UserAnswer | null>(null);
  // dirty: 用户对当前题"主动"动过 (拨过选项 / 敲过空 / 拖过顺序)。
  // 用来给 useBeforeUnloadGuard 判断: 答了一半关页要不要拦。
  // 注意必须区分"用户输入"和下面那个 useEffect 自动初始化排序 / 填空答案的默认值,
  // 否则一进页面就触发 beforeunload, 用户体验更差。
  const [dirty, setDirty] = useState(false);
  const [resultsByQuestion, setResultsByQuestion] = useState<
    Record<string, SubmitActionData>
  >({});

  const currentQuestionResolved = currentQuestion;
  const submitResult = currentQuestionResolved
    ? (resultsByQuestion[currentQuestionResolved.id] ?? null)
    : null;
  const submittedForCurrent = submitResult !== null;
  const isSubmitting = fetcher.state !== "idle";
  const progress = submitResult?.progress ?? initialProgress;

  const feedback: QuestionFeedback | undefined = useMemo(() => {
    if (!submittedForCurrent || !currentQuestionResolved || !answer)
      return undefined;
    if (submitResult?.isCorrect) return undefined;
    return {
      fillBlank: buildFillBlankFeedback(currentQuestionResolved, answer),
      sort: buildSortFeedback(currentQuestionResolved, answer),
    };
  }, [
    submittedForCurrent,
    currentQuestionResolved,
    answer,
    submitResult?.isCorrect,
  ]);

  const sortFeedbackMessage =
    submittedForCurrent &&
    !submitResult?.isCorrect &&
    answer &&
    currentQuestionResolved
      ? buildSortFeedbackMessage(currentQuestionResolved, answer)
      : undefined;

  const fillBlankFeedback =
    submittedForCurrent &&
    !submitResult?.isCorrect &&
    answer?.type === "fill_blank" &&
    currentQuestionResolved?.correctAnswer
      ? Object.fromEntries(
          Object.entries(
            (
              currentQuestionResolved.correctAnswer as {
                values: Record<string, string>;
              }
            ).values,
          ).map(([key, correct]) => [
            key,
            { user: answer.values[key] ?? "", correct },
          ]),
        )
      : undefined;

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data?.ok) return;
    const result = fetcher.data;
    setResultsByQuestion((prev) => ({
      ...prev,
      [result.questionId]: result,
    }));
    requestAnimationFrame(() => {
      document.getElementById("answer-feedback")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    if (!currentQuestionResolved) {
      setAnswer(null);
      setDirty(false);
      return;
    }
    // 切到新题: 清掉"已修改"标记, 这样未真正动手的 sort/fill_blank 默认值
    // 不会触发 beforeunload 警告。
    setDirty(false);
    if (
      currentQuestionResolved.type === "sort" &&
      currentQuestionResolved.sortItems
    ) {
      const shuffled = [...currentQuestionResolved.sortItems]
        .map((item) => item.id)
        .sort(() => Math.random() - 0.5);
      setAnswer({ type: "sort", itemIds: shuffled });
      return;
    }
    if (
      currentQuestionResolved.type === "fill_blank" &&
      currentQuestionResolved.blanks
    ) {
      setAnswer({
        type: "fill_blank",
        values: Object.fromEntries(
          currentQuestionResolved.blanks.map((blank) => [blank.id, ""]),
        ),
      });
      return;
    }
    setAnswer(null);
  }, [currentQuestionResolved?.id]);

  // beforeunload: 选了答案但还没提交时, 关 tab / 刷新前弹系统确认。
  // 提交中 (isSubmitting) 不拦, 否则会和正常的 form submit 撞到一起。
  useBeforeUnloadGuard(dirty && !submittedForCurrent && !isSubmitting);

  if (!currentQuestionResolved) {
    return (
      <div className="studio-card p-6">
        <p className="text-[var(--fg-muted)]">题目不存在。</p>
        <Link
          to={`/learn/courses/${courseSlug}`}
          className="mt-4 inline-block font-medium text-[var(--brand-fg)] hover:underline"
        >
          ← 返回课程
        </Link>
      </div>
    );
  }

  function handleSubmit() {
    if (!answer || submittedForCurrent || !currentQuestionResolved) return;
    fetcher.submit(
      {
        intent: "submit_answer",
        questionId: currentQuestionResolved.id,
        questionType: currentQuestionResolved.type,
        answerJson: serializeUserAnswer(answer),
      },
      { method: "post" },
    );
  }

  function goNext() {
    const nextIndex = submitResult?.nextQuestionIndex ?? questionIndex + 1;
    if (nextIndex < questionSummaries.length) {
      setSearchParams({ phase: "practice", q: String(nextIndex) });
    }
  }

  const lessonComplete = progress.isCompleted;
  const sourceFiles = useMemo(() => {
    const list = [
      currentQuestionResolved.sourceFilePath,
      ...(currentQuestionResolved.touchedFiles ?? []),
      lessonSourceFilePath,
    ].filter((p): p is string => Boolean(p));
    return Array.from(new Set(list));
  }, [
    currentQuestionResolved.sourceFilePath,
    currentQuestionResolved.touchedFiles,
    lessonSourceFilePath,
  ]);

  return (
    <div className="space-y-4 pb-24">
      {/* 卡1: 源码 + 行内 AI 讲解(答题前导读 / 答题后结合答案) */}
      <AnnotatedSourceCard
        files={sourceFiles}
        questionId={currentQuestionResolved.id}
        questionType={currentQuestionResolved.type}
        answered={submittedForCurrent}
      />

      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-0.5 font-medium text-[var(--fg-muted)]">
            <span className="tabular-nums">第 {questionIndex + 1}</span>
            <span className="text-[var(--fg-faint)]">/</span>
            <span className="tabular-nums text-[var(--fg-soft)]">
              {questionSummaries.length}
            </span>
            <span>题</span>
          </span>
          <span className="text-[var(--fg-soft)] tabular-nums">
            关卡进度 {progress.attemptedQuestions}/{progress.totalQuestions}
            {lessonComplete && " · 已完成"}
          </span>
        </div>
        <ProgressBar
          value={questionIndex + (submittedForCurrent ? 1 : 0)}
          max={questionSummaries.length}
          size="sm"
          tone="indigo"
        />
      </div>

      {/* 卡2: 题目 (id="answer-feedback" 由 ExplanationPanel 自身承担, 不在外层重复) */}
      <div className="studio-card p-6">
        <QuestionMetaBar question={currentQuestionResolved} />
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
          {currentQuestionResolved.title}
        </h2>
        <QuestionRenderer
          question={currentQuestionResolved}
          value={answer}
          onChange={(next) => {
            setAnswer(next);
            // 任何一次 onChange 都视为"用户动手过"。这里不再判断值是否相等,
            // 因为对 sort/排序 而言 setAnswer 同一份 itemIds 引用就足以代表"用户碰过"。
            setDirty(true);
          }}
          disabled={submittedForCurrent || isSubmitting}
          feedback={feedback}
        />

        {!submittedForCurrent && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!answer || isSubmitting}
            className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-pop)] transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 disabled:opacity-70 disabled:shadow-none sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
                </svg>
                提交中…
              </>
            ) : (
              <>
                提交答案
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        )}

        {submittedForCurrent && submitResult && (
          <>
            <ExplanationPanel
              isCorrect={submitResult.isCorrect}
              needsAiGrading={submitResult.needsAiGrading}
              explanation={submitResult.explanation}
              mistakeType={submitResult.mistakeType}
              sortFeedback={sortFeedbackMessage}
              fillBlankFeedback={fillBlankFeedback}
              question={currentQuestionResolved}
              userChoiceId={extractUserChoiceId(answer)}
            />
            {!submitResult.isCorrect && !submitResult.needsAiGrading && (
              <p className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-soft)] px-3 py-2 text-sm text-[var(--warning-fg)]">
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19h16L12 4z" />
                  <path d="M12 10v4M12 17h.01" />
                </svg>
                本题已记录到错题本，建议看上方代码讲解后复盘。
              </p>
            )}
            <div className="sticky bottom-4 mt-6 flex flex-wrap items-center gap-3 studio-floating-bar p-2.5">
              {(submitResult?.nextQuestionIndex ?? questionIndex + 1) <
              (submitResult?.totalQuestions ?? questionSummaries.length) ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-5 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
                >
                  下一题
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--success-border)] bg-[var(--success-soft)] px-4 py-1.5 text-sm font-medium text-[var(--success-fg)]">
                  <span aria-hidden>🎉</span>
                  本关题目已全部完成
                </div>
              )}
              <Link
                to={`/learn/courses/${courseSlug}`}
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-1.5 text-sm font-medium text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--fg-primary)]"
              >
                返回课程
              </Link>
            </div>
          </>
        )}
      </div>

      {/* 卡3: 思维导图 */}
      <DiagramCard
        questionId={currentQuestionResolved.id}
        questionType={currentQuestionResolved.type}
        answered={submittedForCurrent}
      />
    </div>
  );
}
