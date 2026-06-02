/**
 * Multi-language coverage tests.
 *
 * Proves that the ~25 sample languages in the multi-language fixtures all
 * process to non-empty content and render to a valid PDF, that the Shiki
 * tokenizer (which now lives in the renderer, not the CodeProcessor) is a shared
 * singleton, that representative languages tokenize to real colored runs, and
 * that unknown languages fall back gracefully without throwing.
 *
 * Architecture note: syntax highlighting moved out of CodeProcessor into the
 * renderer's Tokenizer. CodeProcessor.process() now only returns
 * { ...file, processedContent } — no highlightedHtml. Color assertions therefore
 * target the ShikiTokenizer directly, and "it renders" is proven by generating a
 * real PDF (%PDF- header) rather than by inspecting HTML.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

import { CodeProcessor } from "../src/processors/code-processor";
import { PDFGenerator } from "../src/generators/pdf-generator";
import { ShikiTokenizer } from "../src/renderers/tokenizers";
import {
  determineFileType,
  determineLanguage,
  extractExtension,
} from "../src/utils/file-utils";
import {
  getHighlighter,
  disposeHighlighters,
} from "../src/utils/shiki-manager";
import {
  generateAllFixtures,
  MULTI_LANGUAGE_DIR,
} from "./fixtures/generate-fixtures";
import { createTestConfig } from "./helpers/test-utils";
import type { RepoFile, ProcessedFile } from "../src/types/file.types";
import type { TokenizedLine } from "../src/renderers/tokenizer.interface";

const TEST_TIMEOUT = 60000;

/** Read a fixture sample file and build a RepoFile for the processor. */
function buildRepoFile(fileName: string): RepoFile {
  const filePath = path.join(MULTI_LANGUAGE_DIR, fileName);
  const content = fs.readFileSync(filePath, "utf8");
  const extension = extractExtension(fileName);
  return {
    name: fileName,
    path: fileName,
    content,
    size: Buffer.byteLength(content),
    type: determineFileType(extension),
    extension,
    language: determineLanguage(extension),
    isDirectory: false,
  };
}

/** Flatten tokenized lines into the concatenated text they represent. */
function tokensToText(lines: TokenizedLine[]): string {
  return lines.map((line) => line.map((t) => t.text).join("")).join("\n");
}

/** True when at least one token carries a (non-default) syntax color. */
function hasColoredTokens(lines: TokenizedLine[]): boolean {
  return lines.some((line) => line.some((t) => typeof t.color === "string"));
}

describe("multi-language coverage", () => {
  beforeAll(() => {
    generateAllFixtures();
  });

  afterAll(async () => {
    await disposeHighlighters();
  });

  const sampleFiles = fs
    .readdirSync(MULTI_LANGUAGE_DIR)
    .filter((f) => f.startsWith("sample."));

  it(
    "discovers the generated multi-language fixtures",
    () => {
      expect(sampleFiles.length).toBeGreaterThanOrEqual(20);
    },
    TEST_TIMEOUT,
  );

  // 1. Every sample.<ext> processes to non-empty processedContent (no
  //    highlighting happens here anymore — that moved to the renderer).
  describe("per-language fixture processing", () => {
    it.each(sampleFiles)(
      "processes %s to non-empty processedContent",
      async (fileName) => {
        const file = buildRepoFile(fileName);
        const processor = new CodeProcessor(createTestConfig());

        const result = await processor.process(file);

        expect(result).toBeDefined();
        expect(typeof result.processedContent).toBe("string");
        expect(result.processedContent.length).toBeGreaterThan(0);
        // The original source survives processing verbatim.
        expect(result.processedContent).toBe(file.content);
      },
      TEST_TIMEOUT,
    );
  });

  // 2. The whole multi-language set renders to a single valid PDF.
  it(
    "renders the whole multi-language set to a valid PDF",
    async () => {
      const config = createTestConfig();
      const processor = new CodeProcessor(config);

      const processed: ProcessedFile[] = [];
      for (const fileName of sampleFiles) {
        processed.push(await processor.process(buildRepoFile(fileName)));
      }

      const generator = new PDFGenerator(config);
      const bytes = await generator.generateToBytes(processed, {
        name: "multi-language",
        description: "Multi-language fixtures",
        url: "",
      });

      expect(bytes.length).toBeGreaterThan(0);
      const header = Buffer.from(bytes.slice(0, 5)).toString("latin1");
      expect(header).toBe("%PDF-");
    },
    TEST_TIMEOUT,
  );

  // 3. Singleton proof: same theme returns the SAME highlighter instance.
  it(
    "returns the same highlighter instance for a given theme (singleton)",
    async () => {
      const first = await getHighlighter("github-dark");
      const second = await getHighlighter("github-dark");
      expect(first).toBe(second);
    },
    TEST_TIMEOUT,
  );

  // 4. Representative languages tokenize to real colored runs via the Shiki
  //    tokenizer (the renderer's highlighter), not a plain-text fallback.
  describe("representative languages produce real colored tokens", () => {
    const REPRESENTATIVE: Array<{ ext: string; firstWord: string }> = [
      { ext: "ts", firstWord: "export" },
      { ext: "py", firstWord: "def" },
      { ext: "go", firstWord: "package" },
      { ext: "rs", firstWord: "fn" },
      { ext: "cpp", firstWord: "#include" },
      { ext: "rb", firstWord: "def" },
    ];

    it.each(REPRESENTATIVE)(
      "tokenizes .$ext with Shiki colors",
      async ({ ext, firstWord }) => {
        const file = buildRepoFile(`sample.${ext}`);
        const processor = new CodeProcessor(createTestConfig());
        const result = await processor.process(file);

        // Original content is preserved by processing.
        expect(result.processedContent).toContain(firstWord);

        const tokenizer = new ShikiTokenizer();
        const lines = await tokenizer.tokenize(
          result.processedContent,
          file.language ?? "text",
          "github-dark",
        );

        // The tokenized text round-trips back to the source content.
        expect(tokensToText(lines)).toBe(result.processedContent);
        // Real Shiki output carries per-token colors (the plain fallback does
        // not).
        expect(hasColoredTokens(lines)).toBe(true);
      },
      TEST_TIMEOUT,
    );
  });

  // 5. Unknown language falls back gracefully without throwing: content is
  //    preserved and it still tokenizes (to a single plain run) and renders.
  it(
    "falls back gracefully for an unknown language",
    async () => {
      const content = "some::unknown <syntax> here\nline two\n";
      const file: RepoFile = {
        name: "weird.zzz",
        path: "weird.zzz",
        content,
        size: Buffer.byteLength(content),
        type: "code",
        extension: "zzz",
        language: "zzz",
        isDirectory: false,
      };
      const processor = new CodeProcessor(createTestConfig());

      const result = await processor.process(file);

      // Content is preserved verbatim — no highlighting mangles it.
      expect(result.processedContent).toBe(content);

      // Tokenizing an unknown language must not throw; it round-trips the text.
      const tokenizer = new ShikiTokenizer();
      const lines = await tokenizer.tokenize(
        result.processedContent,
        file.language ?? "text",
        "github-dark",
      );
      expect(tokensToText(lines)).toBe(result.processedContent);

      // It also renders to a valid PDF end-to-end.
      const generator = new PDFGenerator(createTestConfig());
      const bytes = await generator.generateToBytes([result], {
        name: "weird",
        description: "Unknown language",
        url: "",
      });
      const header = Buffer.from(bytes.slice(0, 5)).toString("latin1");
      expect(header).toBe("%PDF-");
    },
    TEST_TIMEOUT,
  );
});
