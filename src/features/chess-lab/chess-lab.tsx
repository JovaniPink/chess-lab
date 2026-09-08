"use client";
import { useMachine } from "@xstate/react";
import { Chess, type PieceSymbol, type Square } from "chess.js";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  FlipHorizontal2,
  Pause,
  Play,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { jovaniStudy } from "@/content/jovani-study";
import { candidateForMove, chessAtPly, formatMoveLabel, parsePgn, playMove } from "@/lib/chess";
import { SITE_NAME } from "@/lib/site-config";
import type { CandidateMove, ParsedGame, SubmittedAnswer } from "@/types/chess";
import { ChessBoard } from "./chess-board";
import { chessLabMachine } from "./chess-lab-machine";
import { FailureSummary } from "./failure-summary";
import {
  createEmptyImportedGameReview,
  ImportedGameReviewFlow,
  reviewRequirements,
  type ImportedGameReview,
} from "./imported-game-review";
import { PgnImportDialog } from "./pgn-import-dialog";
import { PracticePanel } from "./practice-panel";
import { ReviewPanel } from "./review-panel";
import { createTrainingPlan, TrainingPlanView } from "./training-plan";
import { gameIdentity, gameMetadata, type ReviewStage, type SessionGame } from "./session-game";
import { practiceSummary, reviewSummary } from "./summaries";
import { SummaryActions } from "./summary-actions";

const originalGame = parsePgn(jovaniStudy.pgn);
if (originalGame.moves.length !== jovaniStudy.expectedPlyCount)
  throw new Error("Bundled study move count mismatch.");
