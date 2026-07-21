import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { jovaniStudy } from "@/content/jovani-study";
import { chessAtPly, moveFromSan, parsePgn, pgnImportSchema, playMove } from "@/lib/chess";
import { lessonSchema } from "@/types/chess";

describe("bundled chess study", () => {
  const game = parsePgn(jovaniStudy.pgn);

  it("parses the canonical headers and 30-ply checkmate", () => {
    expect(game.white).toBe("Jovani Pink");
    expect(game.black).toBe("Computer");
    expect(game.result).toBe("0-1");
    expect(game.moves).toHaveLength(30);
    expect(game.isCheckmate).toBe(true);
  });

  it.each([
    [8, "r1bqkb1r/pp1p1ppp/2n1pn2/2p5/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 3 5"],
    [10, "r1bqkb1r/pp1p1ppp/2n1p3/2p1P3/6n1/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 1 6"],
    [20, "r1b1k2r/pp2bppp/1qn1p3/2ppn3/4N3/3PB3/PPP1NPPP/R2QKB1R w KQkq - 0 11"],
    [26, "r1b1k2r/pp3ppp/1q2p3/2b1n3/3N4/3P4/PPP2PPP/R2QKB1R w KQkq - 0 14"],
    [28, "r1b1k2r/pp3ppp/1q2p3/4n3/8/3P1N2/PPP2bPP/R2QKB1R w KQkq - 0 15"],
  ])("reconstructs the critical position at ply %i", (ply, fen) => {
    expect(chessAtPly(game, ply).fen()).toBe(fen);
  });

  it("keeps every coached move legal and the intentionally illegal capture unavailable", () => {
    for (const lesson of jovaniStudy.lessons.slice(0, -1)) {
      const chess = chessAtPly(game, lesson.setupPly);
      for (const candidate of lesson.candidates) {
        expect(moveFromSan(chess, candidate.san), `${lesson.id}: ${candidate.san}`).not.toBeNull();
      }
    }

    const finalLesson = jovaniStudy.lessons.at(-1)!;
    const finalPosition = chessAtPly(game, finalLesson.setupPly);
    expect(finalPosition.moves().sort()).toEqual(["Kd2", "Ke2"]);
    expect(moveFromSan(finalPosition, "Kxf2")).toBeNull();
  });

  it("verifies that Ke2 permits Qe3 checkmate while Kd2 continues", () => {
    const afterCheck = chessAtPly(game, 28);
    afterCheck.move("Ke2");
    afterCheck.move("Qe3#");
    expect(afterCheck.isCheckmate()).toBe(true);

    const alternative = chessAtPly(game, 28);
    alternative.move("Kd2");
    expect(alternative.isCheckmate()).toBe(false);
  });

  it("supports promotion and rejects malformed PGN input", () => {
    const promotion = new Chess("7k/P7/8/8/8/8/8/7K w - - 0 1");
    const move = playMove(promotion, "a7", "a8", "n");
    expect(move?.promotion).toBe("n");
    expect(promotion.get("a8")).toEqual({ color: "w", type: "n" });

    expect(pgnImportSchema.safeParse({ pgn: "not a chess game" }).success).toBe(false);
  });

  it("extracts player and result headers from imported games", () => {
    const imported = parsePgn(
      `[White "Ada"]\n[Black "Grace"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`,
    );
    expect(imported).toMatchObject({
      white: "Ada",
      black: "Grace",
      result: "1-0",
      isCheckmate: true,
    });
  });

  it("replays a valid PGN from its custom FEN starting position", () => {
    const imported = parsePgn(
      `[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n[Result "*"]\n\n1. a8=Q+ *`,
    );

    expect(imported.initialFen).toBe("7k/P7/8/8/8/8/8/7K w - - 0 1");
    expect(chessAtPly(imported, 0).fen()).toBe(imported.initialFen);
    expect(chessAtPly(imported, 1).fen()).toBe("Q6k/8/8/8/8/8/8/7K b - - 0 1");
  });

  it("requires one matching correct candidate and unique candidate notation", () => {
    const lesson = jovaniStudy.lessons[0];
    expect(lessonSchema.safeParse(lesson).success).toBe(true);
    expect(
      lessonSchema.safeParse({
        ...lesson,
        candidates: [lesson.candidates[0], lesson.candidates[0]],
      }).success,
    ).toBe(false);
    expect(lessonSchema.safeParse({ ...lesson, correctSan: "e5" }).success).toBe(false);
  });
});
