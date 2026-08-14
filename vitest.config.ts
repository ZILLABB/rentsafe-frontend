import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** Test config, kept separate from vite.config.ts.
 *
 *  Vitest re-exports `defineConfig` with stricter Rollup typings than the app
 *  build uses, so putting a `test` block inside the Vite config forced a choice
 *  between a typed test section and a typed `manualChunks`. Two files, both
 *  correct, is cheaper than either compromise.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["node_modules", "dist"],
  },
});
