import type { ReactNode } from "react";

type Variant =
  | "default"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "muted";

type BadgeProps = {
  children: ReactNode;
  variant?: Variant;
  /** Show a 6px leading dot (status pill). */
  dot?: boolean;
  /** Outlined / soft style. Defaults to "soft". */
  appearance?: "soft" | "solid";
};

const softClass: Record<Variant, string> = {
  default:
    "bg-[var(--brand-soft)] border border-[var(--border-soft-brand)] text-[var(--brand-fg)]",
  success:
    "bg-[var(--success-soft)] border border-[var(--success-border)] text-[var(--success-fg)]",
  danger: "bg-[var(--danger-soft)] border border-[var(--danger-border)] text-[var(--danger-fg)]",
  warning:
    "bg-[var(--warning-soft)] border border-[var(--warning-border)] text-[var(--warning-fg)]",
  info: "bg-[var(--info-soft)] border border-[var(--info-border)] text-[var(--info-fg)]",
  muted:
    "bg-[var(--surface-inset)] border border-[var(--border-subtle)] text-[var(--fg-muted)]",
};

const solidClass: Record<Variant, string> = {
  default:
    "bg-[var(--color-brand-600)] border border-[var(--color-brand-600)] text-white",
  success: "bg-emerald-500 border border-emerald-500 text-white",
  danger: "bg-rose-500 border border-rose-500 text-white",
  warning: "bg-amber-500 border border-amber-500 text-white",
  info: "bg-slate-500 border border-slate-500 text-white",
  muted: "bg-slate-500 border border-slate-500 text-white",
};

const dotColor: Record<Variant, string> = {
  default: "bg-[var(--color-brand-500)]",
  success: "bg-emerald-500",
  danger: "bg-rose-500",
  warning: "bg-amber-500",
  info: "bg-slate-500",
  muted: "bg-slate-400",
};

export function Badge({
  children,
  variant = "default",
  dot = false,
  appearance = "soft",
}: BadgeProps) {
  const cls = appearance === "soft" ? softClass[variant] : solidClass[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            appearance === "soft" ? dotColor[variant] : "bg-white/90"
          }`}
        />
      )}
      {children}
    </span>
  );
}
