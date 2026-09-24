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
    expect(actor.getSnapshot().context.run?.phase).toBe("incorrect");
    expect(actor.getSnapshot().context.submittedAnswer?.san).toBe("Nxc5");

    actor.send({
      type: "SUBMIT_ANSWER",
      answer: { san: "N4c3", fen: "replacement", correct: true },
    });
    expect(actor.getSnapshot().context.submittedAnswer?.san).toBe("Nxc5");

    actor.send({ type: "NEXT_LESSON" });
    expect(actor.getSnapshot().context.lessonIndex).toBe(2);
    actor.send({ type: "RETRY" });
    actor.send({
      type: "SUBMIT_ANSWER",
      answer: { san: "N4c3", fen: "replacement", correct: true },
    });
    actor.send({ type: "NEXT_LESSON" });
    expect(actor.getSnapshot().matches("practice")).toBe(true);
    expect(actor.getSnapshot().context.lessonIndex).toBe(3);
    expect(actor.getSnapshot().context.submittedAnswer).toBeNull();
  });

  it("records and resets an exploration branch", () => {
    const actor = createActor(chessLabMachine).start();
    actor.send({ type: "EXPLORE", fen: "start" });
    actor.send({
      type: "BRANCH_MOVE",
      fen: "next",
      san: "e4",
      from: "e2",
      to: "e4",
      color: "w",
      piece: "p",
    });
    expect(actor.getSnapshot().context.branchMoves).toMatchObject([{ san: "e4" }]);
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

it("retains attempts and hints across retry and game loading without counting reveal as solved", () => {
  const actor = createActor(chessLabMachine).start();
  actor.send({ type: "PRACTICE" });
  actor.send({ type: "HINT" });
  actor.send({ type: "SUBMIT_ANSWER", answer: { san: "e5", fen: "test", correct: false } });
  actor.send({ type: "RETRY" });
  actor.send({ type: "LOAD_GAME", maxPly: 4 });
  actor.send({ type: "PRACTICE" });
  expect(actor.getSnapshot().context.run?.progress["premature-advance"]).toMatchObject({
    hintUsed: true,
    outcome: "pending",
    attempts: [{ san: "e5" }],
  });
  actor.send({ type: "REVEAL", answer: { san: "Be2", fen: "test", correct: true } });
  expect(actor.getSnapshot().context.run?.progress["premature-advance"]).toMatchObject({
    outcome: "revealed",
    attempts: [{ san: "e5" }],
  });
  actor.stop();
});

describe("practice phase guards", () => {
  const correct = { san: "Be2", fen: "solved", correct: true };
  const wrong = { san: "e5", fen: "wrong", correct: false };

  it("ignores reveal, skip, hint, and retry after a solve", () => {
    const actor = createActor(chessLabMachine).start();
    actor.send({ type: "PRACTICE" });
    actor.send({ type: "SUBMIT_ANSWER", answer: correct });
    const solved = actor.getSnapshot().context;
    for (const type of ["SKIP", "HINT", "RETRY"] as const) actor.send({ type });
    actor.send({ type: "REVEAL", answer: correct });
    const after = actor.getSnapshot().context;
    expect(after.run?.phase).toBe("solved");
    expect(after.run?.cursor).toBe(0);
    expect(after.run?.progress["premature-advance"]).toEqual(
      solved.run?.progress["premature-advance"],
    );
    expect(after.submittedAnswer).toEqual(correct);
    actor.stop();
  });

  it("ignores continue until the position is solved or revealed", () => {
    const actor = createActor(chessLabMachine).start();
    actor.send({ type: "PRACTICE" });
    actor.send({ type: "NEXT_LESSON" });
    expect(actor.getSnapshot().context.run?.cursor).toBe(0);
    actor.send({ type: "SUBMIT_ANSWER", answer: wrong });
    actor.send({ type: "NEXT_LESSON" });
    actor.send({ type: "HINT" });
    expect(actor.getSnapshot().context.run).toMatchObject({ cursor: 0, phase: "incorrect" });
    expect(actor.getSnapshot().context.run?.progress["premature-advance"].hintUsed).toBe(false);
    actor.send({ type: "REVEAL", answer: correct });
    actor.send({ type: "RETRY" });
    actor.send({ type: "SKIP" });
    expect(actor.getSnapshot().context.run).toMatchObject({ cursor: 0, phase: "revealed" });
    expect(actor.getSnapshot().context.run?.progress["premature-advance"].outcome).toBe("revealed");
    actor.send({ type: "NEXT_LESSON" });
    expect(actor.getSnapshot().context.run).toMatchObject({ cursor: 1, phase: "answering" });
    actor.stop();
  });

  it("ignores lesson events once the run reaches its recap", () => {
    const actor = createActor(chessLabMachine).start();
    actor.send({ type: "PRACTICE" });
    for (let i = 0; i < 5; i++) actor.send({ type: "SKIP" });
    expect(actor.getSnapshot().context.run?.phase).toBe("summary");
    const summary = actor.getSnapshot().context.run;
    actor.send({ type: "SKIP" });
    actor.send({ type: "NEXT_LESSON" });
    actor.send({ type: "REVEAL", answer: correct });
    actor.send({ type: "SUBMIT_ANSWER", answer: correct });
    expect(actor.getSnapshot().context.run).toEqual(summary);
    actor.stop();
  });

  it("jumps inside an existing run without discarding progress", () => {
    const actor = createActor(chessLabMachine).start();
    actor.send({ type: "PRACTICE" });
    actor.send({ type: "SUBMIT_ANSWER", answer: correct });
    actor.send({ type: "REVIEW" });
    actor.send({ type: "PRACTICE", lessonIndex: 3 });
    const run = actor.getSnapshot().context.run;
    expect(run).toMatchObject({ cursor: 3, phase: "answering", lessonIds: { length: 5 } });
    expect(run?.progress["premature-advance"]).toMatchObject({ outcome: "solved" });
    actor.stop();
  });
});
