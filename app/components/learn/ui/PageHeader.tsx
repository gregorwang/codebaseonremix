import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Optional right-aligned actions (buttons, links). */
  actions?: ReactNode;
  /** Add a subtle eyebrow line above the title. */
  eyebrow?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="relative pl-4">
        <span
          aria-hidden
          className="absolute left-0 top-1.5 h-7 w-1 rounded-full bg-gradient-to-b from-[var(--color-brand-400)] via-[var(--color-brand-500)] to-[var(--color-accent-500)]"
        />
        {eyebrow && (
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--fg-soft)]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-bold tracking-tight text-[var(--fg-primary)] sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
