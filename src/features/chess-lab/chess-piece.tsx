import type { Color, PieceSymbol } from "chess.js";

// Original geometric silhouettes, shared by the board and promotion controls.
const shapes: Record<PieceSymbol, string> = {
  p: "M20 42h24v-5H20z M24 35h16l-3-14H27z M25 14a7 7 0 1 0 14 0a7 7 0 1 0-14 0",
  r: "M17 42h30v-6H17z M22 34h20V18H22z M18 18h28V6h-7v6h-4V6h-6v6h-4V6h-7z",
  n: "M18 42h29v-6H18z M22 34h21l-2-16-8-12-2 7-8 2-8 12 9 3 6-9 2 6z M31 17h3",
  b: "M18 42h28v-6H18z M22 34h20l-6-11c9-6 4-13-4-19-8 6-13 13-4 19z M33 9l-5 8",
  q: "M17 42h30v-6H17z M22 34h20l5-21-10 9-5-16-5 16-10-9z M16 8a3 3 0 1 0 0 .1 M48 8a3 3 0 1 0 0 .1",
  k: "M17 42h30v-6H17z M22 34h20l2-14c1-9-9-10-12-4-3-6-13-5-12 4z M29 2h6v4h5v5h-5v5h-6v-5h-5V6h5z",
};
export function ChessPiece({ color, piece }: { color: Color; piece: PieceSymbol }) {
  return (
    <svg className="piece-art" viewBox="10 0 44 48" aria-hidden="true" focusable="false">
      <path
        d={shapes[piece]}
        fill={color === "w" ? "#fffaf0" : "#18211e"}
        stroke={color === "w" ? "#18211e" : "#fffaf0"}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
