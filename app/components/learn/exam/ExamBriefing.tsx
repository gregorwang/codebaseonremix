import type { Exam, ExamBriefing } from "~/lib/learn/types";

type ExamBriefingPanelProps = {
  exam: Exam;
  onStart: () => void;
};

function BriefingSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="studio-card p-5">
      <h3 className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-soft)]">
        <span className="text-[var(--accent-fg)]" aria-hidden>
          {icon}
        </span>
        {title}
      </h3>
      <div className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
        {children}
      </div>
    </section>
  );
}

const fileIcon = (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
  </svg>
);

const targetIcon = (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
  </svg>
);

const scopeIcon = (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
  </svg>
);

const bgIcon = (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12h7l3-9 4 18 3-9h1" />
  </svg>
);

export function ExamBriefingPanel({ exam, onStart }: ExamBriefingPanelProps) {
  const briefing: ExamBriefing | undefined = exam.briefing;

  return (
    <div className="space-y-4">
      <header className="relative overflow-hidden rounded-[var(--radius-card-lg)] border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-indigo-50/60 p-7 dark:border-violet-500/30 dark:from-violet-950/40 dark:via-[var(--surface-raised)] dark:to-indigo-950/30">
        <div
          aria-hidden
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-violet-400/30 to-indigo-400/20 blur-3xl"
        />
        <div className="relative">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            项目改造大关
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--fg-primary)] sm:text-3xl">
            {exam.title}
          </h2>
          <p className="mt-2 text-[var(--fg-muted)]">{exam.description}</p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]">
            {exam.scenario}
          </p>
          <p className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs text-[var(--fg-soft)]">
            <span className="rounded-full border border-violet-200/60 bg-white/70 px-2.5 py-1 font-medium text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-200">
              共 {exam.tasks.length} 道任务
            </span>
            <span className="rounded-full border border-violet-200/60 bg-white/70 px-2.5 py-1 font-medium text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-200">
              及格线 {exam.passingScore}%
            </span>
          </p>
        </div>
      </header>

      {briefing && (
        <>
          <BriefingSection title="任务背景" icon={bgIcon}>
            {briefing.taskBackground}
          </BriefingSection>
          <BriefingSection title="目标效果" icon={targetIcon}>
            {briefing.targetOutcome}
          </BriefingSection>
          <BriefingSection title="涉及文件" icon={fileIcon}>
            <ul className="space-y-1 font-mono text-xs">
              {briefing.involvedFiles.map((file) => (
                <li
                  key={file}
                  className="rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-2 py-1"
                >
                  {file}
                </li>
              ))}
            </ul>
          </BriefingSection>
          <BriefingSection title="影响范围" icon={scopeIcon}>
            <ul className="ml-4 list-disc space-y-1 marker:text-[var(--accent-fg)]">
              {briefing.impactScope.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </BriefingSection>
        </>
      )}

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onStart}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 via-violet-600 to-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgb(124_58_237_/_0.5)] transition-transform hover:-translate-y-0.5"
        >
          开始大关
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
      </div>
    </div>
  );
}
