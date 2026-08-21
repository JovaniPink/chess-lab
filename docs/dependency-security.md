# Dependency security

The application runtime dependency graph must pass `npm audit --omit=dev --audit-level=high` and `npm run security:transitive-guards`. The guard keeps the remaining exception below out of the production graph, rejects Sharp releases older than 0.35.0, and rejects a lockfile that reintroduces `image-size` or a pre-5.0 root Netlify utility.

## Time-bounded development exceptions

Reviewed 2026-08-21 against the npm registry and Netlify CLI 27.1.2:

| Package                                                                  | Development-only path                                       | Disposition                                                                                                                 |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`extract-zip@2.0.1`](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) | `netlify-cli` -> `@netlify/dev` -> `@netlify/functions-dev` | No fixed `extract-zip` release is published. Keep isolated to local/CI Netlify tooling and review when Netlify replaces it. |

Netlify CLI 27.1.2 moves its root `@netlify/dev-utils` dependency from 4.4.7 to 5.0.0, removing the final `image-size@2.0.2` path from this lockfile. The full audit therefore reports four high-severity rows through one underlying `extract-zip` advisory, down from six rows across two underlying packages. npm's suggested fix remains an unsupported downgrade to Netlify CLI 23.15.1.

`sharp@0.35.3` is enforced through npm overrides because Netlify Images still installs IPX 3.1.1 with a `^0.34.3` range. The canonical tests and packaged Netlify artifact tests validate the override; remove it after Netlify Images adopts IPX 4 or another fixed Sharp range.

Recheck the remaining exception no later than 2026-09-15, and earlier whenever Netlify CLI, `@netlify/dev`, or `@netlify/functions-dev` changes.
