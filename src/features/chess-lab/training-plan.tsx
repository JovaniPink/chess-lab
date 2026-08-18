"use client";

import {
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListChecks,
  NotebookPen,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const activityBlueprints = [
  { id: "serious-games", label: "Serious games", target: "2" },
  { id: "human-first-analyses", label: "Human-first analyses", target: "2" },
  { id: "tactical-sessions", label: "Tactical sessions", target: "5" },
  { id: "written-calculation", label: "Written calculation sessions", target: "2" },
  { id: "endgame-sessions", label: "Endgame sessions", target: "2" },
  { id: "model-game", label: "Model game", target: "1" },
  { id: "opening-maintenance", label: "Opening maintenance", target: "1" },
] as const;

const phaseBlueprints = [
  {
    weeks: [1, 2],
    title: "Baseline and threat awareness",
    intention: "Observe your decisions honestly and build a dependable threat scan.",
    commitments: [
      "Play two serious games at 15+10 or slower.",
      "Analyze each game without an engine first.",
      "Ask “What changed?” after every opposing move.",
      "Log unforced material losses and missed immediate threats.",
    ],
  },
  {
    weeks: [3, 4],
    title: "Tactical foundations",
    intention: "Build recognition through a fixed set, then verify every idea by calculation.",
    commitments: [
      "Begin one fixed tactical set and keep it stable.",
      "Train forks, pins, skewers, loose pieces, and removal of defenders.",
      "Perform a blunder check before every move.",
      "Continue serious games and human-first analysis.",
    ],
  },
  {
    weeks: [5, 6],
    title: "Calculation discipline",
    intention: "Generate real candidates and test them against the opponent’s best defense.",
    commitments: [
      "Complete two written calculation sessions.",
      "Generate at least two candidates in every critical position.",
      "Calculate the opponent’s strongest defense.",
      "Log variations you stopped too early.",
    ],
  },
  {
    weeks: [7, 8],
    title: "Endgame foundations",
    intention: "Train execution from both sides instead of merely recognizing the position.",
    commitments: [
      "Practice opposition, key squares, pawn races, Lucena, and Philidor.",
      "Play theoretical positions from both sides.",
      "Review every endgame transition from recent games.",
      "Continue serious games and human-first analysis.",
    ],
  },
  {
    weeks: [9, 10],
    title: "Pawn structures and model games",
    intention: "Connect a recurring structure from your repertoire to plans you can explain.",
    commitments: [
      "Choose one recurring pawn structure from your repertoire.",
      "Study three complete annotated model games.",
      "Record typical pawn breaks, piece placement, and favorable exchanges.",
      "Explain your middlegame plan after each serious game.",
    ],
  },
  {
    weeks: [11],
    title: "Opening consolidation",
    intention: "Keep only opening knowledge that connects to your games and makes human sense.",
    commitments: [
      "Create one-page summaries for your main openings.",
      "Add only variations that arose in your games.",
      "Attach model games to each structural family.",
      "Remove memorized branches you cannot explain.",
    ],
  },
  {
    weeks: [12],
    title: "Audit and redesign",
    intention: "Use decision-quality evidence to choose the next cycle’s largest bottleneck.",
    commitments: [
      "Audit serious games and human-first analyses.",
      "Compare unforced losses, missed threats, and time-trouble games.",
      "Name repeated error categories and the drills that helped.",
      "Design the next cycle around the largest remaining bottleneck.",
    ],
  },
] as const;

type ActivityId = (typeof activityBlueprints)[number]["id"];

export type TrainingActivity = {
  id: ActivityId;
  label: string;
  target: string;
  completed: string;
};

export type WeeklyReview = {
  bestDecision: string;
  importantMistake: string;
  repeatedError: string;
  improvementEvidence: string;
  nextAdjustment: string;
};

export type TrainingWeek = {
  number: number;
  phase: string;
  intention: string;
  primaryTarget: string;
  commitments: Array<{ label: string; complete: boolean }>;
  activities: TrainingActivity[];
  trainingNotes: string;
  metrics: {
    unforcedLosses: string;
    missedThreats: string;
    timeTroubleGames: string;
    endgamesExecuted: string;
  };
  review: WeeklyReview;
};

export type TrainingPlan = {
  objective: {
    weeklyTime: string;
    outcomeGoal: string;
    decisionQualityGoal: string;
    habitToBuild: string;
    behaviorToReduce: string;
  };
  weeks: TrainingWeek[];
};

export function createTrainingPlan(): TrainingPlan {
  return {
    objective: {
      weeklyTime: "",
      outcomeGoal: "",
      decisionQualityGoal: "",
      habitToBuild: "",
      behaviorToReduce: "",
    },
    weeks: phaseBlueprints.flatMap((phase) =>
      phase.weeks.map((weekNumber) => ({
        number: weekNumber,
        phase: phase.title,
        intention: phase.intention,
        primaryTarget: phase.title,
        commitments: phase.commitments.map((label) => ({ label, complete: false })),
        activities: activityBlueprints.map((activity) => ({
          ...activity,
          completed: "",
        })),
        trainingNotes: "",
        metrics: {
          unforcedLosses: "",
          missedThreats: "",
          timeTroubleGames: "",
          endgamesExecuted: "",
        },
        review: {
          bestDecision: "",
          importantMistake: "",
          repeatedError: "",
          improvementEvidence: "",
          nextAdjustment: "",
        },
      })),
    ),
  };
}

type TrainingPlanViewProps = {
  plan: TrainingPlan;
  selectedWeek: number;
  onChange: (plan: TrainingPlan) => void;
  onSelectWeek: (week: number) => void;
};

export function TrainingPlanView({
  plan,
  selectedWeek,
  onChange,
  onSelectWeek,
}: TrainingPlanViewProps) {
  const week = plan.weeks[selectedWeek - 1] ?? plan.weeks[0];
  const completedCommitments = week.commitments.filter((item) => item.complete).length;
  const totalCompleted = plan.weeks.reduce(
    (total, planWeek) => total + planWeek.commitments.filter((item) => item.complete).length,
    0,
  );
  const totalCommitments = plan.weeks.reduce(
    (total, planWeek) => total + planWeek.commitments.length,
    0,
  );

  function updateObjective(
    field: keyof TrainingPlan["objective"],
    value: TrainingPlan["objective"][typeof field],
  ) {
    onChange({
      ...plan,
      objective: { ...plan.objective, [field]: value },
    });
  }

  function updateWeek(patch: Partial<TrainingWeek>) {
    onChange({
      ...plan,
      weeks: plan.weeks.map((planWeek) =>
        planWeek.number === week.number ? { ...planWeek, ...patch } : planWeek,
      ),
    });
  }

  function updateActivity(activityId: ActivityId, field: "target" | "completed", value: string) {
    updateWeek({
      activities: week.activities.map((activity) =>
        activity.id === activityId ? { ...activity, [field]: value } : activity,
      ),
    });
  }

  function updateMetric(field: keyof TrainingWeek["metrics"], value: string) {
    updateWeek({ metrics: { ...week.metrics, [field]: value } });
  }

  function updateReview(field: keyof WeeklyReview, value: string) {
    updateWeek({ review: { ...week.review, [field]: value } });
  }

  return (
    <section id="study-workspace" className="training-plan" aria-labelledby="training-plan-title">
      <header className="training-plan-header">
        <div className="training-plan-heading">
          <div className="training-plan-icon" aria-hidden="true">
            <CalendarRange size={22} />
          </div>
          <div>
            <p className="eyebrow">Systematic training workbook</p>
            <h2 id="training-plan-title">Your 12-week training cycle</h2>
            <p>
              Start with your games and your thinking. Rating is secondary; better decisions are the
              work.
            </p>
          </div>
        </div>
        <div className="session-boundary">
          <ShieldCheck size={17} />
          <div>
            <strong>Open-tab plan</strong>
            <span>Edits survive view changes, then disappear on refresh or close.</span>
          </div>
        </div>
      </header>

      <section className="cycle-compass" aria-labelledby="cycle-compass-title">
        <div className="plan-section-heading">
          <div>
            <p className="eyebrow">Cycle compass</p>
            <h3 id="cycle-compass-title">Define the behavior you want to change</h3>
          </div>
          <span>Editable this session</span>
        </div>
        <div className="objective-grid">
          <PlanField
            id="weekly-time"
            label="Weekly study time available"
            value={plan.objective.weeklyTime}
            placeholder="For example: 5 focused hours"
            onChange={(value) => updateObjective("weeklyTime", value)}
          />
          <PlanField
            id="outcome-goal"
            label="Twelve-week outcome goal"
            value={plan.objective.outcomeGoal}
            placeholder="A concrete body of work, not a rating promise"
            onChange={(value) => updateObjective("outcomeGoal", value)}
          />
          <PlanField
            id="decision-quality-goal"
            label="Decision-quality goal"
            value={plan.objective.decisionQualityGoal}
            placeholder="The decisions you want to make more reliably"
            onChange={(value) => updateObjective("decisionQualityGoal", value)}
          />
          <PlanField
            id="habit-to-build"
            label="Most important habit to build"
            value={plan.objective.habitToBuild}
            placeholder="For example: threat scan after every opponent move"
            onChange={(value) => updateObjective("habitToBuild", value)}
          />
          <PlanField
            id="behavior-to-reduce"
            label="Behavior to reduce or eliminate"
            value={plan.objective.behaviorToReduce}
            placeholder="The recurring shortcut that costs you decisions"
            onChange={(value) => updateObjective("behaviorToReduce", value)}
          />
        </div>
      </section>

      <div className="plan-progress" aria-label="Cycle progress">
        <div>
          <span>Selected</span>
          <strong>Week {week.number} of 12</strong>
        </div>
        <div>
          <span>This week</span>
          <strong>
            {completedCommitments} / {week.commitments.length} commitments
          </strong>
        </div>
        <div>
          <span>Whole cycle</span>
          <strong>
            {totalCompleted} / {totalCommitments} commitments
          </strong>
        </div>
      </div>

      <nav className="week-picker" aria-label="Training weeks">
        {plan.weeks.map((planWeek) => {
          const weekCompleted = planWeek.commitments.filter((item) => item.complete).length;
          return (
            <button
              key={planWeek.number}
              type="button"
              className={cn(
                planWeek.number === week.number && "active",
                weekCompleted > 0 && "started",
              )}
              onClick={() => onSelectWeek(planWeek.number)}
              aria-current={planWeek.number === week.number ? "step" : undefined}
              aria-label={`Week ${planWeek.number}, ${planWeek.phase}, ${weekCompleted} of ${planWeek.commitments.length} commitments complete`}
            >
              <span>{planWeek.number}</span>
              {weekCompleted === planWeek.commitments.length ? (
                <Check size={12} aria-hidden="true" />
              ) : (
                <small>
                  {weekCompleted}/{planWeek.commitments.length}
                </small>
              )}
            </button>
          );
        })}
      </nav>

      <article className="training-week" aria-labelledby="training-week-title">
        <header className="training-week-header">
          <div>
            <p className="eyebrow">Week {week.number}</p>
            <h3 id="training-week-title">{week.phase}</h3>
            <p>{week.intention}</p>
          </div>
          <div className="week-navigation">
            <Button
              tone="ghost"
              size="icon"
              disabled={week.number === 1}
              onClick={() => onSelectWeek(week.number - 1)}
              aria-label="Previous week"
            >
              <ChevronLeft size={18} />
            </Button>
            <Button
              tone="ghost"
              size="icon"
              disabled={week.number === 12}
              onClick={() => onSelectWeek(week.number + 1)}
              aria-label="Next week"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </header>

        <div className="training-week-grid">
          <section className="plan-card" aria-labelledby="weekly-work-title">
            <div className="plan-card-title">
              <Target size={17} />
              <div>
                <h4 id="weekly-work-title">This week’s work</h4>
                <p>Protect the phase intent, then adapt it to your actual games.</p>
              </div>
            </div>
            <label htmlFor={`week-${week.number}-target`}>Primary training target</label>
            <input
              id={`week-${week.number}-target`}
              value={week.primaryTarget}
              onChange={(event) => updateWeek({ primaryTarget: event.target.value })}
            />
            <div className="commitment-list" aria-label={`Week ${week.number} commitments`}>
              {week.commitments.map((commitment, index) => (
                <label key={commitment.label} className={cn(commitment.complete && "complete")}>
                  <input
                    type="checkbox"
                    checked={commitment.complete}
                    onChange={(event) =>
                      updateWeek({
                        commitments: week.commitments.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, complete: event.target.checked } : item,
                        ),
                      })
                    }
                  />
                  <span aria-hidden="true">{commitment.complete ? <Check size={13} /> : null}</span>
                  {commitment.label}
                </label>
              ))}
            </div>
          </section>

          <section className="plan-card" aria-labelledby="weekly-rhythm-title">
            <div className="plan-card-title">
              <ListChecks size={17} />
              <div>
                <h4 id="weekly-rhythm-title">Weekly rhythm</h4>
                <p>Workbook defaults are starting points. Fit the targets to your week.</p>
              </div>
            </div>
            <div className="activity-table">
              <div className="activity-table-heading" aria-hidden="true">
                <span>Activity</span>
                <span>Done</span>
                <span>Target</span>
              </div>
              {week.activities.map((activity) => (
                <div className="activity-row" key={activity.id}>
                  <span>{activity.label}</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={activity.completed}
                    onChange={(event) =>
                      updateActivity(activity.id, "completed", event.target.value)
                    }
                    aria-label={`${activity.label} completed, week ${week.number}`}
                  />
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={activity.target}
                    onChange={(event) => updateActivity(activity.id, "target", event.target.value)}
                    aria-label={`${activity.label} target, week ${week.number}`}
                  />
                </div>
              ))}
            </div>
            <label htmlFor={`week-${week.number}-notes`}>Training notes</label>
            <textarea
              id={`week-${week.number}-notes`}
              rows={3}
              value={week.trainingNotes}
              onChange={(event) => updateWeek({ trainingNotes: event.target.value })}
              placeholder="What needs protecting, rescheduling, or changing this week?"
            />
          </section>
        </div>

        <section className="decision-quality" aria-labelledby="decision-quality-title">
          <div className="plan-card-title">
            <Clock3 size={17} />
            <div>
              <h4 id="decision-quality-title">Decision-quality signals</h4>
              <p>
                Count what happened in your games. Treat rating as a secondary, lagging measure.
              </p>
            </div>
          </div>
          <div className="metric-grid">
            <MetricField
              id={`week-${week.number}-unforced-losses`}
              label="Unforced material losses"
              value={week.metrics.unforcedLosses}
              onChange={(value) => updateMetric("unforcedLosses", value)}
            />
            <MetricField
              id={`week-${week.number}-missed-threats`}
              label="Missed immediate threats"
              value={week.metrics.missedThreats}
              onChange={(value) => updateMetric("missedThreats", value)}
            />
            <MetricField
              id={`week-${week.number}-time-trouble`}
              label="Time-trouble games"
              value={week.metrics.timeTroubleGames}
              onChange={(value) => updateMetric("timeTroubleGames", value)}
            />
            <MetricField
              id={`week-${week.number}-endgames`}
              label="Endgames executed"
              value={week.metrics.endgamesExecuted}
              onChange={(value) => updateMetric("endgamesExecuted", value)}
            />
          </div>
        </section>

        <section className="weekly-reflection" aria-labelledby="weekly-reflection-title">
          <div className="plan-card-title">
            <NotebookPen size={17} />
            <div>
              <h4 id="weekly-reflection-title">Human checkpoint</h4>
              <p>Review the week in your own words before changing the plan.</p>
            </div>
          </div>
          <div className="reflection-grid">
            <PlanField
              id={`week-${week.number}-best-decision`}
              label="Best decision of the week"
              value={week.review.bestDecision}
              onChange={(value) => updateReview("bestDecision", value)}
              multiline
            />
            <PlanField
              id={`week-${week.number}-important-mistake`}
              label="Most important mistake"
              value={week.review.importantMistake}
              onChange={(value) => updateReview("importantMistake", value)}
              multiline
            />
            <PlanField
              id={`week-${week.number}-repeated-error`}
              label="Repeated error"
              value={week.review.repeatedError}
              onChange={(value) => updateReview("repeatedError", value)}
              multiline
            />
            <PlanField
              id={`week-${week.number}-improvement-evidence`}
              label="Evidence of improvement"
              value={week.review.improvementEvidence}
              onChange={(value) => updateReview("improvementEvidence", value)}
              multiline
            />
            <PlanField
              id={`week-${week.number}-next-adjustment`}
              label="Training adjustment for next week"
              value={week.review.nextAdjustment}
              onChange={(value) => updateReview("nextAdjustment", value)}
              multiline
            />
          </div>
        </section>
      </article>
    </section>
  );
}

function PlanField({
  id,
  label,
  value,
  placeholder,
  multiline = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="plan-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

function MetricField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="metric-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        placeholder="—"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
