import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import type {
  Exam,
  ExamResult,
  ExamTask,
  Question,
  UserAnswer,
} from "~/lib/learn/types";
import { QuestionMetaBar } from "~/components/learn/question/QuestionMetaBar";
import { QuestionRenderer } from "~/components/learn/question/QuestionRenderer";
import { ProgressBar } from "~/components/learn/ui/ProgressBar";
import { CollapsibleSection } from "~/components/learn/ui/CollapsibleSection";
import { AiMarkdown } from "~/components/learn/ui/AiMarkdown";
import { useBeforeUnloadGuard } from "~/components/learn/ui/useBeforeUnloadGuard";
import {
  AiLoadingPhases,
  AI_EXAM_REVIEW_PHASES,
} from "~/components/learn/ui/AiLoadingPhases";

type SubmitExamActionData =
  | { ok: true; result: ExamResult }
  | { ok: false; error: string };

type ExamAiReviewActionData =
  | { ok: true; text: string }
  | { ok: false; error: string; code?: string };

type ExamAiReviewPanelProps = {
  result: ExamResult;
};

export function ExamAiReviewPanel({ result }: ExamAiReviewPanelProps) {
  const fetcher = useFetcher<ExamAiReviewActionData>();
  const isLoading = fetcher.state !== "idle";
  const text = fetcher.data?.ok ? fetcher.data.text : null;
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data.error : null;

  return (
    <CollapsibleSection
      title="✨ AI 考试复盘（可选）"
      description="需要时再展开；不影响成绩展示"
      tone="brand"
      defaultOpen={false}
    >
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="ai_exam_review" />
        <input type="hidden" name="resultId" value={result.id} />
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-violet-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
        >
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
          {isLoading ? "AI 生成中…" : "生成 AI 复盘"}
        </button>
        {isLoading && (
          <div className="mt-2">
            <AiLoadingPhases phases={AI_EXAM_REVIEW_PHASES} />
          </div>
        )}
      </fetcher.Form>
      {error && (
        <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
          {error}
        </p>
      )}
      {text && (
        <div className="mt-3 rounded-lg border border-[var(--border-soft-brand)] bg-[var(--surface-raised)] p-3">
          <AiMarkdown text={text} />
        </div>
      )}
    </CollapsibleSection>
  );
}

type ExamPracticeProps = {
  exam: Exam;
  tasks: ExamTask[];
  questions: Question[];
  onSubmitted: (result: ExamResult) => void;
};

