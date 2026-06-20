import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    // Unit + (gated) integration tests. Playwright specs live in /e2e.
    include: ["test/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      // Allow importing modules marked "server-only" inside the test runner.
      "server-only": path.resolve(root, "test/stubs/server-only.ts"),
      "@": path.resolve(root, "src"),
    },
  },
});
