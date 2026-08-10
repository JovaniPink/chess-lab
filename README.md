# Jovani Chess Lab

Jovani Chess Lab is an interactive, human-first chess analysis and training workspace built around Jovani Pink's July 20, 2026 game against the computer.

The app reconstructs the complete game, explains the decision chain behind the loss, and turns five critical positions into legal, board-driven exercises.

## Product features

- Complete 30-ply replay with autoplay, previous/next controls, scrubber, and clickable notation
- Five guided lessons playable directly on the board or through accessible candidate controls
- Legal variation exploration with promotion choice and branch reset
- PGN importing with player, result, and move validation
- Board orientation controls, keyboard navigation, live status feedback, and reduced-motion support
- Responsive layouts for desktop, tablet, and mobile

Imported games and lesson progress are intentionally session-only. The first release has no accounts, database, analytics, or external engine service.

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

- Node.js 22.15 or newer
- npm 10.9.2 when updating `package-lock.json`

Install and run:

```bash
npm ci
npm run dev
```

Vite normally serves the app at `http://localhost:5173`.

The repository records `npm@10.9.2` as its package manager because GitHub Actions
uses Node 22.15.0 and that npm release. Keep manifest and lockfile updates on that
version so `npm ci` validates the same graph locally and in CI.

## Quality gates

Run the complete gate:

```bash
npm run test-all
```

Or run checks independently:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:artifact
```

## Netlify

The repository is ready for Netlify continuous deployment from GitHub. Netlify uses `netlify.toml`, builds the Vinext application with Nitro's Netlify preset, publishes static assets from `dist`, and serves the App Router through the generated Netlify function.

To create or link a Netlify site locally:

```bash
npx netlify init
```

To test the complete Netlify build locally:

```bash
npm run build
npm run test:artifact
```

Once the directory is linked, preview and production deploys are available through:

```bash
npm run deploy:netlify
npm run deploy:netlify:prod
```

The Netlify build converts `CONTEXT` into the public application environment and embeds the current deploy URL in the server bundle. Artifact validation follows that same contract: deploy previews must remain non-indexed and omit a sitemap from `robots.txt`, while the production context must be indexable and use the canonical production sitemap URL. A local `npm run build` defaults to the production contract when `CONTEXT` is unset.

## Architecture

- `app/` contains runtime-sensitive App Router routes, metadata, and global styles.
- `src/content/` contains the validated bundled study.
- `src/features/chess-lab/` contains the product state machine and interface modules.
- `src/lib/` contains PGN parsing, board reconstruction, and shared utilities.
- `vite.config.ts` builds Vinext through Nitro's Netlify preset.
- `netlify.toml` defines the production build, publish directory, local proxy, and security headers.

The review, practice, feedback, playing, and exploration modes are explicit XState states. `chess.js` remains authoritative for move legality, FEN reconstruction, check, and checkmate.
