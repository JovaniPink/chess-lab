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

it("exposes rows and keeps the last inspected square as the keyboard entry point", async () => {
  const user = userEvent.setup();
  render(
    <ChessBoard
      chess={new Chess()}
      flipped={false}
      interactive
      positionLabel="start"
      onMove={() => true}
    />,
  );
  expect(screen.getAllByRole("row")).toHaveLength(8);
  const origin = screen.getByRole("gridcell", { name: "e2, white pawn" });
  await user.click(origin);
  await user.keyboard("{ArrowUp}");
  expect(screen.getByRole("gridcell", { name: "e3, empty, legal destination" })).toHaveAttribute(
    "tabindex",
    "0",
  );
});

it.each([false, true])(
  "navigates visual rows and corners without wrapping (flipped=%s)",
  async (flipped) => {
    const user = userEvent.setup();
    render(
      <ChessBoard
        chess={new Chess()}
        flipped={flipped}
        interactive={false}
        positionLabel="read-only"
        onMove={() => false}
      />,
    );
    await user.click(screen.getByRole("gridcell", { name: "e2, white pawn" }));
    await user.keyboard("{Home}");
    expect(
      screen.getByRole("gridcell", { name: `${flipped ? "h" : "a"}2, white pawn` }),
    ).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(
      screen.getByRole("gridcell", { name: `${flipped ? "h" : "a"}2, white pawn` }),
    ).toHaveFocus();
    await user.keyboard("{Control>}{End}{/Control}");
    expect(
      screen.getByRole("gridcell", { name: flipped ? "a8, black rook" : "h1, white rook" }),
    ).toHaveFocus();
    await user.keyboard("{Control>}{Home}{/Control}");
    expect(
      screen.getByRole("gridcell", { name: flipped ? "h1, white rook" : "a8, black rook" }),
    ).toHaveFocus();
    expect(screen.getAllByRole("gridcell").filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
  },
);

it("announces an illegal destination without submitting a practice attempt", async () => {
  const user = userEvent.setup();
  const onMove = vi.fn();
  render(
    <ChessBoard
      chess={new Chess()}
      flipped={false}
      interactive
      positionLabel="start"
      onMove={onMove}
    />,
  );
  await user.click(screen.getByRole("gridcell", { name: "e2, white pawn" }));
  await user.click(screen.getByRole("gridcell", { name: "e5, empty" }));
  expect(screen.getByRole("status")).toHaveTextContent("That destination is not legal");
  expect(onMove).not.toHaveBeenCalled();
  await user.keyboard("{Escape}");
  expect(screen.getByRole("gridcell", { name: "e2, white pawn" })).toHaveAttribute(
    "aria-selected",
    "false",
  );
});
