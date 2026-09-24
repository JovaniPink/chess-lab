"use client";
import { Button } from "@/components/ui/button";
import type { CandidateMove, Lesson, SubmittedAnswer } from "@/types/chess";
import type { PracticeRun } from "./practice-run";
export function PracticePanel({
  lesson,
  run,
  answer,
  onCandidate,
  onHint,
  onRetry,
  onReveal,
  onSkip,
  onContinue,
}: {
  lesson: Lesson;
  run: PracticeRun;
  answer: SubmittedAnswer | null;
  onCandidate: (c: CandidateMove) => void;
  onHint: () => void;
  onRetry: () => void;
  onReveal: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const progress = run.progress[lesson.id];
  const unlocked = run.phase === "answering";
  const showSolution = run.phase === "solved" || run.phase === "revealed";
  const candidate = lesson.candidates.find((c) => c.san === answer?.san);
  return (
    <div className="practice-panel">
      <div className="answer-list">
        {lesson.candidates.map((c) => (
          <button
            type="button"
            key={c.san}
            aria-disabled={!unlocked}
            onClick={() => unlocked && onCandidate(c)}
            className={`answer-option ${showSolution && c.correct ? "correct-answer" : ""}`}
          >
            <strong>{c.san}</strong>{" "}
            <span>{showSolution ? c.explanation : "Choose this move"}</span>
          </button>
        ))}
      </div>
      {unlocked && (
        <div className="action-row">
          <Button tone="ghost" onClick={onHint}>
            Give me a hint
          </Button>
          <Button tone="ghost" onClick={onReveal}>
            Show coached move
          </Button>
          <Button tone="ghost" onClick={onSkip}>
            Skip position
          </Button>
        </div>
      )}
      {progress.hintUsed && unlocked && <p className="hint-copy">{lesson.hint}</p>}
      {run.phase === "incorrect" && (
        <div className="feedback-box incorrect" role="status">
          <div>
            <h3>Try another idea</h3>
            <p>
              {candidate?.explanation ??
                `The legal move ${answer?.san} is outside this lesson’s coached line. This is not an engine evaluation.`}
            </p>
            <div className="action-row">
              <Button tone="primary" onClick={onRetry}>
                Try again
              </Button>
              <Button tone="secondary" onClick={onReveal}>
                Show coached move
              </Button>
              <Button tone="ghost" onClick={onSkip}>
                Skip position
              </Button>
            </div>
          </div>
        </div>
      )}
      {showSolution && (
        <div className="feedback-box correct" role="status">
          <div>
            <h3>{run.phase === "solved" ? "Coached move found" : "Coached move revealed"}</h3>
            <p>
              {lesson.correctSan}: {lesson.candidates.find((c) => c.correct)?.explanation}
            </p>
            <p>{lesson.insight}</p>
            <Button tone="primary" onClick={onContinue}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
