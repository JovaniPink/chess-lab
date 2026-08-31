import { chessKnowledgeIndex } from "@/lib/knowledge-index";

export const dynamic = "force-static";

export async function GET() {
  return Response.json(chessKnowledgeIndex, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
