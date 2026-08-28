import vinext from "vinext";
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { PRODUCTION_SITE_URL } from "./src/lib/site-config.ts";

export default defineConfig(({ command }) => {
  const netlifyContext = process.env.CONTEXT ?? (command === "serve" ? "dev" : "production");
  const appEnv = netlifyContext === "production" ? "prd" : netlifyContext === "dev" ? "dev" : "stg";
  const deployUrl = process.env.DEPLOY_PRIME_URL ?? process.env.URL;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (netlifyContext === "production" ? PRODUCTION_SITE_URL : deployUrl) ??
    "http://localhost:5173";

  return {
    define: {
      "process.env.CHESS_LAB_APP_ENV": JSON.stringify(appEnv),
      "process.env.CHESS_LAB_SITE_URL": JSON.stringify(siteUrl),
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      vinext(),
      nitro({
        preset: "netlify",
        prerender: {
          routes: ["/", "/manifest.webmanifest", "/robots.txt", "/sitemap.xml"],
          failOnError: true,
        },
      }),
    ],
  };
});
