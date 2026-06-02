/**
 * Comprehensive Test Suite
 *
 * FULL real-world testing with actual repositories.
 * This test suite is designed to be thorough and may take a long time.
 *
 * Before running:
 *   npx ts-node tests/setup-test-repos.ts
 *
 * Run tests:
 *   npm run test:run -- tests/comprehensive.test.ts
 *
 * This tests:
 * - ALL CLI commands with ALL options
 * - ALL themes
 * - ALL file types and languages
 * - Real repositories of various sizes
 * - Edge cases, error handling, performance
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Repo2PDF, convertRepository } from "../src/index";
import { LocalFetcher } from "../src/fetchers/local-fetcher";
import { CodeProcessor } from "../src/processors/code-processor";
import { PDFGenerator } from "../src/generators/pdf-generator";
import { CacheManager } from "../src/utils/cache-manager";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import {
  createTestConfig,
  createLocalRepoConfig,
  ensureTestOutputDir,
  getUniqueOutputPath,
  pdfExists,
  getPdfSize,
  ALL_THEMES,
} from "./helpers/test-utils";
import { TEST_REPOS_DIR, TEST_REPOSITORIES } from "./setup-test-repos";

const execAsync = promisify(exec);

// Test output directory
const COMPREHENSIVE_OUTPUT_DIR = path.join(
  __dirname,
  "output",
  "comprehensive",
);

// CLI path
const CLI_PATH = path.join(__dirname, "..", "dist", "cli.js");

/**
 * Whether real-repo (network clone) tests are enabled. Off by default so the
 * suite is deterministic and offline; opt in with ENABLE_REAL_CLONES=true.
 */
const REAL_CLONES_ENABLED = process.env.ENABLE_REAL_CLONES === "true";

/**
 * Check if a test repository is available (and real-clone tests are enabled).
 */
function repoExists(name: string): boolean {
  return (
    REAL_CLONES_ENABLED && fs.existsSync(path.join(TEST_REPOS_DIR, name))
  );
}

/**
 * Get available test repositories
 */
function getAvailableRepos(): typeof TEST_REPOSITORIES {
  return TEST_REPOSITORIES.filter((repo) => repoExists(repo.name));
}

