# Chess Lab by Measured Studios

Chess Lab by Measured Studios is an interactive, human-first chess analysis and training workspace built around Jovani Pink's July 20, 2026 game against the computer.

The app reconstructs the complete game, explains the decision chain behind the loss, and turns five critical positions into legal, board-driven exercises.

## Product features

- Complete 30-ply replay with autoplay, previous/next controls, scrubber, and clickable notation
- Five guided lessons with retries before solution reveal, hint tracking, and a session recap
- Legal variation exploration with native promotion choice, one-move undo, and branch reset
- PGN importing with player, result, and move validation
- Human-first imported-game review with memory capture, critical-position markers, one primary
  error category, and one corrective drill
- Editable 12-week training plan with workbook-based phases, weekly activity targets,
  decision-quality signals, and human reflection prompts
- Board orientation controls, keyboard navigation, live status feedback, and reduced-motion support
- Responsive layouts for desktop, tablet, and mobile

Imported games and lesson progress are intentionally session-only. The first release has no accounts, database, analytics, or external engine service.

## Imported-game review contract

The review workflow appears only after a valid PGN import. It preserves the player's own account
of the game before introducing outside analysis:

1. Record immediate post-game thoughts and the suspected first important mistake.
2. Replay the legal game and mark up to three critical positions.
3. Classify one primary thinking error.
4. Write one specific corrective drill.

A review can be completed only after thoughts, at least one critical position, an error category,
and a drill are present. Critical positions are stored by replay ply and are reconstructed through
the existing `chess.js` path; copied board states and engine evaluations are not authoritative.

The imported PGN, notes, markers, classification, and drill live only in React state for the open
tab. Each import receives its own session identity, including repeated imports of identical notation.
Games and unfinished reviews remain accessible through Games in this tab while switching modes.
All state disappears on reload or tab close. Do not add browser storage, uploads, accounts, analytics, engines, or another
external service without a separate product and privacy decision.

## Training-plan contract

The 12-week plan translates the systematic training workbook into a human-first weekly view. The
workbook's activity targets are editable starting points, while the phase commitments, leading
decision-quality signals, and end-of-week prompts keep the plan grounded in the player's own games
and observations rather than a rating promise. Completing an imported-game review links that
review's error category and corrective drill to the selected week as a distinct evidence record;
re-completing the same review updates or moves its stable link instead of duplicating it.

The complete plan and its linked reviews live in React memory for the open tab. They remain
available while switching between study modes, but a reload or closed tab starts a fresh plan. They
do not use browser storage, uploads, accounts, analytics, engines, or external services.

## Learning workflow and takeaways

Start with the five-position lesson, or choose Review your game to import notation. Incorrect
answers reveal only the attempted move's feedback until the learner explicitly requests the
coached move. Retries and hints remain in the run history. The recap distinguishes unassisted
solutions, assisted solutions, reveals, and skips; targeted retry selects revealed/skipped positions.
Switching modes or loading another game preserves the unfinished practice run.

Imported review starts with first impressions and an optional Skip for now action, followed by
Positions, Diagnosis and drill, and Complete. Skipping impressions does not waive the completion
requirement for nonblank thoughts. Links in the selected training week reopen the source game
and exact marked position. Editing a completed review marks its existing link as needing completion
again; re-completion updates that link and moves it when the chosen week changes.

The training view leads with the selected week and linked drills. Cycle goals, activity counts,
decision-quality signals, and reflection use disclosures whose state survives view changes.
Copy summary and Print summary provide read-only takeaways for the current review, practice recap,
or selected week. Clipboard failures expose selectable text. Summaries exclude raw PGN and unrelated
games; they are not a state export or restoration format.

Implementation validation and outstanding release limitations are recorded in
[the learning-experience validation notes](docs/learning-experience-validation.md).

## Technology

- Next.js 16-compatible App Router APIs through Vinext and Vite
- React 19 and TypeScript
- XState 5
- chess.js
- React Hook Form and Zod
- Tailwind CSS 4 and component-scoped design classes
- Vitest and Testing Library
- Netlify Functions deployment through Vinext, Vite, and Nitro

## Local development

Requirements:

