import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("site configuration", () => {
  it("keeps the production canonical fixed to the Measured Studios domain", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "prd");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://wrong.example");
    vi.stubEnv("CHESS_LAB_SITE_URL", "https://also-wrong.example");

    const { PRODUCTION_SITE_URL, configuredSiteUrl, isProduction } = await import("./site-config");

    expect(isProduction).toBe(true);
    expect(configuredSiteUrl).toBe(PRODUCTION_SITE_URL);
  });

  it("uses the unique configured URL outside production", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "stg");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://deploy-preview-17--chess-labs.netlify.app/");

    const { configuredSiteUrl, isProduction } = await import("./site-config");

    expect(isProduction).toBe(false);
    expect(configuredSiteUrl).toBe("https://deploy-preview-17--chess-labs.netlify.app");
  });

  it("fails an unknown environment closed to staging behavior", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "unexpected");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example-preview.netlify.app/");

    const { appEnv, configuredSiteUrl, isProduction } = await import("./site-config");

    expect(appEnv).toBe("stg");
    expect(isProduction).toBe(false);
    expect(configuredSiteUrl).toBe("https://example-preview.netlify.app");
  });
});
