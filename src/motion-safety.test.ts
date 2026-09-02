import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("motion safety", () => {
  it("disables animation and transitions under reduced motion", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain("animation: none !important");
    expect(reduced).toContain("transition: none !important");
    expect(reduced).toContain("scroll-behavior: auto !important");
    expect(reduced).not.toContain("0.01ms");
  });

  it("does not ship an unused Motion dependency", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
    expect(manifest.dependencies).not.toHaveProperty("motion");
  });
});
