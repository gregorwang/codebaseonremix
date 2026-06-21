type ProgressBarProps = {
  value: number;
  max?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  tone?: "indigo" | "emerald" | "amber";
  showPercent?: boolean;
};

const sizeClass = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-2.5",
};

const fillClass = {
  indigo:
    "bg-gradient-to-r from-[var(--color-brand-400)] via-[var(--color-brand-500)] to-[var(--color-brand-600)]",
  emerald: "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600",
  amber:
    "bg-gradient-to-r from-[var(--color-accent-400)] via-[var(--color-accent-500)] to-[var(--color-accent-600)]",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  size = "md",
  tone = "indigo",
  showPercent = false,
}: ProgressBarProps) {
  const percent =
    max > 0 ? Math.min(100, Math.round((value / max) * 1000) / 10) : 0;

  return (
    <div>
      {(label || showPercent) && (
        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--fg-soft)]">
          {label && <span>{label}</span>}
          {showPercent && (
            <span className="tabular-nums font-medium text-[var(--fg-muted)]">
              {percent}%
            </span>
          )}
        </div>
      )}
      <div
        className={`overflow-hidden rounded-full bg-[var(--surface-inset)] shadow-inner ${sizeClass[size]}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${fillClass[tone]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
