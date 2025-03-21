import { EPUBGenerator } from "../../../src/generators/epub-generator";
import fs from "fs";
import path from "path";

// Mock dependencies
jest.mock("fs");
jest.mock("path");

// Mock epub-gen
jest.mock("epub-gen", () => {
  return jest.fn().mockImplementation(() => {
    return {
      promise: Promise.resolve(),
    };
  });
});

describe("EPUBGenerator", () => {
  let epubGenerator: EPUBGenerator;
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    epubGenerator = new EPUBGenerator(mockLogger as any);
  });

  describe("generate", () => {
    it("should generate EPUB from processed files", async () => {
      // Mock processed files
      const processedFiles = [
        {
          path: "src/index.ts",
          content: 'console.log("Hello World");',
          language: "typescript",
          type: "code",
        },
        {
          path: "README.md",
          content: "# Project\nThis is a test project.",
          language: "markdown",
          type: "markdown",
        },
      ];

      // Mock configuration
      const config = {
        output: {
          directory: "/output",
          filename: "repo-doc",
          format: "epub",
        },
        title: "Test Repository",
        repository: {
          url: "https://github.com/test/repo",
        },
        author: "Test Author",
      };

      // Mock path.join
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Call generate method
      const result = await epubGenerator.generate(processedFiles, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.format).toBe("epub");
      expect(result.path).toBe("/output/repo-doc.epub");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Generated EPUB output at /output/repo-doc.epub",
      );
    });

    it("should handle errors during EPUB generation", async () => {
      // Mock processed files
      const processedFiles = [
        {
          path: "src/index.ts",
          content: 'console.log("Hello World");',
          language: "typescript",
          type: "code",
        },
      ];

      // Mock configuration
      const config = {
        output: {
          directory: "/output",
          filename: "repo-doc",
          format: "epub",
        },
      };

      // Mock epub-gen to throw an error
      jest.mock("epub-gen", () => {
        return jest.fn().mockImplementation(() => {
          return {
            promise: Promise.reject(new Error("Failed to generate EPUB")),
          };
        });
      });

      // Mock path.join
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Call generate method and expect it to throw
      await expect(
        epubGenerator.generate(processedFiles, config),
      ).rejects.toThrow("Failed to generate EPUB output");

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