- Node.js 22.22.2+ or 24.15.0+
- npm 12.0.2 through Corepack when installing or updating `package-lock.json`

Install and run:

```bash
corepack npm ci
corepack npm run dev
```

Vite normally serves the app at `http://localhost:5173`.

The repository integrity-pins `npm@12.0.2`, tests Node 22 and 24 in GitHub Actions,
and uses exact direct dependency versions. Keep manifest and lockfile updates on that
npm release so `corepack npm ci` validates the same graph locally and in CI.

## Quality gates

Run the complete gate:

```bash
corepack npm install-scripts ls
corepack npm run test-all
```

Or run checks independently:

```bash
corepack npm run lint
corepack npm run typecheck
corepack npm run typecheck:compat
corepack npm run test
corepack npm run audit:production
corepack npm run audit:dependencies
corepack npm run security:transitive-guards
corepack npm run build
corepack npm run test:artifact
```

`corepack npm run test-all` includes the production audit and a full dependency audit. The latter
runs npm's complete audit and currently accepts no advisory at any severity; every finding fails.
The transitive guard rejects Sharp versions older than 0.35.4, requires the Netlify CLI 27.8
toolchain, and prevents the lockfile from reintroducing the removed `extract-zip` and `image-size`
paths. Do not use `npm audit fix --force` or downgrade the runtime toolchain merely to make the
audit green. The narrow Sharp override, the retired `extract-zip` exception, and removal criteria
are documented in [docs/dependency-security.md](docs/dependency-security.md). Every toolchain
override must pass the production audit, Vinext/Nitro build, and packaged Netlify runtime tests.

## Product identity

Chess Lab retains its existing acid-lime knight mark, 48- and 192-pixel app icons, Apple icon, and
reviewed 1200x630 social card. `corepack npm run generate:favicon` deterministically produces the
conventional 64-pixel `favicon.ico`; the complete gate verifies its exact bytes, all rendered icon
dimensions, manifest declarations, metadata links, and the social-card digest.

## Netlify

The repository is ready for Netlify continuous deployment from GitHub. Netlify uses `netlify.toml`, builds the Vinext application with Nitro's Netlify preset, publishes static assets from `dist`, and serves the App Router through the generated Netlify function.

To create or link a Netlify site locally:

```bash
npx netlify init
```

To test the complete Netlify build locally:

```bash
corepack npm run build
corepack npm run test:artifact
```

Once the directory is linked, a preview deploy is available through:

```bash
corepack npm run deploy:netlify
```

Production deploys come from reviewed merges to GitHub `main`; routine local or API production deploys are outside the release contract. Netlify provider rollback is the owner-controlled break-glass path.

The Netlify build converts `CONTEXT` into the public application environment. Production uses `https://chess.measuredstudios.com` as the canonical URL. Deploy previews use their unique deploy URL, remain non-indexed, and omit a sitemap from `robots.txt`. A local `npm run build` defaults to the production contract when `CONTEXT` is unset.

Security, traffic, billing, and rollback controls are documented in [Netlify operations](docs/netlify-operations.md).

## Architecture

- `app/` contains runtime-sensitive App Router routes, metadata, and global styles.
- `src/content/` contains the validated bundled study.
- `src/features/chess-lab/` contains the product state machine and interface modules.
- `src/lib/` contains PGN parsing, board reconstruction, and shared utilities.
- `vite.config.ts` builds Vinext through Nitro's Netlify preset.
- `netlify.toml` defines the production build, publish directory, local proxy, and security headers.

The review, practice, feedback, playing, and exploration modes are explicit XState states. `chess.js` remains authoritative for move legality, FEN reconstruction, check, and checkmate.

## Training guides

- [Systematic Chess Improvement](docs/systematic-chess-improvement.md) presents a
  human-first loop for serious games, self-analysis, targeted practice, and
  measurement.
- [Chess Training Workbook](docs/systematic-chess-training-workbook.md) provides
  reusable worksheets for applying that loop over a twelve-week cycle.

These guides are practical coaching frameworks, not promises of a particular rating
gain. Their schedules and percentage allocations are starting heuristics to adjust
against the player's own error log and available time.
