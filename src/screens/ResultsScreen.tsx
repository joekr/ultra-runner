import { useState } from "preact/hooks";
import { Button } from "../components/Button";
import { navigateTo } from "../state/actions";
import type { CompletedRace, SegmentResult } from "../types";

interface ResultsScreenProps {
  race: CompletedRace;
  segmentResults?: SegmentResult[];
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ResultsScreen({ race, segmentResults = [] }: ResultsScreenProps) {
  const [showSplits, setShowSplits] = useState(false);
  const isDNF = race.result === "dnf";

  return (
    <div class="results">
      {isDNF ? (
        <>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
            DNF
          </h1>
          <p class="results__dnf-message">
            Not every run ends at the finish line. But you showed up, you tried,
            and you learned something. Rest up. The road will be there tomorrow.
          </p>
        </>
      ) : (
        <>
          <div class="results__time">{formatTime(race.finishTime)}</div>
          <div class="results__position">
            #{race.position} / {race.totalRunners}
          </div>
          {race.personalBest && (
            <div class="results__pr">PERSONAL BEST!</div>
          )}
        </>
      )}

      <div class="results__earnings">
        <div>
          <div class="results__earning-value">+{race.xpEarned} XP</div>
          <div class="results__earning-label">Experience</div>
        </div>
        <div>
          <div class="results__earning-value">${race.moneyEarned}</div>
          <div class="results__earning-label">Prize Money</div>
        </div>
      </div>

      {segmentResults.length > 0 && (
        <div class="results__splits">
          <button
            class="results__splits-toggle"
            onClick={() => setShowSplits(!showSplits)}
          >
            {showSplits ? "Hide Splits" : "Show Splits"}
          </button>
          {showSplits && (
            <div class="results__splits-list">
              {segmentResults.map((seg, i) => (
                <div key={i} class="results__split-row">
                  <span>Segment {seg.segment + 1}</span>
                  <span>{formatTime(seg.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Button
        label="Continue"
        onClick={() => navigateTo("dashboard")}
      />
    </div>
  );
}
