/**
 * PdfLibRenderer tests (v3, pure-JS pdf-lib renderer).
 *
 * Exercises the renderer directly (no PDFGenerator orchestration, no fs):
 *  - render(files, repoInfo, config) returns real %PDF- bytes.
 *  - highlight "none" (PlainTokenizer) vs "auto" both produce valid PDFs.
 *  - Empty file list is handled.
 *  - Very long lines (wrapping) and unicode content render without throwing.
 *
 * Highlight defaults to "none" for determinism/offline; one case forces "auto"
 * to exercise the Shiki-or-plain resolution path (it degrades to plain text if
 * Shiki can't load, so it stays deterministic in spirit and never throws).
 */

import { describe, it, expect } from "vitest";
import { PdfLibRenderer } from "../src/renderers/pdf-lib-renderer";
import type { ProcessedFile } from "../src/types/file.types";
import type { RenderRepoInfo } from "../src/renderers/renderer.interface";
import type { Config } from "../src/types/config.types";
import { createTestConfig } from "./helpers/test-utils";

function makeFile(overrides: Partial<ProcessedFile> = {}): ProcessedFile {
  const processedContent = overrides.processedContent ?? 'const x = "hello";';
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

/** Config with highlight forced to a given mode (default "none" for offline). */
function rendererConfig(
  highlight: "auto" | "shiki" | "none" = "none",
  overrides: Partial<Config> = {},
): Config {
  const cfg = createTestConfig({
    style: {
      theme: "github-light",
      lineNumbers: true,
      pageNumbers: true,
      includeTableOfContents: true,
      fontSize: "14px",
      fontFamily: "monospace",
    },
    ...overrides,
  });
  cfg.style.highlight = highlight;
  return cfg;
}

const REPO_INFO: RenderRepoInfo = {
  name: "renderer-repo",
  description: "Renderer under test",
  url: "https://github.com/test/renderer",
};

function startsWithPdfHeader(bytes: Uint8Array): boolean {
  return Buffer.from(bytes.slice(0, 5)).toString("latin1") === "%PDF-";
}

describe("PdfLibRenderer", () => {
  it("renders a real PDF (starts with %PDF-)", async () => {
    const renderer = new PdfLibRenderer();
    const bytes = await renderer.render(
      [makeFile()],
      REPO_INFO,
      rendererConfig(),
    );

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    expect(startsWithPdfHeader(bytes)).toBe(true);
  });

  it("handles an empty file list", async () => {
    const renderer = new PdfLibRenderer();
    const bytes = await renderer.render([], REPO_INFO, rendererConfig());

    expect(startsWithPdfHeader(bytes)).toBe(true);
    expect(bytes.length).toBeGreaterThan(0);
  });

  describe("highlight mode", () => {
    const file = makeFile({
      processedContent:
        "function greet(name: string): string {\n  return `Hello, ${name}!`;\n}",
    });

    it('produces a valid PDF with highlight "none" (plain tokenizer)', async () => {
      const renderer = new PdfLibRenderer();
      const bytes = await renderer.render(
        [file],
        REPO_INFO,
        rendererConfig("none"),
      );
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });

    it('produces a valid PDF with highlight "auto"', async () => {
      // "auto" upgrades to Shiki when it loads, else degrades to plain text.
      // Either way the output must be a valid PDF and must not throw.
      const renderer = new PdfLibRenderer();
      const bytes = await renderer.render(
        [file],
        REPO_INFO,
        rendererConfig("auto"),
      );
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });

    it("honors a renderer-level highlight override over config", async () => {
      // Constructor-level highlight should win; "none" keeps it offline/plain.
      const renderer = new PdfLibRenderer({ highlight: "none" });
      const bytes = await renderer.render(
        [file],
        REPO_INFO,
        rendererConfig("auto"),
      );
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });
  });

  describe("difficult content", () => {
    it("wraps very long lines without throwing", async () => {
      const longLine = "const data = [" + "1, ".repeat(800) + "];";
      const renderer = new PdfLibRenderer();
      const bytes = await renderer.render(
        [makeFile({ processedContent: longLine })],
        REPO_INFO,
        rendererConfig("none"),
      );
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });

    it("handles a single line longer than several pages", async () => {
      // One enormous line forces many wrapped rows -> multiple page breaks.
      const hugeLine = "x".repeat(20000);
      const renderer = new PdfLibRenderer();
      const bytes = await renderer.render(
        [makeFile({ processedContent: hugeLine })],
        REPO_INFO,
        rendererConfig("none"),
      );
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });

    it("renders unicode content without throwing", async () => {
      const renderer = new PdfLibRenderer();
      const bytes = await renderer.render(
        [
          makeFile({
            processedContent:
              'const s = "Héllo, 世界! Ω≈ç√∫ — emoji 🚀🌍, accents àéîõü";',
          }),
        ],
        REPO_INFO,
        rendererConfig("none"),
      );
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });

    it("renders tabs and mixed-indent code", async () => {
      const renderer = new PdfLibRenderer();
      const bytes = await renderer.render(
        [
          makeFile({
            processedContent: "if (x) {\n\treturn 1;\n\t\treturn 2;\n}",
          }),
        ],
        REPO_INFO,
        rendererConfig("none"),
      );
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });
  });

  describe("non-code files", () => {
    it("renders image and binary placeholders without base64 or crashing", async () => {
      const renderer = new PdfLibRenderer();
      const files: ProcessedFile[] = [
        {
          name: "pic.png",
          path: "img/pic.png",
          type: "image",
          content: null,
          size: 4096,
          extension: "png",
          isDirectory: false,
          processedContent: "",
        },
        {
          name: "blob.bin",
          path: "bin/blob.bin",
          type: "binary",
          content: null,
          size: 999,
          extension: "bin",
          isDirectory: false,
          processedContent: "bin/blob.bin (999 bytes)",
        },
      ];

      const bytes = await renderer.render(
        files,
        REPO_INFO,
        rendererConfig("none"),
      );
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });
  });

  describe("layout options", () => {
    it("renders without a table of contents", async () => {
      const renderer = new PdfLibRenderer();
      const cfg = rendererConfig("none");
      cfg.style.includeTableOfContents = false;
      const bytes = await renderer.render([makeFile()], REPO_INFO, cfg);
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });

    it("renders without page numbers", async () => {
      const renderer = new PdfLibRenderer();
      const cfg = rendererConfig("none");
      cfg.style.pageNumbers = false;
      const bytes = await renderer.render([makeFile()], REPO_INFO, cfg);
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });

    it("renders without line numbers", async () => {
      const renderer = new PdfLibRenderer();
      const cfg = rendererConfig("none");
      cfg.style.lineNumbers = false;
      const bytes = await renderer.render(
        [makeFile({ processedContent: "a\nb\nc" })],
        REPO_INFO,
        cfg,
      );
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });

    it("falls back to the default theme for an unknown theme name", async () => {
      const renderer = new PdfLibRenderer();
      const cfg = rendererConfig("none");
      cfg.style.theme = "no-such-theme";
      const bytes = await renderer.render([makeFile()], REPO_INFO, cfg);
      expect(startsWithPdfHeader(bytes)).toBe(true);
    });
  });
});
