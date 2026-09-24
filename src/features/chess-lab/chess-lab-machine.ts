import { assign, setup } from "xstate";
import { jovaniStudy } from "@/content/jovani-study";
import type { MoveRecord, SubmittedAnswer } from "@/types/chess";
import { createPracticeRun, practiceHabit, type PracticeRun } from "./practice-run";
export type BranchMove = MoveRecord & { fen: string };
export type ChessLabContext = {
  currentPly: number;
  maxPly: number;
  lessonIndex: number;
  submittedAnswer: SubmittedAnswer | null;
  run: PracticeRun | null;
  branchStartFen: string;
  branchStartLabel: string;
  branchFen: string;
  branchMoves: BranchMove[];
  branchLastMove: Pick<MoveRecord, "from" | "to"> | null;
};
export type ChessLabEvent =
  | {
      type:
        | "NEXT"
        | "PREV"
        | "PLAY"
        | "PAUSE"
        | "REVIEW"
        | "RETRY"
        | "HINT"
        | "NEXT_LESSON"
        | "SKIP"
        | "UNDO_BRANCH"
        | "RESET_BRANCH";
    }
  | { type: "SEEK"; ply: number }
  | { type: "LOAD_GAME"; maxPly: number; ply?: number }
  | { type: "PRACTICE"; lessonIndex?: number; restart?: boolean; lessonIds?: string[] }
  | { type: "SUBMIT_ANSWER" | "REVEAL"; answer: SubmittedAnswer }
  | { type: "EXPLORE"; fen: string; label?: string }
  | ({ type: "BRANCH_MOVE" } & BranchMove)
  | { type: "TAKEAWAY"; value: string };
