import { ABILITY_TAG_LABELS } from "~/lib/learn/abilityTags";
import type { Exam, ExamResult } from "~/lib/learn/types";
import type { ExamGradeFeedback } from "~/lib/server/learn/examGrading.server";
import { Badge } from "~/components/learn/ui/Badge";
import { ProgressBar } from "~/components/learn/ui/ProgressBar";

type ExamResultPanelProps = {
  exam: Exam;
  result: ExamResult;
};

export function ExamResultPanel({ exam, result }: ExamResultPanelProps) {
  const feedback = result.feedback as ExamGradeFeedback;
  const taskMap = new Map(exam.tasks.map((t) => [t.id, t]));
  const correctCount = (feedback.tasks ?? []).filter((t) => t.isCorrect).length;
  const totalTasks = feedback.tasks?.length ?? exam.tasks.length;

  const passed = result.isPassed;

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card-lg)] border bg-[var(--surface-raised)] shadow-[var(--shadow-card)]"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-1 ${
          passed
            ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600"
            : "bg-gradient-to-r from-amber-400 via-amber-500 to-rose-500"
        }`}
      />
      <div className="p-6 pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight text-[var(--fg-primary)]">
            考试结果
          </h2>
          <Badge variant={passed ? "success" : "danger"} dot>
            {passed ? "通过" : "未通过"}
          </Badge>
        </div>

        <div className="mt-5 flex items-baseline gap-2">
          <p
            className={`text-5xl font-bold tabular-nums tracking-tight ${
              passed
                ? "bg-gradient-to-br from-emerald-500 to-emerald-700 bg-clip-text text-transparent"
                : "bg-gradient-to-br from-amber-500 to-rose-600 bg-clip-text text-transparent"
            }`}
          >
            {result.score}
          </p>
          <p className="text-base font-medium text-[var(--fg-soft)]">/ 100</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
          {feedback.summary}
        </p>

        <div className="mt-4">
          <ProgressBar
            value={correctCount}
            max={totalTasks || 1}
            label={`答对 ${correctCount}/${totalTasks} 题`}
            tone={passed ? "emerald" : "amber"}
            showPercent
          />
        </div>

        {result.weakAbilities && result.weakAbilities.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]">
              薄弱能力
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.weakAbilities.map((tag) => (
                <Badge key={tag} variant="warning" dot>
                  {ABILITY_TAG_LABELS[tag]}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]">
            逐题结果
          </p>
          <ul className="mt-2 space-y-1.5">
            {(feedback.tasks ?? []).map((task, index) => {
              const meta = taskMap.get(task.taskId);
              return (
                <li
                  key={task.taskId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        task.isCorrect
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="truncate text-[var(--fg-primary)]">
                      {meta?.title ?? task.taskId}
                    </span>
                  </span>
                  <Badge variant={task.isCorrect ? "success" : "danger"}>
                    {task.isCorrect ? "正确" : "错误"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
