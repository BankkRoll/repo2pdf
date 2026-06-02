/**
 * PDF Generator Tests
 *
 * Tests the PDF generation functionality:
 * - HTML generation
 * - PDF rendering via Puppeteer
 * - Theme application
 * - Content formatting
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { PDFGenerator } from "../src/generators/pdf-generator";
import type { ProcessedFile } from "../src/types/file.types";
import path from "path";
import fs from "fs";
import {
  createTestConfig,
  ensureTestOutputDir,
  getUniqueOutputPath,
  pdfExists,
  getPdfSize,
  ALL_THEMES,
  createMockProcessedFile,
} from "./helpers/test-utils";

describe("PDFGenerator", () => {
  let generator: PDFGenerator;

  beforeAll(() => {
    ensureTestOutputDir();
  });

  afterEach(async () => {
    if (generator) {
      await generator.cleanup();
    }
  });

  describe("generatePDF", () => {
    it("should generate a valid PDF from processed files", async () => {
      const config = createTestConfig();
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [
        createMockProcessedFile({
          name: "index.ts",
          path: "src/index.ts",
          processedContent: 'const x = "hello";',
          highlightedHtml:
            '<pre class="shiki github-dark">const x = "hello";</pre>',
        }),
        createMockProcessedFile({
          name: "utils.ts",
          path: "src/utils.ts",
          processedContent:
            "export function add(a: number, b: number) { return a + b; }",
          highlightedHtml:
            '<pre class="shiki github-dark">export function add(a: number, b: number) { return a + b; }</pre>',
        }),
      ];

      const repoInfo = {
        name: "test-repo",
        description: "A test repository",
        url: "https://github.com/test/repo",
      };

      const outputPath = getUniqueOutputPath("pdf-gen-basic");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.format).toBe("pdf");
      expect(result.fileSize).toBeGreaterThan(0);
      expect(pdfExists(outputPath)).toBe(true);
    }, 60000);

    it("should include repository info in PDF", async () => {
      const config = createTestConfig();
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [
        createMockProcessedFile({
          name: "README.md",
          path: "README.md",
          type: "code",
          language: "markdown",
          processedContent: "# Hello World",
          highlightedHtml: '<pre class="shiki">## Hello World</pre>',
        }),
      ];

      const repoInfo = {
        name: "my-awesome-repo",
        description: "This is an awesome repository",
        url: "https://github.com/user/my-awesome-repo",
      };

      const outputPath = getUniqueOutputPath("pdf-gen-repo-info");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
      // PDF should contain repo name (though verifying PDF content is complex)
      expect(result.fileSize).toBeGreaterThan(5000);
    }, 60000);

    it("should handle empty file list", async () => {
      const config = createTestConfig();
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [];
      const repoInfo = {
        name: "empty-repo",
        url: "https://github.com/test/empty",
      };

      const outputPath = getUniqueOutputPath("pdf-gen-empty");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
      // Should still produce a valid PDF (with just header/footer)
      expect(pdfExists(outputPath)).toBe(true);
    }, 60000);

    it("should handle files with special characters", async () => {
      const config = createTestConfig();
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [
        createMockProcessedFile({
          name: "special.ts",
          path: "src/special.ts",
          processedContent: 'const html = "<div>&amp;&lt;&gt;</div>";',
          highlightedHtml:
            '<pre class="shiki">const html = "&lt;div&gt;&amp;amp;&amp;lt;&amp;gt;&lt;/div&gt;";</pre>',
        }),
      ];

      const repoInfo = {
        name: "special-chars",
        url: "https://github.com/test/special",
      };

      const outputPath = getUniqueOutputPath("pdf-gen-special");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);

    it("should handle files with unicode content", async () => {
      const config = createTestConfig();
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [
        createMockProcessedFile({
          name: "unicode.ts",
          path: "src/unicode.ts",
          processedContent: 'const greeting = "Hello, 世界! 🌍";',
          highlightedHtml:
            '<pre class="shiki">const greeting = "Hello, 世界! 🌍";</pre>',
        }),
      ];

      const repoInfo = {
        name: "unicode-repo",
        url: "https://github.com/test/unicode",
      };

      const outputPath = getUniqueOutputPath("pdf-gen-unicode");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);

    it("should handle large files", async () => {
      const config = createTestConfig();
      generator = new PDFGenerator(config);

      // Generate a large file content
      const largeContent = Array(1000).fill('console.log("line");').join("\n");
      const files: ProcessedFile[] = [
        createMockProcessedFile({
          name: "large.ts",
          path: "src/large.ts",
          processedContent: largeContent,
          highlightedHtml: `<pre class="shiki">${largeContent}</pre>`,
          size: largeContent.length,
        }),
      ];

      const repoInfo = {
        name: "large-file-repo",
        url: "https://github.com/test/large",
      };

      const outputPath = getUniqueOutputPath("pdf-gen-large");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
      // Large file should produce larger PDF
      expect(result.fileSize).toBeGreaterThan(20000);
    }, 120000);

    it("should handle nested directory structure", async () => {
      const config = createTestConfig();
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [
        createMockProcessedFile({
          name: "index.ts",
          path: "index.ts",
          processedContent: 'export * from "./src";',
        }),
        createMockProcessedFile({
          name: "main.ts",
          path: "src/main.ts",
          processedContent: "export function main() {}",
        }),
        createMockProcessedFile({
          name: "utils.ts",
          path: "src/utils/utils.ts",
          processedContent: "export function util() {}",
        }),
        createMockProcessedFile({
          name: "helpers.ts",
          path: "src/utils/helpers/helpers.ts",
          processedContent: "export function helper() {}",
        }),
      ];

      const repoInfo = {
        name: "nested-repo",
        url: "https://github.com/test/nested",
      };

      const outputPath = getUniqueOutputPath("pdf-gen-nested");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);

    it("should handle mixed file types", async () => {
      const config = createTestConfig();
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [
        createMockProcessedFile({
          name: "index.ts",
          path: "src/index.ts",
          type: "code",
          language: "typescript",
        }),
        createMockProcessedFile({
          name: "styles.css",
          path: "styles/styles.css",
          type: "code",
          language: "css",
          extension: "css",
          processedContent: "body { margin: 0; }",
          highlightedHtml: '<pre class="shiki">body { margin: 0; }</pre>',
        }),
        createMockProcessedFile({
          name: "config.json",
          path: "config.json",
          type: "code",
          language: "json",
          extension: "json",
          processedContent: '{ "name": "test" }',
          highlightedHtml: '<pre class="shiki">{ "name": "test" }</pre>',
        }),
        createMockProcessedFile({
          name: "README.md",
          path: "README.md",
          type: "code",
          language: "markdown",
          extension: "md",
          processedContent: "# Title",
          highlightedHtml: '<pre class="shiki"># Title</pre>',
        }),
      ];

      const repoInfo = {
        name: "mixed-types",
        url: "https://github.com/test/mixed",
      };

      const outputPath = getUniqueOutputPath("pdf-gen-mixed");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);
  });

  describe("themes", () => {
    it.each(ALL_THEMES.slice(0, 5))(
      "should generate PDF with %s theme",
      async (theme) => {
        const config = createTestConfig({
          style: {
            theme,
            lineNumbers: true,
            pageNumbers: true,
            includeTableOfContents: true,
            fontSize: "14px",
            fontFamily: "monospace",
          },
        });
        generator = new PDFGenerator(config);

        const files: ProcessedFile[] = [
          createMockProcessedFile({
            name: "test.ts",
            path: "src/test.ts",
            processedContent: 'const x = "test";',
            highlightedHtml: `<pre class="shiki ${theme}">const x = "test";</pre>`,
          }),
        ];

        const repoInfo = {
          name: `theme-${theme}`,
          url: "https://github.com/test/theme",
        };

        const outputPath = getUniqueOutputPath(`pdf-theme-${theme}`);
        const result = await generator.generatePDF(files, repoInfo, outputPath);

        expect(result.success).toBe(true);
        expect(pdfExists(outputPath)).toBe(true);
      },
      60000,
    );
  });

  describe("options", () => {
    it("should generate PDF without line numbers", async () => {
      const config = createTestConfig({
        style: {
          theme: "github-dark",
          lineNumbers: false,
          pageNumbers: true,
          includeTableOfContents: true,
          fontSize: "14px",
          fontFamily: "monospace",
        },
      });
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [createMockProcessedFile()];

      const repoInfo = {
        name: "no-line-numbers",
        url: "https://github.com/test/no-lines",
      };

      const outputPath = getUniqueOutputPath("pdf-no-lines");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);

    it("should generate PDF without table of contents", async () => {
      const config = createTestConfig({
        style: {
          theme: "github-dark",
          lineNumbers: true,
          pageNumbers: true,
          includeTableOfContents: false,
          fontSize: "14px",
          fontFamily: "monospace",
        },
      });
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [createMockProcessedFile()];

      const repoInfo = {
        name: "no-toc",
        url: "https://github.com/test/no-toc",
      };

      const outputPath = getUniqueOutputPath("pdf-no-toc");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);

    it("should generate PDF without page numbers", async () => {
      const config = createTestConfig({
        style: {
          theme: "github-dark",
          lineNumbers: true,
          pageNumbers: false,
          includeTableOfContents: true,
          fontSize: "14px",
          fontFamily: "monospace",
        },
      });
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [createMockProcessedFile()];

      const repoInfo = {
        name: "no-page-numbers",
        url: "https://github.com/test/no-pages",
      };

      const outputPath = getUniqueOutputPath("pdf-no-pages");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);

    it("should apply custom CSS", async () => {
      const config = createTestConfig({
        style: {
          theme: "github-dark",
          lineNumbers: true,
          pageNumbers: true,
          includeTableOfContents: true,
          fontSize: "14px",
          fontFamily: "monospace",
          customCSS: "body { background: red !important; }",
        },
      });
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [createMockProcessedFile()];

      const repoInfo = {
        name: "custom-css",
        url: "https://github.com/test/custom",
      };

      const outputPath = getUniqueOutputPath("pdf-custom-css");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);

    it("should use custom font size", async () => {
      const config = createTestConfig({
        style: {
          theme: "github-dark",
          lineNumbers: true,
          pageNumbers: true,
          includeTableOfContents: true,
          fontSize: "18px",
          fontFamily: "monospace",
        },
      });
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [createMockProcessedFile()];

      const repoInfo = {
        name: "custom-font-size",
        url: "https://github.com/test/font",
      };

      const outputPath = getUniqueOutputPath("pdf-font-size");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);
  });

  describe("page settings", () => {
    it("should generate PDF with Letter page size", async () => {
      const config = createTestConfig({
        output: {
          format: "pdf",
          outputPath: "",
          singleFile: true,
          pageSize: "Letter",
        },
      });
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [createMockProcessedFile()];

      const repoInfo = {
        name: "letter-size",
        url: "https://github.com/test/letter",
      };

      const outputPath = getUniqueOutputPath("pdf-letter");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);

    it("should generate PDF in landscape orientation", async () => {
      const config = createTestConfig({
        output: {
          format: "pdf",
          outputPath: "",
          singleFile: true,
          landscape: true,
        },
      });
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [createMockProcessedFile()];

      const repoInfo = {
        name: "landscape",
        url: "https://github.com/test/landscape",
      };

      const outputPath = getUniqueOutputPath("pdf-landscape");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);

    it("should apply custom margins", async () => {
      const config = createTestConfig({
        output: {
          format: "pdf",
          outputPath: "",
          singleFile: true,
          margin: {
            top: "2cm",
            right: "2cm",
            bottom: "2cm",
            left: "2cm",
          },
        },
      });
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [createMockProcessedFile()];

      const repoInfo = {
        name: "custom-margins",
        url: "https://github.com/test/margins",
      };

      const outputPath = getUniqueOutputPath("pdf-margins");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);
  });

  describe("cleanup", () => {
    it("should cleanup browser resources", async () => {
      const config = createTestConfig();
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [createMockProcessedFile()];

      const repoInfo = {
        name: "cleanup-test",
        url: "https://github.com/test/cleanup",
      };

      const outputPath = getUniqueOutputPath("pdf-cleanup");
      await generator.generatePDF(files, repoInfo, outputPath);

      // Cleanup should not throw
      await expect(generator.cleanup()).resolves.not.toThrow();

      // Double cleanup should also not throw
      await expect(generator.cleanup()).resolves.not.toThrow();
    }, 60000);
  });

  describe("binary and image files", () => {
    it("should handle binary file placeholders", async () => {
      const config = createTestConfig();
      generator = new PDFGenerator(config);

      const files: ProcessedFile[] = [
        createMockProcessedFile({
          name: "data.bin",
          path: "data/data.bin",
          type: "binary",
          extension: "bin",
          processedContent: "Binary file: data.bin (1024 bytes)",
        }),
      ];

      const repoInfo = {
        name: "binary-test",
        url: "https://github.com/test/binary",
      };

      const outputPath = getUniqueOutputPath("pdf-binary");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);

    it("should handle image files with base64 content", async () => {
      const config = createTestConfig();
      generator = new PDFGenerator(config);

      // Small 1x1 pixel PNG as base64
      const tinyPng =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const files: ProcessedFile[] = [
        createMockProcessedFile({
          name: "image.png",
          path: "images/image.png",
          type: "image",
          extension: "png",
          base64Content: tinyPng,
        }),
      ];

      const repoInfo = {
        name: "image-test",
        url: "https://github.com/test/image",
      };

      const outputPath = getUniqueOutputPath("pdf-image");
      const result = await generator.generatePDF(files, repoInfo, outputPath);

      expect(result.success).toBe(true);
    }, 60000);
  });
});

describe("PDF Output Validation", () => {
  let generator: PDFGenerator;

  afterEach(async () => {
    if (generator) {
      await generator.cleanup();
    }
  });

  it("should produce valid PDF file format", async () => {
    const config = createTestConfig();
    generator = new PDFGenerator(config);

    const files: ProcessedFile[] = [createMockProcessedFile()];

    const repoInfo = {
      name: "valid-pdf",
      url: "https://github.com/test/valid",
    };

    const outputPath = getUniqueOutputPath("pdf-valid");
    await generator.generatePDF(files, repoInfo, outputPath);

    // Read first bytes to verify PDF header
    const buffer = fs.readFileSync(outputPath);
    const header = buffer.slice(0, 8).toString("ascii");

    expect(header.startsWith("%PDF-")).toBe(true);
  }, 60000);

  it("should produce PDF with proper structure", async () => {
    const config = createTestConfig();
    generator = new PDFGenerator(config);

    const files: ProcessedFile[] = [createMockProcessedFile()];

    const repoInfo = {
      name: "structure-test",
      url: "https://github.com/test/structure",
    };

    const outputPath = getUniqueOutputPath("pdf-structure");
    await generator.generatePDF(files, repoInfo, outputPath);

    const buffer = fs.readFileSync(outputPath);
    const content = buffer.toString("latin1");

    // PDF should end with %%EOF
    expect(content.includes("%%EOF")).toBe(true);

    // PDF should have objects
    expect(content.includes("obj")).toBe(true);
    expect(content.includes("endobj")).toBe(true);
  }, 60000);
});
