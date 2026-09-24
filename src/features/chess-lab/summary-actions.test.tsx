import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { SummaryActions, summaryText } from "./summary-actions";
import { reviewSummary, weekSummary } from "./summaries";
import { createEmptyImportedGameReview } from "./imported-game-review";
import { createTrainingPlan } from "./training-plan";
import { parsePgn } from "@/lib/chess";
const summary = {
  title: "Draft review",
  sections: [{ heading: "Notes", lines: ["A long note\nwith another line"] }],
};
afterEach(() => vi.restoreAllMocks());
it("copies only after permission succeeds and provides a manual fallback on rejection", async () => {
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  render(<SummaryActions summary={summary} />);
  await user.click(screen.getByRole("button", { name: "Copy summary" }));
  expect(write).toHaveBeenCalledWith(summaryText(summary));
  expect(screen.getByRole("status")).toHaveTextContent("Summary copied.");
  write.mockRejectedValueOnce(new Error("denied"));
  await user.click(screen.getByRole("button", { name: "Copy summary" }));
  expect(screen.getByLabelText("Summary to copy")).toHaveValue(summaryText(summary));
  expect(screen.getByRole("status")).not.toHaveTextContent("Summary copied.");
});
it("prints a separate summary and restores the view after cancellation", async () => {
  const user = userEvent.setup();
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  render(<SummaryActions summary={summary} />);
  await user.click(screen.getByRole("button", { name: "Print summary" }));
  expect(print).toHaveBeenCalledOnce();
  expect(document.body).toHaveClass("printing-summary");
  expect(document.body.querySelector(":scope > .print-summary")).toHaveTextContent("A long note");
  fireEvent(window, new Event("afterprint"));
  await waitFor(() => expect(document.body).not.toHaveClass("printing-summary"));
  expect(document.querySelector(".print-summary")).not.toBeInTheDocument();
});
it("excludes raw notation and unrelated sessions and identifies drafts", () => {
  const game = parsePgn('[White "Synthetic"]\n[Result "*"]\n\n1. e4 *');
  const session = {
    id: "one",
    game,
    review: createEmptyImportedGameReview(),
    stage: "thoughts" as const,
    ply: 0,
    week: 1,
  };
  const text = summaryText(reviewSummary(session));
  expect(text).toContain("Draft review");
  expect(text).not.toContain("[White");
  const plan = createTrainingPlan();
  plan.weeks[0].linkedReviews = [{ id: "link", gameId: "one" }];
  expect(
    summaryText(
      weekSummary(plan, 1, [
        session,
        { ...session, id: "two", game: { ...game, white: "UNRELATED" } },
      ]),
    ),
  ).not.toContain("UNRELATED");
});
