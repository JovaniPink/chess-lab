import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChessLab } from "./chess-lab";
const pgn = '[White "Player A"]\n[Black "Player B"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 *';
async function importGame(user: ReturnType<typeof userEvent.setup>, value = pgn) {
  await user.click(screen.getByRole("button", { name: "Load PGN" }));
  fireEvent.change(screen.getByLabelText("Paste game notation"), { target: { value } });
  await user.click(screen.getByRole("button", { name: "Validate & load" }));
}
async function fillReview(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Immediate post-game thoughts"), "I missed a threat.");
  await user.click(screen.getByRole("button", { name: "Continue to replay" }));
  await user.click(screen.getByRole("button", { name: "Next move" }));
  await user.click(screen.getByRole("button", { name: "Mark position" }));
  await user.click(screen.getByRole("button", { name: "Continue to diagnosis" }));
  await user.selectOptions(screen.getByLabelText("Error category"), "Threat blindness");
  await user.type(
    screen.getByLabelText("Corrective drill"),
    "Name three threats before each move.",
  );
  await user.click(screen.getByRole("button", { name: "Review completion" }));
}
describe("ChessLab learning journeys", () => {
  it("replays and submits a move while preserving board focus", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Next move" }));
    expect(screen.getByRole("slider")).toHaveValue("1");
    await user.click(screen.getByRole("button", { name: "Practice" }));
    await user.click(screen.getByRole("gridcell", { name: "f1, white bishop" }));
    const target = screen.getByRole("gridcell", { name: "e2, empty, legal destination" });
    await user.click(target);
    expect(screen.getByText("Coached move found")).toBeVisible();
    expect(screen.getByRole("gridcell", { name: "e2, white bishop" })).toHaveFocus();
  });
  it("keeps focus on replay and undo controls at their boundaries", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Next move" }));
    const previous = screen.getByRole("button", { name: "Previous move" });
    await user.click(previous);
    expect(previous).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Explore" }));
    await user.click(screen.getByRole("gridcell", { name: "e2, white pawn" }));
    await user.click(screen.getByRole("gridcell", { name: "e4, empty, legal destination" }));
    await user.click(screen.getByRole("button", { name: "Explore" }));
    const undo = screen.getByRole("button", { name: "Undo move" });
    await user.click(undo);
    expect(undo).toHaveFocus();
    expect(undo).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("gridcell", { name: "e2, white pawn" })).toBeInTheDocument();
  });
  it("keeps the solution hidden after a wrong answer and resumes the run", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Practice" }));
    await user.click(screen.getByRole("button", { name: "e5 Choose this move" }));
    expect(screen.getByText("Try another idea")).toBeVisible();
    expect(screen.queryByText(/Develops the bishop and prepares/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Training plan" }));
    await user.click(screen.getByRole("button", { name: "Practice" }));
    expect(screen.getByText("Try another idea")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("heading", { name: "Position 1 of 5" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Be2 Choose this move" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Position 2 of 5" })).toHaveFocus();
  });
  it("summarizes skips and reveals honestly and offers a targeted retry", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Start five-position lesson" }));
    await user.click(screen.getByRole("button", { name: "Show coached move" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    for (let i = 0; i < 4; i++)
      await user.click(screen.getByRole("button", { name: "Skip position" }));
    expect(screen.getByRole("heading", { name: "Your study recap" })).toHaveFocus();
    expect(screen.getByLabelText("Takeaway habit")).toHaveValue(
      "Prefer a move that develops a new piece and makes castling easier.",
    );
    await user.click(screen.getByRole("button", { name: "Retry positions needing work" }));
    const confirm = screen.getByRole("dialog", { name: "Start a new practice run?" });
    await user.click(within(confirm).getByRole("button", { name: "Start new run" }));
    expect(screen.getByRole("heading", { name: "Position 1 of 5" })).toBeVisible();
  });
  it("jumps to a critical position inside the existing run without losing progress", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Practice" }));
    await user.click(screen.getByRole("button", { name: "Be2 Choose this move" }));
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByText(/^Critical moments/, { selector: "summary" }));
    await user.click(screen.getAllByRole("button", { name: "Practice this position" })[2]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Position 3 of 5" })).toHaveFocus();
    expect(
      screen.getByRole("grid", { name: "Chess board: Position 3 of 5, your move" }),
    ).toBeVisible();
    for (let i = 0; i < 3; i++)
      await user.click(screen.getByRole("button", { name: "Skip position" }));
    expect(screen.getByRole("heading", { name: "Your study recap" })).toBeVisible();
    expect(screen.getByText("Solved without help").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("Skipped").nextElementSibling).toHaveTextContent("3");
  });
  it("records an illegal lesson candidate as an incorrect attempt with its explanation", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByText(/^Critical moments/, { selector: "summary" }));
    await user.click(screen.getAllByRole("button", { name: "Practice this position" })[4]);
    await user.click(screen.getByRole("button", { name: "Kxf2 Choose this move" }));
    expect(screen.getByText("Try another idea")).toBeVisible();
    expect(screen.getByText(/Illegal: Black's queen on b6 protects/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Show coached move" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Positions attempted").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("Revealed").nextElementSibling).toHaveTextContent("1");
  });
  it("asks before a restart discards run progress", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Practice" }));
    await user.click(screen.getByRole("button", { name: "Restart five-position lesson" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "e5 Choose this move" }));
    const restart = screen.getByRole("button", { name: "Restart five-position lesson" });
    await user.click(restart);
    const confirm = screen.getByRole("dialog", { name: "Start a new practice run?" });
    const keep = within(confirm).getByRole("button", { name: "Keep current run" });
    expect(keep).toHaveFocus();
    await user.click(keep);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(restart).toHaveFocus();
    expect(screen.getByText("Try another idea")).toBeVisible();
    await user.click(restart);
    await user.click(screen.getByRole("button", { name: "Start new run" }));
    expect(screen.queryByText("Try another idea")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Position 1 of 5" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Give me a hint" })).toBeVisible();
  });
  it("asks before practicing a position outside a targeted retry run", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Start five-position lesson" }));
    await user.click(screen.getByRole("button", { name: "Skip position" }));
    for (const san of ["Bf4", "N4c3", "c3", "Kd2"]) {
      await user.click(screen.getByRole("button", { name: `${san} Choose this move` }));
      await user.click(screen.getByRole("button", { name: "Continue" }));
    }
    await user.click(screen.getByRole("button", { name: "Retry positions needing work" }));
    await user.click(screen.getByRole("button", { name: "Start new run" }));
    expect(screen.getByRole("heading", { name: "Position 1 of 1" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Skip position" }));
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByText(/^Critical moments/, { selector: "summary" }));
    await user.click(screen.getAllByRole("button", { name: "Practice this position" })[1]);
    const confirm = screen.getByRole("dialog", { name: "Start a new practice run?" });
    await user.click(within(confirm).getByRole("button", { name: "Start new run" }));
    expect(screen.getByRole("heading", { name: "Position 2 of 5" })).toHaveFocus();
  });
  it("preserves plan edits and disclosures across modes and resets on a fresh mount", async () => {
    const user = userEvent.setup();
    const first = render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Training plan" }));
    expect(screen.getByLabelText("Most important habit to build")).not.toBeVisible();
    await user.click(screen.getByText("Cycle goals", { selector: "summary" }));
    await user.type(screen.getByLabelText("Most important habit to build"), "Check threats.");
    await user.click(screen.getByRole("button", { name: /^Week 3,/ }));
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByRole("button", { name: "Training plan" }));
    expect(screen.getByRole("textbox", { name: "Most important habit to build" })).toHaveValue(
      "Check threats.",
    );
    expect(screen.getByText("Week 3 of 12")).toBeVisible();
    first.unmount();
    render(<ChessLab />);
    expect(screen.queryByLabelText("Games in this tab")).not.toBeInTheDocument();
  });
  it("preserves the PGN draft and rejects invalid notation without replacing the game", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Load PGN" }));
    expect(screen.getByLabelText("Paste game notation")).toHaveValue("");
    await user.type(screen.getByLabelText("Paste game notation"), "not a valid chess game");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Load PGN" }));
    expect(screen.getByLabelText("Paste game notation")).toHaveValue("not a valid chess game");
    await user.click(screen.getByRole("button", { name: "Validate & load" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be parsed");
    expect(screen.getByLabelText("Paste game notation")).toHaveAttribute("aria-invalid", "true");
  });
  it("encourages memory first but permits skipping and lists missing requirements", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await importGame(user);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(screen.getByRole("slider")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Complete" }));
    expect(screen.getByRole("button", { name: "Complete session review" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Record first impressions" }));
    expect(screen.getByLabelText("Immediate post-game thoughts")).toBeVisible();
  });
  it("retains identical-name games and reopens the linked exact position without duplicate links", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await importGame(user);
    await fillReview(user);
    await user.selectOptions(screen.getByLabelText("Training week"), "3");
    await user.click(screen.getByRole("button", { name: "Complete session review" }));
    await importGame(user);
    expect(screen.getByLabelText("Immediate post-game thoughts")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Training plan" }));
    await user.click(screen.getByRole("button", { name: /^Week 3,/ }));
    const links = screen.getByRole("region", { name: "Linked game reviews" });
    expect(within(links).getAllByRole("article")).toHaveLength(1);
    await user.click(within(links).getByRole("button", { name: "Open 1. e4" }));
    expect(screen.getByRole("slider")).toHaveValue("1");
    expect(screen.getByRole("gridcell", { name: "e4, white pawn" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "First impressions" }));
    expect(screen.getByLabelText("Immediate post-game thoughts")).toHaveValue("I missed a threat.");
    await user.type(screen.getByLabelText("Immediate post-game thoughts"), " I will slow down.");
    await user.click(screen.getByRole("button", { name: "Training plan" }));
    expect(screen.getByText("Needs completion again")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Open game review" }));
    await user.click(screen.getByRole("button", { name: "Complete" }));
    await user.selectOptions(screen.getByLabelText("Training week"), "4");
    await user.click(screen.getByRole("button", { name: "Complete session review" }));
    await user.click(screen.getByRole("button", { name: "Open linked Week 4" }));
    expect(
      within(screen.getByRole("region", { name: "Linked game reviews" })).getAllByRole("article"),
    ).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /^Week 3,/ }));
    expect(screen.queryByRole("region", { name: "Linked game reviews" })).not.toBeInTheDocument();
  });
  it("removes a completed review's link when its training week changes", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await importGame(user);
    await fillReview(user);
    await user.selectOptions(screen.getByLabelText("Training week"), "3");
    await user.click(screen.getByRole("button", { name: "Complete session review" }));
    await user.selectOptions(screen.getByLabelText("Training week"), "5");
    await user.click(screen.getByRole("button", { name: "Training plan" }));
    for (const week of [/^Week 3,/, /^Week 5,/]) {
      await user.click(screen.getByRole("button", { name: week }));
      expect(screen.queryByRole("region", { name: "Linked game reviews" })).not.toBeInTheDocument();
    }
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByRole("button", { name: "Complete session review" }));
    await user.click(screen.getByRole("button", { name: "Open linked Week 5" }));
    expect(
      within(screen.getByRole("region", { name: "Linked game reviews" })).getAllByRole("article"),
    ).toHaveLength(1);
  });
  it("restores custom-FEN promotion positions with original move numbering", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await importGame(
      user,
      '[SetUp "1"]\n[FEN "7k/8/8/8/8/8/p7/7K b - - 0 23"]\n[Result "*"]\n\n23... a1=Q+ *',
    );
    await user.click(screen.getByRole("button", { name: "Skip for now" }));
    await user.click(screen.getByRole("button", { name: "Next move" }));
    expect(screen.getByRole("gridcell", { name: "a1, black queen" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Mark position" }));
    await user.click(screen.getByRole("button", { name: "Previous move" }));
    await user.click(screen.getByRole("button", { name: "Return to 23... a1=Q+" }));
    expect(screen.getByRole("slider")).toHaveValue("1");
  });
  it("bounds marking and preserves imported work when opening practice", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await importGame(user);
    await user.click(screen.getByRole("button", { name: "Skip for now" }));
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole("button", { name: "Next move" }));
      await user.click(screen.getByRole("button", { name: "Mark position" }));
    }
    await user.click(screen.getByRole("button", { name: "Next move" }));
    expect(screen.getByRole("button", { name: "Three positions marked" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Practice" }));
    await user.selectOptions(screen.getByLabelText("Games in this tab"), "game-1");
    expect(
      within(screen.getByLabelText("Marked critical positions")).getAllByRole("article"),
    ).toHaveLength(3);
  });
  it("flips player identity and closes the native PGN dialog", async () => {
    const user = userEvent.setup();
    const { container } = render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Flip board" }));
    expect(container.querySelector('[data-player-color="w"]')).toHaveTextContent("Jovani Pink");
    await user.click(screen.getByRole("button", { name: "Load PGN" }));
    fireEvent(
      screen.getByRole("dialog", { name: "Review your game" }),
      new Event("cancel", { cancelable: true }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
