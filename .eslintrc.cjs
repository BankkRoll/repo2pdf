/**
 * ESLint configuration for repo2pdf (ESLint 8 + @typescript-eslint 7).
 *
 * Rules are tuned to catch the classes of bugs found during the v3 audit
 * (unused/dead code, floating promises) without blocking on stylistic noise.
 */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // Dead-code detection (caught the dead SecureTokenManager/ParallelProcessor).
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    // Async-safety (caught the unawaited highlighter init).
    "@typescript-eslint/no-floating-promises": "warn",
    "@typescript-eslint/no-misused-promises": "warn",
    // Pragmatic for a CLI/codebase that intentionally uses `any` in a few spots.
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "no-console": "off",
  },
  ignorePatterns: [
    "dist/",
    "node_modules/",
    "coverage/",
    "tests/fixtures/test-repos/",
    "tests/fixtures/edge-cases/",
    "tests/fixtures/multi-language/",
    "tests/fixtures/synthetic-large/",
    "*.js",
    "*.cjs",
  ],
};
