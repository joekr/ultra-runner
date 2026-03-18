interface StatBarProps {
  label: string;
  value: number; // 0-100
  color: string; // CSS var or color
}

export function StatBar({ label, value, color }: StatBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div class="stat-bar">
      <span class="stat-bar__label">{label}</span>
      <div class="stat-bar__track">
        <div
          class="stat-bar__fill"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span class="stat-bar__value">{clamped}</span>
    </div>
  );
}
