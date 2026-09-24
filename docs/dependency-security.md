# Dependency security

The application runtime dependency graph must pass `corepack npm run audit:production` and
`corepack npm run security:transitive-guards`. The full graph must pass
`corepack npm run audit:dependencies`, which executes npm's complete JSON audit and currently
accepts no advisory at any severity. A new advisory fails the gate and requires either a real
update or a fresh, documented decision recorded below with its exact causal path. The raw npm exit
behavior remains available through `corepack npm run audit:raw`.

## Time-bounded development exceptions

None. Re-reviewed 2026-09-23 against the npm registry, npm 12.0.2, and Netlify CLI 27.8.1.

The previous `extract-zip@2.0.1` exception (`GHSA-jmr9-qjv8-65gv`, and the later
`GHSA-7pqw-9j4j-h8q3`) is retired. Netlify CLI 27.8.1 selects `@netlify/dev@5.1.2` and
`@netlify/functions-dev@2.0.7`, which unpacks archives with `yauzl` and no longer depends on
`extract-zip`. The same update moves `@netlify/build`, `@netlify/zip-it-and-ship-it`, and
`@netlify/functions-utils` onto a fixed `toml` range. The transitive guard rejects any lockfile
path to `extract-zip` or `image-size` and requires the Netlify 27.8 toolchain minimums.

`browserslist`, `js-yaml`, and `fflate` are locked at fixed versions within their declared
transitive ranges.

`sharp@0.35.4` is enforced through npm overrides because Netlify Images 2.0.1 still installs IPX
3.1.1 with a `^0.34.3` range, and 0.35.4 is the first release outside `GHSA-rgj7-g3m4-5g8c`. The
canonical tests and packaged Netlify artifact tests validate the override; remove it after Netlify
Images adopts IPX 4 or another fixed Sharp range.

Recheck whenever Netlify CLI, `@netlify/dev`, `@netlify/functions-dev`, Netlify Images, or the npm
advisory report changes.
