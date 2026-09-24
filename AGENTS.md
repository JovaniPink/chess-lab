# AGENTS.md

## Purpose

Jovani Chess Lab is a focused chess-analysis and training application. It uses Next.js-compatible App Router APIs through Vinext and deploys to Netlify through Nitro.

## Prerequisites

- Node 22.22.2 or Node 24.15.0 and later compatible minors
- npm 12.0.2 through the integrity-pinned `packageManager` declaration
- Bootstrap with `corepack npm ci`

## Canonical commands

| Command                               | Purpose                                                 |
| ------------------------------------- | ------------------------------------------------------- |
| `corepack npm run dev`                | Start the local Vinext development server               |
| `corepack npm run dev:netlify`        | Run the application through Netlify Dev                 |
| `corepack npm run lint`               | Run ESLint                                              |
| `corepack npm run typecheck`          | Run the TypeScript 7 native CLI                         |
| `corepack npm run typecheck:compat`   | Run the TypeScript 6 Vinext compatibility API           |
| `corepack npm run test`               | Run Vitest unit and interaction tests                   |
| `corepack npm run build`              | Build and validate the Nitro/Netlify artifact           |
| `corepack npm run test:artifact`      | Smoke-test the packaged Netlify runtime                 |
| `corepack npm run audit:production`   | Reject high-severity production dependency findings     |
| `corepack npm run audit:dependencies` | Audit the full graph; no advisory exception is accepted |
| `corepack npm run test-all`           | Run every required Netlify-focused quality gate         |
| `corepack npm run format`             | Format the repository with Prettier                     |

## Working rules

- Keep App Router routes under root `app/`; keep product code under `src/` and import it through `@/*`.
- Use kebab-case filenames and named exports for reusable modules.
- The bundled study is validated data. Tactical claims must remain executable through `chess.js` tests.
- Imported PGNs and training state are intentionally session-only. Do not add persistence, authentication, analytics, or external chess services without a separate product decision.
- Preserve `netlify.toml`, the Nitro Vite configuration, and the generated Netlify function contract.
- Do not add another hosting target, persistence layer, or external service without a separate product decision.

## Quality gate

Before finishing a change, run `corepack npm install-scripts ls` and
`corepack npm run test-all`. The complete gate includes production and full dependency audits. The
full audit accepts no advisory at any severity unless an exception is documented in
`docs/dependency-security.md`; any new advisory fails. Do not suppress findings or force unsupported
transitive overrides.

## Framework and publication safety

- Read the version-matched Next.js guides in `node_modules/next/dist/docs/` before changing App
  Router contracts, then verify the behavior against Vinext, Nitro, and the artifact tests because
  this repository does not run the stock Next.js server.
- Inspect the staged diff and every commit being pushed. Do not publish credentials, private data,
  unapproved source artifacts, or private workstation and user identifiers.
- Use synthetic fixtures for public examples. Automated secret scanning is a backstop, not proof;
  rotate or revoke an exposed credential before attempting history cleanup.
