import type { ParsedGame } from "@/types/chess";
import type { ImportedGameReview } from "./imported-game-review";
export type ReviewStage = "thoughts" | "positions" | "diagnosis" | "complete";
export type SessionGame = {
  id: string;
  game: ParsedGame;
  review: ImportedGameReview;
  stage: ReviewStage;
  ply: number;
  week: number;
};
export function gameMetadata(game: ParsedGame) {
  return [game.date, game.event].filter((value) => value && !/^[?.\s]+$/.test(value)).join(" · ");
}
export function gameIdentity(session: SessionGame) {
  const metadata = gameMetadata(session.game);
  const sequence = /^game-(\d+)$/.exec(session.id)?.[1];
  return `${sequence ? `Game ${sequence}: ` : ""}${session.game.white} vs. ${session.game.black}${metadata ? ` · ${metadata}` : ""}`;
}
