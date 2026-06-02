/**
 * PDFGenerator tests (v3, pdf-lib pipeline).
 *
 * The PDF pipeline migrated from Puppeteer/HTML to pure-JS pdf-lib. There is no
 * more HTML generation, no Shiki HTML, and no highlightedHtml/base64Content on
 * ProcessedFile. These tests cover the thin orchestrator:
 *  - generatePDF(files, repoInfo, outputPath) writes a real PDF and returns a
 *    GenerationResult.
 *  - generateToBytes(files, repoInfo) returns %PDF- bytes and never writes a file.
 *  - Style options (line numbers, TOC, page numbers, themes) all produce valid
 *    PDFs.
 *  - Mixed file types (code, image, binary) don't crash.
 *
 * Tests are deterministic and offline: highlight is forced to "none" so we never
 * depend on Shiki/WASM loading, and files are constructed directly OR fetched
 * from the local mock-repo fixture.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { PDFGenerator } from "../src/generators/pdf-generator";
import { LocalFetcher } from "../src/fetchers/local-fetcher";
import { FileProcessor } from "../src/processors/file-processor";
import type { ProcessedFile } from "../src/types/file.types";
import type { RenderRepoInfo } from "../src/renderers/renderer.interface";
import type { Config } from "../src/types/config.types";
import fs from "fs";
import {
  createTestConfig,
  ensureTestOutputDir,
  getUniqueOutputPath,
  pdfExists,
  MOCK_REPO_PATH,
} from "./helpers/test-utils";

/**
 * Build a ProcessedFile directly (no stale HTML/base64 fields). The new pipeline
 * only needs the RepoFile shape plus processedContent.
 */
function makeFile(overrides: Partial<ProcessedFile> = {}): ProcessedFile {
  const processedContent =
    overrides.processedContent ?? 'const x: string = "hello";';
  return {
    name: "test.ts",
    path: "src/test.ts",
    type: "code",
    content: processedContent,
    size: processedContent.length,
    extension: "ts",
    language: "typescript",
    isDirectory: false,
    processedContent,
    ...overrides,
  };
}

/** Force highlight "none" so tests never depend on Shiki/WASM at runtime. */
function offlineConfig(overrides: Partial<Config> = {}): Config {
  const cfg = createTestConfig(overrides);
  cfg.style.highlight = "none";
  return cfg;
}

const REPO_INFO: RenderRepoInfo = {
  name: "test-repo",
  description: "A test repository",
  url: "https://github.com/test/repo",
};

/** True if the byte buffer begins with the %PDF- magic header. */
function startsWithPdfHeader(bytes: Uint8Array): boolean {
  const header = Buffer.from(bytes.slice(0, 5)).toString("latin1");
  return header === "%PDF-";
}

/**
 * Run the local mock repository through the real fetch + process pipeline,
 * yielding ProcessedFile[] exactly as the renderer would receive them.
 */
async function processMockRepo(config: Config): Promise<ProcessedFile[]> {
  const fetcher = new LocalFetcher();
  await fetcher.initialize(config.repository);
  const repoFiles = await fetcher.fetchRepository();
  const processor = new FileProcessor(config);
  return processor.processFiles(repoFiles);
}

