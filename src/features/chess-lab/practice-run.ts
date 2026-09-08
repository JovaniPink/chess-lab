import { jovaniStudy } from "@/content/jovani-study";
import type { SubmittedAnswer } from "@/types/chess";
export type PracticeOutcome = "pending" | "solved" | "revealed" | "skipped";
export type LessonProgress = {
  attempts: SubmittedAnswer[];
  hintUsed: boolean;
  outcome: PracticeOutcome;
};
export type PracticeRun = {
  lessonIds: string[];
  cursor: number;
  progress: Record<string, LessonProgress>;
  phase: "answering" | "incorrect" | "solved" | "revealed" | "summary";
  takeaway: string;
};
export function createPracticeRun(ids = jovaniStudy.lessons.map((l) => l.id)): PracticeRun {
  return {
    lessonIds: ids,
    cursor: 0,
    progress: Object.fromEntries(
      ids.map((id) => [id, { attempts: [], hintUsed: false, outcome: "pending" }]),
    ),
    phase: "answering",
    takeaway: "",
  };
}
export function practiceStats(run: PracticeRun) {
  const values = Object.values(run.progress);
  return {
    attempted: values.filter((p) => p.attempts.length).length,
    unassisted: values.filter(
      (p) => p.outcome === "solved" && p.attempts.length === 1 && !p.hintUsed,
    ).length,
    assisted: values.filter((p) => p.outcome === "solved" && (p.attempts.length > 1 || p.hintUsed))
      .length,
    revealed: values.filter((p) => p.outcome === "revealed").length,
    skipped: values.filter((p) => p.outcome === "skipped").length,
    hints: values.filter((p) => p.hintUsed).length,
  };
}
export function practiceHabit(run: PracticeRun) {
  const needs = (id: string) => ["revealed", "skipped"].includes(run.progress[id].outcome);
  const helped = (id: string) => run.progress[id].hintUsed || run.progress[id].attempts.length > 1;
  const id = run.lessonIds.find(needs) ?? run.lessonIds.find(helped);
  return (
    jovaniStudy.lessons.find((l) => l.id === id)?.hint ??
    "After every opponent move, ask: What changed—especially which defender moved and which line opened?"
  );
}
