"use client";

import { useMachine } from "@xstate/react";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CalendarRange,
  Flag,
  FlipHorizontal2,
  GraduationCap,
  History,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Swords,
  Target,
  Upload,
} from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { jovaniStudy } from "@/content/jovani-study";
import {
  candidateForMove,
  chessAtPly,
  formatMoveLabel,
  moveFromSan,
  parsePgn,
  playMove,
} from "@/lib/chess";
import { cn } from "@/lib/utils";
import type { CandidateMove, MoveRecord, ParsedGame, SubmittedAnswer } from "@/types/chess";
import { ChessBoard } from "./chess-board";
import { chessLabMachine } from "./chess-lab-machine";
import { FailureSummary } from "./failure-summary";
import { createEmptyImportedGameReview, type ImportedGameReview } from "./imported-game-review";
import { PgnImportDialog } from "./pgn-import-dialog";
import { PracticePanel } from "./practice-panel";
import { ReviewPanel } from "./review-panel";
import {
  createTrainingPlan,
  type TrainingPlan,
  type TrainingReviewLink,
  TrainingPlanView,
} from "./training-plan";

const originalGame = parsePgn(jovaniStudy.pgn);

if (originalGame.moves.length !== jovaniStudy.expectedPlyCount) {
  throw new Error(
    `Expected ${jovaniStudy.expectedPlyCount} plies in the bundled study, received ${originalGame.moves.length}.`,
  );
}

