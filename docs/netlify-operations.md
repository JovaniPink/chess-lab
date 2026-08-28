# Chess Lab Netlify operations

## Release authority

Reviewed merges to GitHub `main` are the normal production release path. The repository's `netlify.toml` is authoritative for the build command, Node version, response headers, and code-based rate limit. Netlify's restore-deploy control is the owner-only break-glass rollback path.

The production application is public at `https://chess.measuredstudios.com`. Deploy previews and deploy logs are private. The default `chess-labs.netlify.app` hostname remains attached only as a provider-managed redirect to the primary domain.

## Cost boundary

Chess Lab has no accounts, database, forms, analytics, AI inference, external chess engine, uploads, or paid API. Normal requests should resolve from static assets. Nitro's packaged server function remains a fallback for unmatched routes.

Netlify credit auto-recharge must remain disabled. Credit exhaustion may pause every project on the team; that availability loss is intentional because it prevents automatic credit-pack purchases.

The repository limits the whole site to 120 requests per 60 seconds for each IP and domain. This is a single-client abuse control, not a distributed-traffic ceiling. Verify every changed rule in the deploy log because provider validation errors do not necessarily fail a deploy.

## Monitoring and response

- Record the project request, bandwidth, function-compute, and credit baseline at launch.
- Recheck after 24 hours and seven days.
- At 50 percent of the team credit pool, inspect per-project usage and rate-limit activity.
- At 75 percent, stop nonessential production deploys and investigate abnormal traffic.
- If hostile Chess Lab traffic threatens the remaining portfolio allowance, an owner may disable the Chess Lab project in Netlify while preserving the repository and DNS record for investigation.

## Verification

After each production release, confirm:

1. GitHub `main` and the Netlify production deploy reference the same commit.
2. The deploy log used `npm run build` from `netlify.toml`, Node 22.15.0, and skipped Netlify's Next.js plugin in favor of Vinext and Nitro.
3. Netlify accepted the rate-limit rule during post-processing.
4. The custom domain has a valid certificate and returns the expected CSP and security headers.
5. Canonical metadata, Open Graph URL, robots, and sitemap use `https://chess.measuredstudios.com`.
6. `https://chess-labs.netlify.app` redirects to the custom domain.

## Rollback

If a release breaks the application or its security policy, restore the last known-good Netlify deploy, revert the GitHub change through a reviewed PR, and verify the restored commit and live behavior independently. If DNS or certificate setup fails before release, keep the Netlify hostname primary and remove only the new `chess` CNAME from Squarespace.
