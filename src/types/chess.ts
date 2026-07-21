import type { Color, PieceSymbol, Square } from "chess.js";
import { z } from "zod";

export const squareSchema = z.string().regex(/^[a-h][1-8]$/);

export const candidateMoveSchema = z.object({
  san: z.string().min(1),
  correct: z.boolean(),
  explanation: z.string().min(1),
});

export const lessonSchema = z.object({
  id: z.string().min(1),
  setupPly: z.number().int().nonnegative(),
  moveLabel: z.string().min(1),
  title: z.string().min(1),
  severity: z.enum(["inaccuracy", "mistake", "blunder", "mate"]),
  prompt: z.string().min(1),
  correctSan: z.string().min(1),
  candidates: z.array(candidateMoveSchema).min(2),
  hint: z.string().min(1),
  insight: z.string().min(1),
});

export const studySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  headline: z.string().min(1),
  pgn: z.string().min(1),
  expectedPlyCount: z.number().int().positive(),
  lessons: z.array(lessonSchema).min(1),
});

export type CandidateMove = z.infer<typeof candidateMoveSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Study = z.infer<typeof studySchema>;

export type MoveRecord = {
  from: Square;
  to: Square;
  san: string;
  color: Color;
  piece: PieceSymbol;
  promotion?: PieceSymbol;
};

export type ParsedGame = {
  white: string;
  black: string;
  result: string;
  event?: string;
  date?: string;
  initialFen: string;
  moves: MoveRecord[];
  pgn: string;
  isCheckmate: boolean;
};

export type SubmittedAnswer = {
  san: string;
  fen: string;
  correct: boolean;
  from?: Square;
  to?: Square;
};
