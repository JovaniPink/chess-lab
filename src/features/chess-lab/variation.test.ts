import { Chess } from "chess.js";
import { createActor } from "xstate";
import { expect, it } from "vitest";
import { chessLabMachine } from "./chess-lab-machine";
it.each([
  [new Chess().fen(), ["e4", "d5", "exd5"]],
  ["r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", ["O-O", "O-O-O"]],
  ["7k/8/8/3pP3/8/8/8/7K w - d6 0 12", ["exd6"]],
  ["7k/P7/8/8/8/8/8/7K w - - 0 23", ["a8=N"]],
])("undo restores full chess state for %s", (fen, line) => {
  const actor = createActor(chessLabMachine).start();
  const chess = new Chess(fen);
  const states = [fen];
  actor.send({ type: "EXPLORE", fen });
  for (const san of line) {
    const m = chess.move(san);
    actor.send({ type: "BRANCH_MOVE", ...m, fen: chess.fen() });
    states.push(chess.fen());
  }
  for (let i = line.length - 1; i >= 0; i--) {
    actor.send({ type: "UNDO_BRANCH" });
    chess.undo();
    expect(actor.getSnapshot().context.branchFen).toBe(states[i]);
    expect(actor.getSnapshot().context.branchLastMove).toEqual(
      i
        ? {
            from: chess.history({ verbose: true }).at(-1)!.from,
            to: chess.history({ verbose: true }).at(-1)!.to,
          }
        : null,
    );
  }
  actor.stop();
});
