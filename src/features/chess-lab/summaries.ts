import { jovaniStudy } from "@/content/jovani-study";
import { gameIdentity, type SessionGame } from "./session-game";
import { practiceStats, type PracticeRun } from "./practice-run";
import type { Summary } from "./summary-actions";
import type { TrainingPlan } from "./training-plan";
const entered = (value: string) => value.trim() || "Not recorded";
export function reviewSummary(session: SessionGame): Summary {
  const r = session.review;
  return {
    title: `${r.completed ? "Completed review" : "Draft review"}: ${gameIdentity(session)}`,
    sections: [
      {
        heading: "First impressions",
        lines: [entered(r.postGameThoughts), `Suspected mistake: ${entered(r.suspectedMistake)}`],
      },
      {
        heading: "Critical positions",
        lines: r.criticalPositions.map((p) => `${p.label}: ${entered(p.note)}`),
      },
      {
        heading: "Diagnosis and drill",
        lines: [
          entered(r.errorCategory),
          entered(r.correctiveDrill),
          `Training week: ${session.week}`,
        ],
      },
    ],
  };
}
export function practiceSummary(run: PracticeRun): Summary {
  const s = practiceStats(run);
  return {
    title: "Guided study recap",
    sections: [
      {
        heading: "This run",
        lines: [
          `Positions attempted: ${s.attempted}`,
          `Solved without help: ${s.unassisted}`,
          `Solved after help: ${s.assisted}`,
          `Revealed: ${s.revealed}`,
          `Skipped: ${s.skipped}`,
          `Positions with hints: ${s.hints}`,
        ],
      },
      {
        heading: "Positions",
        lines: run.lessonIds.map(
          (id) =>
            `${jovaniStudy.lessons.find((l) => l.id === id)?.title}: ${run.progress[id].outcome}; ${run.progress[id].attempts.length} attempts`,
        ),
      },
      { heading: "Takeaway habit", lines: [run.takeaway] },
    ],
  };
}
export function weekSummary(
  plan: TrainingPlan,
  weekNumber: number,
  sessions: SessionGame[],
): Summary {
  const week = plan.weeks[weekNumber - 1];
  return {
    title: `Week ${weekNumber}: ${week.phase}`,
    sections: [
      { heading: "Primary target", lines: [week.primaryTarget, week.intention] },
      {
        heading: "Commitments",
        lines: week.commitments.map((c) => `${c.complete ? "Done" : "To do"}: ${c.label}`),
      },
      {
        heading: "Activity targets and counts",
        lines: week.activities.map((a) => `${a.label}: ${a.completed || "0"} / ${a.target || "0"}`),
      },
      { heading: "Training notes", lines: [entered(week.trainingNotes)] },
      {
        heading: "Cycle goals",
        lines: Object.entries(plan.objective).map(([k, v]) => `${fieldLabel(k)}: ${entered(v)}`),
      },
      {
        heading: "Decision-quality signals",
        lines: Object.entries(week.metrics).map(([k, v]) => `${fieldLabel(k)}: ${entered(v)}`),
      },
      {
        heading: "Weekly reflection",
        lines: Object.entries(week.review).map(([k, v]) => `${fieldLabel(k)}: ${entered(v)}`),
      },
      ...week.linkedReviews.flatMap((link) => {
        const session = sessions.find((s) => s.id === link.gameId);
        return session
          ? [
              {
                heading: gameIdentity(session),
                lines: [
                  session.review.completed ? "Completed review" : "Needs completion again",
                  entered(session.review.errorCategory),
                  entered(session.review.correctiveDrill),
                  ...session.review.criticalPositions.map((p) => `${p.label}: ${entered(p.note)}`),
                ],
              },
            ]
          : [];
      }),
    ],
  };
}
function fieldLabel(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
