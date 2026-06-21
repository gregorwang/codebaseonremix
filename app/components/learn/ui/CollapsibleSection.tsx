import { useState, type ReactNode } from "react";

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  tone?: "violet" | "slate" | "brand" | "accent";
};

const toneClass: Record<NonNullable<CollapsibleSectionProps["tone"]>, string> =
  {
    violet:
      "border-violet-200/70 bg-violet-50/70 dark:border-violet-900/60 dark:bg-violet-950/40",
    slate:
      "border-[var(--border-subtle)] bg-[var(--surface-sunken)]",
    brand:
      "border-[var(--border-soft-brand)] bg-[var(--brand-soft)]",
    accent:
      "border-[var(--accent-fg)]/25 bg-[var(--accent-soft)]",
  };

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
  tone = "violet",
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`mt-4 rounded-[var(--radius-card)] border p-4 transition-colors ${toneClass[tone]}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--fg-primary)]">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-[var(--fg-soft)]">{description}</p>
          )}
        </div>
        <span
          aria-hidden
          className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fg-muted)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 4.5L6 7.5L9 4.5" />
          </svg>
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}
