import { describe, expect, it } from "vitest";

import { jovaniStudy } from "@/content/jovani-study";
import { chessKnowledgeIndex, validateChessKnowledgeBoundary } from "@/lib/knowledge-index";

describe("chess knowledge contract", () => {
  it("maps the game, positions, analysis notes, and retrospective", () => {
    expect(() => validateChessKnowledgeBoundary()).not.toThrow();
    expect(chessKnowledgeIndex.objects.filter(({ kind }) => kind === "source")).toHaveLength(1);
    expect(chessKnowledgeIndex.objects.filter(({ kind }) => kind === "scenario")).toHaveLength(
      jovaniStudy.lessons.length,
    );
    expect(chessKnowledgeIndex.objects.filter(({ kind }) => kind === "note")).toHaveLength(
      jovaniStudy.lessons.length,
    );
    expect(chessKnowledgeIndex.objects.filter(({ kind }) => kind === "retrospective")).toHaveLength(
      1,
    );
  });

  it("does not claim a training outcome", () => {
    const serialized = JSON.stringify(chessKnowledgeIndex);
    expect(serialized).not.toContain('"evidenceStatus":"corroborated"');
    expect(serialized).toMatch(/makes no claim about rating gains/i);
  });
});
