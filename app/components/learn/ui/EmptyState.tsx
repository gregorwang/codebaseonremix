import type { ReactNode } from "react";

type EmptyStateProps = {
  message: string;
  action?: ReactNode;
  icon?: ReactNode;
};

const defaultIcon = (
  <svg
    aria-hidden
    className="h-12 w-12 text-[var(--fg-faint)]"
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="6" width="22" height="30" rx="3" />
    <path d="M14 14h12M14 20h12M14 26h8" />
    <circle cx="34" cy="34" r="7" fill="var(--surface-raised)" />
    <path d="M34 31v6M31 34h6" stroke="var(--brand-fg)" />
  </svg>
);

export function EmptyState({ message, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-6 py-12 text-center">
      <div className="mb-3">{icon ?? defaultIcon}</div>
      <p className="text-sm text-[var(--fg-muted)]">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
