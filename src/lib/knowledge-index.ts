import { createHash } from "node:crypto";

import { jovaniStudy } from "@/content/jovani-study";
import { PRODUCTION_SITE_URL } from "@/lib/site-config";

type KnowledgeObject = Readonly<Record<string, unknown>> & {
  id: string;
  kind: string;
};

const sourceId = `chess-lab:source:${jovaniStudy.id}`;
const retrospectiveId = `chess-lab:retrospective:${jovaniStudy.id}`;
const publicationId = `chess-lab:publication:${jovaniStudy.id}`;
const recordedAt = "2026-07-20T00:00:00.000Z";
const snapshotDigest = `sha256:${createHash("sha256").update(jovaniStudy.pgn).digest("hex")}`;

const common = ({
  id,
  title,
  summary,
  limitations,
}: {
  id: string;
  title: string;
  summary: string;
  limitations: string[];
}) => ({
  schemaVersion: "1.0",
  id,
  projectId: "chess-lab",
  legacyIds: [],
  title,
  summary,
  dates: { createdAt: "2026-07-20" },
  provenance: { sourceIds: [sourceId], methodIds: [], snapshotDigest },
  semantics: {
    domains: ["sports"],
    topics: ["chess-analysis", "human-first-training"],
    tags: ["real-game-study", "legal-move-exercise"],
    entities: [],
  },
  evidenceStatus: "source-reviewed",
  editorialStatus: "published",
  visibility: "public",
  limitations,
  relationships: [],
  corrections: [],
});

const gameSource: KnowledgeObject = {
  ...common({
    id: sourceId,
    title: jovaniStudy.title,
    summary: "A dated personal training game preserved as PGN for a bounded public study.",
    limitations: [
      "This is one personal game against a computer, not a representative sample or validated training outcome.",
    ],
  }),
  kind: "source",
  legacyIds: [jovaniStudy.id],
  dates: { createdAt: "2026-07-20", asOf: recordedAt },
  source: {
    canonicalUrl: PRODUCTION_SITE_URL,
    publisher: "Chess Lab by Measured Studios",
    authors: ["Jovani Pink"],
    authorityRole: "primary-source",
    accessStatus: "open-access",
    license: "Public study artifact; source-specific reuse rights are not separately granted.",
    methodologyWarnings: [
      "Tactical claims are bounded to the exact PGN and legal move checks in the repository.",
    ],
  },
};

const lessonObjects = jovaniStudy.lessons.flatMap((lesson): KnowledgeObject[] => {
  const scenarioId = `chess-lab:scenario:${lesson.id}`;
  const noteId = `chess-lab:note:${lesson.id}`;
  const scenario: KnowledgeObject = {
    ...common({
      id: scenarioId,
      title: `${lesson.moveLabel}: ${lesson.title}`,
      summary: lesson.prompt,
      limitations: [
        "The exercise evaluates legal candidates in one recorded position and does not prove general playing strength.",
      ],
    }),
    kind: "scenario",
    legacyIds: [lesson.id, `${jovaniStudy.id}:ply-${lesson.setupPly}`],
    scenario: {
      assumptions: [
        `The position is reconstructed from the exact PGN after ply ${lesson.setupPly}.`,
        `The authored correct move is ${lesson.correctSan}.`,
        "Candidate legality and the continuation are checked with chess.js tests.",
      ],
      sourceIds: [sourceId],
      synthetic: false,
    },
  };
  const note: KnowledgeObject = {
    ...common({
      id: noteId,
      title: `${lesson.title}: analysis note`,
      summary: lesson.insight,
      limitations: [
        "This human-authored explanation is a bounded interpretation of the recorded position, not engine analysis.",
      ],
    }),
    kind: "note",
    legacyIds: [`${lesson.id}:insight`],
    note: { body: lesson.insight, sourceIds: [sourceId] },
    relationships: [{ type: "about", targetId: scenarioId }],
  };
  return [scenario, note];
});

const retrospective: KnowledgeObject = {
  ...common({
    id: retrospectiveId,
    title: jovaniStudy.headline,
    summary: jovaniStudy.summary,
    limitations: [
      "The retrospective identifies lessons from one game and makes no claim about rating gains or training effectiveness.",
    ],
  }),
  kind: "retrospective",
  retrospective: {
    periodStart: "2026-07-20",
    periodEnd: "2026-07-20",
    subjectIds: lessonObjects.filter(({ kind }) => kind === "scenario").map(({ id }) => id),
    findings: jovaniStudy.lessons.map(({ insight }) => insight),
    remainingUnknowns: [
      "Whether the player applies these lessons in later games.",
      "Whether repeated use changes decision quality or rating.",
    ],
  },
};

const publication: KnowledgeObject = {
  ...common({
    id: publicationId,
    title: jovaniStudy.title,
    summary: jovaniStudy.summary,
    limitations: [
      "The live prototype demonstrates replay and exercise mechanics, not validated training outcomes.",
    ],
  }),
  kind: "publication",
  dates: { createdAt: "2026-07-20", publishedAt: recordedAt },
  publication: {
    canonicalUrl: PRODUCTION_SITE_URL,
    publishedAt: recordedAt,
    objectIds: [sourceId, ...lessonObjects.map(({ id }) => id), retrospectiveId],
  },
};

export const chessKnowledgeIndex = {
  schemaVersion: "1.0",
  projectId: "chess-lab",
  generatedAt: recordedAt,
  objects: [gameSource, ...lessonObjects, retrospective, publication],
} as const;

export function validateChessKnowledgeBoundary(): void {
  const ids = chessKnowledgeIndex.objects.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new Error("Chess knowledge IDs must be unique");
  const serialized = JSON.stringify(chessKnowledgeIndex);
  if (/\/Users\/|file:\/\/|localStorage|sessionStorage/.test(serialized)) {
    throw new Error("Session or workstation data crossed the public knowledge boundary");
  }
}

validateChessKnowledgeBoundary();
