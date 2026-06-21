import type { ReactNode } from "react";
import { Link } from "react-router";

type StatCardProps = {
  to: string;
  label: string;
  value: ReactNode;
  hint: string;
  accent?: "rose" | "indigo" | "emerald" | "amber" | "slate";
};

const accentDot: Record<NonNullable<StatCardProps["accent"]>, string> = {
  rose: "bg-rose-500/90",
  indigo: "bg-[var(--color-brand-500)]",
  emerald: "bg-emerald-500/90",
  amber: "bg-[var(--color-accent-500)]",
  slate: "bg-slate-400",
};

const accentText: Record<NonNullable<StatCardProps["accent"]>, string> = {
  rose: "text-rose-600 dark:text-rose-300",
  indigo: "text-[var(--brand-fg)]",
  emerald: "text-emerald-600 dark:text-emerald-300",
  amber: "text-[var(--accent-fg)]",
  slate: "text-slate-700 dark:text-slate-300",
};

export function StatCard({
  to,
  label,
  value,
  hint,
  accent = "indigo",
}: StatCardProps) {
  return (
    <Link
      to={to}
      className="studio-card studio-card-interactive group block p-4 focus-visible:outline-none focus-visible:[box-shadow:var(--shadow-focus)]"
    >
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${accentDot[accent]}`} />
        <p className="text-sm font-semibold text-[var(--fg-primary)]">{label}</p>
      </div>
      <p
        className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${accentText[accent]}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--fg-soft)]">{hint}</p>
    </Link>
  );
}
