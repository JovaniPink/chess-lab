import type { Square } from "chess.js";
import { assign, setup } from "xstate";
import { jovaniStudy } from "@/content/jovani-study";
import type { SubmittedAnswer } from "@/types/chess";

export type ChessLabContext = {
  currentPly: number;
  maxPly: number;
  lessonIndex: number;
  submittedAnswer: SubmittedAnswer | null;
  branchStartFen: string;
  branchFen: string;
  branchMoves: string[];
  branchLastMove: { from: Square; to: Square } | null;
};

export type ChessLabEvent =
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "SEEK"; ply: number }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "REVIEW" }
  | { type: "EXPLORE"; fen: string }
  | { type: "PRACTICE"; lessonIndex?: number }
  | { type: "SUBMIT_ANSWER"; answer: SubmittedAnswer }
  | { type: "NEXT_LESSON" }
  | { type: "LOAD_GAME"; maxPly: number }
  | { type: "BRANCH_MOVE"; fen: string; san: string; from: Square; to: Square }
  | { type: "RESET_BRANCH" };

const initialContext: ChessLabContext = {
  currentPly: 0,
  maxPly: 30,
  lessonIndex: 0,
  submittedAnswer: null,
  branchStartFen: "",
  branchFen: "",
  branchMoves: [],
  branchLastMove: null,
};

export const chessLabMachine = setup({
  types: {
    context: {} as ChessLabContext,
    events: {} as ChessLabEvent,
  },
  guards: {
    canAdvance: ({ context }) => context.currentPly < context.maxPly,
    hasNextLesson: ({ context }) => context.lessonIndex < jovaniStudy.lessons.length - 1,
  },
  actions: {
    next: assign(({ context }) => ({
      currentPly: Math.min(context.currentPly + 1, context.maxPly),
    })),
    previous: assign(({ context }) => ({
      currentPly: Math.max(context.currentPly - 1, 0),
    })),
    seek: assign(({ context, event }) =>
      event.type === "SEEK" ? { currentPly: Math.max(0, Math.min(event.ply, context.maxPly)) } : {},
    ),
    loadGame: assign(({ event }) =>
      event.type === "LOAD_GAME"
        ? {
            currentPly: 0,
            maxPly: event.maxPly,
            lessonIndex: 0,
            submittedAnswer: null,
            branchStartFen: "",
            branchFen: "",
            branchMoves: [],
            branchLastMove: null,
          }
        : {},
    ),
    startPractice: assign(({ context, event }) => {
      const requestedIndex = event.type === "PRACTICE" ? event.lessonIndex : undefined;
      const lessonIndex = Math.max(
        0,
        Math.min(requestedIndex ?? context.lessonIndex, jovaniStudy.lessons.length - 1),
      );
      return {
        lessonIndex,
        currentPly: jovaniStudy.lessons[lessonIndex].setupPly,
        submittedAnswer: null,
      };
    }),
    submitAnswer: assign(({ event }) =>
      event.type === "SUBMIT_ANSWER" ? { submittedAnswer: event.answer } : {},
    ),
    nextLesson: assign(({ context }) => {
      const lessonIndex = Math.min(context.lessonIndex + 1, jovaniStudy.lessons.length - 1);
      return {
        lessonIndex,
        currentPly: jovaniStudy.lessons[lessonIndex].setupPly,
        submittedAnswer: null,
      };
    }),
    startExplore: assign(({ event }) =>
      event.type === "EXPLORE"
        ? {
            branchStartFen: event.fen,
            branchFen: event.fen,
            branchMoves: [],
            branchLastMove: null,
            submittedAnswer: null,
          }
        : {},
    ),
    addBranchMove: assign(({ context, event }) =>
      event.type === "BRANCH_MOVE"
        ? {
            branchFen: event.fen,
            branchMoves: [...context.branchMoves, event.san],
            branchLastMove: { from: event.from, to: event.to },
          }
        : {},
    ),
    resetBranch: assign(({ context }) => ({
      branchFen: context.branchStartFen,
      branchMoves: [],
      branchLastMove: null,
    })),
    clearInteraction: assign(() => ({
      submittedAnswer: null,
      branchMoves: [],
      branchLastMove: null,
    })),
  },
}).createMachine({
  id: "chessLab",
  initial: "review",
  context: initialContext,
  on: {
    LOAD_GAME: { target: ".review", actions: "loadGame" },
    REVIEW: { target: ".review", actions: "clearInteraction" },
    PRACTICE: { target: ".practice", actions: "startPractice" },
    EXPLORE: { target: ".explore", actions: "startExplore" },
  },
  states: {
    review: {
      on: {
        NEXT: { actions: "next" },
        PREV: { actions: "previous" },
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
      on: {
        PAUSE: { target: "review" },
        SEEK: { target: "review", actions: "seek" },
      },
    },
    practice: {
      on: {
        SUBMIT_ANSWER: { target: "feedback", actions: "submitAnswer" },
      },
    },
    feedback: {
      on: {
        NEXT_LESSON: [
          { guard: "hasNextLesson", target: "practice", actions: "nextLesson" },
          { target: "review", actions: "clearInteraction" },
        ],
      },
    },
    explore: {
      on: {
        BRANCH_MOVE: { actions: "addBranchMove" },
        RESET_BRANCH: { actions: "resetBranch" },
      },
    },
  },
});
