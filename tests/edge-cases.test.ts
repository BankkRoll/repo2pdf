/**
 * Edge-case fixture tests.
 *
 * Exercises the real LocalFetcher + FileProcessor pipeline against the
 * deterministic edge-case fixtures (empty files, CRLF, unicode filenames,
 * very long lines, deeply nested paths, hidden dotfiles, and comment/string
 * edge cases). Everything is offline and deterministic — fixtures are
 * generated on disk before the suite.
 *
 * Most assertions run at the fetcher/processor level (fast). Exactly one full
 * Repo2PDF.convert() to PDF is exercised (generous timeout) to prove the whole
 * pipeline survives these inputs end-to-end.
 */

import { describe, it, expect, beforeAll } from "vitest";
import path from "path";
import { LocalFetcher } from "../src/fetchers/local-fetcher";
import { FileProcessor } from "../src/processors/file-processor";
import { PDFGenerator } from "../src/generators/pdf-generator";
import { Repo2PDF } from "../src/index";
import type { RepoFile, ProcessedFile } from "../src/types/file.types";
import {
  EDGE_CASES_DIR,
  generateAllFixtures,
} from "./fixtures/generate-fixtures";
import {
  createLocalRepoConfig,
  getUniqueOutputPath,
  pdfExists,
} from "./helpers/test-utils";

/**
 * Fetch all edge-case files via the real LocalFetcher.
 */
async function fetchEdgeCaseFiles(): Promise<RepoFile[]> {
  const fetcher = new LocalFetcher();
  await fetcher.initialize({ url: "", localPath: EDGE_CASES_DIR });
  return fetcher.fetchRepository();
}

/**
 * Find a fetched file by its basename (handles unicode names too).
 */
function byName(files: RepoFile[], name: string): RepoFile | undefined {
  return files.find((f) => f.name === name);
}

