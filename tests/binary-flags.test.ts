/**
 * Tests for the --include-binary / --include-hidden filtering behavior at the
 * FileProcessor level (shouldIgnore + filterFiles + processFiles).
 *
 * These are fast, fully offline, and never touch Puppeteer/PDF generation.
 */

import { describe, it, expect } from "vitest";
import { FileProcessor } from "../src/processors/file-processor";
import { createTestConfig, createMockRepoFile } from "./helpers/test-utils";
import type { RepoFile } from "../src/types/file.types";

/**
 * A tiny 1x1 transparent PNG as a Buffer so ImageProcessor can produce base64
 * without throwing.
 */
const PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Build a fresh, well-mixed set of RepoFiles for each test.
 * - code:    src/main.ts        (type "code", non-hidden)
 * - binary:  assets/blob.bin    (type "binary", content null)
 * - image:   assets/logo.png    (type "image", Buffer content)
 * - unknown: data/mystery.xyz   (type "unknown")
 * - hidden:  .env               (type "code" but path starts with ".")
 */
function makeMixedFiles(): RepoFile[] {
  return [
    createMockRepoFile({
      name: "main.ts",
      path: "src/main.ts",
      type: "code",
      extension: "ts",
      language: "typescript",
      content: 'export const greeting = "hi";',
    }),
    createMockRepoFile({
      name: "blob.bin",
      path: "assets/blob.bin",
      type: "binary",
      extension: "bin",
      language: undefined,
      content: null,
    }),
    createMockRepoFile({
      name: "logo.png",
      path: "assets/logo.png",
      type: "image",
      extension: "png",
      language: undefined,
      content: PNG_BUFFER,
    }),
    createMockRepoFile({
      name: "mystery.xyz",
      path: "data/mystery.xyz",
      type: "unknown",
      extension: "xyz",
      language: undefined,
      content: null,
    }),
    createMockRepoFile({
      name: ".env",
      path: ".env",
      type: "code",
      extension: "env",
      language: undefined,
      content: "SECRET=shh",
    }),
  ];
}

/** Helper: get the set of surviving paths from a processed-file array. */
function pathsOf(files: { path: string }[]): string[] {
  return files.map((f) => f.path);
}

