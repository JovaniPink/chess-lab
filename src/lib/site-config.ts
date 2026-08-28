export const SITE_NAME = "Chess Lab by Measured Studios";
export const SITE_TITLE = "Chess Lab | Measured Studios";
export const SITE_DESCRIPTION =
  "An interactive, human-first chess analysis and training workspace built around one real game.";
export const PRODUCTION_SITE_URL = "https://chess.measuredstudios.com";

export type AppEnvironment = "dev" | "stg" | "prd";

function normalizeAppEnv(value?: string): AppEnvironment {
  switch (value) {
    case "production":
      return "prd";
    case "preview":
      return "stg";
    case "development":
      return "dev";
    case "dev":
    case "stg":
    case "prd":
      return value;
    default:
      return "stg";
  }
}

export const appEnv = normalizeAppEnv(
  process.env.CHESS_LAB_APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV,
);
export const isProduction = appEnv === "prd";
export const configuredSiteUrl = (
  isProduction
    ? PRODUCTION_SITE_URL
    : (process.env.CHESS_LAB_SITE_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:5173")
).replace(/\/$/, "");
