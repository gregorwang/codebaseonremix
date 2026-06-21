import type { Exam } from "~/lib/learn/types";
import { Badge } from "~/components/learn/ui/Badge";

export function ExamScenario({ exam }: { exam: Exam }) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-[var(--radius-card-lg)] border border-[var(--border-soft-brand)] p-6">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[var(--brand-soft)] via-[var(--surface-raised)] to-[var(--accent-soft)]"
      />
      <div className="relative">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-[var(--brand-fg-strong)]">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7l9-4 9 4-9 4z" />
            <path d="M3 12l9 4 9-4M3 17l9 4 9-4" />
          </svg>
          考试场景
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--fg-muted)]">
          {exam.scenario}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="info">及格线 {exam.passingScore} 分</Badge>
          <Badge variant="info">共 {exam.tasks.length} 题</Badge>
        </div>
      </div>
    </section>
  );
}
