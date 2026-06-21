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
          {isLoading ? "生成中…" : "生成 AI 复盘"}
        </button>
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

  const currentTask = tasks[questionIndex];
  const currentQuestion = questions[questionIndex];
  const isSubmitting = fetcher.state !== "idle";
  const isLast = questionIndex >= tasks.length - 1;

  useEffect(() => {
    if (!currentTask || !currentQuestion) return;
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

      <QuestionMetaBar question={currentQuestion} />
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
        {currentQuestion.title}
      </h2>
      <QuestionRenderer
        question={currentQuestion}
        value={answer}
        onChange={setAnswer}
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
        <p className="mt-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
          {fetcher.data.error}
        </p>
      )}
    </div>
  );
}
