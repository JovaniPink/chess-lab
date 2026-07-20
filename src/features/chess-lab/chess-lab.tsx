"use client";

import { useMachine } from "@xstate/react";
import { Chess, type PieceSymbol, type Square } from "chess.js";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
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
import { useMemo, useState } from "react";
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
import { PgnImportDialog } from "./pgn-import-dialog";
import { PracticePanel } from "./practice-panel";
import { ReviewPanel } from "./review-panel";

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
  const [liveMessage, setLiveMessage] = useState("Bundled study loaded.");

  const inReview = state.matches("review") || state.matches("playing");
  const inPractice = state.matches("practice") || state.matches("feedback");
  const inExplore = state.matches("explore");
  const currentPly = Math.min(state.context.currentPly, game.moves.length);
  const currentLesson = jovaniStudy.lessons[state.context.lessonIndex];
  const lineChess = useMemo(() => chessAtPly(game.moves, currentPly), [currentPly, game.moves]);
  const practiceChess = useMemo(() => {
    if (!inPractice) return null;
    return state.context.submittedAnswer
      ? new Chess(state.context.submittedAnswer.fen)
      : chessAtPly(game.moves, currentLesson.setupPly);
  }, [currentLesson.setupPly, game.moves, inPractice, state.context.submittedAnswer]);
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

  function enterExplore() {
    send({ type: "EXPLORE", fen: lineChess.fen() });
    setLiveMessage(`Exploring from ${currentMoveLabel}.`);
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
      const chess = chessAtPly(game.moves, currentLesson.setupPly);
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
    const chess = chessAtPly(game.moves, currentLesson.setupPly);
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
    setShowImport(false);
    send({ type: "LOAD_GAME", maxPly: importedGame.moves.length });
    setLiveMessage(
      `${importedGame.white} versus ${importedGame.black} loaded with ${importedGame.moves.length} plies.`,
    );
  }

  function resetOriginal() {
    setGame(originalGame);
    setIsOriginal(true);
    setShowImport(false);
    send({ type: "LOAD_GAME", maxPly: originalGame.moves.length });
    setLiveMessage("Returned to the bundled Jovani study.");
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
            <GraduationCap size={15} /> {game.white} vs. {game.black} · {game.result}
          </p>
          <h1 id="page-title">
            {isOriginal ? jovaniStudy.headline : "Read the game one decision at a time."}
          </h1>
          <p className="hero-copy">
            {isOriginal
              ? jovaniStudy.summary
              : "Replay the imported line, inspect every position, and branch into legal variations without changing the original game."}
          </p>
        </div>
        <div className="result-card" aria-label={`Game result ${game.result}`}>
          <span>Result</span>
          <strong>{game.result}</strong>
          <p>
            {game.isCheckmate
              ? `Checkmate in ${Math.ceil(game.moves.length / 2)}`
              : `${game.moves.length} ply`}
          </p>
        </div>
      </section>

      <nav className="mode-tabs" aria-label="Study modes">
        <button
          type="button"
          className={cn(inReview && "active")}
          onClick={() => send({ type: "REVIEW" })}
          aria-current={inReview ? "page" : undefined}
        >
          <History size={17} /> Review
        </button>
        <button
          type="button"
          className={cn(inPractice && "active")}
          onClick={() => isOriginal && send({ type: "PRACTICE", lessonIndex: 0 })}
          disabled={!isOriginal}
          aria-current={inPractice ? "page" : undefined}
        >
          <Target size={17} /> Find the move
        </button>
        <button
          type="button"
          className={cn(inExplore && "active")}
          onClick={enterExplore}
          aria-current={inExplore ? "page" : undefined}
        >
          <Swords size={17} /> Explore variations
        </button>
      </nav>

      <div id="study-workspace" className="workspace-grid">
        <section className="board-column" aria-label="Chess board workspace">
          <div className="player-row opponent">
            <div className="avatar dark" aria-hidden="true">
              {initials(game.black)}
            </div>
            <div>
              <strong>{game.black}</strong>
              <span>{boardChess.turn() === "b" ? "To move" : "Black"}</span>
            </div>
            {isOriginal && (
              <span className="winner-badge">
                <Flag size={13} /> Winner
              </span>
            )}
          </div>

          <ChessBoard
            key={`${positionLabel}-${flipped}`}
            chess={boardChess}
            flipped={flipped}
            interactive={inExplore || state.matches("practice")}
            lastMove={lastMove}
            positionLabel={positionLabel}
            onMove={handleBoardMove}
          />

          <div className="player-row">
            <div className="avatar light" aria-hidden="true">
              {initials(game.white)}
            </div>
            <div>
              <strong>{game.white}</strong>
              <span>{boardChess.turn() === "w" ? "To move" : "White"}</span>
            </div>
            <Button
              tone="ghost"
              size="icon"
              onClick={() => setFlipped((value) => !value)}
              aria-label="Flip board"
            >
              <FlipHorizontal2 size={17} />
            </Button>
          </div>

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

        <aside className="study-panel" aria-label="Study guidance">
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
              isOriginal={isOriginal}
              onSeek={(ply) => send({ type: "SEEK", ply })}
              onPractice={(lessonIndex) => send({ type: "PRACTICE", lessonIndex })}
            />
          )}
        </aside>
      </div>

      {isOriginal && <FailureSummary />}

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
