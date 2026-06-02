#!/usr/bin/env ts-node
/**
 * Test Repository Setup Script
 *
 * Clones real-world repositories for comprehensive testing.
 * Run this before running the full test suite:
 *
 *   npx ts-node tests/setup-test-repos.ts
 *
 * This will clone repositories that cover:
 * - Multiple programming languages (JS, TS, Python, Rust, Go, Java, etc.)
 * - Various project structures
 * - Large file counts
 * - Real-world edge cases
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

// Directory where test repos will be cloned
const TEST_REPOS_DIR = path.join(__dirname, "fixtures", "test-repos");

/**
 * Test repositories to clone
 * Selected to cover various languages, sizes, and structures
 */
const TEST_REPOSITORIES = [
  // Small repos for quick tests
  {
    name: "chalk",
    url: "https://github.com/chalk/chalk",
    description: "Small TypeScript library - terminal styling",
    size: "small",
    languages: ["typescript", "javascript"],
  },
  {
    name: "is",
    url: "https://github.com/sindresorhus/is",
    description: "Small TypeScript library - type checking",
    size: "small",
    languages: ["typescript"],
  },

  // Medium repos for moderate tests
  {
    name: "commander.js",
    url: "https://github.com/tj/commander.js",
    description: "Medium JS/TS library - CLI framework",
    size: "medium",
    languages: ["javascript", "typescript"],
  },
  {
    name: "express",
    url: "https://github.com/expressjs/express",
    description: "Medium JS library - web framework",
    size: "medium",
    languages: ["javascript"],
  },

  // Large repos for comprehensive tests
  {
    name: "freeCodeCamp",
    url: "https://github.com/freeCodeCamp/freeCodeCamp",
    description:
      "LARGE - Open source learning platform with JS, TS, CSS, Markdown, etc.",
    size: "large",
    languages: [
      "javascript",
      "typescript",
      "css",
      "html",
      "markdown",
      "json",
      "yaml",
    ],
  },
  {
    name: "vscode",
    url: "https://github.com/microsoft/vscode",
    description: "LARGE - VS Code editor with TypeScript, CSS, HTML",
    size: "large",
    languages: ["typescript", "javascript", "css", "html", "json"],
  },
  {
    name: "rust",
    url: "https://github.com/rust-lang/rust",
    description: "LARGE - Rust compiler - Rust, Python, shell scripts",
    size: "large",
    languages: ["rust", "python", "bash", "toml"],
  },
  {
    name: "go",
    url: "https://github.com/golang/go",
    description: "LARGE - Go language - Go, Assembly, bash",
    size: "large",
    languages: ["go", "assembly", "bash"],
  },
  {
    name: "linux",
    url: "https://github.com/torvalds/linux",
    description: "MASSIVE - Linux kernel - C, Assembly, Makefile",
    size: "massive",
    languages: ["c", "assembly", "makefile", "bash"],
  },

  // Multi-language repos
  {
    name: "homebrew-core",
    url: "https://github.com/Homebrew/homebrew-core",
    description: "LARGE - Ruby formulas",
    size: "large",
    languages: ["ruby"],
  },
  {
    name: "tensorflow",
    url: "https://github.com/tensorflow/tensorflow",
    description: "LARGE - ML library - Python, C++, CUDA",
    size: "large",
    languages: ["python", "cpp", "cuda", "bash"],
  },
];

/** Repo root (one dir up from tests/). */
const REPO_ROOT = path.resolve(__dirname, "..");

/** True if this repo path is registered as a git submodule in .gitmodules. */
function isRegisteredSubmodule(repoPath: string): boolean {
  const gitmodules = path.join(REPO_ROOT, ".gitmodules");
  if (!fs.existsSync(gitmodules)) return false;
  const rel = path
    .relative(REPO_ROOT, repoPath)
    .split(path.sep)
    .join("/");
  return fs.readFileSync(gitmodules, "utf8").includes(`path = ${rel}`);
}

/** True if the directory contains a populated git checkout. */
function isPopulated(repoPath: string): boolean {
  return (
    fs.existsSync(path.join(repoPath, ".git")) &&
    fs.readdirSync(repoPath).some((entry) => entry !== ".git")
  );
}

/**
 * Make a single repository available for the test suite.
 *
 * The test repos are tracked as full (non-shallow) git submodules — see
 * .gitmodules. So the preferred path is `git submodule update --init`, which
 * checks out each submodule at the exact commit pinned in this repo. Any repo
 * not yet registered as a submodule falls back to a full `git clone`.
 */
