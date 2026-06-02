import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Never pick up test files inside fixture repos (real clones bring their own
    // *.test.ts that need other environments like jsdom).
    exclude: ["node_modules", "dist", "tests/fixtures/**"],
    // Generate deterministic fixtures once before the suite runs.
    globalSetup: ["./tests/global-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", "dist", "tests"],
    },
    // Increase timeout for PDF generation tests
    testTimeout: 120000, // 2 minutes
    hookTimeout: 60000, // 1 minute for setup/teardown
    // Allow console output for debugging
    silent: false,
    reporters: ["default"],
    // Show console logs during tests (useful for debugging)
    onConsoleLog: (log, type) => {
      // Return true to show logs, false to suppress
      // Show warnings and errors, suppress info
      if (type === "stderr") return true;
      if (log.includes("Error") || log.includes("Warning")) return true;
      return false;
    },
    // Pool settings for better parallel execution
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    // Retry flaky tests once
    retry: 1,
  },
});
