import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChessLab } from "./chess-lab";

describe("ChessLab", () => {
  it("navigates the review and submits the first lesson on the board", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);

    const slider = screen.getByRole("slider", { name: "Game move" });
    expect(slider).toHaveValue("0");
    await user.click(screen.getByRole("button", { name: "Next move" }));
    expect(slider).toHaveValue("1");

    await user.click(screen.getByRole("button", { name: "Find the move" }));
    expect(screen.getByText("A premature advance")).toBeVisible();

    await user.click(screen.getByRole("gridcell", { name: "f1, white bishop" }));
    await user.click(screen.getByRole("gridcell", { name: "e2, empty, legal destination" }));
    expect(screen.getByText("Exactly.")).toBeVisible();
    expect(screen.getByRole("button", { name: /Be2/ })).toBeDisabled();
  });

  it("shows targeted candidate feedback and advances lessons", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Find the move" }));
    await user.click(screen.getByRole("button", { name: /e5/ }));
    expect(screen.getByText("Look one layer deeper.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next lesson" }));
    expect(screen.getByText("The first concrete oversight")).toBeVisible();
  });

  it("rejects malformed PGN and loads valid PGN headers", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Load PGN" }));

    const input = screen.getByLabelText("PGN notation");
    await user.clear(input);
    await user.type(input, "not a chess game");
    await user.click(screen.getByRole("button", { name: "Validate & load" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be parsed");

    await user.clear(input);
    fireEvent.change(input, {
      target: {
        value: `[White "Ada"]\n[Black "Grace"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`,
      },
    });
    await user.click(screen.getByRole("button", { name: "Validate & load" }));
    await waitFor(() => expect(screen.getByText(/Ada vs. Grace/)).toBeVisible());
    expect(screen.getByRole("button", { name: "Find the move" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Remember first. Diagnose second." })).toBeVisible();
  });

  it("turns an imported game into one human-first session review", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Load PGN" }));
    fireEvent.change(screen.getByLabelText("PGN notation"), {
      target: {
        value: `[White "Ada"]\n[Black "Grace"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`,
      },
    });
    await user.click(screen.getByRole("button", { name: "Validate & load" }));

    const completeReview = screen.getByRole("button", { name: "Complete session review" });
    expect(completeReview).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: "Immediate post-game thoughts" }),
      "I felt uncertain after ...e5 and only calculated checks.",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Suspected first important mistake" }),
      "I stopped checking Grace's threats.",
    );

    await user.click(screen.getByRole("button", { name: "Next move" }));
    await user.click(screen.getByRole("button", { name: "Next move" }));
    await user.click(screen.getByRole("button", { name: "Mark current position" }));
    expect(screen.getByLabelText("Marked critical positions")).toHaveTextContent("1... e5");
    await user.type(
      screen.getByRole("textbox", { name: "Why was this position critical?" }),
      "The position required a threat scan.",
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Error category" }),
      "Threat blindness",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Corrective drill" }),
      "Replay this position and name every threat before choosing a move.",
    );
    expect(completeReview).toBeEnabled();
    await user.click(completeReview);

    expect(screen.getByText("Session review complete")).toBeVisible();
    expect(screen.getByText(/Threat blindness → Replay this position/)).toBeVisible();
    expect(screen.getByText("1", { selector: ".study-facts strong" })).toBeVisible();
  });

  it("returns a marked custom-FEN position to its legally reconstructed board", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Load PGN" }));
    fireEvent.change(screen.getByLabelText("PGN notation"), {
      target: {
        value: `[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n[Result "*"]\n\n1. a8=Q+ *`,
      },
    });
    await user.click(screen.getByRole("button", { name: "Validate & load" }));

    expect(screen.getByRole("gridcell", { name: "a7, white pawn" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next move" }));
    expect(screen.getByRole("gridcell", { name: "a8, white queen" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Mark current position" }));

    await user.click(screen.getByRole("button", { name: "Previous move" }));
    expect(screen.getByRole("gridcell", { name: "a7, white pawn" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Return to 1. a8=Q+" }));

    expect(screen.getByRole("slider", { name: "Game move" })).toHaveValue("1");
    expect(screen.getByRole("gridcell", { name: "a8, white queen" })).toBeVisible();
  });

  it("closes the PGN dialog when its native cancel event fires", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Load PGN" }));
    const dialog = screen.getByRole("dialog", { name: "Load a PGN to replay" });
    fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
  });

  it("keeps the player rows aligned with the board orientation", async () => {
    const user = userEvent.setup();
    const { container } = render(<ChessLab />);

    const playerRows = () => container.querySelectorAll<HTMLElement>("[data-player-color]");
    expect(playerRows()[0]).toHaveAttribute("data-player-color", "b");
    expect(playerRows()[0]).toHaveTextContent("Computer");
    expect(playerRows()[1]).toHaveAttribute("data-player-color", "w");
    expect(playerRows()[1]).toHaveTextContent("Jovani Pink");

    await user.click(screen.getByRole("button", { name: "Flip board" }));
    expect(playerRows()[0]).toHaveAttribute("data-player-color", "w");
    expect(playerRows()[1]).toHaveAttribute("data-player-color", "b");
  });
});