describe("Edge-case fixtures", () => {
  let files: RepoFile[];

  beforeAll(async () => {
    // Be safe even though global-setup already generated these.
    generateAllFixtures();
    files = await fetchEdgeCaseFiles();
  });

  describe("LocalFetcher.fetchRepository()", () => {
    it("returns a non-empty list of files", () => {
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });

    it("finds the unicode-named file (café-☕.md)", () => {
      const unicodeFile = byName(files, "café-☕.md");
      expect(unicodeFile).toBeDefined();
      expect(unicodeFile?.type).toBe("code");
      expect(unicodeFile?.path).toContain("café-☕.md");
    });

    it("uses POSIX-style separators for deeply nested deep.ts", () => {
      const deep = byName(files, "deep.ts");
      expect(deep).toBeDefined();
      const p = deep!.path;
      // Cross-platform: canonical relative paths use "/" everywhere.
      expect(p.includes("/")).toBe(true);
      expect(p.includes("\\")).toBe(false);
      // Path reflects the nested a/b/c/d/e/f/deep.ts structure.
      expect(p).toBe("a/b/c/d/e/f/deep.ts");
    });
  });

  describe("CRLF preservation", () => {
    it("preserves \\r\\n through fetch + process (crlf.js)", async () => {
      const crlf = byName(files, "crlf.js");
      expect(crlf).toBeDefined();
      expect(typeof crlf!.content).toBe("string");
      expect((crlf!.content as string).includes("\r\n")).toBe(true);

      // No comment/empty-line transforms, so content survives verbatim.
      const config = createLocalRepoConfig(EDGE_CASES_DIR);
      const processor = new FileProcessor(config);
      const processed = await processor.processFile(crlf!);
      expect(processed.processedContent.includes("\r\n")).toBe(true);
    });
  });

  describe("Empty file handling", () => {
    it("classifies empty.txt as code with empty content", () => {
      const empty = byName(files, "empty.txt");
      expect(empty).toBeDefined();
      expect(empty?.type).toBe("code");
      expect(empty?.content).toBe("");
      expect(empty?.size).toBe(0);
    });

    it("handles an empty file gracefully through the list processor", async () => {
      const empty = byName(files, "empty.txt");
      expect(empty).toBeDefined();

      const config = createLocalRepoConfig(EDGE_CASES_DIR);
      const processor = new FileProcessor(config);

      // ACTUAL behavior: processFiles() (the list API) wraps per-file errors so
      // one bad/empty file never aborts the run. Empty content is falsy, so the
      // CodeProcessor throws internally, but the wrapper turns it into a minimal
      // ProcessedFile carrying an error placeholder instead of rejecting.
      let processed: ProcessedFile[] = [];
      await expect(
        (async () => {
          processed = await processor.processFiles([empty!]);
        })(),
      ).resolves.not.toThrow();

      expect(processed).toHaveLength(1);
      const emptyProcessed = processed[0];
      expect(emptyProcessed.name).toBe("empty.txt");
      expect(typeof emptyProcessed.processedContent).toBe("string");
      // The wrapper substitutes an "Error processing file:" placeholder.
      expect(emptyProcessed.processedContent).toContain(
        "Error processing file",
      );
    });

    it("rejects at the single-file processFile() level for empty content (actual behavior)", async () => {
      const empty = byName(files, "empty.txt");
      expect(empty).toBeDefined();

      const config = createLocalRepoConfig(EDGE_CASES_DIR);
      const processor = new FileProcessor(config);

      // ACTUAL behavior: the single-file processFile() does NOT wrap errors, so
      // the CodeProcessor's "File content is empty" throw propagates here. Only
      // the list-based processFiles() swallows it (see the test above).
      await expect(processor.processFile(empty!)).rejects.toThrow(
        /File content is empty/,
      );
    });

    it("includes the empty file when processing the whole list", async () => {
      const config = createLocalRepoConfig(EDGE_CASES_DIR);
      const processor = new FileProcessor(config);
      const processed = await processor.processFiles(files);
      const emptyProcessed = processed.find((f) => f.name === "empty.txt");
      expect(emptyProcessed).toBeDefined();
      // typeof guard: processedContent is always a string (possibly empty or an
      // error placeholder), never undefined.
      expect(typeof emptyProcessed!.processedContent).toBe("string");
    });
  });

  describe("Very long line handling", () => {
    it("processes the 15k-char long line and renders to a valid PDF", async () => {
      const longLine = byName(files, "long-line.js");
      expect(longLine).toBeDefined();
      expect((longLine!.content as string).length).toBeGreaterThan(15000);

      const config = createLocalRepoConfig(EDGE_CASES_DIR);
      const processor = new FileProcessor(config);
      const processed = await processor.processFile(longLine!);

      // Content survives processing verbatim (no highlighting at this stage).
      expect(typeof processed.processedContent).toBe("string");
      expect(processed.processedContent).toContain("x".repeat(1000));

      // The renderer (which now performs tokenization) must not crash on a
      // pathologically long line — assert it produces a real PDF.
      const generator = new PDFGenerator(config);
      const bytes = await generator.generateToBytes([processed], {
        name: "edge-cases",
        description: "Edge case fixtures",
        url: "",
      });
      expect(bytes.length).toBeGreaterThan(0);
      // A real PDF starts with the "%PDF-" magic bytes.
      const header = Buffer.from(bytes.slice(0, 5)).toString("latin1");
      expect(header).toBe("%PDF-");
    }, 120000);
  });

  describe("Hidden dotfile handling", () => {
    it("excludes .hidden-config.json by default", async () => {
      const config = createLocalRepoConfig(EDGE_CASES_DIR, {
        processing: {
          ignorePatterns: [],
          maxConcurrency: 5,
          removeComments: false,
          removeEmptyLines: false,
          includeBinaryFiles: false,
          includeHiddenFiles: false,
          useIncrementalProcessing: false,
          incrementalChunkSize: 100,
        },
      });
      const processor = new FileProcessor(config);
      const processed = await processor.processFiles(files);
      const hidden = processed.find((f) => f.name === ".hidden-config.json");
      expect(hidden).toBeUndefined();
    });

    it("includes .hidden-config.json when includeHiddenFiles:true", async () => {
      const config = createLocalRepoConfig(EDGE_CASES_DIR, {
        processing: {
          ignorePatterns: [],
          maxConcurrency: 5,
          removeComments: false,
          removeEmptyLines: false,
          includeBinaryFiles: false,
          includeHiddenFiles: true,
          useIncrementalProcessing: false,
          incrementalChunkSize: 100,
        },
      });
      const processor = new FileProcessor(config);
      const processed = await processor.processFiles(files);
      const hidden = processed.find((f) => f.name === ".hidden-config.json");
      expect(hidden).toBeDefined();
      // It's a .json file → code, so it gets real content.
      expect(hidden!.processedContent).toContain("hidden");
    });
  });

  describe("Extensionless file behavior (actual current behavior)", () => {
    it("classifies LICENSE and Makefile as 'unknown' (no extension)", () => {
      const license = byName(files, "LICENSE");
      const makefile = byName(files, "Makefile");
      expect(license).toBeDefined();
      expect(makefile).toBeDefined();
      // file-utils.determineFileType returns "unknown" for extensionless files.
      expect(license?.type).toBe("unknown");
      expect(makefile?.type).toBe("unknown");
      expect(license?.extension).toBe("");
      expect(makefile?.extension).toBe("");
    });

    it("excludes 'unknown' files by default (includeBinaryFiles:false)", async () => {
      const config = createLocalRepoConfig(EDGE_CASES_DIR);
      const processor = new FileProcessor(config);
      const processed = await processor.processFiles(files);
      expect(processed.find((f) => f.name === "LICENSE")).toBeUndefined();
      expect(processed.find((f) => f.name === "Makefile")).toBeUndefined();
    });
  });

  describe("String-aware comment stripping (comment-edge.ts)", () => {
    it("keeps URL string and template-literal comment-like text intact", async () => {
      const commentEdge = byName(files, "comment-edge.ts");
      expect(commentEdge).toBeDefined();

      const config = createLocalRepoConfig(EDGE_CASES_DIR, {
        processing: {
          ignorePatterns: [],
          maxConcurrency: 5,
          removeComments: true,
          removeEmptyLines: false,
          includeBinaryFiles: false,
          includeHiddenFiles: false,
          useIncrementalProcessing: false,
          incrementalChunkSize: 100,
        },
      });
      const processor = new FileProcessor(config);
      const processed = await processor.processFile(commentEdge!);
      const out = processed.processedContent;

      // The URL lives inside a string literal → must NOT be stripped.
      expect(out).toContain("https://example.com");
      // The "/* not a comment */" lives inside a template literal → kept.
      expect(out).toContain("/* not a comment */");

      // Sanity: the real standalone block comment IS removed.
      expect(out).not.toContain("a real block comment");
      // The real trailing line comment IS removed.
      expect(out).not.toContain("trailing");
    });
  });

  describe("Full pipeline (single PDF over edge cases)", () => {
    it("converts the edge-case repo to a valid PDF end-to-end", async () => {
      const outputPath = getUniqueOutputPath("edge-cases-e2e");
      const config = createLocalRepoConfig(EDGE_CASES_DIR, {
        output: {
          format: "pdf",
          outputPath,
          singleFile: true,
          pageSize: "A4",
          landscape: false,
          margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
        },
      });

      const repo2pdf = new Repo2PDF(config);
      const result = await repo2pdf.convert();

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(pdfExists(outputPath)).toBe(true);
    }, 120000);
  });
});