const initial: ChessLabContext = {
  currentPly: 0,
  maxPly: 30,
  lessonIndex: 0,
  submittedAnswer: null,
  run: null,
  branchStartFen: "",
  branchStartLabel: "Starting position",
  branchFen: "",
  branchMoves: [],
  branchLastMove: null,
};
function updateRun(
  context: ChessLabContext,
  patch: Partial<PracticeRun>,
  progressPatch?: Partial<PracticeRun["progress"][string]>,
) {
  const run = context.run ?? createPracticeRun();
  const id = run.lessonIds[run.cursor];
  return {
    ...run,
    ...patch,
    progress: progressPatch
      ? { ...run.progress, [id]: { ...run.progress[id], ...progressPatch } }
      : run.progress,
  };
}
function advance(context: ChessLabContext, skip = false) {
  const run = updateRun(context, {}, skip ? { outcome: "skipped" } : undefined);
  if (run.cursor === run.lessonIds.length - 1)
    return {
      run: { ...run, phase: "summary" as const, takeaway: run.takeaway || practiceHabit(run) },
      submittedAnswer: null,
    };
  const cursor = run.cursor + 1;
  return {
    run: { ...run, cursor, phase: "answering" as const },
    lessonIndex: jovaniStudy.lessons.findIndex((l) => l.id === run.lessonIds[cursor]),
    submittedAnswer: null,
  };
}
export const chessLabMachine = setup({
  types: { context: {} as ChessLabContext, events: {} as ChessLabEvent },
  guards: {
    canAdvance: ({ context }) => context.currentPly < context.maxPly,
    answering: ({ context }) => context.run?.phase === "answering",
    unresolved: ({ context }) =>
      context.run?.phase === "answering" || context.run?.phase === "incorrect",
    incorrect: ({ context }) => context.run?.phase === "incorrect",
    resolved: ({ context }) => context.run?.phase === "solved" || context.run?.phase === "revealed",
  },
  actions: {
    next: assign(({ context }) => ({
      currentPly: Math.min(context.currentPly + 1, context.maxPly),
    })),
    prev: assign(({ context }) => ({ currentPly: Math.max(0, context.currentPly - 1) })),
    seek: assign(({ context, event }) =>
      event.type === "SEEK" ? { currentPly: Math.max(0, Math.min(event.ply, context.maxPly)) } : {},
    ),
    load: assign(({ event }) =>
      event.type === "LOAD_GAME"
        ? {
            currentPly: Math.min(event.ply ?? 0, event.maxPly),
            maxPly: event.maxPly,
            branchMoves: [],
            branchFen: "",
            branchStartFen: "",
            branchLastMove: null,
          }
        : {},
    ),
    practice: assign(({ context, event }) => {
      if (event.type !== "PRACTICE") return {};
      const run = event.restart || !context.run ? createPracticeRun(event.lessonIds) : context.run;
      if (event.lessonIndex !== undefined) {
        const id = jovaniStudy.lessons[event.lessonIndex].id;
        const cursor = run.lessonIds.indexOf(id);
        if (cursor >= 0)
          return {
            run: { ...run, cursor, phase: "answering" as const },
            lessonIndex: event.lessonIndex,
            submittedAnswer: null,
          };
      }
      const lessonIndex = jovaniStudy.lessons.findIndex((l) => l.id === run.lessonIds[run.cursor]);
      const attempts = run.progress[run.lessonIds[run.cursor]].attempts;
      return {
        run,
        lessonIndex,
        submittedAnswer:
          run.phase === "incorrect" || run.phase === "solved" ? (attempts.at(-1) ?? null) : null,
      };
    }),
    answer: assign(({ context, event }) => {
      if (event.type !== "SUBMIT_ANSWER" || !context.run) return {};
      const progress = context.run.progress[context.run.lessonIds[context.run.cursor]];
      return {
        submittedAnswer: event.answer,
        run: updateRun(
          context,
          { phase: event.answer.correct ? "solved" : "incorrect" },
          {
            attempts: [...progress.attempts, event.answer],
            outcome: event.answer.correct ? "solved" : "pending",
          },
        ),
      };
    }),
    reveal: assign(({ context, event }) =>
      event.type === "REVEAL"
        ? {
            submittedAnswer: event.answer,
            run: updateRun(context, { phase: "revealed" }, { outcome: "revealed" }),
          }
        : {},
    ),
    retry: assign(({ context }) => ({
      submittedAnswer: null,
      run: updateRun(context, { phase: "answering" }),
    })),
    hint: assign(({ context }) => ({ run: updateRun(context, {}, { hintUsed: true }) })),
    advance: assign(({ context }) => advance(context)),
    skip: assign(({ context }) => advance(context, true)),
    takeaway: assign(({ context, event }) =>
      event.type === "TAKEAWAY" ? { run: updateRun(context, { takeaway: event.value }) } : {},
    ),
    explore: assign(({ event }) =>
      event.type === "EXPLORE"
        ? {
            branchStartFen: event.fen,
            branchStartLabel: event.label ?? "Starting position",
            branchFen: event.fen,
            branchMoves: [],
            branchLastMove: null,
          }
        : {},
    ),
    branch: assign(({ context, event }) =>
      event.type === "BRANCH_MOVE"
        ? {
            branchMoves: [...context.branchMoves, event],
            branchFen: event.fen,
            branchLastMove: { from: event.from, to: event.to },
          }
        : {},
    ),
    undo: assign(({ context }) => {
      const moves = context.branchMoves.slice(0, -1);
      const last = moves.at(-1);
      return {
        branchMoves: moves,
        branchFen: last?.fen ?? context.branchStartFen,
        branchLastMove: last ? { from: last.from, to: last.to } : null,
      };
    }),
    reset: assign(({ context }) => ({
      branchMoves: [],
      branchFen: context.branchStartFen,
      branchLastMove: null,
    })),
  },
}).createMachine({
  id: "chessLab",
  initial: "review",
  context: initial,
  on: {
    LOAD_GAME: { target: ".review", actions: "load" },
    REVIEW: { target: ".review" },
    PRACTICE: { target: ".practice", actions: "practice" },
    EXPLORE: { target: ".explore", actions: "explore" },
    TAKEAWAY: { actions: "takeaway" },
  },
  states: {
    review: {
      on: {
        NEXT: { actions: "next" },
        PREV: { actions: "prev" },
        SEEK: { actions: "seek" },
        PLAY: { target: "playing" },
      },
    },
    playing: {
      after: {
        850: [
          { guard: "canAdvance", actions: "next", target: "playing", reenter: true },
          { target: "review" },
        ],
      },
      on: { PAUSE: { target: "review" }, SEEK: { target: "review", actions: "seek" } },
    },
    practice: {
      on: {
        SUBMIT_ANSWER: { guard: "answering", actions: "answer" },
        RETRY: { guard: "incorrect", actions: "retry" },
        REVEAL: { guard: "unresolved", actions: "reveal" },
        HINT: { guard: "answering", actions: "hint" },
        NEXT_LESSON: { guard: "resolved", actions: "advance" },
        SKIP: { guard: "unresolved", actions: "skip" },
      },
    },
    explore: {
      on: {
        EXPLORE: {},
        BRANCH_MOVE: { actions: "branch" },
        UNDO_BRANCH: { actions: "undo" },
        RESET_BRANCH: { actions: "reset" },
      },
    },
  },
});
