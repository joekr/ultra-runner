import { useState } from "preact/hooks";
import { Button } from "../components/Button";
import { startNewGame } from "../state/actions";
import { RunnerIcon } from "../components/Icons";

type Backstory = "couch_to_5k" | "former_athlete" | "hiker" | "stress_runner";

interface BackstoryOption {
  id: Backstory;
  name: string;
  description: string;
  perk: string;
}

const BACKSTORIES: BackstoryOption[] = [
  {
    id: "couch_to_5k",
    name: "Couch to 5K",
    description: "You downloaded the app. This is day one.",
    perk: "+15% XP gain early on",
  },
  {
    id: "former_athlete",
    name: "Former Athlete",
    description: "You used to be fast. Time to find that again.",
    perk: "+200 Endurance XP",
  },
  {
    id: "hiker",
    name: "Weekend Hiker",
    description: "You know trails. Now you want to run them.",
    perk: "+150 Strength XP",
  },
  {
    id: "stress_runner",
    name: "Stress Runner",
    description: "Running keeps you sane. Now make it count.",
    perk: "+150 Recovery XP",
  },
];

export function RunnerCreation() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [backstory, setBackstory] = useState<Backstory | null>(null);

  function handleNext() {
    if (step === 1 && name.trim().length > 0) {
      setStep(2);
    } else if (step === 2 && backstory) {
      setStep(3);
    }
  }

  function handleStart() {
    if (name.trim().length > 0 && backstory) {
      startNewGame(name.trim(), backstory);
    }
  }

  return (
    <div class="creation">
      <div style={{ textAlign: "center", marginBottom: "var(--space-2)" }}>
        <RunnerIcon size={64} color="var(--color-terracotta)" />
      </div>
      <h1 class="creation__title">Ultra Runner</h1>
      <p class="creation__subtitle">
        {step === 1
          ? "What do they call you?"
          : step === 2
            ? "What's your story?"
            : "Here's how it works"}
      </p>

      {step === 1 ? (
        <>
          <p class="creation__step-label">Step 1 of 3</p>
          <input
            class="creation__name-input"
            type="text"
            placeholder="Runner name"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNext();
            }}
            maxLength={20}
            autoFocus
          />
          <Button
            label="Next"
            onClick={handleNext}
            disabled={name.trim().length === 0}
          />
        </>
      ) : step === 2 ? (
        <>
          <p class="creation__step-label">Step 2 of 3</p>
          <div class="creation__backstories">
            {BACKSTORIES.map((bs) => (
              <div
                key={bs.id}
                class={`card card--interactive creation__backstory-card ${backstory === bs.id ? "card--selected" : ""}`}
                onClick={() => setBackstory(bs.id)}
              >
                <div class="creation__backstory-name">{bs.name}</div>
                <div class="creation__backstory-desc">{bs.description}</div>
                <div class="creation__backstory-perk">{bs.perk}</div>
              </div>
            ))}
          </div>
          <Button
            label="Next"
            onClick={handleNext}
            disabled={!backstory}
          />
        </>
      ) : (
        <>
          <p class="creation__step-label">Step 3 of 3</p>
          <div style={{
            textAlign: "left",
            fontSize: "var(--text-sm)",
            lineHeight: 1.6,
            color: "var(--color-warm-gray-600)",
            marginBottom: "var(--space-4)",
          }}>
            <div style={{ marginBottom: "var(--space-3)" }}>
              <strong style={{ color: "var(--color-text)" }}>Train daily.</strong>{" "}
              Tap in rhythm to hit the sweet spot. Different workouts build different stats.
              Easy runs build endurance. Intervals build speed. Hills build strength.
            </div>
            <div style={{ marginBottom: "var(--space-3)" }}>
              <strong style={{ color: "var(--color-text)" }}>Race on Saturdays.</strong>{" "}
              Register for races, then compete on race day. Pick your pace each segment.
              Use fuel to stay strong. Finish well to earn prize money.
            </div>
            <div style={{ marginBottom: "var(--space-3)" }}>
              <strong style={{ color: "var(--color-text)" }}>Manage fatigue.</strong>{" "}
              Push too hard and you'll get injured. Rest days recover fatigue.
              Better fitness means less fatigue from the same workout.
            </div>
            <div style={{ marginBottom: "var(--space-3)" }}>
              <strong style={{ color: "var(--color-text)" }}>Level up to unlock longer races.</strong>{" "}
              Start with 5Ks. Work your way to 10Ks, half marathons, marathons, and beyond.
              The ultimate goal: the Barkley Marathons.
            </div>
            <div>
              <strong style={{ color: "var(--color-text)" }}>Buy gear and fuel.</strong>{" "}
              Better shoes make you faster. Nutrition reduces fatigue mid-run.
              Recovery tools help between workouts. Earn money from races and sponsored runs.
            </div>
          </div>
          <Button
            label="Start Running"
            onClick={handleStart}
          />
        </>
      )}
    </div>
  );
}
