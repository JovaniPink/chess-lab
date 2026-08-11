"use client";

import { BookOpen, ChevronRight, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jovaniStudy } from "@/content/jovani-study";
import { cn } from "@/lib/utils";
import type { MoveRecord } from "@/types/chess";
import { ImportedGameReviewFlow, type ImportedGameReview } from "./imported-game-review";

type ReviewPanelProps = {
  moves: MoveRecord[];
  currentPly: number;
  currentPositionLabel: string;
  isOriginal: boolean;
  canMarkPosition: boolean;
  importedReview: ImportedGameReview;
  onSeek: (ply: number) => void;
  onPractice: (lessonIndex: number) => void;
  onImportedReviewChange: (review: ImportedGameReview) => void;
};

export function ReviewPanel({
  moves,
  currentPly,
  currentPositionLabel,
  isOriginal,
  canMarkPosition,
  importedReview,
  onSeek,
  onPractice,
  onImportedReviewChange,
}: ReviewPanelProps) {
  const rows = Array.from({ length: Math.ceil(moves.length / 2) }, (_, index) => ({
    white: moves[index * 2],
    black: moves[index * 2 + 1],
    number: index + 1,
  }));
  const activeLesson = jovaniStudy.lessons.findIndex(
    (lesson) => Math.abs(lesson.setupPly - currentPly) <= 1,
  );

  return (
    <>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            <BookOpen size={14} /> {isOriginal ? "Annotated review" : "Game replay"}
          </p>
          <h2>{isOriginal ? "How the position collapsed" : "Imported move list"}</h2>
        </div>
        <span className="move-count">{Math.ceil(moves.length / 2)} moves</span>
      </div>

      {isOriginal && (
        <div className="diagnosis-banner">
          <div className="diagnosis-icon">
            <Zap size={18} />
          </div>
          <div>
            <strong>Primary diagnosis</strong>
            <p>Development debt → loose piece → opened diagonal → forced mate.</p>
          </div>
        </div>
      )}

      <div className="move-table" aria-label="Game moves">
        {rows.map((row) => (
          <div className="move-row" key={row.number}>
            <span className="move-number">{row.number}</span>
            <button
              type="button"
              className={cn(currentPly === row.number * 2 - 1 && "current")}
              onClick={() => onSeek(row.number * 2 - 1)}
              aria-label={`Go to ${row.number}. ${row.white?.san}`}
            >
              {row.white?.san}
            </button>
            <button
              type="button"
              className={cn(currentPly === row.number * 2 && "current")}
              onClick={() => row.black && onSeek(row.number * 2)}
              disabled={!row.black}
              aria-label={row.black ? `Go to ${row.number}... ${row.black.san}` : undefined}
            >
              {row.black?.san}
            </button>
          </div>
        ))}
      </div>

      {isOriginal && (
        <div className="moments-list">
          <div className="section-label">
            <span>Critical moments</span>
            <span>{jovaniStudy.lessons.length}</span>
          </div>
          {jovaniStudy.lessons.map((lesson, index) => (
            <button
              type="button"
              key={lesson.id}
              className={cn("moment-item", activeLesson === index && "active")}
              onClick={() => onSeek(lesson.setupPly)}
            >
              <span className={cn("moment-dot", lesson.severity)} />
              <div>
                <strong>
                  {lesson.moveLabel} · {lesson.title}
                </strong>
                <span>{lesson.insight}</span>
              </div>
              <ChevronRight size={17} />
            </button>
          ))}
          <Button tone="primary" onClick={() => onPractice(Math.max(0, activeLesson))}>
            <Target size={16} /> Practice these positions
          </Button>
        </div>
      )}

      {!isOriginal && (
        <ImportedGameReviewFlow
          review={importedReview}
          currentPly={currentPly}
          currentPositionLabel={currentPositionLabel}
          canMarkPosition={canMarkPosition}
          onChange={onImportedReviewChange}
          onSeek={onSeek}
        />
      )}
    </>
  );
}
