"use client";

import { Button } from "@/components/ui/button";
import type { ReviewStage } from "./session-game";

const errorCategories = [
  "Threat blindness",
  "Tactical-pattern failure",
  "Candidate-generation failure",
  "Calculation-depth failure",
  "Calculation-breadth failure",
  "Visualization failure",
  "Evaluation failure",
  "Strategic misconception",
  "Opening-understanding gap",
  "Endgame-knowledge gap",
  "Time-management failure",
  "Emotional or psychological error",
  "Physical distraction or fatigue",
] as const;

export type ErrorCategory = (typeof errorCategories)[number];

export type ImportedReviewTrainingLink = {
  id: string;
  weekNumber: number;
};

export type CriticalPosition = {
  ply: number;
  label: string;
  note: string;
};

export type ImportedGameReview = {
  postGameThoughts: string;
  suspectedMistake: string;
  criticalPositions: CriticalPosition[];
  errorCategory: ErrorCategory | "";
  correctiveDrill: string;
  completed: boolean;
  trainingWeekLink: ImportedReviewTrainingLink | null;
};

export function createEmptyImportedGameReview(): ImportedGameReview {
  return {
    postGameThoughts: "",
    suspectedMistake: "",
    criticalPositions: [],
    errorCategory: "",
    correctiveDrill: "",
    completed: false,
    trainingWeekLink: null,
  };
}

export function reviewRequirements(review: ImportedGameReview) {
  return [
    {
      label: "Record first impressions",
      stage: "thoughts" as const,
      done: !!review.postGameThoughts.trim(),
    },
    {
      label: "Mark a critical position",
      stage: "positions" as const,
      done: review.criticalPositions.length > 0,
    },
    {
      label: "Choose an error category",
      stage: "diagnosis" as const,
      done: !!review.errorCategory,
    },
    {
      label: "Record a corrective drill",
      stage: "diagnosis" as const,
      done: !!review.correctiveDrill.trim(),
    },
  ];
}
type Props = {
  review: ImportedGameReview;
  stage: ReviewStage;
  week: number;
  onStage: (s: ReviewStage) => void;
  onWeek: (n: number) => void;
  onChange: (r: ImportedGameReview) => void;
  onSeek: (ply: number) => void;
  onComplete: () => void;
  onOpenWeek: () => void;
};
export function ImportedGameReviewFlow({
  review,
  stage,
  week,
  onStage,
  onWeek,
  onChange,
  onSeek,
  onComplete,
  onOpenWeek,
}: Props) {
  function update(patch: Partial<ImportedGameReview>) {
    onChange({ ...review, ...patch, completed: false });
  }
  const steps: [ReviewStage, string][] = [
    ["thoughts", "First impressions"],
    ["positions", "Positions"],
    ["diagnosis", "Diagnosis and drill"],
    ["complete", "Complete"],
  ];
  const missing = reviewRequirements(review).filter((r) => !r.done);
  return (
    <section className="imported-review-flow" aria-label="Personal game review">
      <nav className="review-progress" aria-label="Review progress">
        {steps.map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-current={stage === id ? "step" : undefined}
            onClick={() => onStage(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {stage === "thoughts" && (
        <div className="review-step">
          <h2>Remember first. Diagnose second.</h2>
          <p>
            Write what you remember before replay changes the story. You can skip now and return
            before completing the review.
          </p>
          <label htmlFor="post-game-thoughts">Immediate post-game thoughts</label>
          <textarea
            id="post-game-thoughts"
            value={review.postGameThoughts}
            onChange={(e) => update({ postGameThoughts: e.target.value })}
            rows={4}
          />
          <label htmlFor="suspected-mistake">Suspected first important mistake (optional)</label>
          <input
            id="suspected-mistake"
            value={review.suspectedMistake}
            onChange={(e) => update({ suspectedMistake: e.target.value })}
          />
          <div className="action-row">
            <Button tone="primary" onClick={() => onStage("positions")}>
              Continue to replay
            </Button>
            <Button tone="ghost" onClick={() => onStage("positions")}>
              Skip for now
            </Button>
          </div>
        </div>
      )}
      {stage === "positions" && (
        <div className="review-step">
          <h2>Mark critical positions</h2>
          <p>
            Use replay and Mark position beside the board. Choose up to three decisions worth
            revisiting.
          </p>
          <div aria-label="Marked critical positions">
            {review.criticalPositions.map((p) => (
              <article className="critical-position-card" key={p.ply}>
                <Button tone="secondary" onClick={() => onSeek(p.ply)}>
                  Return to {p.label}
                </Button>
                <Button
                  tone="ghost"
                  aria-label={`Remove ${p.label} from critical positions`}
                  onClick={() =>
                    update({
                      criticalPositions: review.criticalPositions.filter((c) => c.ply !== p.ply),
                    })
                  }
                >
                  Remove
                </Button>
                <label htmlFor={`position-${p.ply}`}>
                  Why was this position critical? (optional)
                </label>
                <textarea
                  id={`position-${p.ply}`}
                  value={p.note}
                  onChange={(e) =>
                    update({
                      criticalPositions: review.criticalPositions.map((c) =>
                        c.ply === p.ply ? { ...c, note: e.target.value } : c,
                      ),
                    })
                  }
                />
              </article>
            ))}
          </div>
          <Button tone="primary" onClick={() => onStage("diagnosis")}>
            Continue to diagnosis
          </Button>
        </div>
      )}
      {stage === "diagnosis" && (
        <div className="review-step">
          <h2>Diagnosis and drill</h2>
          <p>Name a thinking failure and one action you can repeat.</p>
          <label htmlFor="error-category">Error category</label>
          <select
            id="error-category"
            value={review.errorCategory}
            onChange={(e) => update({ errorCategory: e.target.value as ErrorCategory })}
          >
            <option value="">Choose the best fit</option>
            {errorCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label htmlFor="corrective-drill">Corrective drill</label>
          <textarea
            id="corrective-drill"
            value={review.correctiveDrill}
            rows={4}
            onChange={(e) => update({ correctiveDrill: e.target.value })}
          />
          <Button tone="primary" onClick={() => onStage("complete")}>
            Review completion
          </Button>
        </div>
      )}
      {stage === "complete" && (
        <div className="review-step">
          <h2>{review.completed ? "Session review complete" : "Complete your review"}</h2>
          <label htmlFor="review-week">Training week</label>
          <select id="review-week" value={week} onChange={(e) => onWeek(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Week {i + 1}
              </option>
            ))}
          </select>
          {missing.length > 0 && (
            <div>
              <p>Before completing:</p>
              <ul>
                {missing.map((r) => (
                  <li key={r.label}>
                    <button type="button" onClick={() => onStage(r.stage)}>
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p>
            {review.errorCategory} {review.correctiveDrill}
          </p>
          {review.completed ? (
            <Button tone="primary" onClick={onOpenWeek}>
              Open linked Week {week}
            </Button>
          ) : (
            <Button tone="primary" disabled={missing.length > 0} onClick={onComplete}>
              Complete session review
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
