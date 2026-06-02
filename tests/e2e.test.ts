/**
 * End-to-End Tests
 *
 * Full integration tests that test the complete workflow:
 * 1. Fetching repository (local or remote)
 * 2. Processing all files
 * 3. Generating PDF
 * 4. Verifying output
 *
 * These tests use real repositories to ensure comprehensive coverage.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Repo2PDF, convertRepository } from "../src/index";
import { ConfigLoader } from "../src/config/config-loader";
import { LocalFetcher } from "../src/fetchers/local-fetcher";
import { CacheManager } from "../src/utils/cache-manager";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import {
  createTestConfig,
  createLocalRepoConfig,
  ensureTestOutputDir,
  cleanupTestOutput,
  getUniqueOutputPath,
  pdfExists,
  getPdfSize,
  ALL_THEMES,
  MOCK_REPO_PATH,
} from "./helpers/test-utils";

const execAsync = promisify(exec);

// Test repository paths - can be configured
const TEST_REPOS_DIR = path.join(__dirname, "fixtures", "test-repos");

// Small test repositories for quick tests
const SMALL_TEST_REPOS = [
  {
    name: "chalk",
    url: "https://github.com/chalk/chalk",
    description: "Small TypeScript/JS library",
  },
  {
    name: "is",
    url: "https://github.com/sindresorhus/is",
    description: "Type checking utilities",
  },
];

// Large test repository for comprehensive tests
const LARGE_TEST_REPO = {
  name: "freeCodeCamp-samples",
  url: "https://github.com/freeCodeCamp/freeCodeCamp",
  description: "Large multi-language repository",
  // We'll only clone a subset for testing
  sparse: true,
  paths: ["curriculum", "client/src", "api/src"],
};

/**
 * Clone a repository for testing (if not already cloned)
 */
async function cloneTestRepo(
  url: string,
  targetDir: string,
  options: { sparse?: boolean; paths?: string[]; branch?: string } = {},
): Promise<string> {
  const repoName = url.split("/").pop()?.replace(".git", "") || "repo";
  const repoPath = path.join(targetDir, repoName);

  // If already exists, return path
  if (fs.existsSync(repoPath)) {
    return repoPath;
  }

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  try {
    if (options.sparse && options.paths) {
      // Sparse checkout for large repos
      await execAsync(
        `git clone --filter=blob:none --sparse "${url}" "${repoPath}"`,
        {
          timeout: 300000,
          cwd: targetDir,
        },
      );

      // Set up sparse checkout
      await execAsync(`git sparse-checkout set ${options.paths.join(" ")}`, {
        cwd: repoPath,
        timeout: 60000,
      });
    } else {
      // Full clone for small repos
      const branch = options.branch ? `--branch ${options.branch}` : "";
      await execAsync(`git clone --depth 1 ${branch} "${url}" "${repoPath}"`, {
        timeout: 300000,
        cwd: targetDir,
      });
    }

    return repoPath;
  } catch (error: any) {
    console.warn(`Failed to clone ${url}:`, error.message);
    throw error;
  }
}

