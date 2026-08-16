# Dependency security

The application runtime dependency graph must pass `npm audit --omit=dev --audit-level=high` and `npm run security:transitive-guards`. The guard prevents the two exceptions below from entering the production graph and rejects Sharp releases older than 0.35.0.

## Time-bounded development exceptions

Reviewed 2026-08-15 against the npm registry and Netlify CLI 27.1.1, the latest published release at review time:

| Package                                                                  | Development-only path                                       | Disposition                                                                                                                                                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`extract-zip@2.0.1`](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) | `netlify-cli` -> `@netlify/dev` -> `@netlify/functions-dev` | No fixed `extract-zip` release is published. Keep isolated to local/CI Netlify tooling and review when Netlify publishes a replacement.                                                         |
| [`image-size@2.0.2`](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr)  | `netlify-cli` -> `@netlify/dev-utils`                       | No fixed `image-size` release is published. Vinext 1.0.0-beta.6 removed its direct copy, but Netlify has not adopted `@netlify/dev-utils@5`. Keep the remaining path isolated to build tooling. |

`sharp@0.35.3` is enforced through npm overrides because Netlify Images still installs IPX 3.1.1 with a `^0.34.3` range. The canonical tests and packaged Netlify artifact tests validate the override; remove it after Netlify Images adopts IPX 4 or another fixed Sharp range.

Recheck these exceptions no later than 2026-09-15, and earlier whenever Netlify CLI, Vinext, `@netlify/functions-dev`, or `@netlify/dev-utils` changes.
