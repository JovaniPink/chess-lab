export const SITE_NAME = "Jovani Chess Lab";
export const SITE_DESCRIPTION =
  "An interactive, human-first chess analysis and training workspace built around one real game.";

function normalizeAppEnv(value?: string) {
  switch (value) {
    case "production":
      return "prd";
    case "preview":
      return "stg";
    case "development":
      return "dev";
    default:
      return value || "stg";
  }
}

export const appEnv = normalizeAppEnv(
  process.env.CHESS_LAB_APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV,
);
export const isProduction = appEnv === "prd";
export const configuredSiteUrl = (
  process.env.CHESS_LAB_SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:5173"
).replace(/\/$/, "");