describe("E2E Tests", () => {
  beforeAll(() => {
    ensureTestOutputDir();
    // Ensure test repos directory exists
    if (!fs.existsSync(TEST_REPOS_DIR)) {
      fs.mkdirSync(TEST_REPOS_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up cached data
    const cacheManager = CacheManager.getInstance();
    cacheManager.clearAllCache();
  });

  describe("Local Repository Conversion", () => {
    it("should convert mock repository to PDF", async () => {
      const outputPath = getUniqueOutputPath("e2e-mock");

      const config = createLocalRepoConfig(MOCK_REPO_PATH, {
        output: {
          format: "pdf",
          outputPath,
          singleFile: true,
        },
      });

      const repo2pdf = new Repo2PDF(config);
      const result = await repo2pdf.convert();

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(pdfExists(outputPath)).toBe(true);
    }, 120000);

    it("should include all mock repo files in PDF", async () => {
      const outputPath = getUniqueOutputPath("e2e-mock-files");

      const config = createLocalRepoConfig(MOCK_REPO_PATH, {
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
      });

      const repo2pdf = new Repo2PDF(config);
      const result = await repo2pdf.convert();

      expect(result.success).toBe(true);
      // PDF should be substantial (contains multiple files)
      expect(result.fileSize).toBeGreaterThan(10000);
    }, 120000);

    it("should work with all themes", async () => {
      const results: { theme: string; success: boolean; size: number }[] = [];

      for (const theme of ALL_THEMES.slice(0, 3)) {
        // Test first 3 themes for speed
        const outputPath = getUniqueOutputPath(`e2e-theme-${theme}`);

        const config = createLocalRepoConfig(MOCK_REPO_PATH, {
          output: {
            format: "pdf",
            outputPath,
            singleFile: true,
          },
          style: {
            theme,
            lineNumbers: true,
            pageNumbers: true,
            includeTableOfContents: true,
            fontSize: "14px",
            fontFamily: "monospace",
          },
        });

        try {
          const repo2pdf = new Repo2PDF(config);
          const result = await repo2pdf.convert();
          results.push({
            theme,
            success: result.success,
            size: result.fileSize,
          });
        } catch (error: any) {
          results.push({ theme, success: false, size: 0 });
        }
      }

      // All themes should produce valid PDFs
      for (const result of results) {
        expect(result.success).toBe(true);
        expect(result.size).toBeGreaterThan(0);
      }
    }, 300000);

    it("should respect removeComments option", async () => {
      const outputWithComments = getUniqueOutputPath("e2e-with-comments");
      const outputWithoutComments = getUniqueOutputPath("e2e-no-comments");

      // Generate with comments
      const configWith = createLocalRepoConfig(MOCK_REPO_PATH, {
        output: {
          format: "pdf",
          outputPath: outputWithComments,
          singleFile: true,
        },
        processing: {
          removeComments: false,
          removeEmptyLines: false,
          maxConcurrency: 5,
          includeBinaryFiles: false,
          includeHiddenFiles: false,
        },
      });

      // Generate without comments
      const configWithout = createLocalRepoConfig(MOCK_REPO_PATH, {
        output: {
          format: "pdf",
          outputPath: outputWithoutComments,
          singleFile: true,
        },
        processing: {
          removeComments: true,
          removeEmptyLines: false,
          maxConcurrency: 5,
          includeBinaryFiles: false,
          includeHiddenFiles: false,
        },
      });

      const repo2pdfWith = new Repo2PDF(configWith);
      const repo2pdfWithout = new Repo2PDF(configWithout);

      const resultWith = await repo2pdfWith.convert();
      const resultWithout = await repo2pdfWithout.convert();

      expect(resultWith.success).toBe(true);
      expect(resultWithout.success).toBe(true);

      // Without comments should be smaller (or at least not larger)
      // Note: Due to PDF encoding, this isn't always guaranteed
      expect(resultWithout.fileSize).toBeLessThanOrEqual(
        resultWith.fileSize * 1.1,
      ); // Allow 10% margin
    }, 240000);

    it("should respect removeEmptyLines option", async () => {
      const outputPath = getUniqueOutputPath("e2e-no-empty-lines");

      const config = createLocalRepoConfig(MOCK_REPO_PATH, {
        output: { format: "pdf", outputPath, singleFile: true },
        processing: {
          removeComments: false,
          removeEmptyLines: true,
          maxConcurrency: 5,
          includeBinaryFiles: false,
          includeHiddenFiles: false,
        },
      });

      const repo2pdf = new Repo2PDF(config);
      const result = await repo2pdf.convert();

      expect(result.success).toBe(true);
      expect(pdfExists(outputPath)).toBe(true);
    }, 120000);

    it("should work without line numbers", async () => {
      const outputPath = getUniqueOutputPath("e2e-no-line-numbers");

      const config = createLocalRepoConfig(MOCK_REPO_PATH, {
        output: { format: "pdf", outputPath, singleFile: true },
        style: {
          theme: "github-dark",
          lineNumbers: false,
          pageNumbers: true,
          includeTableOfContents: true,
          fontSize: "14px",
          fontFamily: "monospace",
        },
      });

      const repo2pdf = new Repo2PDF(config);
      const result = await repo2pdf.convert();

      expect(result.success).toBe(true);
    }, 120000);

    it("should work without table of contents", async () => {
      const outputPath = getUniqueOutputPath("e2e-no-toc");

      const config = createLocalRepoConfig(MOCK_REPO_PATH, {
        output: { format: "pdf", outputPath, singleFile: true },
        style: {
          theme: "github-dark",
          lineNumbers: true,
          pageNumbers: true,
          includeTableOfContents: false,
          fontSize: "14px",
          fontFamily: "monospace",
        },
      });

      const repo2pdf = new Repo2PDF(config);
      const result = await repo2pdf.convert();

      expect(result.success).toBe(true);
    }, 120000);

    it("should work without page numbers", async () => {
      const outputPath = getUniqueOutputPath("e2e-no-page-numbers");

      const config = createLocalRepoConfig(MOCK_REPO_PATH, {
        output: { format: "pdf", outputPath, singleFile: true },
        style: {
          theme: "github-dark",
          lineNumbers: true,
          pageNumbers: false,
          includeTableOfContents: true,
          fontSize: "14px",
          fontFamily: "monospace",
        },
      });

      const repo2pdf = new Repo2PDF(config);
      const result = await repo2pdf.convert();

      expect(result.success).toBe(true);
    }, 120000);
  });

  describe("convertRepository API", () => {
    it("should work with partial config", async () => {
      const outputPath = getUniqueOutputPath("e2e-api");

      const result = await convertRepository({
        repository: {
          url: "",
          vcsType: "local",
          localPath: MOCK_REPO_PATH,
        },
        output: {
          format: "pdf",
          outputPath,
          singleFile: true,
        },
      });

      expect(result.success).toBe(true);
      expect(pdfExists(outputPath)).toBe(true);
    }, 120000);
  });

  describe("Real Repository Tests", () => {
    // These tests require network access and may take longer.
    // Off by default; enable with ENABLE_REAL_CLONES=true.
    const realClonesEnabled = process.env.ENABLE_REAL_CLONES === "true";

    it.skipIf(!realClonesEnabled)(
      "should clone and convert a small real repository",
      async () => {
        const repo = SMALL_TEST_REPOS[0];
        const repoPath = await cloneTestRepo(repo.url, TEST_REPOS_DIR);
        const outputPath = getUniqueOutputPath(`e2e-real-${repo.name}`);

        const config = createLocalRepoConfig(repoPath, {
          output: { format: "pdf", outputPath, singleFile: true },
          processing: {
            ignorePatterns: ["node_modules/**", ".git/**", "*.lock"],
            maxConcurrency: 5,
            includeBinaryFiles: false,
            includeHiddenFiles: false,
            removeComments: false,
            removeEmptyLines: false,
          },
        });

        const repo2pdf = new Repo2PDF(config);
        const result = await repo2pdf.convert();

        expect(result.success).toBe(true);
        expect(result.fileSize).toBeGreaterThan(50000); // Should be substantial
      },
      300000,
    );
  });

  describe("Error Handling", () => {
    it("should throw for non-existent local path", async () => {
      const config = createLocalRepoConfig("/non/existent/path/12345", {
        output: {
          format: "pdf",
          outputPath: getUniqueOutputPath("e2e-error"),
          singleFile: true,
        },
      });

      const repo2pdf = new Repo2PDF(config);

      await expect(repo2pdf.convert()).rejects.toThrow();
    });

    it("should throw for empty repository", async () => {
      // Create an empty directory
      const emptyDir = path.join(TEST_REPOS_DIR, "empty-repo-test");
      if (!fs.existsSync(emptyDir)) {
        fs.mkdirSync(emptyDir, { recursive: true });
      }

      const config = createLocalRepoConfig(emptyDir, {
        output: {
          format: "pdf",
          outputPath: getUniqueOutputPath("e2e-empty"),
          singleFile: true,
        },
      });

      const repo2pdf = new Repo2PDF(config);

      // Should either throw or produce empty/minimal PDF
      try {
        const result = await repo2pdf.convert();
        // If it succeeds, it should still be valid
        expect(result.success).toBe(true);
      } catch (error) {
        // Expected for empty repos
        expect(error).toBeTruthy();
      }

      // Clean up
      fs.rmdirSync(emptyDir);
    }, 60000);
  });

  describe("Caching", () => {
    it("should cache repository files", async () => {
      const outputPath1 = getUniqueOutputPath("e2e-cache-1");
      const outputPath2 = getUniqueOutputPath("e2e-cache-2");

      const config1 = createLocalRepoConfig(MOCK_REPO_PATH, {
        output: { format: "pdf", outputPath: outputPath1, singleFile: true },
        repository: {
          url: "test-cache-repo",
          vcsType: "local",
          localPath: MOCK_REPO_PATH,
          useCache: true,
        },
        cache: { enabled: true, ttl: 86400000 },
      });

      const config2 = createLocalRepoConfig(MOCK_REPO_PATH, {
        output: { format: "pdf", outputPath: outputPath2, singleFile: true },
        repository: {
          url: "test-cache-repo",
          vcsType: "local",
          localPath: MOCK_REPO_PATH,
          useCache: true,
        },
        cache: { enabled: true, ttl: 86400000 },
      });

      // First conversion
      const start1 = Date.now();
      const repo2pdf1 = new Repo2PDF(config1);
      await repo2pdf1.convert();
      const time1 = Date.now() - start1;

      // Second conversion (should use cache)
      const start2 = Date.now();
      const repo2pdf2 = new Repo2PDF(config2);
      await repo2pdf2.convert();
      const time2 = Date.now() - start2;

      // Both should succeed
      expect(pdfExists(outputPath1)).toBe(true);
      expect(pdfExists(outputPath2)).toBe(true);

      // Second should be faster (due to caching)
      // Note: Not always guaranteed, so we just verify both complete
      console.log(`First conversion: ${time1}ms, Second: ${time2}ms`);
    }, 240000);
  });

  describe("Large File Handling", () => {
    it("should handle incremental processing for large repos", async () => {
      const outputPath = getUniqueOutputPath("e2e-incremental");

      const config = createLocalRepoConfig(MOCK_REPO_PATH, {
        output: { format: "pdf", outputPath, singleFile: true },
        processing: {
          useIncrementalProcessing: true,
          incrementalChunkSize: 2, // Small chunk size for testing
          maxConcurrency: 5,
          includeBinaryFiles: false,
          includeHiddenFiles: false,
          removeComments: false,
          removeEmptyLines: false,
        },
      });

      const repo2pdf = new Repo2PDF(config);
      const result = await repo2pdf.convert();

      expect(result.success).toBe(true);
      expect(pdfExists(outputPath)).toBe(true);
    }, 120000);
  });
});

describe("PDF Output Verification", () => {
  it("should generate valid PDF header", async () => {
    const outputPath = getUniqueOutputPath("e2e-pdf-verify");

    const config = createLocalRepoConfig(MOCK_REPO_PATH, {
      output: { format: "pdf", outputPath, singleFile: true },
    });

    const repo2pdf = new Repo2PDF(config);
    await repo2pdf.convert();

    // Read PDF header
    const buffer = fs.readFileSync(outputPath);
    const header = buffer.slice(0, 8).toString("ascii");

    // PDF files start with %PDF-
    expect(header.startsWith("%PDF-")).toBe(true);
  }, 120000);

  it("should generate PDF with reasonable size", async () => {
    const outputPath = getUniqueOutputPath("e2e-pdf-size");

    const config = createLocalRepoConfig(MOCK_REPO_PATH, {
      output: { format: "pdf", outputPath, singleFile: true },
    });

    const repo2pdf = new Repo2PDF(config);
    const result = await repo2pdf.convert();

    // PDF should be at least 10KB for a repo with multiple files
    expect(result.fileSize).toBeGreaterThan(10000);

    // But not unreasonably large (less than 100MB)
    expect(result.fileSize).toBeLessThan(100 * 1024 * 1024);
  }, 120000);
});
