interface ProgressBarProps {
  value: number; // 0-1
  label?: string;
  color?: string;
}

export function ProgressBar({
  value,
  label,
  color = "var(--color-terracotta)",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div class="progress-bar">
      {label && <div class="progress-bar__label">{label}</div>}
      <div class="progress-bar__track">
        <div
          class="progress-bar__fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