export function ChessLab() {
  const [state, send] = useMachine(chessLabMachine);
  const [game, setGame] = useState<ParsedGame>(originalGame);
  const [isOriginal, setIsOriginal] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [activeView, setActiveView] = useState<"board" | "training-plan">("board");
  const [selectedTrainingWeek, setSelectedTrainingWeek] = useState(1);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(() => createTrainingPlan());
  const [importedReview, setImportedReview] = useState<ImportedGameReview>(() =>
    createEmptyImportedGameReview(),
  );
  const nextImportedReviewLinkId = useRef(1);
  const [liveMessage, setLiveMessage] = useState("Bundled study loaded.");

  const inReview = state.matches("review") || state.matches("playing");
  const inPractice = state.matches("practice") || state.matches("feedback");
  const inExplore = state.matches("explore");
  const inTrainingPlan = activeView === "training-plan";
  const currentPly = Math.min(state.context.currentPly, game.moves.length);
  const currentLesson = jovaniStudy.lessons[state.context.lessonIndex];
  const lineChess = useMemo(() => chessAtPly(game, currentPly), [currentPly, game]);
  const practiceChess = useMemo(() => {
    if (!inPractice) return null;
    return state.context.submittedAnswer
      ? new Chess(state.context.submittedAnswer.fen)
      : chessAtPly(game, currentLesson.setupPly);
  }, [currentLesson.setupPly, game, inPractice, state.context.submittedAnswer]);
  const boardChess = useMemo(() => {
    if (inExplore) return new Chess(state.context.branchFen || lineChess.fen());
    if (practiceChess) return practiceChess;
    return lineChess;
  }, [inExplore, lineChess, practiceChess, state.context.branchFen]);

  const reviewLastMove = inReview && currentPly > 0 ? game.moves[currentPly - 1] : undefined;
  const practiceLastMove = answerAsMove(state.context.submittedAnswer);
  const branchLastMove = state.context.branchLastMove ?? undefined;
  const lastMove = inExplore ? branchLastMove : inPractice ? practiceLastMove : reviewLastMove;
  const currentMoveLabel =
    currentPly === 0
      ? "Starting position"
      : formatMoveLabel(currentPly - 1, game.moves[currentPly - 1]);
  const positionLabel = inPractice
    ? `${currentLesson.title}, ${state.context.submittedAnswer ? "answer shown" : "your move"}`
    : inExplore
      ? `variation after ${state.context.branchMoves.length} branch moves`
      : currentMoveLabel;
  const topColor: Color = flipped ? "w" : "b";
  const bottomColor: Color = flipped ? "b" : "w";
  const winnerColor: Color | null =
    game.result === "1-0" ? "w" : game.result === "0-1" ? "b" : null;
  const studyFacts = inTrainingPlan
    ? [
        { value: "12", label: "Training weeks" },
        { value: `Week ${selectedTrainingWeek}`, label: "Selected focus" },
        { value: "Open tab", label: "Session-only plan" },
      ]
    : [
        { value: String(game.moves.length), label: "Playable ply" },
        {
          value: isOriginal
            ? String(jovaniStudy.lessons.length)
            : String(importedReview.criticalPositions.length),
          label: isOriginal ? "Coached positions" : "Critical positions",
        },
        { value: "Local", label: "Session-only data" },
      ];

  function enterExplore() {
    setActiveView("board");
    send({ type: "EXPLORE", fen: lineChess.fen() });
    setLiveMessage(`Exploring from ${currentMoveLabel}.`);
  }

  function seekReviewPosition(ply: number) {
    send({ type: "REVIEW" });
    send({ type: "SEEK", ply });
    const move = ply > 0 ? game.moves[ply - 1] : undefined;
    setLiveMessage(
      ply === 0 || !move
        ? "Returned to the starting position."
        : `Returned to ${formatMoveLabel(ply - 1, move)}.`,
    );
  }

  function handleBoardMove(from: Square, to: Square, promotion: PieceSymbol = "q") {
    if (inExplore) {
      const chess = new Chess(boardChess.fen());
      const move = playMove(chess, from, to, promotion);
      if (!move) return false;
      send({
        type: "BRANCH_MOVE",
        fen: chess.fen(),
        san: move.san,
        from: move.from,
        to: move.to,
      });
      setLiveMessage(`${move.san} added to the variation.`);
      return true;
    }

    if (state.matches("practice")) {
      const chess = chessAtPly(game, currentLesson.setupPly);
      const move = playMove(chess, from, to, promotion);
      if (!move) return false;
      const candidate = candidateForMove(currentLesson, move.san);
      submitAnswer({
        san: move.san,
        from: move.from,
        to: move.to,
        fen: chess.fen(),
        correct: candidate?.correct ?? false,
      });
      return true;
    }

    return false;
  }

  function submitCandidate(candidate: CandidateMove) {
    if (!state.matches("practice")) return;
    const chess = chessAtPly(game, currentLesson.setupPly);
    const move = moveFromSan(chess, candidate.san);

    if (move) {
      chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" });
      submitAnswer({
        san: candidate.san,
        from: move.from,
        to: move.to,
        fen: chess.fen(),
        correct: candidate.correct,
      });
    } else {
      submitAnswer({
        san: candidate.san,
        fen: chess.fen(),
        correct: false,
      });
    }
  }

  function submitAnswer(answer: SubmittedAnswer) {
    send({ type: "SUBMIT_ANSWER", answer });
    setLiveMessage(
      answer.correct
        ? `${answer.san} is the coached move. Feedback is available.`
        : `${answer.san} does not solve the lesson. Feedback is available.`,
    );
  }

  function loadGame(importedGame: ParsedGame) {
    setGame(importedGame);
    setIsOriginal(false);
    setImportedReview(createEmptyImportedGameReview());
    setActiveView("board");
    setShowImport(false);
    send({ type: "LOAD_GAME", maxPly: importedGame.moves.length });
    setLiveMessage(
      `${importedGame.white} versus ${importedGame.black} loaded with ${importedGame.moves.length} plies.`,
    );
  }

  function resetOriginal() {
    setGame(originalGame);
    setIsOriginal(true);
    setImportedReview(createEmptyImportedGameReview());
    setActiveView("board");
    setShowImport(false);
    send({ type: "LOAD_GAME", maxPly: originalGame.moves.length });
    setLiveMessage("Returned to the bundled Jovani study.");
  }

  function completeImportedReview(review: ImportedGameReview) {
    if (!review.errorCategory || review.correctiveDrill.trim().length === 0) return;

    const existingLinkId = review.trainingWeekLink?.id;
    const linkId = existingLinkId ?? `imported-review-${nextImportedReviewLinkId.current++}`;
    const linkedReview: TrainingReviewLink = {
      id: linkId,
      errorCategory: review.errorCategory,
      correctiveDrill: review.correctiveDrill,
    };

    setTrainingPlan((currentPlan) => ({
      ...currentPlan,
      weeks: currentPlan.weeks.map((week) => {
        const otherLinks = week.linkedReviews.filter((link) => link.id !== linkId);
        return week.number === selectedTrainingWeek
          ? { ...week, linkedReviews: [...otherLinks, linkedReview] }
          : { ...week, linkedReviews: otherLinks };
      }),
    }));
    setImportedReview({
      ...review,
      completed: true,
      trainingWeekLink: { id: linkId, weekNumber: selectedTrainingWeek },
    });
    setLiveMessage(
      `Session review completed and linked to training plan week ${selectedTrainingWeek}.`,
    );
  }

  function openTrainingWeek(weekNumber: number) {
    if (state.matches("playing")) send({ type: "PAUSE" });
    setSelectedTrainingWeek(weekNumber);
    setActiveView("training-plan");
    setLiveMessage(`Training plan opened to linked week ${weekNumber}.`);
  }

  return (
    <main className="app-frame">
      <a className="skip-link" href="#study-workspace">
        Skip to study workspace
      </a>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <BrainCircuit size={21} />
          </div>
          <div>
            <p>Jovani Chess Lab</p>
            <span>Think clearly. Learn from the board.</span>
          </div>
        </div>
        <div className="top-actions">
          <Button tone="ghost" size="sm" onClick={() => setShowImport(true)}>
            <Upload size={16} /> Load PGN
          </Button>
          {!isOriginal && (
            <Button tone="secondary" size="sm" onClick={resetOriginal}>
              <RotateCcw size={15} /> Return to lesson
            </Button>
          )}
          <div className="status-pill">
            <span /> Study session
          </div>
        </div>
      </header>

      <section className="hero-strip" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">
            <GraduationCap size={15} />
            {inTrainingPlan
              ? "Human-first · 12-week cycle"
              : `${game.white} vs. ${game.black} · ${game.result}`}
          </p>
          <h1 id="page-title">
            {inTrainingPlan
              ? "Train the decisions, not just the result."
              : isOriginal
                ? jovaniStudy.headline
                : "Read the game one decision at a time."}
          </h1>
          <p className="hero-copy">
            {inTrainingPlan
              ? "Shape a sustainable plan around serious games, honest analysis, deliberate practice, and the evidence you notice each week."
              : isOriginal
                ? jovaniStudy.summary
                : "Capture your first impressions, replay legal positions, mark critical moments, and leave with one corrective drill."}
          </p>
        </div>
        <div
          className="result-card"
          aria-label={inTrainingPlan ? "Twelve-week training cycle" : `Game result ${game.result}`}
        >
          <span>{inTrainingPlan ? "Cycle" : "Result"}</span>
          <strong>{inTrainingPlan ? "12" : game.result}</strong>
          <p>
            {inTrainingPlan
              ? "weeks"
              : game.isCheckmate
                ? `Checkmate in ${Math.ceil(game.moves.length / 2)}`
                : `${game.moves.length} ply`}
          </p>
        </div>
      </section>

      <ul className="study-facts" aria-label="Study facts">
        {studyFacts.map((fact) => (
          <li key={fact.label}>
            <strong>{fact.value}</strong>
            <span>{fact.label}</span>
          </li>
        ))}
      </ul>

      <nav className="mode-tabs" aria-label="Study modes">
        <button
          type="button"
          className={cn(!inTrainingPlan && inReview && "active")}
          onClick={() => {
            setActiveView("board");
            send({ type: "REVIEW" });
          }}
          aria-current={!inTrainingPlan && inReview ? "page" : undefined}
        >
          <History size={17} /> Review
        </button>
        <button
          type="button"
          className={cn(!inTrainingPlan && inPractice && "active")}
          onClick={() => {
            if (!isOriginal) return;
            setActiveView("board");
            send({ type: "PRACTICE", lessonIndex: 0 });
          }}
          disabled={!isOriginal}
          aria-current={!inTrainingPlan && inPractice ? "page" : undefined}
        >
          <Target size={17} /> Find the move
        </button>
        <button
          type="button"
          className={cn(!inTrainingPlan && inExplore && "active")}
          onClick={enterExplore}
          aria-current={!inTrainingPlan && inExplore ? "page" : undefined}
        >
          <Swords size={17} /> Explore variations
        </button>
        <button
          type="button"
          className={cn(inTrainingPlan && "active")}
          onClick={() => {
            if (state.matches("playing")) send({ type: "PAUSE" });
            setActiveView("training-plan");
            setLiveMessage(`Training plan opened to week ${selectedTrainingWeek}.`);
          }}
          aria-current={inTrainingPlan ? "page" : undefined}
        >
          <CalendarRange size={17} /> 12-week plan
        </button>
      </nav>

      {inTrainingPlan ? (
        <TrainingPlanView
          plan={trainingPlan}
          selectedWeek={selectedTrainingWeek}
          onChange={setTrainingPlan}
          onSelectWeek={(week) => {
            setSelectedTrainingWeek(week);
            setLiveMessage(`Training plan week ${week} selected.`);
          }}
        />
      ) : (
        <div id="study-workspace" className="workspace-grid">
          <section className="board-column" aria-label="Chess board workspace">
            <PlayerRow
              color={topColor}
              game={game}
              toMove={boardChess.turn() === topColor}
              winner={winnerColor === topColor}
              opponent
            />

            <ChessBoard
              key={`${positionLabel}-${flipped}`}
              chess={boardChess}
              flipped={flipped}
              interactive={inExplore || state.matches("practice")}
              lastMove={lastMove}
              positionLabel={positionLabel}
              onMove={handleBoardMove}
            />

            <PlayerRow
              color={bottomColor}
              game={game}
              toMove={boardChess.turn() === bottomColor}
              winner={winnerColor === bottomColor}
              action={
                <Button
                  tone="ghost"
                  size="icon"
                  onClick={() => setFlipped((value) => !value)}
                  aria-label="Flip board"
                >
                  <FlipHorizontal2 size={17} />
                </Button>
              }
            />

            {inReview && (
              <div className="playback-card">
                <Button
                  tone="ghost"
                  size="icon"
                  onClick={() => send({ type: "PREV" })}
                  disabled={currentPly === 0}
                  aria-label="Previous move"
                >
                  <ArrowLeft size={19} />
                </Button>
                <Button
                  tone="primary"
                  size="icon"
                  onClick={() => send({ type: state.matches("playing") ? "PAUSE" : "PLAY" })}
                  aria-label={state.matches("playing") ? "Pause replay" : "Play replay"}
                >
                  {state.matches("playing") ? (
                    <Pause size={18} />
                  ) : (
                    <Play size={18} fill="currentColor" />
                  )}
                </Button>
                <Button
                  tone="ghost"
                  size="icon"
                  onClick={() => send({ type: "NEXT" })}
                  disabled={currentPly === game.moves.length}
                  aria-label="Next move"
                >
                  <ArrowRight size={19} />
                </Button>
                <div className="scrubber-wrap">
                  <div className="scrubber-label">
                    <strong>{currentMoveLabel}</strong>
                    <span>
                      {currentPly} / {game.moves.length} ply
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={game.moves.length}
                    value={currentPly}
                    onChange={(event) => send({ type: "SEEK", ply: Number(event.target.value) })}
                    aria-label="Game move"
                  />
                </div>
              </div>
            )}

            {inPractice && (
              <div className="practice-bar">
                <Target size={17} />
                <span>
                  <strong>{state.matches("practice") ? "Your move" : "Answer reviewed"}</strong> ·
                  Position locked to lesson {state.context.lessonIndex + 1}
                </span>
              </div>
            )}

            {inExplore && (
              <div className="explore-bar">
                <div>
                  <Sparkles size={17} />
                  <span>
                    <strong>Exploration board</strong> · make any legal move
                  </span>
                </div>
                <div className="explore-moves" aria-label="Variation moves">
                  {state.context.branchMoves.length
                    ? state.context.branchMoves.join("  ")
                    : "No branch moves yet"}
                </div>
                <Button
                  tone="secondary"
                  size="sm"
                  onClick={() => {
                    send({ type: "RESET_BRANCH" });
                    setLiveMessage("Variation reset to its starting position.");
                  }}
                >
                  <RefreshCw size={15} /> Reset branch
                </Button>
              </div>
            )}
          </section>

          <aside
            className={cn("study-panel", !isOriginal && "imported-review-panel")}
            aria-label="Study guidance"
          >
            {inPractice && isOriginal ? (
              <PracticePanel
                key={currentLesson.id}
                lesson={currentLesson}
                lessonIndex={state.context.lessonIndex}
                lessonCount={jovaniStudy.lessons.length}
                submittedAnswer={state.context.submittedAnswer}
                onCandidate={submitCandidate}
                onNext={() => send({ type: "NEXT_LESSON" })}
              />
            ) : (
              <ReviewPanel
                moves={game.moves}
                currentPly={currentPly}
                currentPositionLabel={currentMoveLabel}
                isOriginal={isOriginal}
                canMarkPosition={inReview}
                selectedTrainingWeek={selectedTrainingWeek}
                importedReview={importedReview}
                onSeek={seekReviewPosition}
                onPractice={(lessonIndex) => send({ type: "PRACTICE", lessonIndex })}
                onImportedReviewChange={setImportedReview}
                onImportedReviewComplete={completeImportedReview}
                onOpenTrainingWeek={openTrainingWeek}
              />
            )}
          </aside>
        </div>
      )}

      {isOriginal && !inTrainingPlan && <FailureSummary />}

      <footer className="site-footer">
        <p>Jovani Chess Lab</p>
        <span>
          Games, answers, and review notes stay only in this open tab. No account, upload,
          analytics, engine, or external service.
        </span>
      </footer>

      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>

      <PgnImportDialog
        open={showImport}
        defaultPgn={jovaniStudy.pgn}
        onClose={() => setShowImport(false)}
        onLoad={loadGame}
      />
    </main>
  );
}

function PlayerRow({
  color,
  game,
  toMove,
  winner,
  opponent = false,
  action,
}: {
  color: Color;
  game: ParsedGame;
  toMove: boolean;
  winner: boolean;
  opponent?: boolean;
  action?: ReactNode;
}) {
  const name = color === "w" ? game.white : game.black;
  const colorName = color === "w" ? "White" : "Black";

  return (
    <div className={cn("player-row", opponent && "opponent")} data-player-color={color}>
      <div className={cn("avatar", color === "w" ? "light" : "dark")} aria-hidden="true">
        {initials(name)}
      </div>
      <div>
        <strong>{name}</strong>
        <span>{toMove ? "To move" : colorName}</span>
      </div>
      {winner && (
        <span className="winner-badge">
          <Flag size={13} /> Winner
        </span>
      )}
      {action}
    </div>
  );
}

function answerAsMove(answer: SubmittedAnswer | null): MoveRecord | undefined {
  if (!answer?.from || !answer.to) return undefined;
  return {
    from: answer.from,
    to: answer.to,
    san: answer.san,
    color: "w",
    piece: "p",
  };
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}
