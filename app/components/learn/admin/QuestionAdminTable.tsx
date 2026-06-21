import { Link } from "react-router";
import type { AdminQuestionListItem } from "~/lib/server/learn/questions.server";
import { Badge } from "~/components/learn/ui/Badge";
import { EmptyState } from "~/components/learn/ui/EmptyState";

type QuestionAdminTableProps = {
  questions: AdminQuestionListItem[];
};

export function QuestionAdminTable({ questions }: QuestionAdminTableProps) {
  if (questions.length === 0) {
    return <EmptyState message="暂无题目" />;
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-[var(--shadow-card)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--surface-sunken)] text-left">
          <tr>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]">
              题目
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]">
              课程 / 关卡
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]">
              题型
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]">
              状态
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-soft)]">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {questions.map((q) => (
            <tr
              key={q.id}
              className="bg-[var(--surface-raised)] transition-colors hover:bg-[var(--brand-soft)]/40"
            >
              <td className="px-4 py-3">
                <p className="font-medium text-[var(--fg-primary)]">{q.title}</p>
                <p className="font-mono text-xs text-[var(--fg-soft)]">{q.id}</p>
              </td>
              <td className="px-4 py-3">
                <Link
                  to={`/learn/courses/${q.courseSlug}/lessons/${q.lessonSlug}`}
                  className="font-medium text-[var(--brand-fg)] hover:underline"
                >
                  {q.courseTitle} / {q.lessonTitle}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-0.5 font-mono text-xs text-[var(--fg-muted)]">
                  {q.type}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge variant={q.isPublished ? "success" : "muted"} dot>
                  {q.isPublished ? "已发布" : "未发布"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {!q.isPublished && (
                    <form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value="publish_question"
                      />
                      <input type="hidden" name="questionId" value={q.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/15"
                      >
                        发布
                      </button>
                    </form>
                  )}
                  {q.isPublished && (
                    <form method="post">
                      <input
                        type="hidden"
                        name="intent"
                        value="archive_question"
                      />
                      <input type="hidden" name="questionId" value={q.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
                      >
                        下架
                      </button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
