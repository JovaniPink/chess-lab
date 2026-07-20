import { createActor } from "xstate";
import { describe, expect, it, vi } from "vitest";
import { chessLabMachine } from "./chess-lab-machine";

describe("chess lab state machine", () => {
  it("bounds review navigation and stops autoplay at the end", async () => {
    vi.useFakeTimers();
    const actor = createActor(chessLabMachine).start();

    actor.send({ type: "PREV" });
    expect(actor.getSnapshot().context.currentPly).toBe(0);

    actor.send({ type: "LOAD_GAME", maxPly: 1 });
    actor.send({ type: "PLAY" });
    await vi.advanceTimersByTimeAsync(1700);
    expect(actor.getSnapshot().matches("review")).toBe(true);
    expect(actor.getSnapshot().context.currentPly).toBe(1);

    actor.stop();
    vi.useRealTimers();
  });

  it("locks a submitted lesson answer until the next lesson", () => {
    const actor = createActor(chessLabMachine).start();
    actor.send({ type: "PRACTICE", lessonIndex: 2 });
    actor.send({
      type: "SUBMIT_ANSWER",
      answer: { san: "Nxc5", fen: "test-fen", correct: false },
    });
    expect(actor.getSnapshot().matches("feedback")).toBe(true);
    expect(actor.getSnapshot().context.submittedAnswer?.san).toBe("Nxc5");

    actor.send({
      type: "SUBMIT_ANSWER",
      answer: { san: "N4c3", fen: "replacement", correct: true },
    });
    expect(actor.getSnapshot().context.submittedAnswer?.san).toBe("Nxc5");

    actor.send({ type: "NEXT_LESSON" });
    expect(actor.getSnapshot().matches("practice")).toBe(true);
    expect(actor.getSnapshot().context.lessonIndex).toBe(3);
    expect(actor.getSnapshot().context.submittedAnswer).toBeNull();
  });

  it("records and resets an exploration branch", () => {
    const actor = createActor(chessLabMachine).start();
    actor.send({ type: "EXPLORE", fen: "start" });
    actor.send({ type: "BRANCH_MOVE", fen: "next", san: "e4", from: "e2", to: "e4" });
    expect(actor.getSnapshot().context.branchMoves).toEqual(["e4"]);
    expect(actor.getSnapshot().context.branchFen).toBe("next");

    actor.send({ type: "RESET_BRANCH" });
    expect(actor.getSnapshot().context.branchMoves).toEqual([]);
    expect(actor.getSnapshot().context.branchFen).toBe("start");
  });

  it("loads imported games into a clean review state", () => {
    const actor = createActor(chessLabMachine).start();
    actor.send({ type: "PLAY" });
    actor.send({ type: "LOAD_GAME", maxPly: 7 });
    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("review")).toBe(true);
    expect(snapshot.context).toMatchObject({ currentPly: 0, maxPly: 7, submittedAnswer: null });
  });
});
