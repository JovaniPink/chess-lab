"use client";

import { Check, ChevronRight, Lightbulb, ShieldAlert, Target } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CandidateMove, Lesson, SubmittedAnswer } from "@/types/chess";

type PracticePanelProps = {
  lesson: Lesson;
  lessonIndex: number;
  lessonCount: number;
  submittedAnswer: SubmittedAnswer | null;
  onCandidate: (candidate: CandidateMove) => void;
  onNext: () => void;
};

export function PracticePanel({
  lesson,
  lessonIndex,
  lessonCount,
  submittedAnswer,
  onCandidate,
  onNext,
}: PracticePanelProps) {
  const [showHint, setShowHint] = useState(false);
  const chosenCandidate = submittedAnswer
    ? lesson.candidates.find((candidate) => candidate.san === submittedAnswer.san)
    : undefined;

  return (
    <div className="practice-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            <Target size={14} /> Lesson {lessonIndex + 1} of {lessonCount}
          </p>
          <h2>{lesson.title}</h2>
        </div>
        <span className={cn("severity", lesson.severity)}>{lesson.moveLabel}</span>
      </div>

      <div className="progress-steps" aria-label={`Lesson ${lessonIndex + 1} of ${lessonCount}`}>
        {Array.from({ length: lessonCount }, (_, index) => (
          <span key={index} className={cn(index <= lessonIndex && "done")} />
        ))}
      </div>

      <p className="practice-prompt">{lesson.prompt}</p>
      <p className="practice-instruction">Make a legal move on the board or choose a candidate.</p>

      <div className="answer-list">
        {lesson.candidates.map((candidate) => {
          const selected = submittedAnswer?.san === candidate.san;
          return (
            <button
              key={candidate.san}
              type="button"
              onClick={() => onCandidate(candidate)}
              disabled={Boolean(submittedAnswer)}
              className={cn(
                "answer-option",
                submittedAnswer && candidate.correct && "correct-answer",
                submittedAnswer && selected && !candidate.correct && "selected-wrong-answer",
                submittedAnswer && !selected && !candidate.correct && "muted-answer",
              )}
              aria-pressed={selected}
            >
              <strong>{candidate.san}</strong>
              <span>{submittedAnswer ? candidate.explanation : "Choose this move"}</span>
              {submittedAnswer && candidate.correct && <Check size={18} aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {!submittedAnswer && (
        <button
          type="button"
          className="hint-button"
          onClick={() => setShowHint((value) => !value)}
        >
          <Lightbulb size={16} /> {showHint ? "Hide hint" : "Give me a hint"}
        </button>
      )}
      {showHint && !submittedAnswer && <p className="hint-copy">{lesson.hint}</p>}

      {submittedAnswer && (
        <div className={cn("feedback-box", submittedAnswer.correct ? "correct" : "incorrect")}>
          {submittedAnswer.correct ? <Check size={18} /> : <ShieldAlert size={18} />}
          <div>
            <strong>{submittedAnswer.correct ? "Exactly." : "Look one layer deeper."}</strong>
            <p>
              {chosenCandidate?.explanation ??
                `The legal move ${submittedAnswer.san} does not address this lesson's decision point.`}
            </p>
            <p>{lesson.insight}</p>
          </div>
        </div>
      )}

      {submittedAnswer && (
        <Button tone="primary" onClick={onNext}>
          {lessonIndex === lessonCount - 1 ? "Return to review" : "Next lesson"}
          <ChevronRight size={17} />
        </Button>
      )}
    </div>
  );
}
