"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Chess, Color, PieceSymbol, Square } from "chess.js";
import { cn } from "@/lib/utils";
import type { MoveRecord } from "@/types/chess";

const pieceGlyph: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const pieceName: Record<PieceSymbol, string> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};

const promotionPieces: PieceSymbol[] = ["q", "r", "b", "n"];

type ChessBoardProps = {
  chess: Chess;
  flipped: boolean;
  interactive: boolean;
  lastMove?: Pick<MoveRecord, "from" | "to">;
  positionLabel: string;
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
};

export function ChessBoard({
  chess,
  flipped,
  interactive,
  lastMove,
  positionLabel,
  onMove,
}: ChessBoardProps) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const buttonRefs = useRef<Partial<Record<Square, HTMLButtonElement>>>({});
  const firstPromotionRef = useRef<HTMLButtonElement>(null);
  const boardHelpId = useId();
  const promotionTitleId = useId();

  const files = useMemo(
    () =>
      flipped ? ["h", "g", "f", "e", "d", "c", "b", "a"] : ["a", "b", "c", "d", "e", "f", "g", "h"],
    [flipped],
  );
  const ranks = useMemo(
    () => (flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1]),
    [flipped],
  );
  const legalMoves = selected ? chess.moves({ square: selected, verbose: true }) : [];
  const legalTargets = legalMoves.map((move) => move.to);
  const initialFocusSquare = (flipped ? "e7" : "e2") as Square;

  useEffect(() => {
    if (promotion) firstPromotionRef.current?.focus();
  }, [promotion]);

  function chooseSquare(square: Square) {
    if (!interactive || promotion) return;
    const clickedPiece = chess.get(square);

    if (!selected) {
      if (clickedPiece?.color === chess.turn()) setSelected(square);
      return;
    }

    if (clickedPiece?.color === chess.turn()) {
      setSelected(square);
      return;
    }

    const movesToSquare = legalMoves.filter((move) => move.to === square);
    if (movesToSquare.some((move) => move.isPromotion())) {
      setPromotion({ from: selected, to: square });
      return;
    }

    const moved = onMove(selected, square);
    setSelected(moved ? null : selected);
  }

  function choosePromotion(piece: PieceSymbol) {
    if (!promotion) return;
    const moved = onMove(promotion.from, promotion.to, piece);
    if (moved) setSelected(null);
    setPromotion(null);
  }

  function cancelPromotion() {
    const origin = promotion?.from;
    setPromotion(null);
    if (origin) buttonRefs.current[origin]?.focus();
  }

  function moveFocus(square: Square, event: React.KeyboardEvent<HTMLButtonElement>) {
    const keyDeltas: Partial<Record<string, [number, number]>> = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    };
    const delta = keyDeltas[event.key];
    if (!delta) return;

    event.preventDefault();
    const fileIndex = files.indexOf(square[0]);
    const rankIndex = ranks.indexOf(Number(square[1]));
    const nextFileIndex = Math.max(0, Math.min(fileIndex + delta[1], 7));
    const nextRankIndex = Math.max(0, Math.min(rankIndex + delta[0], 7));
    const nextSquare = `${files[nextFileIndex]}${ranks[nextRankIndex]}` as Square;
    buttonRefs.current[nextSquare]?.focus();
  }

  return (
    <div className="board-shell">
      <div
        className={cn("chess-board", interactive && "interactive-board")}
        role="grid"
        aria-label={`Chess board: ${positionLabel}`}
        aria-describedby={interactive ? boardHelpId : undefined}
      >
        {ranks.flatMap((rank, rankIndex) =>
          files.map((file, fileIndex) => {
            const square = `${file}${rank}` as Square;
            const piece = chess.get(square);
            const isLight = (rankIndex + fileIndex) % 2 === 0;
            const isSelected = selected === square;
            const isTarget = legalTargets.includes(square);
            const isLast = lastMove?.from === square || lastMove?.to === square;
            const canStartMove = interactive && piece?.color === chess.turn();

            return (
              <button
                ref={(element) => {
                  if (element) buttonRefs.current[square] = element;
                }}
                type="button"
                role="gridcell"
                key={square}
                className={cn(
                  "board-square",
                  isLight ? "square-light" : "square-dark",
                  isSelected && "square-selected",
                  isLast && "square-last",
                )}
                onClick={() => chooseSquare(square)}
                onKeyDown={(event) => moveFocus(square, event)}
                tabIndex={
                  interactive && (isSelected || (!selected && square === initialFocusSquare))
                    ? 0
                    : -1
                }
                aria-disabled={!interactive}
                aria-selected={isSelected}
                aria-label={`${square}, ${
                  piece
                    ? `${piece.color === "w" ? "white" : "black"} ${pieceName[piece.type]}`
                    : "empty"
                }${isTarget ? ", legal destination" : ""}`}
                data-move-origin={canStartMove || undefined}
              >
                {fileIndex === 0 && <span className="rank-label">{rank}</span>}
                {rankIndex === 7 && <span className="file-label">{file}</span>}
                {isTarget && <span className={cn("legal-target", piece && "capture-target")} />}
                {piece && (
                  <span
                    className={cn(
                      "chess-piece",
                      piece.color === "w" ? "piece-white" : "piece-black",
                    )}
                    aria-hidden="true"
                  >
                    {pieceGlyph[piece.color][piece.type]}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>

      {interactive && (
        <p id={boardHelpId} className="sr-only">
          Use the arrow keys to move between squares. Press Enter or Space to select a piece and its
          destination.
        </p>
      )}

      {promotion && (
        <div
          className="promotion-picker"
          role="dialog"
          aria-modal="true"
          aria-labelledby={promotionTitleId}
          onKeyDown={(event) => {
            if (event.key === "Escape") cancelPromotion();
          }}
        >
          <span id={promotionTitleId}>Promote to</span>
          {promotionPieces.map((piece, index) => (
            <button
              ref={index === 0 ? firstPromotionRef : undefined}
              key={piece}
              type="button"
              onClick={() => choosePromotion(piece)}
            >
              <span aria-hidden="true">{pieceGlyph[chess.turn()][piece]}</span>
              <span className="sr-only">{pieceName[piece]}</span>
            </button>
          ))}
          <button type="button" className="promotion-cancel" onClick={cancelPromotion}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