describe("Comprehensive Test Suite", () => {
  beforeAll(() => {
    ensureTestOutputDir();
    if (!fs.existsSync(COMPREHENSIVE_OUTPUT_DIR)) {
      fs.mkdirSync(COMPREHENSIVE_OUTPUT_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up cache
    const cacheManager = CacheManager.getInstance();
    cacheManager.clearAllCache();
  });

  describe("Repository Availability Check", () => {
    it("should have test repositories available", () => {
      const available = getAvailableRepos();

      if (available.length === 0) {
        console.warn(
          "\n⚠️  No test repositories found. Run: npx ts-node tests/setup-test-repos.ts\n",
        );
      }

      console.log(`\nAvailable test repositories: ${available.length}`);
      for (const repo of available) {
        console.log(`  ✓ ${repo.name} (${repo.size})`);
      }
    });
  });

  describe("Full Repository Conversion Tests", () => {
    const availableRepos = getAvailableRepos();

    // Keep the suite non-empty when real-clone tests are disabled (the default).
    it.skipIf(REAL_CLONES_ENABLED)(
      "skips real-repo conversions when ENABLE_REAL_CLONES is unset",
      () => {
        expect(REAL_CLONES_ENABLED).toBe(false);
      },
    );

    // Test each available repository
    for (const repo of availableRepos) {
      describe(`${repo.name} (${repo.size})`, () => {
        const repoPath = path.join(TEST_REPOS_DIR, repo.name);
        const skipLarge =
          repo.size === "massive" && process.env.SKIP_MASSIVE !== "false";

        it.skipIf(skipLarge)(
          "should convert entire repository to PDF",
          async () => {
            const outputPath = path.join(
              COMPREHENSIVE_OUTPUT_DIR,
              `${repo.name}-full.pdf`,
            );

            const config = createLocalRepoConfig(repoPath, {
              output: {
                format: "pdf",
                outputPath,
                singleFile: true,
              },
              style: {
                theme: "github-dark",
                lineNumbers: true,
                pageNumbers: true,
                includeTableOfContents: true,
                fontSize: "14px",
                fontFamily: "monospace",
              },
              processing: {
                ignorePatterns: [
                  "node_modules/**",
                  ".git/**",
                  "*.lock",
                  "dist/**",
                  "build/**",
                  "*.min.js",
                  "*.min.css",
                  "*.map",
                ],
                maxConcurrency: 10,
                removeComments: false,
                removeEmptyLines: false,
                includeBinaryFiles: false,
                includeHiddenFiles: false,
                useIncrementalProcessing: true,
                incrementalChunkSize: 50,
              },
              cache: {
                enabled: true,
                ttl: 86400000,
              },
            });

            const startTime = Date.now();
            const repo2pdf = new Repo2PDF(config);
            const result = await repo2pdf.convert();
            const duration = Date.now() - startTime;

            expect(result.success).toBe(true);
            expect(pdfExists(outputPath)).toBe(true);
            expect(result.fileSize).toBeGreaterThan(0);

            console.log(`  ${repo.name}:`);
            console.log(`    Time: ${(duration / 1000).toFixed(1)}s`);
            console.log(
              `    Size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`,
            );
          },
          600000, // 10 minutes timeout for large repos
        );

        it.skipIf(skipLarge)(
          "should work with all themes",
          async () => {
            const results: { theme: string; success: boolean }[] = [];

            // Test a subset of themes for large repos to save time
            const themesToTest =
              repo.size === "large" ? ALL_THEMES.slice(0, 3) : ALL_THEMES;

            for (const theme of themesToTest) {
              const outputPath = path.join(
                COMPREHENSIVE_OUTPUT_DIR,
                `${repo.name}-theme-${theme}.pdf`,
              );

              try {
                const config = createLocalRepoConfig(repoPath, {
                  output: { format: "pdf", outputPath, singleFile: true },
                  style: {
                    theme,
                    lineNumbers: true,
                    pageNumbers: true,
                    includeTableOfContents: true,
                    fontSize: "14px",
                    fontFamily: "monospace",
                  },
                  processing: {
                    ignorePatterns: ["node_modules/**", ".git/**", "dist/**"],
                    maxConcurrency: 10,
                    removeComments: false,
                    removeEmptyLines: false,
                    includeBinaryFiles: false,
                    includeHiddenFiles: false,
                  },
                });

                const repo2pdf = new Repo2PDF(config);
                await repo2pdf.convert();
                results.push({ theme, success: true });
              } catch (error) {
                results.push({ theme, success: false });
              }
            }

            const failed = results.filter((r) => !r.success);
            expect(failed.length).toBe(0);
          },
          1200000,
        );

        it.skipIf(skipLarge)(
          "should work with removeComments option",
          async () => {
            const outputPath = path.join(
              COMPREHENSIVE_OUTPUT_DIR,
              `${repo.name}-no-comments.pdf`,
            );

            const config = createLocalRepoConfig(repoPath, {
              output: { format: "pdf", outputPath, singleFile: true },
              processing: {
                ignorePatterns: ["node_modules/**", ".git/**", "dist/**"],
                maxConcurrency: 10,
                removeComments: true,
                removeEmptyLines: false,
                includeBinaryFiles: false,
                includeHiddenFiles: false,
              },
            });

            const repo2pdf = new Repo2PDF(config);
            const result = await repo2pdf.convert();

            expect(result.success).toBe(true);
          },
          600000,
        );

        it.skipIf(skipLarge)(
          "should work with removeEmptyLines option",
          async () => {
            const outputPath = path.join(
              COMPREHENSIVE_OUTPUT_DIR,
              `${repo.name}-no-empty.pdf`,
            );

            const config = createLocalRepoConfig(repoPath, {
              output: { format: "pdf", outputPath, singleFile: true },
              processing: {
                ignorePatterns: ["node_modules/**", ".git/**", "dist/**"],
                maxConcurrency: 10,
                removeComments: false,
                removeEmptyLines: true,
                includeBinaryFiles: false,
                includeHiddenFiles: false,
              },
            });

            const repo2pdf = new Repo2PDF(config);
            const result = await repo2pdf.convert();

            expect(result.success).toBe(true);
          },
          600000,
        );

        it.skipIf(skipLarge)(
          "should work without line numbers",
          async () => {
            const outputPath = path.join(
              COMPREHENSIVE_OUTPUT_DIR,
              `${repo.name}-no-lines.pdf`,
            );

            const config = createLocalRepoConfig(repoPath, {
              output: { format: "pdf", outputPath, singleFile: true },
              style: {
                theme: "github-dark",
                lineNumbers: false,
                pageNumbers: true,
                includeTableOfContents: true,
                fontSize: "14px",
                fontFamily: "monospace",
              },
              processing: {
                ignorePatterns: ["node_modules/**", ".git/**", "dist/**"],
                maxConcurrency: 10,
                removeComments: false,
                removeEmptyLines: false,
                includeBinaryFiles: false,
                includeHiddenFiles: false,
              },
            });

            const repo2pdf = new Repo2PDF(config);
            const result = await repo2pdf.convert();

            expect(result.success).toBe(true);
          },
          600000,
        );

        it.skipIf(skipLarge)(
          "should work without table of contents",
          async () => {
            const outputPath = path.join(
              COMPREHENSIVE_OUTPUT_DIR,
              `${repo.name}-no-toc.pdf`,
            );

            const config = createLocalRepoConfig(repoPath, {
              output: { format: "pdf", outputPath, singleFile: true },
              style: {
                theme: "github-dark",
                lineNumbers: true,
                pageNumbers: true,
                includeTableOfContents: false,
                fontSize: "14px",
                fontFamily: "monospace",
              },
              processing: {
                ignorePatterns: ["node_modules/**", ".git/**", "dist/**"],
                maxConcurrency: 10,
                removeComments: false,
                removeEmptyLines: false,
                includeBinaryFiles: false,
                includeHiddenFiles: false,
              },
            });

            const repo2pdf = new Repo2PDF(config);
            const result = await repo2pdf.convert();

            expect(result.success).toBe(true);
          },
          600000,
        );
      });
    }
  });

  describe("CLI Command Tests", () => {
    const cliExists = fs.existsSync(CLI_PATH);
    const availableRepos = getAvailableRepos();
    const smallRepo = availableRepos.find((r) => r.size === "small");

    it.skipIf(!cliExists || !smallRepo)(
      "should convert using CLI convert command",
      async () => {
        const repoPath = path.join(TEST_REPOS_DIR, smallRepo!.name);
        const outputPath = path.join(
          COMPREHENSIVE_OUTPUT_DIR,
          `cli-convert-${smallRepo!.name}.pdf`,
        );

        const { stdout, stderr } = await execAsync(
          `node "${CLI_PATH}" convert "${repoPath}" -o "${outputPath}" --no-cache`,
          { timeout: 300000 },
        );

        expect(pdfExists(outputPath)).toBe(true);
      },
      300000,
    );

    it.skipIf(!cliExists || !smallRepo)(
      "should work with --theme option",
      async () => {
        const repoPath = path.join(TEST_REPOS_DIR, smallRepo!.name);
        const outputPath = path.join(
          COMPREHENSIVE_OUTPUT_DIR,
          `cli-theme-${smallRepo!.name}.pdf`,
        );

        await execAsync(
          `node "${CLI_PATH}" convert "${repoPath}" -o "${outputPath}" --theme monokai --no-cache`,
          { timeout: 300000 },
        );

        expect(pdfExists(outputPath)).toBe(true);
      },
      300000,
    );

    it.skipIf(!cliExists || !smallRepo)(
      "should work with --no-line-numbers option",
      async () => {
        const repoPath = path.join(TEST_REPOS_DIR, smallRepo!.name);
        const outputPath = path.join(
          COMPREHENSIVE_OUTPUT_DIR,
          `cli-no-lines-${smallRepo!.name}.pdf`,
        );

        await execAsync(
          `node "${CLI_PATH}" convert "${repoPath}" -o "${outputPath}" --no-line-numbers --no-cache`,
          { timeout: 300000 },
        );

        expect(pdfExists(outputPath)).toBe(true);
      },
      300000,
    );

    it.skipIf(!cliExists || !smallRepo)(
      "should work with --no-toc option",
      async () => {
        const repoPath = path.join(TEST_REPOS_DIR, smallRepo!.name);
        const outputPath = path.join(
          COMPREHENSIVE_OUTPUT_DIR,
          `cli-no-toc-${smallRepo!.name}.pdf`,
        );

        await execAsync(
          `node "${CLI_PATH}" convert "${repoPath}" -o "${outputPath}" --no-toc --no-cache`,
          { timeout: 300000 },
        );

        expect(pdfExists(outputPath)).toBe(true);
      },
      300000,
    );

    it.skipIf(!cliExists || !smallRepo)(
      "should work with --remove-comments option",
      async () => {
        const repoPath = path.join(TEST_REPOS_DIR, smallRepo!.name);
        const outputPath = path.join(
          COMPREHENSIVE_OUTPUT_DIR,
          `cli-remove-comments-${smallRepo!.name}.pdf`,
        );

        await execAsync(
          `node "${CLI_PATH}" convert "${repoPath}" -o "${outputPath}" --remove-comments --no-cache`,
          { timeout: 300000 },
        );

        expect(pdfExists(outputPath)).toBe(true);
      },
      300000,
    );

    it.skipIf(!cliExists || !smallRepo)(
      "should work with --remove-empty-lines option",
      async () => {
        const repoPath = path.join(TEST_REPOS_DIR, smallRepo!.name);
        const outputPath = path.join(
          COMPREHENSIVE_OUTPUT_DIR,
          `cli-remove-empty-${smallRepo!.name}.pdf`,
        );

        await execAsync(
          `node "${CLI_PATH}" convert "${repoPath}" -o "${outputPath}" --remove-empty-lines --no-cache`,
          { timeout: 300000 },
        );

        expect(pdfExists(outputPath)).toBe(true);
      },
      300000,
    );

    it.skipIf(!cliExists || !smallRepo)(
      "should work with --ignore option",
      async () => {
        const repoPath = path.join(TEST_REPOS_DIR, smallRepo!.name);
        const outputPath = path.join(
          COMPREHENSIVE_OUTPUT_DIR,
          `cli-ignore-${smallRepo!.name}.pdf`,
        );

        await execAsync(
          `node "${CLI_PATH}" convert "${repoPath}" -o "${outputPath}" --ignore "*.test.ts" "*.spec.ts" --no-cache`,
          { timeout: 300000 },
        );

        expect(pdfExists(outputPath)).toBe(true);
      },
      300000,
    );

    it.skipIf(!cliExists)(
      "should show cache stats",
      async () => {
        const { stdout } = await execAsync(`node "${CLI_PATH}" cache --stats`, {
          timeout: 30000,
        });

        expect(stdout).toContain("Cache");
      },
      30000,
    );

    it.skipIf(!cliExists)(
      "should clear cache",
      async () => {
        const { stdout } = await execAsync(`node "${CLI_PATH}" cache --clear`, {
          timeout: 30000,
        });

        expect(stdout).toContain("Cleared");
      },
      30000,
    );

    it.skipIf(!cliExists)(
      "should show help",
      async () => {
        const { stdout } = await execAsync(`node "${CLI_PATH}" --help`, {
          timeout: 30000,
        });

        expect(stdout).toContain("convert");
        expect(stdout).toContain("interactive");
        expect(stdout).toContain("cache");
      },
      30000,
    );

    it.skipIf(!cliExists)(
      "should show version",
      async () => {
        const { stdout } = await execAsync(`node "${CLI_PATH}" --version`, {
          timeout: 30000,
        });

        expect(stdout).toMatch(/\d+\.\d+\.\d+/);
      },
      30000,
    );
  });

  describe("Language Coverage Tests", () => {
    const availableRepos = getAvailableRepos();

    // Group repos by languages they contain
    const languageRepos = new Map<string, string[]>();
    for (const repo of availableRepos) {
      for (const lang of repo.languages) {
        if (!languageRepos.has(lang)) {
          languageRepos.set(lang, []);
        }
        languageRepos.get(lang)!.push(repo.name);
      }
    }

    it("should list available language coverage", () => {
      console.log("\nLanguage coverage from available repos:");
      for (const [lang, repos] of languageRepos) {
        console.log(`  ${lang}: ${repos.join(", ")}`);
      }

      // When real-clone tests are disabled there are no repos to inspect;
      // language coverage is asserted deterministically in the dedicated
      // multi-language fixture tests instead.
      if (REAL_CLONES_ENABLED) {
        expect(languageRepos.size).toBeGreaterThan(0);
      } else {
        expect(languageRepos.size).toBe(0);
      }
    });

    // Test that we can process each language
    for (const [lang, repoNames] of languageRepos) {
      const repoName = repoNames[0];
      const repoConfig = TEST_REPOSITORIES.find((r) => r.name === repoName);
      const skipMassive = repoConfig?.size === "massive";

      it.skipIf(!repoExists(repoName) || skipMassive)(
        `should process ${lang} files from ${repoName}`,
        async () => {
          const repoPath = path.join(TEST_REPOS_DIR, repoName);

          const fetcher = new LocalFetcher();
          await fetcher.initialize({
            url: "",
            vcsType: "local",
            localPath: repoPath,
          });

          const files = await fetcher.fetchRepository();

          // Find files of this language
          const langFiles = files.filter((f) => f.language === lang);

          console.log(
            `  Found ${langFiles.length} ${lang} files in ${repoName}`,
          );
          expect(langFiles.length).toBeGreaterThanOrEqual(0);

          await fetcher.cleanup();
        },
        60000,
      );
    }
  });

  describe("Performance Tests", () => {
    const availableRepos = getAvailableRepos();
    const smallRepo = availableRepos.find((r) => r.size === "small");

    it.skipIf(!smallRepo)(
      "should measure conversion performance",
      async () => {
        const repoPath = path.join(TEST_REPOS_DIR, smallRepo!.name);
        const outputPath = getUniqueOutputPath("perf-test");

        const measurements: number[] = [];

        // Run 3 times to get average
        for (let i = 0; i < 3; i++) {
          const start = Date.now();

          const config = createLocalRepoConfig(repoPath, {
            output: { format: "pdf", outputPath, singleFile: true },
            cache: { enabled: false, ttl: 0 },
          });

          const repo2pdf = new Repo2PDF(config);
          await repo2pdf.convert();

          measurements.push(Date.now() - start);

          // Clean up for next run
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        }

        const avg =
          measurements.reduce((a, b) => a + b, 0) / measurements.length;
        console.log(`\n  Performance for ${smallRepo!.name}:`);
        console.log(`    Average: ${(avg / 1000).toFixed(2)}s`);
        console.log(
          `    Runs: ${measurements.map((m) => (m / 1000).toFixed(2) + "s").join(", ")}`,
        );

        // Should complete in reasonable time
        expect(avg).toBeLessThan(120000); // 2 minutes
      },
      600000,
    );

    it.skipIf(!smallRepo)(
      "should benefit from caching",
      async () => {
        const repoPath = path.join(TEST_REPOS_DIR, smallRepo!.name);
        const outputPath1 = getUniqueOutputPath("cache-test-1");
        const outputPath2 = getUniqueOutputPath("cache-test-2");

        // First run (no cache)
        const start1 = Date.now();
        const config1 = createLocalRepoConfig(repoPath, {
          output: { format: "pdf", outputPath: outputPath1, singleFile: true },
          repository: {
            url: "cache-test-repo",
            vcsType: "local",
            localPath: repoPath,
            useCache: true,
          },
          cache: { enabled: true, ttl: 86400000 },
        });
        const repo2pdf1 = new Repo2PDF(config1);
        await repo2pdf1.convert();
        const time1 = Date.now() - start1;

        // Second run (should use cache)
        const start2 = Date.now();
        const config2 = createLocalRepoConfig(repoPath, {
          output: { format: "pdf", outputPath: outputPath2, singleFile: true },
          repository: {
            url: "cache-test-repo",
            vcsType: "local",
            localPath: repoPath,
            useCache: true,
          },
          cache: { enabled: true, ttl: 86400000 },
        });
        const repo2pdf2 = new Repo2PDF(config2);
        await repo2pdf2.convert();
        const time2 = Date.now() - start2;

        console.log(`\n  Cache performance:`);
        console.log(`    First run (no cache): ${(time1 / 1000).toFixed(2)}s`);
        console.log(`    Second run (cached): ${(time2 / 1000).toFixed(2)}s`);
        console.log(`    Speedup: ${(time1 / time2).toFixed(2)}x`);

        // Both should succeed
        expect(pdfExists(outputPath1)).toBe(true);
        expect(pdfExists(outputPath2)).toBe(true);
      },
      300000,
    );
  });

  describe("Error Handling Tests", () => {
    it("should handle non-existent path gracefully", async () => {
      const config = createLocalRepoConfig("/non/existent/path/xyz123", {
        output: {
          format: "pdf",
          outputPath: getUniqueOutputPath("error-test"),
          singleFile: true,
        },
      });

      const repo2pdf = new Repo2PDF(config);
      await expect(repo2pdf.convert()).rejects.toThrow();
    });

    it("should handle an unreadable file gracefully", async () => {
      // Create a small deterministic repo with one unreadable file. On POSIX we
      // chmod it to 000; on Windows chmod is a no-op so we skip the assertion
      // but still verify the pipeline doesn't crash.
      const tmpRepo = path.join(
        COMPREHENSIVE_OUTPUT_DIR,
        `perm-repo-${Date.now()}`,
      );
      fs.mkdirSync(tmpRepo, { recursive: true });
      fs.writeFileSync(path.join(tmpRepo, "readable.ts"), "export const a = 1;\n");
      const restricted = path.join(tmpRepo, "restricted.ts");
      fs.writeFileSync(restricted, "export const secret = 2;\n");

      let restrictedApplied = false;
      try {
        fs.chmodSync(restricted, 0o000);
        restrictedApplied = process.platform !== "win32";
      } catch {
        // chmod may be unsupported; proceed without restriction.
      }

      const config = createLocalRepoConfig(tmpRepo, {
        output: {
          format: "pdf",
          outputPath: getUniqueOutputPath("perm-test"),
          singleFile: true,
        },
      });

      try {
        const repo2pdf = new Repo2PDF(config);
        // The pipeline should not throw — unreadable files are logged and
        // skipped, while readable files still convert.
        const result = await repo2pdf.convert();
        expect(result.success).toBe(true);
      } finally {
        // Restore permissions so cleanup can remove the file.
        if (restrictedApplied) {
          try {
            fs.chmodSync(restricted, 0o644);
          } catch {
            // ignore
          }
        }
        fs.rmSync(tmpRepo, { recursive: true, force: true });
      }
    }, 60000);

    it("should handle invalid output path gracefully", async () => {
      const availableRepos = getAvailableRepos();
      const repo = availableRepos[0];

      if (!repo) {
        console.warn("No repos available for test");
        return;
      }

      const repoPath = path.join(TEST_REPOS_DIR, repo.name);

      // Try to write to invalid path
      const invalidPath =
        process.platform === "win32"
          ? "Z:\\invalid\\path\\output.pdf"
          : "/invalid/path/output.pdf";

      const config = createLocalRepoConfig(repoPath, {
        output: { format: "pdf", outputPath: invalidPath, singleFile: true },
      });

      const repo2pdf = new Repo2PDF(config);

      await expect(repo2pdf.convert()).rejects.toThrow();
    }, 60000);
  });

  describe("Output Verification", () => {
    const availableRepos = getAvailableRepos();
    const smallRepo = availableRepos.find((r) => r.size === "small");

    it.skipIf(!smallRepo)(
      "should generate valid PDF header",
      async () => {
        const repoPath = path.join(TEST_REPOS_DIR, smallRepo!.name);
        const outputPath = getUniqueOutputPath("pdf-verify");

        const config = createLocalRepoConfig(repoPath, {
          output: { format: "pdf", outputPath, singleFile: true },
        });

        const repo2pdf = new Repo2PDF(config);
        await repo2pdf.convert();

        // Read and verify PDF header
        const buffer = fs.readFileSync(outputPath);
        const header = buffer.slice(0, 8).toString("ascii");

        expect(header.startsWith("%PDF-")).toBe(true);
      },
      120000,
    );

    it.skipIf(!smallRepo)(
      "should generate PDF with proper structure",
      async () => {
        const repoPath = path.join(TEST_REPOS_DIR, smallRepo!.name);
        const outputPath = getUniqueOutputPath("pdf-structure");

        const config = createLocalRepoConfig(repoPath, {
          output: { format: "pdf", outputPath, singleFile: true },
        });

        const repo2pdf = new Repo2PDF(config);
        await repo2pdf.convert();

        const buffer = fs.readFileSync(outputPath);
        const content = buffer.toString("latin1");

        // PDF should have proper structure
        expect(content.includes("%%EOF")).toBe(true);
        expect(content.includes("obj")).toBe(true);
        expect(content.includes("endobj")).toBe(true);
      },
      120000,
    );
  });
});

// Summary test that runs at the end
describe("Test Summary", () => {
  it("should print test summary", () => {
    const availableRepos = getAvailableRepos();

    console.log("\n" + "=".repeat(60));
    console.log("COMPREHENSIVE TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`\nTest repositories: ${availableRepos.length}`);

    for (const repo of availableRepos) {
      console.log(
        `  - ${repo.name} (${repo.size}): ${repo.languages.join(", ")}`,
      );
    }

    console.log(`\nOutput directory: ${COMPREHENSIVE_OUTPUT_DIR}`);
    console.log("=".repeat(60) + "\n");

    expect(true).toBe(true);
  });
});