describe("FileProcessor binary/hidden filtering", () => {
  it("default config keeps only the non-hidden code file", async () => {
    const config = createTestConfig({
      processing: {
        ...createTestConfig().processing,
        includeBinaryFiles: false,
        includeHiddenFiles: false,
      },
    });

    const processor = new FileProcessor(config);
    const result = await processor.processFiles(makeMixedFiles());
    const paths = pathsOf(result);

    // Only the non-hidden code file survives.
    expect(paths).toContain("src/main.ts");
    expect(paths).not.toContain("assets/blob.bin");
    expect(paths).not.toContain("assets/logo.png");
    expect(paths).not.toContain("data/mystery.xyz");
    expect(paths).not.toContain(".env");
    expect(result).toHaveLength(1);

    // The surviving code file was actually processed (has content).
    const code = result.find((f) => f.path === "src/main.ts");
    expect(code?.processedContent).toContain("greeting");
  });

  it("includeBinaryFiles:true includes binary, image, and unknown files", async () => {
    const config = createTestConfig({
      processing: {
        ...createTestConfig().processing,
        includeBinaryFiles: true,
        includeHiddenFiles: false,
      },
    });

    const processor = new FileProcessor(config);
    const result = await processor.processFiles(makeMixedFiles());
    const paths = pathsOf(result);

    // Binary / image / unknown all pass the filter now.
    expect(paths).toContain("src/main.ts");
    expect(paths).toContain("assets/blob.bin");
    expect(paths).toContain("assets/logo.png");
    expect(paths).toContain("data/mystery.xyz");
    // Hidden file still excluded (includeHiddenFiles is false).
    expect(paths).not.toContain(".env");
    expect(result).toHaveLength(4);

    // Binary placeholder content was produced.
    const bin = result.find((f) => f.path === "assets/blob.bin");
    expect(bin?.processedContent).toContain("Binary file");

    // Image is rendered as a placeholder (no base64 embedding): its
    // processedContent is the empty string and there is no base64Content field.
    const img = result.find((f) => f.path === "assets/logo.png");
    expect(img).toBeDefined();
    expect(img!.processedContent).toBe("");
  });

  it("includeHiddenFiles:true includes the hidden code file but binary stays excluded", async () => {
    const config = createTestConfig({
      processing: {
        ...createTestConfig().processing,
        includeBinaryFiles: false,
        includeHiddenFiles: true,
      },
    });

    const processor = new FileProcessor(config);
    const result = await processor.processFiles(makeMixedFiles());
    const paths = pathsOf(result);

    // Hidden CODE file now survives.
    expect(paths).toContain("src/main.ts");
    expect(paths).toContain(".env");
    // Non-code files still excluded because includeBinaryFiles is false.
    expect(paths).not.toContain("assets/blob.bin");
    expect(paths).not.toContain("assets/logo.png");
    expect(paths).not.toContain("data/mystery.xyz");
    expect(result).toHaveLength(2);

    // The hidden file was processed as code.
    const env = result.find((f) => f.path === ".env");
    expect(env?.processedContent).toContain("SECRET");
  });

  it("a hidden file inside a nested directory is excluded by default", async () => {
    const config = createTestConfig();
    const files: RepoFile[] = [
      createMockRepoFile({
        name: "main.ts",
        path: "src/main.ts",
        type: "code",
        content: "export const a = 1;",
      }),
      createMockRepoFile({
        // dotfile nested in a path -> matched via "/." rule
        name: "config.json",
        path: "src/.hidden/config.json",
        type: "code",
        extension: "json",
        language: "json",
        content: "{}",
      }),
    ];

    const processor = new FileProcessor(config);
    const result = await processor.processFiles(files);
    const paths = pathsOf(result);

    expect(paths).toContain("src/main.ts");
    expect(paths).not.toContain("src/.hidden/config.json");
    expect(result).toHaveLength(1);
  });

  it("ignorePatterns excludes a matching code file via **/*.spec.ts", async () => {
    const config = createTestConfig({
      processing: {
        ...createTestConfig().processing,
        ignorePatterns: ["**/*.spec.ts"],
      },
    });

    const files: RepoFile[] = [
      createMockRepoFile({
        name: "main.ts",
        path: "src/main.ts",
        type: "code",
        content: "export const a = 1;",
      }),
      createMockRepoFile({
        name: "main.spec.ts",
        path: "src/main.spec.ts",
        type: "code",
        content: "describe('x', () => {});",
      }),
    ];

    const processor = new FileProcessor(config);
    const result = await processor.processFiles(files);
    const paths = pathsOf(result);

    expect(paths).toContain("src/main.ts");
    expect(paths).not.toContain("src/main.spec.ts");
    expect(result).toHaveLength(1);
  });

  it('ignorePatterns "node_modules/**" excludes a node_modules path', async () => {
    const config = createTestConfig({
      processing: {
        ...createTestConfig().processing,
        ignorePatterns: ["node_modules/**"],
      },
    });

    const files: RepoFile[] = [
      createMockRepoFile({
        name: "index.ts",
        path: "src/index.ts",
        type: "code",
        content: "export {};",
      }),
      createMockRepoFile({
        name: "dep.js",
        path: "node_modules/some-pkg/dep.js",
        type: "code",
        extension: "js",
        language: "javascript",
        content: "module.exports = {};",
      }),
    ];

    const processor = new FileProcessor(config);
    const result = await processor.processFiles(files);
    const paths = pathsOf(result);

    expect(paths).toContain("src/index.ts");
    expect(paths).not.toContain("node_modules/some-pkg/dep.js");
    expect(result).toHaveLength(1);
  });
});