export function ChessLab() {
  const [state, send] = useMachine(chessLabMachine);
  const [sessions, setSessions] = useState<SessionGame[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [bundledPly, setBundledPly] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [started, setStarted] = useState(false);
  const [training, setTraining] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [plan, setPlan] = useState(createTrainingPlan);
  const [disclosures, setDisclosures] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("Bundled study loaded.");
  const [focusVersion, setFocusVersion] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const nextId = useRef(1);
  useEffect(() => {
    if (focusVersion) heading.current?.focus();
  }, [focusVersion]);
  const session = sessions.find((s) => s.id === activeGameId);
  const game = session?.game ?? originalGame;
  const original = !session;
  const run = state.context.run;
  const practice = !training && state.matches("practice") && !!run;
  const explore = !training && state.matches("explore");
  const review = !training && !practice && !explore;
  const summary = practice && run?.phase === "summary";
  const lesson = jovaniStudy.lessons[state.context.lessonIndex];
  const currentPly = state.context.currentPly;
  const label = currentPly
    ? formatMoveLabel(currentPly - 1, game.moves[currentPly - 1], game.initialFen)
    : "Starting position";
  const answer = state.context.submittedAnswer;
  const practicePosition = () => {
    const position = chessAtPly(originalGame, lesson.setupPly);
    if (run?.phase === "revealed") position.move(lesson.correctSan);
    else if (answer && (run?.phase === "incorrect" || run?.phase === "solved"))
      return new Chess(answer.fen);
    return position;
  };
  const boardChess = explore
    ? new Chess(state.context.branchFen)
    : practice
      ? practicePosition()
      : chessAtPly(game, currentPly);
  const positionLabel = practice
    ? `Position ${state.context.lessonIndex + 1}, ${run?.phase === "answering" ? "your move" : "feedback"}`
    : explore
      ? `variation after ${state.context.branchMoves.length} branch moves`
      : label;
  const lastMove = explore
    ? (state.context.branchLastMove ?? undefined)
    : practice
      ? answer?.from && answer.to
        ? { from: answer.from, to: answer.to }
        : undefined
      : game.moves[currentPly - 1];
  const thoughts = review && session?.stage === "thoughts";
  function focusWorkspace() {
    setStarted(true);
    setFocusVersion((v) => v + 1);
  }
  function updateSession(patch: Partial<SessionGame>) {
    setSessions((all) => all.map((s) => (s.id === activeGameId ? { ...s, ...patch } : s)));
  }
  function savePly(ply: number) {
    if (session) updateSession({ ply });
    else setBundledPly(ply);
  }
  function seek(ply: number) {
    const bounded = Math.max(0, Math.min(ply, game.moves.length));
    send({ type: "REVIEW" });
    send({ type: "SEEK", ply: bounded });
    savePly(bounded);
    setMessage(
      bounded
        ? `Returned to ${formatMoveLabel(bounded - 1, game.moves[bounded - 1], game.initialFen)}.`
        : "Returned to the starting position.",
    );
  }
  function openGame(id: string | null, ply?: number) {
    savePly(currentPly);
    const target = sessions.find((s) => s.id === id);
    const position = ply ?? target?.ply ?? bundledPly;
    setActiveGameId(id);
    setTraining(false);
    send({ type: "LOAD_GAME", maxPly: (target?.game ?? originalGame).moves.length, ply: position });
    if (target && ply !== undefined)
      setSessions((all) => all.map((s) => (s.id === id ? { ...s, stage: "positions", ply } : s)));
    setMessage(target ? `${gameIdentity(target)} opened.` : "Returned to the bundled study.");
    focusWorkspace();
  }
  function loadGame(imported: ParsedGame) {
    savePly(currentPly);
    const id = `game-${nextId.current++}`;
    setSessions((all) => [
      ...all,
      {
        id,
        game: imported,
        review: createEmptyImportedGameReview(),
        stage: "thoughts",
        ply: 0,
        week: selectedWeek,
      },
    ]);
    setActiveGameId(id);
    setShowImport(false);
    setTraining(false);
    send({ type: "LOAD_GAME", maxPly: imported.moves.length });
    setMessage("Game loaded. Start with your first impressions.");
    focusWorkspace();
  }
  function startPractice(restart = false, lessonIndex?: number, lessonIds?: string[]) {
    savePly(currentPly);
    setActiveGameId(null);
    setTraining(false);
    if (!original) send({ type: "LOAD_GAME", maxPly: originalGame.moves.length, ply: bundledPly });
    send({
      type: "PRACTICE",
      restart,
      lessonIndex,
      lessonIds:
        lessonIds ??
        (lessonIndex === undefined ? undefined : [jovaniStudy.lessons[lessonIndex].id]),
    });
    focusWorkspace();
  }
  function enterExplore() {
    setTraining(false);
    send({ type: "EXPLORE", fen: boardChess.fen(), label: positionLabel });
    focusWorkspace();
  }
  function openReview() {
    setTraining(false);
    send({ type: "REVIEW" });
    focusWorkspace();
  }
  function openWeek(week = selectedWeek) {
    if (state.matches("playing")) {
      send({ type: "PAUSE" });
      savePly(currentPly);
    }
    setSelectedWeek(week);
    setTraining(true);
    focusWorkspace();
  }
  function stage(value: ReviewStage) {
    updateSession({ stage: value });
    focusWorkspace();
  }
  function updateReview(value: ImportedGameReview) {
    updateSession({ review: value });
  }
  function complete() {
    if (!session || reviewRequirements(session.review).some((r) => !r.done)) return;
    const id = `review-${session.id}`;
    setPlan((current) => ({
      ...current,
      weeks: current.weeks.map((w) => ({
        ...w,
        linkedReviews: [
          ...w.linkedReviews.filter((l) => l.id !== id),
          ...(w.number === session.week ? [{ id, gameId: session.id }] : []),
        ],
      })),
    }));
    updateSession({
      review: {
        ...session.review,
        completed: true,
        trainingWeekLink: { id, weekNumber: session.week },
      },
    });
    setMessage(`Review completed and linked to Week ${session.week}.`);
    focusWorkspace();
  }
  function mark() {
    if (
      !session ||
      session.review.criticalPositions.some((p) => p.ply === currentPly) ||
      session.review.criticalPositions.length >= 3
    )
      return;
    updateSession({
      stage: "positions",
      review: {
        ...session.review,
        completed: false,
        criticalPositions: [
          ...session.review.criticalPositions,
          { ply: currentPly, label, note: "" },
        ],
      },
    });
    setMessage(`${label} marked.`);
  }
  function submit(from: Square, to: Square, promotion: PieceSymbol = "q") {
    const chess = new Chess(boardChess.fen());
    const move = playMove(chess, from, to, promotion);
    if (!move) return false;
    if (explore) {
      send({ type: "BRANCH_MOVE", ...move, fen: chess.fen() });
      setMessage(`${move.san} added to the variation.`);
      return true;
    }
    if (practice && run?.phase === "answering") {
      send({
        type: "SUBMIT_ANSWER",
        answer: {
          ...move,
          fen: chess.fen(),
          correct: candidateForMove(lesson, move.san)?.correct ?? false,
        },
      });
      setMessage(`${move.san} submitted. Feedback follows the candidates.`);
      return true;
    }
    return false;
  }
  function candidate(c: CandidateMove) {
    const chess = chessAtPly(originalGame, lesson.setupPly);
    try {
      const move = chess.move(c.san);
      submit(move.from, move.to, move.promotion);
    } catch {
      setMessage("This candidate cannot be played from the lesson position.");
    }
  }
  function reveal() {
    const chess = chessAtPly(originalGame, lesson.setupPly);
    const move = chess.move(lesson.correctSan);
    const answer: SubmittedAnswer = { ...move, fen: chess.fen(), correct: true };
    send({ type: "REVEAL", answer });
    focusWorkspace();
    setMessage("Coached move revealed. This position is recorded as revealed, not solved.");
  }
  const marked = session?.review.criticalPositions.some((p) => p.ply === currentPly);
  const full = (session?.review.criticalPositions.length ?? 0) >= 3;
  const boardFact = boardChess.isCheckmate()
    ? "Checkmate"
    : boardChess.isStalemate()
      ? "Stalemate"
      : boardChess.isCheck()
        ? "Check"
        : "";
  const top = flipped ? game.white : game.black;
  const bottom = flipped ? game.black : game.white;
  return (
    <main className={`app-frame learning-app ${started ? "task-started" : ""}`}>
      <a className="skip-link" href="#study-workspace">
        Skip to study workspace
      </a>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <BrainCircuit size={21} />
          </div>
          <div>
            <p>{SITE_NAME}</p>
            <span>Think clearly. Learn from the board.</span>
          </div>
        </div>
        <Button tone="ghost" onClick={() => setShowImport(true)}>
          <Upload size={16} />
          Load PGN
        </Button>
      </header>
      {!started && (
        <section className="welcome">
          <h1>Improve your chess decisions through guided practice and your own game reviews.</h1>
          <p>For players who know the moves and want to make better decisions.</p>
          <div className="action-row">
            <Button tone="primary" onClick={() => startPractice(true)}>
              Start five-position lesson
            </Button>
            <Button tone="secondary" onClick={() => setShowImport(true)}>
              Review your game
            </Button>
          </div>
        </section>
      )}
      <div className="workspace-header">
        <nav className="mode-tabs" aria-label="Study modes">
          {(
            [
              ["Review", review, openReview],
              ["Practice", practice, () => startPractice()],
              ["Explore", explore, enterExplore],
              ["Training plan", training, () => openWeek()],
            ] as const
          ).map(([name, active, action]) => (
            <button
              key={name}
              type="button"
              aria-current={active ? "page" : undefined}
              className={active ? "active" : ""}
              onClick={action}
            >
              {name}
            </button>
          ))}
        </nav>
        {!original && (
          <p className="mode-explanation">
            Guided practice uses the bundled study. Your imported review stays in this tab.
          </p>
        )}
        <div className="game-context">
          {sessions.length > 0 && (
            <label>
              Games in this tab
              <select
                value={activeGameId ?? "bundled"}
                onChange={(e) => openGame(e.target.value === "bundled" ? null : e.target.value)}
              >
                <option value="bundled">Bundled study</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {gameIdentity(s)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <details>
            <summary>Game details</summary>
            <p>
              {game.white} vs. {game.black} · Result:{" "}
              {game.result === "*" ? "Unfinished" : game.result}
            </p>
            <p>{gameMetadata(game)}</p>
          </details>
          <details>
            <summary>Notation and help</summary>
            <p>
              PGN is the text notation of a chess game. SAN names moves: N is knight, B bishop, R
              rook, Q queen, K king; pawns use the destination. “x” means capture, “+” check, and
              “#” checkmate. A tempo is a turn used to improve a position. Count attackers and
              defenders to see whether a piece is supported.
            </p>
          </details>
        </div>
        <h1 ref={heading} tabIndex={-1} id="workspace-title">
          {training
            ? "Training plan"
            : summary
              ? "Your study recap"
              : practice
                ? `Position ${run.cursor + 1} of ${run.lessonIds.length}`
                : explore
                  ? "Explore a variation"
                  : thoughts
                    ? "First impressions"
                    : original
                      ? "Guided game review"
                      : "Review your game"}
        </h1>
      </div>
      {training ? (
        <TrainingPlanView
          plan={plan}
          selectedWeek={selectedWeek}
          onChange={setPlan}
          onSelectWeek={setSelectedWeek}
          sessions={sessions}
          onOpenGame={openGame}
          disclosures={disclosures}
          onDisclosure={(id, open) =>
            setDisclosures((d) => (d[id] === open ? d : { ...d, [id]: open }))
          }
        />
      ) : summary && run ? (
        <section id="study-workspace" className="recap">
          <dl className="recap-stats">
            {practiceSummary(run).sections[0].lines.map((line) => (
              <div key={line}>
                <dt>{line.split(":")[0]}</dt>
                <dd>{line.split(":")[1]}</dd>
              </div>
            ))}
          </dl>
          <label htmlFor="takeaway">Takeaway habit</label>
          <textarea
            id="takeaway"
            value={run.takeaway}
            onChange={(e) => send({ type: "TAKEAWAY", value: e.target.value })}
          />
          <div className="action-row">
            <Button
              tone="primary"
              disabled={
                !run.lessonIds.some((id) =>
                  ["revealed", "skipped"].includes(run.progress[id].outcome),
                )
              }
              onClick={() =>
                startPractice(
                  true,
                  undefined,
                  run.lessonIds.filter((id) =>
                    ["revealed", "skipped"].includes(run.progress[id].outcome),
                  ),
                )
              }
            >
              Retry positions needing work
            </Button>
            <Button tone="secondary" onClick={openReview}>
              Review the game
            </Button>
            <Button tone="ghost" onClick={() => startPractice(true)}>
              Restart five-position lesson
            </Button>
          </div>
          <SummaryActions summary={practiceSummary(run)} />
        </section>
      ) : (
        <div
          id="study-workspace"
          className={`workspace-grid ${practice ? "practice-workspace" : ""} ${thoughts ? "thoughts-workspace" : ""}`}
        >
          {practice && (
            <section className="practice-question" aria-label="Practice question">
              <h2>{lesson.prompt}</h2>
              <p>
                {run.phase === "answering"
                  ? "Make a legal move on the board or choose a candidate."
                  : "Your answer is shown. Read the feedback to continue."}
              </p>
              <Button tone="ghost" onClick={() => startPractice(true)}>
                Restart five-position lesson
              </Button>
            </section>
          )}
          {!thoughts && (
            <section className="board-column" aria-label="Chess board workspace">
              <div className="player-row opponent" data-player-color={flipped ? "w" : "b"}>
                <strong>{top}</strong>
                <span>
                  {flipped ? "White" : "Black"}
                  {boardChess.turn() === (flipped ? "w" : "b") ? " · To move" : ""}
                </span>
              </div>
              <ChessBoard
                chess={boardChess}
                flipped={flipped}
                interactive={explore || (practice && run.phase === "answering")}
                positionKey={`${activeGameId ?? "bundled"}-${practice ? lesson.id : explore ? "explore" : "review"}`}
                positionLabel={positionLabel}
                lastMove={lastMove}
                readOnlyInstruction={
                  practice ? "Read the feedback to choose your next action." : undefined
                }
                onMove={submit}
              />
              <div className="player-row" data-player-color={flipped ? "b" : "w"}>
                <strong>{bottom}</strong>
                <span>
                  {flipped ? "Black" : "White"}
                  {boardChess.turn() === (flipped ? "b" : "w") ? " · To move" : ""}
                </span>
                <Button
                  tone="ghost"
                  size="icon"
                  aria-label="Flip board"
                  onClick={() => setFlipped((v) => !v)}
                >
                  <FlipHorizontal2 size={18} />
                </Button>
              </div>
              {boardFact && <p role="status">{boardFact}</p>}
              {review && (
                <>
                  <div className="playback-card">
                    <Button
                      tone="ghost"
                      size="icon"
                      aria-label="Previous move"
                      aria-disabled={!currentPly}
                      onClick={() => currentPly > 0 && seek(currentPly - 1)}
                    >
                      <ArrowLeft />
                    </Button>
                    <Button
                      size="icon"
                      aria-label={state.matches("playing") ? "Pause replay" : "Play replay"}
                      onClick={() => send({ type: state.matches("playing") ? "PAUSE" : "PLAY" })}
                    >
                      {state.matches("playing") ? <Pause /> : <Play />}
                    </Button>
                    <Button
                      tone="ghost"
                      size="icon"
                      aria-label="Next move"
                      aria-disabled={currentPly === game.moves.length}
                      onClick={() => currentPly < game.moves.length && seek(currentPly + 1)}
                    >
                      <ArrowRight />
                    </Button>
                    <div className="scrubber-wrap">
                      <strong>{label}</strong>
                      <input
                        aria-label="Game move"
                        aria-valuetext={label}
                        type="range"
                        min={0}
                        max={game.moves.length}
                        value={currentPly}
                        onChange={(e) => seek(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  {session && (
                    <div className="mark-position">
                      <Button tone="secondary" aria-disabled={marked || full} onClick={mark}>
                        {marked
                          ? "Position marked"
                          : full
                            ? "Three positions marked"
                            : "Mark position"}
                      </Button>
                      <p>
                        {marked
                          ? "This position is already marked."
                          : full
                            ? "Remove a marked position to choose another."
                            : "Mark up to three decisions worth revisiting."}
                      </p>
                    </div>
                  )}
                </>
              )}
              {explore && (
                <div className="explore-controls">
                  <p>
                    Variation from {state.context.branchStartLabel}.{" "}
                    {boardChess.turn() === "w" ? "White" : "Black"} to move.
                  </p>
                  <p aria-label="Variation moves">
                    {state.context.branchMoves.map((m) => m.san).join(" ") || "No branch moves yet"}
                  </p>
                  <div className="action-row">
                    <Button
                      tone="secondary"
                      aria-disabled={!state.context.branchMoves.length}
                      onClick={() => {
                        if (!state.context.branchMoves.length) return;
                        send({ type: "UNDO_BRANCH" });
                        setMessage("Last variation move undone.");
                      }}
                    >
                      Undo move
                    </Button>
                    <Button tone="secondary" onClick={() => send({ type: "RESET_BRANCH" })}>
                      Reset variation
                    </Button>
                    <Button tone="ghost" onClick={openReview}>
                      Return to review
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}
          <aside className="study-panel" aria-label="Study guidance">
            {practice && run ? (
              <PracticePanel
                lesson={lesson}
                run={run}
                answer={answer}
                onCandidate={candidate}
                onHint={() => send({ type: "HINT" })}
                onRetry={() => {
                  send({ type: "RETRY" });
                  focusWorkspace();
                }}
                onReveal={reveal}
                onSkip={() => {
                  send({ type: "SKIP" });
                  focusWorkspace();
                }}
                onContinue={() => {
                  send({ type: "NEXT_LESSON" });
                  focusWorkspace();
                }}
              />
            ) : explore ? (
              <>
                <h2>Try a legal continuation</h2>
                <p>
                  Experiment with either side. Undo a move to compare another choice; reset to
                  return to the branch’s starting position.
                </p>
                {original && (
                  <details>
                    <summary>Original-game notes</summary>
                    <p>{jovaniStudy.summary}</p>
                    <p>
                      These notes describe the recorded game, not an evaluation of this variation.
                    </p>
                  </details>
                )}
              </>
            ) : (
              <>
                {!thoughts && (
                  <ReviewPanel
                    game={game}
                    currentPly={currentPly}
                    isOriginal={original}
                    onSeek={seek}
                    onPractice={(i) => startPractice(true, i)}
                  />
                )}
                {session && (
                  <>
                    <ImportedGameReviewFlow
                      review={session.review}
                      stage={session.stage}
                      week={session.week}
                      onStage={stage}
                      onWeek={(week) =>
                        updateSession({ week, review: { ...session.review, completed: false } })
                      }
                      onChange={updateReview}
                      onSeek={seek}
                      onComplete={complete}
                      onOpenWeek={() => openWeek(session.week)}
                    />
                    <SummaryActions summary={reviewSummary(session)} />
                  </>
                )}
              </>
            )}
          </aside>
        </div>
      )}
      {original && review && (
        <details className="retrospective">
          <summary>Study diagnosis and practical habits</summary>
          <FailureSummary />
        </details>
      )}
      <footer className="footer">
        <p>{SITE_NAME}</p>
        <p>
          Stored only in this tab. Copy or print anything you want to keep. Refreshing or closing
          clears your games, answers, and notes.
        </p>
        <nav aria-label="Chess Lab information">
          <a href="https://measuredstudios.com/lab">Studio Lab</a>
          <a href="https://measuredstudios.com/privacy">Privacy</a>
          <a href="https://github.com/JovaniPink/chess-lab">Source</a>
        </nav>
      </footer>
      <p className="sr-only" role="status">
        {message}
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
