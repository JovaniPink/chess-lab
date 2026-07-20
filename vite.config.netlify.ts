import { nitro } from "nitro/vite";
import vinext from "vinext";
import { defineConfig } from "vite";

// Netlify runs the same Vinext application through Nitro's native Netlify
// function preset. The Sites build keeps its Cloudflare-specific Vite config.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [vinext(), nitro({ preset: "netlify" })],
});
