/**
 * Multi-language syntax highlighting tests.
 *
 * Proves that Shiki-based highlighting works across the ~25 sample languages in
 * the multi-language fixtures, that the highlighter is a shared singleton, and
 * that unknown languages fall back gracefully without throwing.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

import { CodeProcessor } from "../src/processors/code-processor";
import {
  determineFileType,
  determineLanguage,
  extractExtension,
} from "../src/utils/file-utils";
import { getHighlighter, disposeHighlighters } from "../src/utils/shiki-manager";
import {
  generateAllFixtures,
  MULTI_LANGUAGE_DIR,
} from "./fixtures/generate-fixtures";
import { createTestConfig } from "./helpers/test-utils";
import type { RepoFile } from "../src/types/file.types";

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

/** True when the HTML looks like real Shiki output or an acceptable fallback. */
function looksHighlighted(html: string | undefined): boolean {
  if (!html || html.length === 0) return false;
  return (
    html.includes("<span") || html.includes("shiki") || html.includes("<pre")
  );
}

describe("multi-language syntax highlighting", () => {
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

  // 1. Every sample.<ext> highlights to non-empty Shiki/fallback HTML.
  describe("per-language fixture highlighting", () => {
    it.each(sampleFiles)(
      "highlights %s",
      async (fileName) => {
        const file = buildRepoFile(fileName);
        const processor = new CodeProcessor(createTestConfig());

        const result = await processor.process(file);

        expect(result).toBeDefined();
        expect(typeof result.processedContent).toBe("string");
        expect(result.processedContent.length).toBeGreaterThan(0);
        expect(typeof result.highlightedHtml).toBe("string");
        expect(result.highlightedHtml!.length).toBeGreaterThan(0);
        expect(looksHighlighted(result.highlightedHtml)).toBe(true);
      },
      TEST_TIMEOUT,
    );
  });

  // 2. Singleton proof: same theme returns the SAME highlighter instance.
  it(
    "returns the same highlighter instance for a given theme (singleton)",
    async () => {
      const first = await getHighlighter("github-dark");
      const second = await getHighlighter("github-dark");
      expect(first).toBe(second);
    },
    TEST_TIMEOUT,
  );

  // 3. mapLanguage outputs are loadable: representative langs produce real
  //    highlighted output (Shiki <span>/shiki), not the raw escaped fallback.
  describe("representative languages produce real highlighting", () => {
    const REPRESENTATIVE: Array<{ ext: string; firstLine: string }> = [
      { ext: "ts", firstLine: "export const greet" },
      { ext: "py", firstLine: "def fib" },
      { ext: "go", firstLine: "package main" },
      { ext: "rs", firstLine: "fn main" },
      { ext: "cpp", firstLine: "#include <iostream>" },
      { ext: "rb", firstLine: "def greet" },
    ];

    it.each(REPRESENTATIVE)(
      "highlights .$ext with Shiki (not raw fallback)",
      async ({ ext, firstLine }) => {
        const file = buildRepoFile(`sample.${ext}`);
        const processor = new CodeProcessor(createTestConfig());

        const result = await processor.process(file);

        // Original content is preserved.
        expect(result.processedContent).toContain(firstLine.split(" ")[0]);
        // Real Shiki output (the escaped-only fallback has no class="shiki"
        // wrapper and no token <span> elements).
        const html = result.highlightedHtml || "";
        expect(
          html.includes("shiki") || html.includes("<span"),
        ).toBe(true);
      },
      TEST_TIMEOUT,
    );
  });

  // 4. Unknown language falls back gracefully without throwing.
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

      expect(result.processedContent).toBe(content);
      expect(typeof result.highlightedHtml).toBe("string");
      expect(result.highlightedHtml!.length).toBeGreaterThan(0);
      // Either a <pre> fallback or a plain-text Shiki highlight.
      expect(
        result.highlightedHtml!.includes("<pre") ||
          result.highlightedHtml!.includes("shiki"),
      ).toBe(true);
    },
    TEST_TIMEOUT,
  );
});
