import { gameState } from "../state/gameState";
import { updateTrainingPlan, startWorkout } from "../state/actions";
import { Button } from "../components/Button";
import {
  calculateWeeklyMileageIncrease,
  isOverMileageThreshold,
} from "../systems/training";
import type { DayPlan } from "../types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WORKOUT_CYCLE: DayPlan["workout"][] = [
  "easy_run",
  "long_run",
  "intervals",
  "rest",
];

function workoutLabel(workout: string): string {
  const map: Record<string, string> = {
    easy_run: "Easy",
    long_run: "Long",
    intervals: "Speed",
    rest: "Rest",
  };
  return map[workout] ?? workout;
}

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

  function cycleDay(dayIndex: number) {
    const current = plan[dayIndex].workout;
    const currentIdx = WORKOUT_CYCLE.indexOf(current);
    const next = WORKOUT_CYCLE[(currentIdx + 1) % WORKOUT_CYCLE.length];
    updateTrainingPlan(dayIndex, next);
  }

  const todayWorkout = plan[calendar.weekDay].workout;

  return (
    <div class="screen">
      <h1 class="screen__header">Training Plan</h1>

      <div class="training__calendar">
        {plan.map((day, i) => (
          <div
            key={i}
            class={`training__day ${i === calendar.weekDay ? "training__day--today" : ""}`}
            onClick={() => cycleDay(i)}
          >
            <span class="training__day-label">{DAY_NAMES[i]}</span>
            <span class="training__day-workout">
              {workoutLabel(day.workout)}
            </span>
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
