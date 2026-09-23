# Dependency security

The application runtime dependency graph must pass `corepack npm run audit:production` and
`corepack npm run security:transitive-guards`. The full graph must pass
`corepack npm run audit:dependencies`, which executes npm's complete JSON audit and permits only
the exact causal closure of the reviewed exception below. A new advisory, changed causal path, or
disappearing exception fails the gate and requires a fresh decision. The raw non-allowlisted npm
exit behavior remains available through `corepack npm run audit:raw`.

## Time-bounded development exceptions

Re-reviewed 2026-09-02 against the npm registry, npm 12.0.2, and Netlify CLI 27.3.0:

| Package                                                                  | Development-only path                                       | Disposition                                                                                                                 |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`extract-zip@2.0.1`](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) | `netlify-cli` -> `@netlify/dev` -> `@netlify/functions-dev` | No fixed `extract-zip` release is published. Keep isolated to local/CI Netlify tooling and review when Netlify replaces it. |

Netlify CLI 27.3.0 selects `@netlify/dev@5.0.1`, `@netlify/functions-dev@2.0.1`, and nested `@netlify/dev-utils` paths at 5.0.0 or 6.0.1. The guard validates every installed utility path instead of assuming npm will hoist one to the root. `image-size` remains absent from the lockfile, but the functions development path still selects `extract-zip@2.0.1`. npm's suggested fix remains an unsupported downgrade to Netlify CLI 23.15.1.

The full audit reports exactly three high-severity package paths: `@netlify/dev`,
`@netlify/functions-dev`, and `extract-zip`. They are one causal chain to
`GHSA-jmr9-qjv8-65gv`; no other finding is accepted. `browserslist` is locked at a fixed version
within its declared transitive range.

`sharp@0.35.4` is enforced through npm overrides because Netlify Images 2.0.1 still installs IPX 3.1.1 with a `^0.34.3` range. The canonical tests and packaged Netlify artifact tests validate the override; remove it after Netlify Images adopts IPX 4 or another fixed Sharp range.

Recheck the remaining exception no later than 2026-09-15, and earlier whenever Netlify CLI, `@netlify/dev`, `@netlify/functions-dev`, or the npm advisory report changes.
