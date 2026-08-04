import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    // Playwright owns the end-to-end suite in `e2e/`.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
