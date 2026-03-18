import { gameState } from "../state/gameState";
import { updateTrainingPlan, startWorkout } from "../state/actions";
import { Button } from "../components/Button";
import {
  calculateWeeklyMileageIncrease,
  isOverMileageThreshold,
} from "../systems/training";
import type { DayPlan } from "../types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WORKOUT_OPTIONS: { value: DayPlan["workout"]; label: string }[] = [
  { value: "easy_run", label: "Easy Run" },
  { value: "long_run", label: "Long Run" },
  { value: "intervals", label: "Intervals" },
  { value: "tempo_run", label: "Tempo Run" },
  { value: "hill_repeats", label: "Hill Repeats" },
  { value: "rest", label: "Rest Day" },
];

export function Training() {
  const state = gameState.value;
  if (!state) return null;

  const { calendar, training } = state;
  const plan = calendar.trainingPlan;

  const mileageIncrease = calculateWeeklyMileageIncrease(
    training.weeklyMileage,
    training.previousWeekMileage,
  );
  const overThreshold = isOverMileageThreshold(mileageIncrease);

  const todayWorkout = plan[calendar.weekDay].workout;

  return (
    <div class="screen">
      <h1 class="screen__header">Training Plan</h1>

      <div class="training__calendar">
        {plan.map((day, i) => (
          <div
            key={i}
            class={`training__day ${i === calendar.weekDay ? "training__day--today" : ""}`}
          >
            <span class="training__day-label">{DAY_NAMES[i]}</span>
            <select
              class="training__day-select"
              value={day.workout}
              onChange={(e) =>
                updateTrainingPlan(i, (e.target as HTMLSelectElement).value as DayPlan["workout"])
              }
            >
              {WORKOUT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div class="training__mileage">
        <span class="training__mileage-label">This week</span>
        <span class="training__mileage-value">
          {training.weeklyMileage.toFixed(1)} mi
        </span>
      </div>

      <div class="training__mileage">
        <span class="training__mileage-label">Last week</span>
        <span class="training__mileage-value">
          {training.previousWeekMileage.toFixed(1)} mi
        </span>
      </div>

      {overThreshold && (
        <div class="training__warning">
          Mileage increase of {mileageIncrease.toFixed(0)}% exceeds the 10%
          rule. Injury risk is elevated.
        </div>
      )}

      <div class="training__streak">
        Streak: <span class="training__streak-value">{training.streak}</span>{" "}
        day{training.streak !== 1 ? "s" : ""}
      </div>

      {todayWorkout !== "rest" && (
        <Button
          label="Start Today's Workout"
          onClick={() => startWorkout(todayWorkout)}
        />
      )}
    </div>
  );
}
