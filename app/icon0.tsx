import { ImageResponse } from "next/og";

import { ChessLabMark } from "./chess-lab-mark";

export const dynamic = "force-static";
export const size = { width: 48, height: 48 } as const;
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<ChessLabMark borderRadius={10} />, size);
}
