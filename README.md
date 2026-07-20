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
- Dual deployment targets: Cloudflare Worker-compatible Sites and Netlify Functions through Nitro

## Local development

Requirements:

- Node.js 22.15 or newer
- npm

Install and run:

```bash
npm ci
npm run dev
```

Vite normally serves the app at `http://localhost:5173`.

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
npm run build:netlify
npm run test:netlify-artifact
```

## Netlify

The repository is ready for Netlify continuous deployment from GitHub. Netlify uses `netlify.toml`, builds the Vinext application with Nitro's Netlify preset, publishes static assets from `dist`, and serves the App Router through the generated Netlify function.

To create or link a Netlify site locally:

```bash
npx netlify init
```

To test the complete Netlify build locally:

```bash
npm run build:netlify
npm run test:netlify-artifact
```

Once the directory is linked, preview and production deploys are available through:

```bash
npm run deploy:netlify
npm run deploy:netlify:prod
```

Netlify's `CONTEXT`, `DEPLOY_PRIME_URL`, and `URL` values are used automatically for environment-aware indexing and canonical metadata. Deploy previews remain non-indexed; the production context is indexable.

## Architecture

- `app/` contains runtime-sensitive App Router routes, metadata, and global styles.
- `src/content/` contains the validated bundled study.
- `src/features/chess-lab/` contains the product state machine and interface modules.
- `src/lib/` contains PGN parsing, board reconstruction, and shared utilities.
- `worker/` and `vite.config.ts` preserve the Sites/Vinext Cloudflare runtime.
- `vite.config.netlify.ts` and `netlify.toml` provide the parallel Nitro/Netlify runtime without changing the application code.

The review, practice, feedback, playing, and exploration modes are explicit XState states. `chess.js` remains authoritative for move legality, FEN reconstruction, check, and checkmate.