async function cloneRepo(
  repo: (typeof TEST_REPOSITORIES)[0],
): Promise<{ success: boolean; message: string }> {
  const repoPath = path.join(TEST_REPOS_DIR, repo.name);

  // Already checked out — nothing to do.
  if (isPopulated(repoPath)) {
    return {
      success: true,
      message: `${repo.name}: Already available at ${repoPath}`,
    };
  }

  console.log(`\nFetching ${repo.name}...`);
  console.log(`  URL: ${repo.url}`);
  console.log(`  Size: ${repo.size}`);
  console.log(`  Languages: ${repo.languages.join(", ")}`);

  try {
    if (isRegisteredSubmodule(repoPath)) {
      // Initialise/checkout the submodule at its pinned commit (full history).
      const rel = path
        .relative(REPO_ROOT, repoPath)
        .split(path.sep)
        .join("/");
      console.log(`  (git submodule — checking out pinned commit)`);
      await execAsync(`git submodule update --init -- "${rel}"`, {
        cwd: REPO_ROOT,
        timeout: 1800000, // 30 minutes for large repos
        maxBuffer: 1024 * 1024 * 100, // 100MB buffer
      });
    } else {
      // Not a registered submodule yet — full clone (entire history).
      await execAsync(`git clone "${repo.url}" "${repoPath}"`, {
        timeout: 1800000,
        maxBuffer: 1024 * 1024 * 100,
      });
    }

    return {
      success: true,
      message: `${repo.name}: Ready at ${repoPath}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `${repo.name}: Failed - ${error.message}`,
    };
  }
}

/**
 * Main setup function
 */
async function setup() {
  console.log("=".repeat(60));
  console.log("repo2pdf Test Repository Setup");
  console.log("=".repeat(60));
  console.log(`\nCloning ${TEST_REPOSITORIES.length} repositories to:`);
  console.log(`  ${TEST_REPOS_DIR}\n`);

  // Ensure directory exists
  if (!fs.existsSync(TEST_REPOS_DIR)) {
    fs.mkdirSync(TEST_REPOS_DIR, { recursive: true });
  }

  // Ask for confirmation
  const args = process.argv.slice(2);
  const skipLarge = args.includes("--skip-large");
  const onlySmall = args.includes("--only-small");
  const force = args.includes("--force");

  if (!force) {
    console.log("Options:");
    console.log("  --skip-large   Skip large/massive repos");
    console.log("  --only-small   Only clone small repos");
    console.log("  --force        Skip confirmation prompt");
    console.log("");
  }

  // Filter repos based on options
  let reposToClone = TEST_REPOSITORIES;
  if (onlySmall) {
    reposToClone = TEST_REPOSITORIES.filter((r) => r.size === "small");
    console.log(`\nCloning only small repos (${reposToClone.length} repos)`);
  } else if (skipLarge) {
    reposToClone = TEST_REPOSITORIES.filter(
      (r) => r.size !== "large" && r.size !== "massive",
    );
    console.log(
      `\nSkipping large/massive repos (${reposToClone.length} repos)`,
    );
  }

  console.log("\nRepositories to clone:");
  for (const repo of reposToClone) {
    console.log(`  [${repo.size.padEnd(7)}] ${repo.name}`);
  }

  // Clone repos
  console.log("\n" + "-".repeat(60));
  const results: { success: boolean; message: string }[] = [];

  for (const repo of reposToClone) {
    const result = await cloneRepo(repo);
    results.push(result);
    console.log(result.message);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Setup Complete");
  console.log("=".repeat(60));

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n  Successful: ${successful}`);
  console.log(`  Failed: ${failed}`);

  if (failed > 0) {
    console.log("\nFailed repos:");
    for (const result of results.filter((r) => !r.success)) {
      console.log(`  - ${result.message}`);
    }
  }

  // Print next steps
  console.log("\nNext steps:");
  console.log("  1. Run tests: npm test");
  console.log("  2. Run full E2E: npm run test:run -- tests/e2e.test.ts");
  console.log(
    "  3. Run comprehensive: npm run test:run -- tests/comprehensive.test.ts",
  );
}

// Run if executed directly
setup().catch(console.error);

// Export for use in tests
export { TEST_REPOSITORIES, TEST_REPOS_DIR, cloneRepo };
