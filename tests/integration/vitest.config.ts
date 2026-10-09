import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    testTimeout: 20_000,
    // Every test boots its own PGlite database; more workers run out of memory.
    maxWorkers: 2,
  },
});
