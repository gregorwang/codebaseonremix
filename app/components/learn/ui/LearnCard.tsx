import type { ElementType, ReactNode } from "react";

type Tone =
  | "default"
  | "brand"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

type LearnCardProps = {
  children: ReactNode;
  className?: string;
  tone?: Tone;
  /**
   * Adds hover-lift treatment. Pair with a wrapping <a>/<button>/<Link>
   * (this component is a div, but the hover styles work fine when the
   * surrounding element is the actual anchor — see CourseCard).
   */
  interactive?: boolean;
  /** Render as another tag (e.g. "section"). */
  as?: ElementType;
  /** Drop the default top hairline (used when the card has its own header). */
  flush?: boolean;
};

const toneClass: Record<Tone, string> = {
  default: "",
  brand:
    "bg-[var(--brand-soft)] border-[var(--border-soft-brand)] text-[var(--fg-primary)]",
  accent: "bg-[var(--accent-soft)] border-[var(--accent-fg)]/30 text-[var(--fg-primary)]",
  success:
    "bg-[var(--success-soft)] border-[var(--success-border)] text-[var(--fg-primary)]",
  warning:
    "bg-[var(--warning-soft)] border-[var(--warning-border)] text-[var(--fg-primary)]",
  danger:
    "bg-[var(--danger-soft)] border-[var(--danger-border)] text-[var(--fg-primary)]",
  info: "bg-[var(--info-soft)] border-[var(--info-border)] text-[var(--fg-primary)]",
};

export function LearnCard({
  children,
  className = "",
  tone = "default",
  interactive = false,
  as: As = "div",
  flush = false,
}: LearnCardProps) {
  const base =
    tone === "default"
      ? "studio-card"
      : "relative rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]";
  const hairline = flush || tone !== "default" ? "" : "";
  const interactiveClass = interactive ? "studio-card-interactive" : "";
  return (
    <As
      className={`${base} ${toneClass[tone]} ${hairline} ${interactiveClass} p-5 ${className}`}
    >
      {children}
    </As>
  );
}
