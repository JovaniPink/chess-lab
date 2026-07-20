import { Chess, type PieceSymbol, type Square } from "chess.js";
import { z } from "zod";
import type { Lesson, MoveRecord, ParsedGame } from "@/types/chess";

export const pgnImportSchema = z.object({
  pgn: z
    .string()
    .trim()
    .min(10, "Paste a complete PGN or move sequence.")
    .superRefine((value, context) => {
      try {
        const parsed = parsePgn(value);
        if (parsed.moves.length === 0) {
          context.addIssue({ code: "custom", message: "The PGN does not contain any moves." });
        }
      } catch {
        context.addIssue({
          code: "custom",
          message: "That PGN could not be parsed. Check the notation and try again.",
        });
      }
    }),
});

export type PgnImportValues = z.infer<typeof pgnImportSchema>;

export function parsePgn(pgn: string): ParsedGame {
  const chess = new Chess();
  chess.loadPgn(pgn.trim());
  const headers = chess.getHeaders();
  const moves = chess.history({ verbose: true }).map((move): MoveRecord => ({
    from: move.from,
    to: move.to,
    san: move.san,
    color: move.color,
    piece: move.piece,
    promotion: move.promotion,
  }));

  return {
    white: headers.White || "White",
    black: headers.Black || "Black",
    result: headers.Result || inferResult(chess),
    event: headers.Event,
    date: headers.Date,
    moves,
    pgn: chess.pgn(),
    isCheckmate: chess.isCheckmate(),
  };
}

export function chessAtPly(moves: MoveRecord[], ply: number): Chess {
  const chess = new Chess();
  const boundedPly = Math.max(0, Math.min(ply, moves.length));

  for (const move of moves.slice(0, boundedPly)) {
    chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" });
  }

  return chess;
}

export function moveFromSan(chess: Chess, san: string): MoveRecord | null {
  const clone = new Chess(chess.fen());
  try {
    const move = clone.move(san);
    return {
      from: move.from,
      to: move.to,
      san: move.san,
      color: move.color,
      piece: move.piece,
      promotion: move.promotion,
    };
  } catch {
    return null;
  }
}

export function playMove(
  chess: Chess,
  from: Square,
  to: Square,
  promotion: PieceSymbol = "q",
): MoveRecord | null {
  try {
    const move = chess.move({ from, to, promotion });
    return {
      from: move.from,
      to: move.to,
      san: move.san,
      color: move.color,
      piece: move.piece,
      promotion: move.promotion,
    };
  } catch {
    return null;
  }
}

export function candidateForMove(lesson: Lesson, san: string) {
  return lesson.candidates.find((candidate) => normalizeSan(candidate.san) === normalizeSan(san));
}

export function formatMoveLabel(ply: number, move: MoveRecord): string {
  const moveNumber = Math.ceil((ply + 1) / 2);
  return move.color === "w" ? `${moveNumber}. ${move.san}` : `${moveNumber}... ${move.san}`;
}

export function normalizeSan(san: string): string {
  return san.replace(/[+#?!]+$/g, "");
}

function inferResult(chess: Chess): string {
  if (!chess.isGameOver()) return "*";
  if (chess.isCheckmate()) return chess.turn() === "w" ? "0-1" : "1-0";
  return "1/2-1/2";
}