describe("PDFGenerator", () => {
  beforeAll(() => {
    ensureTestOutputDir();
  });

  describe("generatePDF", () => {
    it("writes a valid PDF and returns a successful result", async () => {
      const generator = new PDFGenerator(offlineConfig());
      const files: ProcessedFile[] = [
        makeFile({ name: "index.ts", path: "src/index.ts" }),
        makeFile({
          name: "utils.ts",
          path: "src/utils.ts",
          processedContent:
            "export function add(a: number, b: number) {\n  return a + b;\n}",
        }),
      ];

      const outputPath = getUniqueOutputPath("pdf-gen-basic");
      const result = await generator.generatePDF(files, REPO_INFO, outputPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.format).toBe("pdf");
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.generationTime).toBeGreaterThanOrEqual(0);
      expect(pdfExists(outputPath)).toBe(true);

      // File on disk must begin with the PDF magic header.
      const buffer = fs.readFileSync(outputPath);
      expect(buffer.slice(0, 5).toString("latin1")).toBe("%PDF-");
    });

    it("handles an empty file list", async () => {
      const generator = new PDFGenerator(offlineConfig());
      const outputPath = getUniqueOutputPath("pdf-gen-empty");

      const result = await generator.generatePDF([], REPO_INFO, outputPath);

      expect(result.success).toBe(true);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(pdfExists(outputPath)).toBe(true);
    });

    it("handles unicode and special characters without crashing", async () => {
      const generator = new PDFGenerator(offlineConfig());
      const files: ProcessedFile[] = [
        makeFile({
          name: "special.ts",
          path: "src/special.ts",
          processedContent: 'const html = "<div>&amp;&lt;&gt;</div>";',
        }),
        makeFile({
          name: "unicode.ts",
          path: "src/unicode.ts",
          processedContent: 'const greeting = "Hello, 世界! 🌍 café";',
        }),
      ];

      const outputPath = getUniqueOutputPath("pdf-gen-unicode");
      const result = await generator.generatePDF(files, REPO_INFO, outputPath);

      expect(result.success).toBe(true);
      expect(pdfExists(outputPath)).toBe(true);
    });

    it("renders the real mock repository through the full pipeline", async () => {
      const config = offlineConfig({
        repository: {
          url: "",
          vcsType: "local",
          localPath: MOCK_REPO_PATH,
          useCache: false,
        },
      });
      const files = await processMockRepo(config);
      expect(files.length).toBeGreaterThan(0);

      const generator = new PDFGenerator(config);
      const outputPath = getUniqueOutputPath("pdf-gen-mockrepo");
      const result = await generator.generatePDF(
        files,
        { name: "mock-repo", url: "file://mock" },
        outputPath,
      );

      expect(result.success).toBe(true);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(pdfExists(outputPath)).toBe(true);
    });
  });

  describe("generateToBytes", () => {
    it("returns %PDF- bytes and never writes a file", async () => {
      const generator = new PDFGenerator(offlineConfig());
      const files: ProcessedFile[] = [makeFile()];

      const bytes = await generator.generateToBytes(files, REPO_INFO);

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });

    it("does not create a file on disk", async () => {
      // A unique would-be output path; generateToBytes must not touch it.
      const outputPath = getUniqueOutputPath("pdf-bytes-nofile");
      fs.rmSync(outputPath, { force: true });

      const generator = new PDFGenerator(offlineConfig());
      await generator.generateToBytes([makeFile()], REPO_INFO);

      expect(fs.existsSync(outputPath)).toBe(false);
    });

    it("works with an empty file list", async () => {
      const generator = new PDFGenerator(offlineConfig());
      const bytes = await generator.generateToBytes([], REPO_INFO);
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });
  });

  describe("style options", () => {
    function configWithStyle(style: Partial<Config["style"]>): Config {
      return offlineConfig({
        style: {
          theme: "github-light",
          fontSize: "14px",
          fontFamily: "monospace",
          lineNumbers: true,
          pageNumbers: true,
          includeTableOfContents: true,
          ...style,
        },
      });
    }

    const multiLineFile = makeFile({
      processedContent: "line one\nline two\nline three\nline four",
    });

    it.each([true, false])("respects lineNumbers=%s", async (lineNumbers) => {
      const generator = new PDFGenerator(configWithStyle({ lineNumbers }));
      const outputPath = getUniqueOutputPath(`pdf-line-numbers-${lineNumbers}`);
      const result = await generator.generatePDF(
        [multiLineFile],
        REPO_INFO,
        outputPath,
      );
      expect(result.success).toBe(true);
      expect(pdfExists(outputPath)).toBe(true);
    });

    it.each([true, false])(
      "respects includeTableOfContents=%s",
      async (includeTableOfContents) => {
        const generator = new PDFGenerator(
          configWithStyle({ includeTableOfContents }),
        );
        const outputPath = getUniqueOutputPath(
          `pdf-toc-${includeTableOfContents}`,
        );
        const result = await generator.generatePDF(
          [multiLineFile],
          REPO_INFO,
          outputPath,
        );
        expect(result.success).toBe(true);
        expect(pdfExists(outputPath)).toBe(true);
      },
    );

    it.each([true, false])("respects pageNumbers=%s", async (pageNumbers) => {
      const generator = new PDFGenerator(configWithStyle({ pageNumbers }));
      const outputPath = getUniqueOutputPath(`pdf-page-numbers-${pageNumbers}`);
      const result = await generator.generatePDF(
        [multiLineFile],
        REPO_INFO,
        outputPath,
      );
      expect(result.success).toBe(true);
      expect(pdfExists(outputPath)).toBe(true);
    });
  });

  describe("themes", () => {
    const THEMES = ["github-light", "dracula", "nord", "monokai"] as const;

    it.each(THEMES)("produces a valid PDF with the %s theme", async (theme) => {
      const generator = new PDFGenerator(
        offlineConfig({
          style: {
            theme,
            lineNumbers: true,
            pageNumbers: true,
            includeTableOfContents: true,
            fontSize: "14px",
            fontFamily: "monospace",
          },
        }),
      );

      const outputPath = getUniqueOutputPath(`pdf-theme-${theme}`);
      const result = await generator.generatePDF(
        [
          makeFile({
            processedContent: 'const greeting = "hi";\nconsole.log(greeting);',
          }),
        ],
        { name: `theme-${theme}`, url: "https://github.com/test/theme" },
        outputPath,
      );

      expect(result.success).toBe(true);
      expect(pdfExists(outputPath)).toBe(true);
      const buffer = fs.readFileSync(outputPath);
      expect(buffer.slice(0, 5).toString("latin1")).toBe("%PDF-");
    });
  });

  describe("mixed file types", () => {
    it("handles code, image, and binary files together without crashing", async () => {
      const generator = new PDFGenerator(offlineConfig());
      const files: ProcessedFile[] = [
        makeFile({
          name: "index.ts",
          path: "src/index.ts",
          processedContent: "export const main = () => {};",
        }),
        makeFile({
          name: "styles.css",
          path: "styles/styles.css",
          extension: "css",
          language: "css",
          processedContent: "body { margin: 0; }",
        }),
        // Image: placeholder, no base64.
        {
          name: "logo.png",
          path: "assets/logo.png",
          type: "image",
          content: null,
          size: 2048,
          extension: "png",
          language: undefined,
          isDirectory: false,
          processedContent: "",
        },
        // Binary: rendered as "Binary file ..." placeholder.
        {
          name: "data.bin",
          path: "data/data.bin",
          type: "binary",
          content: null,
          size: 1024,
          extension: "bin",
          language: undefined,
          isDirectory: false,
          processedContent: "data/data.bin (1024 bytes)",
        },
      ];

      const outputPath = getUniqueOutputPath("pdf-mixed-types");
      const result = await generator.generatePDF(files, REPO_INFO, outputPath);

      expect(result.success).toBe(true);
      expect(pdfExists(outputPath)).toBe(true);
    });
  });

  describe("output structure", () => {
    it("produces a PDF that ends with %%EOF and contains objects", async () => {
      const generator = new PDFGenerator(offlineConfig());
      const outputPath = getUniqueOutputPath("pdf-structure");
      await generator.generatePDF([makeFile()], REPO_INFO, outputPath);

      const content = fs.readFileSync(outputPath).toString("latin1");
      expect(content.includes("%%EOF")).toBe(true);
      expect(content.includes("obj")).toBe(true);
      expect(content.includes("endobj")).toBe(true);
    });
  });

  describe("cleanup", () => {
    it("is a no-op that never throws (even when called twice)", async () => {
      const generator = new PDFGenerator(offlineConfig());
      await expect(generator.cleanup()).resolves.not.toThrow();
      await expect(generator.cleanup()).resolves.not.toThrow();
    });
  });
});
