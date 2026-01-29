import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", "dist", "tests"],
    },
    testTimeout: 30000,
    // Suppress console output during tests for cleaner output
    silent: false,
    reporters: ["default"],
    onConsoleLog: () => false, // Suppress all console logs during tests
  },
});
