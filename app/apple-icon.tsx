import { ImageResponse } from "next/og";

import { ChessLabMark } from "./chess-lab-mark";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 } as const;
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<ChessLabMark borderRadius={36} />, size);
}
