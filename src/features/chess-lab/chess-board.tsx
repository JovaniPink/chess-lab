"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Chess, PieceSymbol, Square } from "chess.js";
import { cn } from "@/lib/utils";
import type { MoveRecord } from "@/types/chess";
import { ChessPiece } from "./chess-piece";

const names: Record<PieceSymbol, string> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};
type Props = {
  chess: Chess;
  flipped: boolean;
  interactive: boolean;
  lastMove?: Pick<MoveRecord, "from" | "to">;
  positionLabel: string;
  positionKey?: string;
  readOnlyInstruction?: string;
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
};
export function ChessBoard({
  chess,
  flipped,
  interactive,
  lastMove,
  positionLabel,
  positionKey,
  readOnlyInstruction,
  onMove,
}: Props) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [focused, setFocused] = useState<Square>("e2");
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [message, setMessage] = useState("");
  const refs = useRef<Partial<Record<Square, HTMLButtonElement>>>({});
  const dialog = useRef<HTMLDialogElement>(null);
  const helpId = useId();
  const titleId = useId();
  const identity = `${chess.fen()}-${positionKey ?? ""}-${interactive}`;
  const [lastIdentity, setLastIdentity] = useState(identity);
  if (identity !== lastIdentity) {
    setLastIdentity(identity);
    setSelected(null);
    setPromotion(null);
    setMessage("");
  }
  const files = flipped ? "hgfedcba" : "abcdefgh";
  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const moves = selected ? chess.moves({ square: selected, verbose: true }) : [];
  useEffect(() => {
    const el = dialog.current;
    if (promotion && el && !el.open) {
      el.showModal();
      el.querySelector<HTMLButtonElement>("button")?.focus();
    }
    if (!promotion && el?.open) el.close();
  }, [promotion]);
  function focus(square: Square) {
    setFocused(square);
    refs.current[square]?.focus();
  }
  function commit(from: Square, to: Square, piece: PieceSymbol = "q") {
    if (onMove(from, to, piece)) {
      setSelected(null);
      setPromotion(null);
      focus(to);
    } else setMessage("That destination is not legal. Choose a highlighted square.");
  }
  function choose(square: Square) {
    if (!interactive || promotion) return;
    const piece = chess.get(square);
    if (piece?.color === chess.turn()) {
      setSelected(selected === square ? null : square);
      setMessage("");
      return;
    }
    if (!selected) {
      setMessage("Select a piece belonging to the side to move.");
      return;
    }
    const legal = moves.filter((m) => m.to === square);
    if (!legal.length) {
      setMessage("That destination is not legal. Choose a highlighted square.");
      return;
    }
    if (legal.some((m) => m.isPromotion())) setPromotion({ from: selected, to: square });
    else commit(selected, square);
  }
  function cancel() {
    const from = promotion?.from;
    setPromotion(null);
    dialog.current?.close();
    if (from) focus(from);
  }
  function navigate(square: Square, event: React.KeyboardEvent) {
    let x = files.indexOf(square[0]);
    let y = ranks.indexOf(Number(square[1]));
    switch (event.key) {
      case "ArrowLeft":
        x = Math.max(0, x - 1);
        break;
      case "ArrowRight":
        x = Math.min(7, x + 1);
        break;
      case "ArrowUp":
        y = Math.max(0, y - 1);
        break;
      case "ArrowDown":
        y = Math.min(7, y + 1);
        break;
      case "Home":
        x = 0;
        if (event.ctrlKey) y = 0;
        break;
      case "End":
        x = 7;
        if (event.ctrlKey) y = 7;
        break;
      case "Escape":
        setSelected(null);
        setMessage("");
        return;
      default:
        return;
    }
    event.preventDefault();
    focus(`${files[x]}${ranks[y]}` as Square);
  }
  return (
    <div className="board-container">
      <div className="board-shell">
        <div
          className={cn("chess-board", interactive && "interactive-board")}
          role="grid"
          aria-label={`Chess board: ${positionLabel}`}
          aria-describedby={helpId}
          aria-readonly={!interactive}
        >
          {ranks.map((rank, ri) => (
            <div role="row" className="board-rank" key={rank}>
              {[...files].map((file, fi) => {
                const square = `${file}${rank}` as Square;
                const piece = chess.get(square);
                const target = moves.some((m) => m.to === square);
                return (
                  <button
                    key={square}
                    ref={(el) => {
                      if (el) refs.current[square] = el;
                    }}
                    type="button"
                    role="gridcell"
                    tabIndex={focused === square ? 0 : -1}
                    onFocus={() => setFocused(square)}
                    onClick={() => choose(square)}
                    onKeyDown={(event) => navigate(square, event)}
                    aria-selected={selected === square}
                    aria-label={`${square}, ${piece ? `${piece.color === "w" ? "white" : "black"} ${names[piece.type]}` : "empty"}${target ? ", legal destination" : ""}`}
                    className={cn(
                      "board-square",
                      (ri + fi) % 2 === 0 ? "square-light" : "square-dark",
                      selected === square && "square-selected",
                      (lastMove?.from === square || lastMove?.to === square) && "square-last",
                    )}
                  >
                    {fi === 0 && <span className="rank-label">{rank}</span>}
                    {ri === 7 && <span className="file-label">{file}</span>}
                    {target && <span className={cn("legal-target", piece && "capture-target")} />}
                    {piece && <ChessPiece color={piece.color} piece={piece.type} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <dialog
          ref={dialog}
          className="promotion-picker"
          aria-modal="true"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            cancel();
          }}
        >
          <h3 id={titleId}>Promote to</h3>
          <div className="promotion-options">
            {(["q", "r", "b", "n"] as PieceSymbol[]).map((piece) => (
              <button
                key={piece}
                type="button"
                aria-label={names[piece]}
                onClick={() => {
                  if (promotion) {
                    dialog.current?.close();
                    commit(promotion.from, promotion.to, piece);
                  }
                }}
              >
                <ChessPiece color={chess.turn()} piece={piece} />
              </button>
            ))}
          </div>
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        </dialog>
      </div>
      <p className="board-instruction">
        {interactive
          ? "Click or tap a piece, then its destination."
          : (readOnlyInstruction ??
            "Replay controls change the position. Explore to try your own moves.")}
      </p>
      <details className="keyboard-help">
        <summary>Keyboard help</summary>
        <p id={helpId}>
          Use arrow keys to inspect squares. Enter or Space selects a piece and destination. Escape
          clears selection. Home and End move across a row; Control with Home or End moves to a
          board corner.
        </p>
      </details>
      <span role="status" className="sr-only">
        {message}
      </span>
    </div>
  );
}
