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
  });

  it("closes the PGN dialog when its native cancel event fires", async () => {
    const user = userEvent.setup();
    render(<ChessLab />);
    await user.click(screen.getByRole("button", { name: "Load PGN" }));
    const dialog = screen.getByRole("dialog", { name: "Load a PGN to replay" });
    fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
  });
});
