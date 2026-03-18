import { useState } from "preact/hooks";
import { Button } from "./Button";

interface AidStationPanelProps {
  onContinue: (timeSpentSeconds: number) => void;
}

export function AidStationPanel({ onContinue }: AidStationPanelProps) {
  const [seconds, setSeconds] = useState(60);

  return (
    <div class="aid-station">
      <h3 class="aid-station__title">Aid Station</h3>
      <p class="aid-station__description">
        Water, electrolytes, and a moment to regroup. More time means better
        recovery, but the clock keeps ticking.
      </p>
      <input
        type="range"
        class="aid-station__slider"
        min={15}
        max={300}
        step={15}
        value={seconds}
        onInput={(e) =>
          setSeconds(Number((e.target as HTMLInputElement).value))
        }
      />
      <div class="aid-station__time">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} at
        station
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <Button
          label="Stop & Recover"
          onClick={() => onContinue(seconds)}
        />
        <Button
          label="Skip"
          onClick={() => onContinue(0)}
          variant="secondary"
        />
      </div>
    </div>
  );
}
