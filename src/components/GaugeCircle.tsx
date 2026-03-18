interface GaugeCircleProps {
  value: number; // 0-100
  label: string;
  color: string;
  size?: number;
}

export function GaugeCircle({
  value,
  label,
  color,
  size = 64,
}: GaugeCircleProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const strokeWidth = size * 0.12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div class="gauge-circle">
      <svg
        class="gauge-circle__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          class="gauge-circle__bg"
          cx={center}
          cy={center}
          r={radius}
          stroke-width={strokeWidth}
        />
        <circle
          class="gauge-circle__fill"
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          stroke-width={strokeWidth}
          stroke-dasharray={circumference}
          stroke-dashoffset={offset}
        />
        <text
          x={center}
          y={center}
          text-anchor="middle"
          dominant-baseline="central"
          class="gauge-circle__text"
          transform={`rotate(90, ${center}, ${center})`}
          style={{ fontSize: `${size * 0.22}px` }}
        >
          {Math.round(clamped)}
        </text>
      </svg>
      <span class="gauge-circle__label">{label}</span>
    </div>
  );
}
