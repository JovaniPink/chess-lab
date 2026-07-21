import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chess } from "chess.js";
import { describe, expect, it, vi } from "vitest";
import { ChessBoard } from "./chess-board";

describe("ChessBoard promotion", () => {
  it("focuses the promotion dialog, supports Escape, and submits the chosen piece", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn(() => true);
    render(
      <ChessBoard
        chess={new Chess("7k/P7/8/8/8/8/8/7K w - - 0 1")}
        flipped={false}
        interactive
        positionLabel="promotion test"
        onMove={onMove}
      />,
    );

    const origin = screen.getByRole("gridcell", { name: "a7, white pawn" });
    await user.click(origin);
    await user.click(screen.getByRole("gridcell", { name: "a8, empty, legal destination" }));

    const dialog = screen.getByRole("dialog", { name: "Promote to" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "queen" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Promote to" })).not.toBeInTheDocument();
    expect(origin).toHaveFocus();

    await user.click(screen.getByRole("gridcell", { name: "a8, empty, legal destination" }));
    await user.click(screen.getByRole("button", { name: "knight" }));
    expect(onMove).toHaveBeenCalledWith("a7", "a8", "n");
  });
});
