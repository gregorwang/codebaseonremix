import { Link } from "react-router";
import type { Exam, ExamResult } from "~/lib/learn/types";
import { Badge } from "~/components/learn/ui/Badge";

type ExamCardProps = {
  exam: Exam;
  latestResult?: ExamResult | null;
};

export function ExamCard({ exam, latestResult }: ExamCardProps) {
  return (
    <Link
      to={`/learn/exams/${exam.slug}`}
      className="studio-card studio-card-interactive group relative block overflow-hidden p-0"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-400 via-indigo-500 to-violet-600"
      />
      <div className="p-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold tracking-tight text-[var(--fg-primary)]">
            {exam.title}
          </h3>
          {latestResult && (
            <Badge variant={latestResult.isPassed ? "success" : "danger"} dot>
              {latestResult.isPassed ? "已通过" : "未通过"} {latestResult.score}
            </Badge>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--fg-muted)]">
          {exam.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="muted">{exam.tasks.length} 题</Badge>
          <Badge variant="muted">及格线 {exam.passingScore} 分</Badge>
        </div>
      </div>
    </Link>
  );
}
