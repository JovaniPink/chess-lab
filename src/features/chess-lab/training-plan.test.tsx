import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { createTrainingPlan, TrainingPlanView } from "./training-plan";

describe("TrainingPlanView", () => {
  it("builds the workbook into twelve independent weekly plans", () => {
    const plan = createTrainingPlan();

    expect(plan.weeks).toHaveLength(12);
    expect(plan.weeks.map((week) => week.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(plan.weeks[0]).toMatchObject({
      phase: "Baseline and threat awareness",
      primaryTarget: "Baseline and threat awareness",
    });
    expect(plan.weeks[10].phase).toBe("Opening consolidation");
    expect(plan.weeks[11].phase).toBe("Audit and redesign");
    expect(plan.weeks.every((week) => week.linkedReviews.length === 0)).toBe(true);

    plan.weeks[0].commitments[0].complete = true;
    expect(plan.weeks[1].commitments[0].complete).toBe(false);
  });

  it("keeps objective and week edits while moving through the open-tab plan", async () => {
    const user = userEvent.setup();
    render(<TrainingPlanHarness />);

    expect(screen.getByText(/Edits survive view changes, then disappear/)).toBeVisible();
    await user.type(
      screen.getByRole("textbox", { name: "Decision-quality goal" }),
      "Notice every immediate threat before choosing candidates.",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "Play two serious games at 15+10 or slower.",
      }),
    );
    await user.type(
      screen.getByRole("spinbutton", { name: "Serious games completed, week 1" }),
      "1",
    );

    await user.click(screen.getByRole("button", { name: /^Week 2,/ }));
    expect(screen.getByRole("heading", { name: "Baseline and threat awareness" })).toBeVisible();
    expect(screen.getByRole("spinbutton", { name: "Serious games completed, week 2" })).toHaveValue(
      null,
    );
    await user.type(
      screen.getByRole("textbox", { name: "Training notes" }),
      "Protect Saturday morning for the long game.",
    );

    await user.click(screen.getByRole("button", { name: "Previous week" }));
    expect(screen.getByRole("spinbutton", { name: "Serious games completed, week 1" })).toHaveValue(
      1,
    );
    expect(
      screen.getByRole("checkbox", {
        name: "Play two serious games at 15+10 or slower.",
      }),
    ).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Decision-quality goal" })).toHaveValue(
      "Notice every immediate threat before choosing candidates.",
    );
  });

  it("returns to a blank plan when a new session mounts", async () => {
    const user = userEvent.setup();
    const firstSession = render(<TrainingPlanHarness />);

    await user.type(
      screen.getByRole("textbox", { name: "Most important habit to build" }),
      "Write candidates before calculating.",
    );
    firstSession.unmount();

    render(<TrainingPlanHarness />);
    expect(screen.getByRole("textbox", { name: "Most important habit to build" })).toHaveValue("");
  });
});

function TrainingPlanHarness() {
  const [plan, setPlan] = useState(() => createTrainingPlan());
  const [selectedWeek, setSelectedWeek] = useState(1);

  return (
    <TrainingPlanView
      plan={plan}
      selectedWeek={selectedWeek}
      onChange={setPlan}
      onSelectWeek={setSelectedWeek}
    />
  );
}
