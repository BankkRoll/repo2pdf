/**
 * Test utilities and helpers for repo2pdf tests
 */

import type { Config } from "../../src/types/config.types";
import type { RepoFile, ProcessedFile } from "../../src/types/file.types";
import fs from "fs";
import path from "path";

/**
 * Path to the mock repository fixture
 */
export const MOCK_REPO_PATH = path.join(
  __dirname,
  "..",
  "fixtures",
  "mock-repo",
);

/**
 * Temporary output directory for test PDFs
 */
export const TEST_OUTPUT_DIR = path.join(__dirname, "..", "output");

/**
 * Create a complete test configuration with sensible defaults
 */
export function createTestConfig(overrides: Partial<Config> = {}): Config {
  return {
    repository: {
      url: "https://github.com/test/repo",
      branch: "main",
      vcsType: "github",
      localPath: "",
      useCache: false,
      ...overrides.repository,
    },
    output: {
      format: "pdf",
      outputPath: path.join(TEST_OUTPUT_DIR, "test-output.pdf"),
      singleFile: true,
      pageSize: "A4",
      landscape: false,
      margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
      ...overrides.output,
    },
    style: {
      theme: "github-dark",
      fontSize: "14px",
      fontFamily: "monospace",
      lineNumbers: true,
      pageNumbers: true,
      includeTableOfContents: true,
      customCSS: "",
      ...overrides.style,
    },
    processing: {
      ignorePatterns: [],
      maxConcurrency: 5,
      removeComments: false,
      removeEmptyLines: false,
      includeBinaryFiles: false,
      includeHiddenFiles: false,
      timeout: 300000,
      useIncrementalProcessing: false,
      incrementalChunkSize: 100,
      ...overrides.processing,
    },
    cache: {
      enabled: false,
      ttl: 86400000,
      cacheDir: "./.repo2pdf-cache",
      ...overrides.cache,
    },
    debug: overrides.debug ?? false,
  };
}

/**
 * Create a local repository test configuration
 */
export function createLocalRepoConfig(
  localPath: string,
  overrides: Partial<Config> = {},
): Config {
  return createTestConfig({
    repository: {
      url: "",
      vcsType: "local",
      localPath,
      useCache: false,
      ...overrides.repository,
    },
    ...overrides,
  });
}

/**
 * Create a mock RepoFile for testing
 */
export function createMockRepoFile(
  overrides: Partial<RepoFile> = {},
): RepoFile {
  return {
    name: "test.ts",
    path: "src/test.ts",
    content: 'const x: string = "hello";',
    size: 26,
    type: "code",
    extension: "ts",
    language: "typescript",
    isDirectory: false,
    ...overrides,
  };
}

/**
 * Create a mock ProcessedFile for testing
 */
export function createMockProcessedFile(
  overrides: Partial<ProcessedFile> = {},
): ProcessedFile {
  return {
    name: "test.ts",
    path: "src/test.ts",
    type: "code",
    size: 26,
    extension: "ts",
    language: "typescript",
    processedContent: 'const x: string = "hello";',
    isDirectory: false,
    ...overrides,
  };
}

/**
 * Ensure test output directory exists
 */
export function ensureTestOutputDir(): void {
  if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Clean up test output directory
 */
export function cleanupTestOutput(): void {
  if (fs.existsSync(TEST_OUTPUT_DIR)) {
    const files = fs.readdirSync(TEST_OUTPUT_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(TEST_OUTPUT_DIR, file));
    }
  }
}

/**
 * Check if a PDF file exists and has content
 */
export function pdfExists(pdfPath: string): boolean {
  if (!fs.existsSync(pdfPath)) {
    return false;
  }
  const stats = fs.statSync(pdfPath);
  return stats.size > 0;
}

/**
 * Get PDF file size
 */
export function getPdfSize(pdfPath: string): number {
  if (!fs.existsSync(pdfPath)) {
    return 0;
  }
  const stats = fs.statSync(pdfPath);
  return stats.size;
}

/**
 * Read PDF as buffer (for content verification)
 */
export function readPdfBuffer(pdfPath: string): Buffer {
  return fs.readFileSync(pdfPath);
}

/**
 * Check if PDF contains specific text (basic check via buffer)
 * Note: This is a simple check - PDFs are binary and text may be encoded
 */
export function pdfContainsText(pdfPath: string, text: string): boolean {
  const buffer = readPdfBuffer(pdfPath);
  return buffer.toString("latin1").includes(text);
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 10000,
  interval: number = 100,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return false;
}

/**
 * Generate a unique output path for tests
 */
export function getUniqueOutputPath(prefix: string = "test"): string {
  ensureTestOutputDir();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return path.join(TEST_OUTPUT_DIR, `${prefix}-${timestamp}-${random}.pdf`);
}

/**
 * List of all supported themes for testing
 */
export const ALL_THEMES = [
  "github-dark",
  "github-light",
  "monokai",
  "dracula",
  "nord",
  "one-dark-pro",
  "solarized-light",
  "solarized-dark",
  "tokyo-night",
  "vitesse-dark",
] as const;

/**
 * Sample code snippets for different languages
 */
export const CODE_SAMPLES = {
  typescript: `
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`,
  javascript: `
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
`,
  python: `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
`,
  rust: `
fn main() {
    println!("Hello, world!");
}
`,
  go: `
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`,
  java: `
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
} as const;
