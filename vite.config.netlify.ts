import { nitro } from "nitro/vite";
import vinext from "vinext";
import { defineConfig } from "vite";

const netlifyContext = process.env.CONTEXT ?? "production";
const appEnv = netlifyContext === "production" ? "prd" : netlifyContext === "dev" ? "dev" : "stg";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.DEPLOY_PRIME_URL ??
  process.env.URL ??
  "https://chess-labs.netlify.app";

// Netlify runs the same Vinext application through Nitro's native Netlify
// function preset. The Sites build keeps its Cloudflare-specific Vite config.
export default defineConfig({
  define: {
    "process.env.CHESS_LAB_APP_ENV": JSON.stringify(appEnv),
    "process.env.CHESS_LAB_SITE_URL": JSON.stringify(siteUrl),
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [vinext(), nitro({ preset: "netlify" })],
});
