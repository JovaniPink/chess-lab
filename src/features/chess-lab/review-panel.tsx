"use client";
import { useEffect, useRef } from "react";
import { jovaniStudy } from "@/content/jovani-study";
import { formatMoveLabel } from "@/lib/chess";
import type { ParsedGame } from "@/types/chess";
import { Button } from "@/components/ui/button";
export function ReviewPanel({
  game,
  currentPly,
  isOriginal,
  onSeek,
  onPractice,
}: {
  game: ParsedGame;
  currentPly: number;
  isOriginal: boolean;
  onSeek: (ply: number) => void;
  onPractice: (index: number) => void;
}) {
  const table = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = table.current;
    const current = el?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!el || !current) return;
    const y = current.offsetTop - el.offsetTop;
    if (y < el.scrollTop) el.scrollTop = y;
    else if (y + current.offsetHeight > el.scrollTop + el.clientHeight)
      el.scrollTop = y + current.offsetHeight - el.clientHeight;
  }, [currentPly]);
  return (
    <section className="review-panel-content" aria-label="Game review">
      <h2>{isOriginal ? "How the position collapsed" : "Imported move list"}</h2>
      {isOriginal && <p>{jovaniStudy.headline}</p>}
      <div ref={table} className="move-table" aria-label="Game moves">
        {game.moves.map((move, index) => (
          <button
            key={index}
            type="button"
            aria-current={index + 1 === currentPly ? "step" : undefined}
            aria-label={`Go to ${formatMoveLabel(index, move, game.initialFen)}`}
            onClick={() => onSeek(index + 1)}
          >
            {formatMoveLabel(index, move, game.initialFen)}
          </button>
        ))}
      </div>
      {isOriginal && (
        <details className="moments-list">
          <summary>Critical moments · {jovaniStudy.lessons.length}</summary>
          {jovaniStudy.lessons.map((lesson, index) => (
            <article key={lesson.id}>
              <Button tone="ghost" onClick={() => onSeek(lesson.setupPly)}>
                Position before {lesson.moveLabel}
              </Button>
              <p>{lesson.insight}</p>
              <Button tone="secondary" onClick={() => onPractice(index)}>
                Practice this position
              </Button>
            </article>
          ))}
        </details>
      )}
    </section>
  );
}
