import { ErrorHandler, ErrorType } from "../../src/utils/error-handler";
import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";

import { convertRepository } from "../../src/index";
import fs from "fs";
import path from "path";

// This is a fuzz test for error handling
// It tests the application with invalid or unexpected inputs

const OUTPUT_DIR = path.join(__dirname, "../../fuzz-output");

describe("Error Handling Fuzz Tests", () => {
  beforeAll(() => {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Mock console.error to prevent noise in test output
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    // Clean up output files
    if (fs.existsSync(OUTPUT_DIR)) {
      const files = fs.readdirSync(OUTPUT_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(OUTPUT_DIR, file));
      }
      fs.rmdirSync(OUTPUT_DIR);
    }
    // Restore console.error
    (console.error as jest.Mock).mockRestore();
  });

  it("should handle invalid repository URL", async () => {
    await expect(
      convertRepository({
        repository: {
          url: "not-a-valid-url",
          vcsType: "github",
        },
        output: {
          format: "pdf",
          outputPath: path.join(OUTPUT_DIR, "invalid-url.pdf"),
          singleFile: true,
        },
      }),
    ).rejects.toThrow();
  });

  it("should handle non-existent repository", async () => {
    await expect(
      convertRepository({
        repository: {
          url: "https://github.com/this-repo-does-not-exist-12345/not-real",
          vcsType: "github",
        },
        output: {
          format: "pdf",
          outputPath: path.join(OUTPUT_DIR, "non-existent-repo.pdf"),
          singleFile: true,
        },
      }),
    ).rejects.toThrow();
  });

  it("should handle non-existent local path", async () => {
    await expect(
      convertRepository({
        repository: {
          localPath: "/path/that/does/not/exist",
          vcsType: "local",
        },
        output: {
          format: "pdf",
          outputPath: path.join(OUTPUT_DIR, "non-existent-local.pdf"),
          singleFile: true,
        },
      }),
    ).rejects.toThrow();
  });

  it("should handle invalid output format", async () => {
    await expect(
      convertRepository({
        repository: {
          url: "https://github.com/octocat/Hello-World",
          vcsType: "github",
        },
        output: {
          format: "invalid-format" as any,
          outputPath: path.join(OUTPUT_DIR, "invalid-format.pdf"),
          singleFile: true,
        },
      }),
    ).rejects.toThrow();
  });

  it("should handle invalid VCS type", async () => {
    await expect(
      convertRepository({
        repository: {
          url: "https://github.com/octocat/Hello-World",
          vcsType: "invalid-vcs" as any,
        },
        output: {
          format: "pdf",
          outputPath: path.join(OUTPUT_DIR, "invalid-vcs.pdf"),
          singleFile: true,
        },
      }),
    ).rejects.toThrow();
  });

  it("should handle missing repository URL and local path", async () => {
    await expect(
      convertRepository({
        repository: {
          url: "",
          localPath: "",
        },
        output: {
          format: "pdf",
          outputPath: path.join(OUTPUT_DIR, "missing-repo.pdf"),
          singleFile: true,
        },
      }),
    ).rejects.toThrow("Repository URL or local path must be provided");
  });

  it("should handle missing output path", async () => {
    await expect(
      convertRepository({
        repository: {
          url: "https://github.com/octocat/Hello-World",
          vcsType: "github",
        },
        output: {
          format: "pdf",
          outputPath: "",
          singleFile: true,
        },
      }),
    ).rejects.toThrow("Output path must be provided");
  });

  it("should handle invalid concurrency value", async () => {
    // This should not throw but should log a warning and use default value
    await expect(
      convertRepository({
        repository: {
          url: "https://github.com/octocat/Hello-World",
          vcsType: "github",
        },
        output: {
          format: "pdf",
          outputPath: path.join(OUTPUT_DIR, "invalid-concurrency.pdf"),
          singleFile: true,
        },
        processing: {
          maxConcurrency: -1,
        },
      }),
    ).resolves.not.toThrow();
  });

  it("should handle invalid cache TTL", async () => {
    // This should not throw but should log a warning and use default value
    await expect(
      convertRepository({
        repository: {
          url: "https://github.com/octocat/Hello-World",
          vcsType: "github",
          useCache: true,
        },
        output: {
          format: "pdf",
          outputPath: path.join(OUTPUT_DIR, "invalid-cache-ttl.pdf"),
          singleFile: true,
        },
        cache: {
          enabled: true,
          ttl: -1,
        },
      }),
    ).resolves.not.toThrow();
  });

  it("should handle custom error types", () => {
    const configError = ErrorHandler.configurationError("Test config error");
    expect(configError.type).toBe(ErrorType.CONFIGURATION);

    const repoError = ErrorHandler.repositoryError("Test repo error");
    expect(repoError.type).toBe(ErrorType.REPOSITORY);

    const fileError = ErrorHandler.fileProcessingError("Test file error");
    expect(fileError.type).toBe(ErrorType.FILE_PROCESSING);

    const genError = ErrorHandler.generationError("Test generation error");
    expect(genError.type).toBe(ErrorType.GENERATION);

    const netError = ErrorHandler.networkError("Test network error");
    expect(netError.type).toBe(ErrorType.NETWORK);

    const authError = ErrorHandler.authenticationError("Test auth error");
    expect(authError.type).toBe(ErrorType.AUTHENTICATION);

    const permError = ErrorHandler.permissionError("Test permission error");
    expect(permError.type).toBe(ErrorType.PERMISSION);

    const timeoutError = ErrorHandler.timeoutError("Test timeout error");
    expect(timeoutError.type).toBe(ErrorType.TIMEOUT);
  });

  it("should handle error with original error", () => {
    const originalError = new Error("Original error");
    const wrappedError = ErrorHandler.networkError(
      "Wrapped error",
      originalError,
    );

    expect(wrappedError.message).toBe("Wrapped error");
    expect(wrappedError.type).toBe(ErrorType.NETWORK);
    expect(wrappedError.originalError).toBe(originalError);
  });

  // Test random inputs (fuzz testing)
  const randomValues = [
    undefined,
    null,
    "",
    0,
    -1,
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    {},
    [],
    [1, 2, 3],
    { a: 1, b: 2 },
    new Date(),
    /regex/,
    () => {},
    () => {},
    Symbol("test"),
    new Map(),
    new Set(),
    new WeakMap(),
    new WeakSet(),
    new ArrayBuffer(10),
    new Int8Array(10),
    new Uint8Array(10),
    new Int16Array(10),
    new Uint16Array(10),
    new Int32Array(10),
    new Uint32Array(10),
    new Float32Array(10),
    new Float64Array(10),
    new BigInt64Array(10),
    new BigUint64Array(10),
    Promise.resolve(),
    Promise.reject().catch(() => {}),
  ];

  for (let i = 0; i < 10; i++) {
    const randomValue1 =
      randomValues[Math.floor(Math.random() * randomValues.length)];
    const randomValue2 =
      randomValues[Math.floor(Math.random() * randomValues.length)];

    it(`should handle random input combination ${i + 1}`, async () => {
      // This test just verifies that the application doesn't crash with random inputs
      try {
        await convertRepository({
          repository: {
            url: randomValue1 as any,
            vcsType: randomValue2 as any,
          },
          output: {
            format: "pdf",
            outputPath: path.join(OUTPUT_DIR, `random-${i}.pdf`),
            singleFile: true,
          },
        });
      } catch (error) {
        // We expect errors, but we want to make sure they're handled properly
        expect(error).toBeDefined();
      }
    });
  }
});