export function ExamPractice({
  tasks,
  questions,
  onSubmitted,
}: ExamPracticeProps) {
  const fetcher = useFetcher<SubmitExamActionData>();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState<UserAnswer | null>(null);
  const [answersByTask, setAnswersByTask] = useState<
    Record<string, UserAnswer>
  >({});
  // 用户主动改过当前题目的答案 (区分自动初始化的 sort/fill_blank 默认值)。
  // 与 answersByTask 一起决定 beforeunload 是否拦页。
  const [dirty, setDirty] = useState(false);
  // 一旦交卷成功 (fetcher.data.ok), 标志位拉起, 解除 beforeunload。
  const submitted = fetcher.state === "idle" && fetcher.data?.ok === true;

  const currentTask = tasks[questionIndex];
  const currentQuestion = questions[questionIndex];
  const isSubmitting = fetcher.state !== "idle";
  const isLast = questionIndex >= tasks.length - 1;

  useEffect(() => {
    if (!currentTask || !currentQuestion) return;
    // 切到一题: 重置 dirty 标记, 这样自动恢复的草稿或自动初始化的默认值
    // 不会触发 beforeunload。
    setDirty(false);
    const saved = answersByTask[currentTask.id];
    if (saved) {
      setAnswer(saved);
      return;
    }
    if (currentQuestion.type === "sort" && currentQuestion.sortItems) {
      setAnswer({
        type: "sort",
        itemIds: currentQuestion.sortItems.map((item) => item.id),
      });
      return;
    }
    if (currentQuestion.type === "fill_blank" && currentQuestion.blanks) {
      setAnswer({
        type: "fill_blank",
        values: Object.fromEntries(
          currentQuestion.blanks.map((blank) => [blank.id, ""]),
        ),
      });
      return;
    }
    setAnswer(null);
  }, [currentTask?.id, currentQuestion?.id]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data?.ok) return;
    onSubmitted(fetcher.data.result);
  }, [fetcher.state, fetcher.data, onSubmitted]);

  // beforeunload: 只要有任意一道题被答过 (无论是 answersByTask 里已存的,
  // 还是当前题用户刚动过手里没保存的) 且没成功交卷, 关页就拦一下。
  // 考试是 in-memory state, 真丢了没救。
  const hasDraft =
    !submitted &&
    !isSubmitting &&
    (Object.keys(answersByTask).length > 0 || dirty);
  useBeforeUnloadGuard(hasDraft);

  if (!currentTask || !currentQuestion) {
    return (
      <p className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] p-5 text-[var(--danger-fg)]">
        考试题目加载失败。
      </p>
    );
  }

  function saveCurrentAnswer() {
    if (!answer || !currentTask) return false;
    setAnswersByTask((prev) => ({ ...prev, [currentTask.id]: answer }));
    return true;
  }

  function goNext() {
    if (!saveCurrentAnswer()) return;
    if (!isLast) setQuestionIndex((i) => i + 1);
  }

  /** 题号导航器跳转: 跳前先把当前题答案落到 answersByTask。
   *  目标可能是已答 / 未答 / 当前题, 一律 setQuestionIndex 即可,
   *  useEffect 会按 task.id 自己加载草稿。 */
  function jumpTo(targetIndex: number) {
    if (targetIndex === questionIndex) return;
    if (answer) saveCurrentAnswer();
    setQuestionIndex(targetIndex);
  }

  function submitExam() {
    if (!saveCurrentAnswer()) return;
    const merged = { ...answersByTask, [currentTask.id]: answer! };
    fetcher.submit(
      {
        intent: "submit_exam",
        answersJson: JSON.stringify(merged),
      },
      { method: "post" },
    );
  }

  const answeredCount = Object.keys(answersByTask).length + (answer ? 1 : 0);

  return (
    <div className="studio-card p-6">
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-0.5 font-medium text-[var(--fg-muted)]">
            <span aria-hidden>🎯</span>
            <span className="tabular-nums">大关任务 {questionIndex + 1}</span>
            <span className="text-[var(--fg-faint)]">/</span>
            <span className="tabular-nums text-[var(--fg-soft)]">{tasks.length}</span>
          </span>
          <span className="text-[var(--fg-soft)] tabular-nums">
            已作答约 {Math.min(answeredCount, tasks.length)} 题
          </span>
        </div>
        <ProgressBar
          value={questionIndex + 1}
          max={tasks.length}
          size="sm"
          tone="emerald"
        />
      </div>

      <QuestionNavigator
        tasks={tasks}
        questionIndex={questionIndex}
        answersByTask={answersByTask}
        currentAnswer={answer}
        disabled={isSubmitting}
        onJump={jumpTo}
      />

      <QuestionMetaBar question={currentQuestion} />
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
        {currentQuestion.title}
      </h2>
      <QuestionRenderer
        question={currentQuestion}
        value={answer}
        onChange={(next) => {
          setAnswer(next);
          setDirty(true);
        }}
        disabled={isSubmitting}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        {questionIndex > 0 && (
          <button
            type="button"
            onClick={() => {
              saveCurrentAnswer();
              setQuestionIndex((i) => i - 1);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-medium text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--fg-primary)]"
          >
            ← 上一题
          </button>
        )}
        {!isLast && (
          <button
            type="button"
            onClick={goNext}
            disabled={!answer}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-700)] px-5 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            下一题 →
          </button>
        )}
        {isLast && (
          <button
            type="button"
            onClick={submitExam}
            disabled={!answer || isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            {isSubmitting ? "交卷中…" : "交卷"}
          </button>
        )}
      </div>

      {fetcher.data && !fetcher.data.ok && (
        <p
          // role=alert 让屏读用户即使没滚动到此处也能收到提示;
          // 同步用 ref + scrollIntoView 滚到错误处, 防止在最后一题点交卷
          // 失败时错误条出在折叠区下方看不到。
          role="alert"
          ref={(node) => {
            if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]"
        >
          {fetcher.data.error}
        </p>
      )}
    </div>
  );
}

/* ---------- 子组件 ---------- */

type QuestionNavigatorProps = {
  tasks: ExamTask[];
  questionIndex: number;
  answersByTask: Record<string, UserAnswer>;
  currentAnswer: UserAnswer | null;
  disabled: boolean;
  onJump: (index: number) => void;
};

/**
 * 顶部题号网格: 一眼看完整张卷的进度, 点击直接跳。
 *
 * 状态色:
 *   - 当前题: 加 ring + 实色背景
 *   - 已答: 蓝灰底, 中间空心圆
 *   - 当前题且已动过手 (currentAnswer 存在但还没 saveCurrentAnswer):
 *     视觉上和"已答"一致, 用户一定会觉得"答过了就是绿点"
 *   - 未答: 描边灰底
 *
 * 键盘可访问: 整组是 <ul>, 每个按钮可被 Tab; aria-current 标记当前题。
 * 折叠默认展开 (考试场景下"我在哪里"比"页面美观"重要)。
 */
function QuestionNavigator({
  tasks,
  questionIndex,
  answersByTask,
  currentAnswer,
  disabled,
  onJump,
}: QuestionNavigatorProps) {
  if (tasks.length <= 1) return null;
  return (
    <nav aria-label="题号导航" className="mb-5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-soft)]">
        题号导航
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {tasks.map((task, idx) => {
          const isCurrent = idx === questionIndex;
          const isAnswered =
            Boolean(answersByTask[task.id]) ||
            (isCurrent && Boolean(currentAnswer));
          const labelStatus = isCurrent
            ? "当前题"
            : isAnswered
              ? "已答"
              : "未答";
          return (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onJump(idx)}
                disabled={disabled}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`第 ${idx + 1} 题（${labelStatus}）`}
                className={[
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold tabular-nums transition-all",
                  isCurrent
                    ? "border-emerald-500 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow ring-2 ring-emerald-300/60"
                    : isAnswered
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                      : "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fg-soft)] hover:border-[var(--border-soft-brand)] hover:text-[var(--fg-primary)]",
                  disabled ? "cursor-not-allowed opacity-60" : "",
                ].join(" ")}
              >
                {idx + 1}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] text-[var(--fg-faint)]">
        绿色 = 已答 · 描边 = 未答 · 高亮 = 当前题 · 点击跳到任意题
      </p>
    </nav>
  );
}
