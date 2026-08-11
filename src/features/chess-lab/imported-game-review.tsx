"use client";

import { BrainCircuit, Check, Dumbbell, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export type CriticalPosition = {
  ply: number;
  label: string;
  note: string;
};

export type ImportedGameReview = {
  postGameThoughts: string;
  suspectedMistake: string;
  criticalPositions: CriticalPosition[];
  errorCategory: (typeof errorCategories)[number] | "";
  correctiveDrill: string;
  completed: boolean;
};

export function createEmptyImportedGameReview(): ImportedGameReview {
  return {
    postGameThoughts: "",
    suspectedMistake: "",
    criticalPositions: [],
    errorCategory: "",
    correctiveDrill: "",
    completed: false,
  };
}

type ImportedGameReviewProps = {
  review: ImportedGameReview;
  currentPly: number;
  currentPositionLabel: string;
  canMarkPosition: boolean;
  onChange: (review: ImportedGameReview) => void;
  onSeek: (ply: number) => void;
};

export function ImportedGameReviewFlow({
  review,
  currentPly,
  currentPositionLabel,
  canMarkPosition,
  onChange,
  onSeek,
}: ImportedGameReviewProps) {
  const currentPositionIsMarked = review.criticalPositions.some(
    (position) => position.ply === currentPly,
  );
  const hasMemoryCapture = review.postGameThoughts.trim().length > 0;
  const hasCriticalPosition = review.criticalPositions.length > 0;
  const hasErrorCategory = review.errorCategory !== "";
  const hasCorrectiveDrill = review.correctiveDrill.trim().length > 0;
  const canComplete =
    hasMemoryCapture && hasCriticalPosition && hasErrorCategory && hasCorrectiveDrill;

  function update(patch: Partial<ImportedGameReview>) {
    onChange({ ...review, ...patch, completed: false });
  }

  function markCurrentPosition() {
    if (!canMarkPosition || currentPositionIsMarked || review.criticalPositions.length >= 3) {
      return;
    }

    update({
      criticalPositions: [
        ...review.criticalPositions,
        { ply: currentPly, label: currentPositionLabel, note: "" },
      ].sort((left, right) => left.ply - right.ply),
    });
  }

  function updateCriticalNote(ply: number, note: string) {
    update({
      criticalPositions: review.criticalPositions.map((position) =>
        position.ply === ply ? { ...position, note } : position,
      ),
    });
  }

  function removeCriticalPosition(ply: number) {
    update({
      criticalPositions: review.criticalPositions.filter((position) => position.ply !== ply),
    });
  }

  const markButtonLabel = !canMarkPosition
    ? "Return to review to mark a position"
    : currentPositionIsMarked
      ? "Position marked"
      : review.criticalPositions.length >= 3
        ? "Three positions marked"
        : "Mark current position";

  return (
    <section className="human-review" aria-labelledby="human-review-title">
      <div className="human-review-intro">
        <div className="human-review-icon" aria-hidden="true">
          <BrainCircuit size={18} />
        </div>
        <div>
          <p className="eyebrow">Human-first review</p>
          <h3 id="human-review-title">Remember first. Diagnose second.</h3>
          <p>
            Work from your own memory before consulting outside analysis. These notes stay only in
            this open tab and disappear when the session ends.
          </p>
        </div>
      </div>

      <ol className="review-progress" aria-label="Review progress">
        <ProgressItem complete={hasMemoryCapture}>Thoughts</ProgressItem>
        <ProgressItem complete={hasCriticalPosition}>Positions</ProgressItem>
        <ProgressItem complete={hasErrorCategory}>Error</ProgressItem>
        <ProgressItem complete={hasCorrectiveDrill}>Drill</ProgressItem>
      </ol>

      <div className="review-step">
        <div className="review-step-heading">
          <span>1</span>
          <div>
            <strong>Immediate post-game capture</strong>
            <p>Write what you remember before the move list changes the story.</p>
          </div>
        </div>
        <label htmlFor="post-game-thoughts">Immediate post-game thoughts</label>
        <textarea
          id="post-game-thoughts"
          rows={4}
          value={review.postGameThoughts}
          onChange={(event) => update({ postGameThoughts: event.target.value })}
          placeholder="Where did you feel uncertain? What did you calculate? When did your evaluation or emotional state change?"
        />
        <label htmlFor="suspected-mistake">Suspected first important mistake</label>
        <input
          id="suspected-mistake"
          type="text"
          value={review.suspectedMistake}
          onChange={(event) => update({ suspectedMistake: event.target.value })}
          placeholder="A move, decision, or moment you want to revisit"
        />
      </div>

      <div className="review-step">
        <div className="review-step-heading">
          <span>2</span>
          <div>
            <strong>Mark critical positions</strong>
            <p>Stop the legal replay at up to three decisions worth revisiting.</p>
          </div>
        </div>
        <div className="current-position-marker">
          <div>
            <span>Board position</span>
            <strong>{currentPositionLabel}</strong>
          </div>
          <Button
            tone="secondary"
            size="sm"
            onClick={markCurrentPosition}
            disabled={
              !canMarkPosition || currentPositionIsMarked || review.criticalPositions.length >= 3
            }
          >
            <MapPin size={14} /> {markButtonLabel}
          </Button>
        </div>

        {review.criticalPositions.length > 0 && (
          <div className="critical-position-list" aria-label="Marked critical positions">
            {review.criticalPositions.map((position, index) => (
              <article key={position.ply} className="critical-position-card">
                <div className="critical-position-title">
                  <button
                    type="button"
                    onClick={() => onSeek(position.ply)}
                    aria-label={`Return to ${position.label}`}
                  >
                    <span>Critical {index + 1}</span>
                    <strong>{position.label}</strong>
                  </button>
                  <button
                    type="button"
                    className="remove-critical-position"
                    onClick={() => removeCriticalPosition(position.ply)}
                    aria-label={`Remove ${position.label} from critical positions`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <label htmlFor={`critical-note-${position.ply}`}>
                  Why was this position critical?
                </label>
                <input
                  id={`critical-note-${position.ply}`}
                  type="text"
                  value={position.note}
                  onChange={(event) => updateCriticalNote(position.ply, event.target.value)}
                  placeholder="The threat, candidate, or evaluation that changed"
                />
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="review-step">
        <div className="review-step-heading">
          <span>3</span>
          <div>
            <strong>Classify one primary error</strong>
            <p>Name the thinking failure, not merely the replacement move.</p>
          </div>
        </div>
        <label htmlFor="error-category">Error category</label>
        <select
          id="error-category"
          value={review.errorCategory}
          onChange={(event) =>
            update({ errorCategory: event.target.value as ImportedGameReview["errorCategory"] })
          }
        >
          <option value="">Choose the best fit</option>
          {errorCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="review-step">
        <div className="review-step-heading">
          <span>4</span>
          <div>
            <strong>Record one corrective drill</strong>
            <p>Finish with a specific action you can repeat and retest.</p>
          </div>
        </div>
        <label htmlFor="corrective-drill">Corrective drill</label>
        <textarea
          id="corrective-drill"
          rows={3}
          value={review.correctiveDrill}
          onChange={(event) => update({ correctiveDrill: event.target.value })}
          placeholder="For example: solve 20 back-rank positions, then retest this position from both sides."
        />
      </div>

      {review.completed ? (
        <div className="review-complete" role="status">
          <Check size={17} />
          <div>
            <strong>Session review complete</strong>
            <p>
              {review.errorCategory} → {review.correctiveDrill}
            </p>
          </div>
        </div>
      ) : (
        <Button
          className="complete-review-button"
          tone="primary"
          disabled={!canComplete}
          onClick={() => onChange({ ...review, completed: true })}
        >
          <Dumbbell size={16} /> Complete session review
        </Button>
      )}
    </section>
  );
}

function ProgressItem({ complete, children }: { complete: boolean; children: string }) {
  return (
    <li className={cn(complete && "complete")}>
      <span aria-hidden="true">{complete ? <Check size={11} /> : null}</span>
      {children}
    </li>
  );
}
