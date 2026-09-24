import { createActor } from "xstate";
import { expect, it } from "vitest";
import { chessLabMachine } from "./chess-lab-machine";
import { createPracticeRun, hasPracticeProgress, practiceStats } from "./practice-run";

it("reports a mixed five-position run and starts a fresh targeted retry", () => {
  const actor = createActor(chessLabMachine).start();
  actor.send({ type: "PRACTICE" });
  const answer = { san: "coached", fen: "unused-by-summary", correct: true };
  actor.send({ type: "SUBMIT_ANSWER", answer });
  actor.send({ type: "NEXT_LESSON" });
  actor.send({ type: "HINT" });
  actor.send({ type: "SUBMIT_ANSWER", answer });
  actor.send({ type: "NEXT_LESSON" });
  actor.send({ type: "SUBMIT_ANSWER", answer: { ...answer, correct: false } });
  actor.send({ type: "RETRY" });
  actor.send({ type: "SUBMIT_ANSWER", answer });
  actor.send({ type: "NEXT_LESSON" });
  actor.send({ type: "REVEAL", answer });
  actor.send({ type: "NEXT_LESSON" });
  actor.send({ type: "SKIP" });
  const run = actor.getSnapshot().context.run!;
  expect(run.phase).toBe("summary");
  expect(practiceStats(run)).toEqual({
    attempted: 3,
    unassisted: 1,
    assisted: 2,
    revealed: 1,
    skipped: 1,
    hints: 1,
  });
  const ids = run.lessonIds.slice(3);
  actor.send({ type: "PRACTICE", restart: true, lessonIds: ids });
  expect(actor.getSnapshot().context.run?.lessonIds).toEqual(ids);
  expect(practiceStats(actor.getSnapshot().context.run!).attempted).toBe(0);
  actor.send({ type: "PRACTICE", restart: true });
  expect(actor.getSnapshot().context.run?.lessonIds).toHaveLength(5);
  actor.stop();
});

it("detects run progress that a restart would discard", () => {
  const run = createPracticeRun();
  expect(hasPracticeProgress(null)).toBe(false);
  expect(hasPracticeProgress(run)).toBe(false);
  const id = run.lessonIds[0];
  expect(
    hasPracticeProgress({
      ...run,
      progress: { ...run.progress, [id]: { ...run.progress[id], hintUsed: true } },
    }),
  ).toBe(true);
  expect(hasPracticeProgress({ ...run, takeaway: "Check threats." })).toBe(true);
  expect(hasPracticeProgress({ ...run, phase: "summary" })).toBe(true);
});
