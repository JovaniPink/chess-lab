import vinext from "vinext";
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => {
  const netlifyContext = process.env.CONTEXT ?? (command === "serve" ? "dev" : "production");
  const appEnv = netlifyContext === "production" ? "prd" : netlifyContext === "dev" ? "dev" : "stg";
  const deployUrl =
    netlifyContext === "production"
      ? process.env.URL
      : (process.env.DEPLOY_PRIME_URL ?? process.env.URL);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? deployUrl ?? "https://chess-labs.netlify.app";

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
