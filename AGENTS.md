# AGENTS.md

## Purpose

Jovani Chess Lab is a focused chess-analysis and training application. It uses Next.js-compatible App Router APIs through Vinext and deploys as a Cloudflare Worker through Sites.

## Prerequisites

- Node 22.15 or newer
- npm
- Bootstrap with `npm ci`

## Canonical commands

| Command                 | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `npm run dev`           | Start the local Sites/Vinext development server   |
| `npm run lint`          | Run ESLint                                        |
| `npm run typecheck`     | Run strict TypeScript checks                      |
| `npm run test`          | Run Vitest unit and interaction tests             |
| `npm run build`         | Build and validate the deployable Worker artifact |
| `npm run test:artifact` | Smoke-test an existing production build           |
| `npm run test-all`      | Run every required quality gate                   |
| `npm run format`        | Format the repository with Prettier               |

## Working rules

- Keep App Router routes under root `app/`; keep product code under `src/` and import it through `@/*`.
- Use kebab-case filenames and named exports for reusable modules.
- The bundled study is validated data. Tactical claims must remain executable through `chess.js` tests.
- Imported PGNs and training state are intentionally session-only. Do not add persistence, authentication, analytics, or external chess services without a separate product decision.
- Preserve `.openai/hosting.json`, the Sites Vite plugin, and Worker-compatible ESM output.
- Keep D1 and R2 disabled until the product explicitly needs durable data.

## Quality gate

Before finishing a change, run `npm run test-all`.
