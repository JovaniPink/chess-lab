# Learning experience implementation and validation

This implements the approved learning sequence: question, board, attempt, feedback, and a practical
next action. The implementation starts from `c6ae265` on `codex/complete-learning-experience`.
Application code is committed at `17635f4` (following board/presentation commit `e78defb`).
Application state remains tab-local. The public knowledge projection, study IDs and tactical data,
App Router routes, dependency lockfile, and Vinext/Nitro/Netlify contracts are unchanged.

## Delivered behavior

- Compact entry, four visible modes, mobile question-before-board ordering, viewport-aware desktop
  board sizing, readable text tokens, and six original SVG piece silhouettes.
- A mounted board with semantic rows, one roving entry point, visual arrow navigation, Home/End,
  corner navigation, illegal-move announcements, native promotion, and destination focus.
- Focusable replay/undo boundary controls prevent focus falling to the document when an action
  reaches the beginning or end. Retry, reveal, and mode changes focus the workspace heading.
- Explicit practice phases in the existing XState context: answering, incorrect, solved, revealed,
  and summary. Wrong-answer feedback does not reveal other candidate explanations. Runs preserve
  attempts and hints across modes/imports; recap and targeted retries distinguish outcomes. The
  machine ignores answer, hint, retry, reveal, skip, and continue events outside their phases.
  Practice this position jumps inside the current run, and any action that would replace run
  progress asks for confirmation in a native modal dialog.
- First-impressions-first imported review with optional skip, editable stages, completion checklist,
  three distinct marked positions, and a chosen training week.
- Stable tab game IDs, separate repeated imports, identifiable game selectors/cards, exact-position
  reopening, and one canonical review link that updates/moves on re-completion. Edits flag the link;
  changing the training week removes the old week's link until the review is completed again.
- Focused weekly training with retained workbook defaults and disclosure state. Shared read-only
  clipboard/print summaries exclude raw PGN and unrelated games, and identify draft reviews.

## Automated evidence

Local execution used Node 24.19.0 and integrity-pinned npm 12.0.2.

| Check                                       | Result                                  |
| ------------------------------------------- | --------------------------------------- |
| `corepack npm install-scripts ls`           | No unreviewed install scripts           |
| Formatting and ESLint                       | Pass                                    |
| Baseline and toolchain contracts            | Pass                                    |
| TypeScript 7 and TypeScript 6 compatibility | Pass                                    |
| Vitest                                      | 58 tests in 10 files pass               |
| Production dependency audit                 | Zero vulnerabilities                    |
| Full dependency audit                       | No advisories at any severity           |
| Development-only transitive guards          | Pass                                    |
| Production build and artifact contract      | Pass                                    |
| Packaged Netlify smoke tests                | Pass: all 9 checks on the final rebuild |

Regression coverage includes keyboard orientation/corners, illegal destinations, promotion cancel
and underpromotion, focus after moves/retry/undo, and variation rollback through capture, castling,
en passant, and underpromotion. Practice coverage includes wrong/retry/correct, hint/correct,
reveal, skip, mixed recap counts, fresh/targeted restarts, run preservation through Practice this
position, restart confirmation, and out-of-phase machine events. Review coverage
includes invalid drafts, memory skip, requirements, marker limits, identical-name/repeated games,
changed completion weeks, draft links, exact-position reopening, and Black-to-move FEN numbering.
Summary tests cover clipboard success/failure/manual fallback, draft scope, unrelated-game exclusion,
and restoring the view after the print lifecycle ends, including cancellation.

## Browser evidence

The in-app browser exercised the development build and synthetic import/review workflows.
Chrome also loaded the packaged Netlify site and started practice through Tab/Enter; the Chrome
tab then became unavailable before the complete keyboard-only sequence finished.
All nine measured widths had four visible mode controls, no page-level horizontal overflow, and DOM
order question → board → candidates. The board has eight rows and one keyboard entry point.

| Viewport width | Board width (CSS px) | Smallest square (CSS px) |
| -------------- | -------------------- | ------------------------ |
| 320            | 256                  | 32                       |
| 390            | 326                  | 41                       |
| 768            | 590                  | 74                       |
| 834            | 590                  | 74                       |
| 959            | 590                  | 74                       |
| 960            | 399                  | 50                       |
| 961            | 399                  | 50                       |
| 1280           | 350                  | 44                       |
| 1440           | 450                  | 56                       |

At 1280×800 and 1440×900, the practice question, full board, and Flip board control fit.
The development checks ended that control at approximately y=769 and y=869. A repeated matrix
against the packaged runtime serving the code committed at `17635f4` also passed all nine widths;
its corresponding control positions were y=688 and y=788. Board dimensions matched the table.
Narrow layouts use ordinary document scrolling. Screenshots were visually inspected in the task.

Live keyboard moves preserved destination focus. Wrong answer → retry → correct and variation
move → reselect Explore → undo succeeded. A synthetic imported review was completed into Week 3,
its marked 1.e4 position reopened, and Copy summary reported success after writing the clipboard.
Rendered DOM audits found eight grid rows, one roving entry point, no visible text below 12px, and
no text contrast ratios below 4.5:1 in the inspected final practice state. These are bounded custom
checks, not a full accessibility scanner or conformance claim.

The packaged runtime additionally completed wrong → retry → correct → remaining skips → recap
using keyboard activation of controls, then successfully copied the recap. A synthetic import was
completed into Week 2 and its marked 1.e4 position reopened with the correct game ID and slider
value. No warnings/errors were captured in that flow. Reload restored the introduction and starting
board and removed the retained-game selector, confirming temporary state was cleared. This does
not establish a full screen-reader journey or complete sequential keyboard traversal.

## Dependency findings

An earlier run of the full gate stopped at `audit:dependencies` on development-only TOML, fflate, and
extract-zip advisories. Main resolved them in #29 by moving to the Netlify CLI 27.8 toolchain and
retiring the extract-zip exception. After merging main, the full audit reports no advisories at any
severity and the transitive guards pass; see `docs/dependency-security.md`.

The development server also logged intermittent `@vitejs/plugin-rsc` errors during hot rebuilds
(`Cannot read properties of undefined (reading 'import')`). Final acceptance therefore used the
packaged runtime independently. This work does not claim to repair development-server internals;
no framework versions or artifact contracts were changed.

## Remaining release acceptance

The local full gate passes; hosted CI on Node 22 and 24 must also pass before release. No deployment is included.
A complete VoiceOver/Safari journey, physical touch-device acceptance, native 200% text scaling,
400% browser zoom, reduced-motion browser preference, and A4/Letter print preview still need direct
acceptance. Narrow viewport coverage is not a substitute for zoom, assistive technology, or touch.
Printing lifecycle tests do not prove paper layout or successful printing. The custom DOM audit is
not a full automated accessibility scan. Earlier production observations are not deployment proof.

After separately authorized deployment, verify the serving revision, public load, complete practice
run, synthetic import-to-plan handoff, keyboard focus, and responsive layout. Rollback is a revert
of the UI/state commits and redeployment of the prior artifact; no data migration is involved.
Usability checks establish that actions can be completed, not measured learning improvement.
