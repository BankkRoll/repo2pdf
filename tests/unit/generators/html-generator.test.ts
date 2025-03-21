import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { HTMLGenerator } from "../../../src/generators/html-generator";
import fs from "fs";
import path from "path";

// Mock dependencies
jest.mock("fs");
jest.mock("path");

describe("HTMLGenerator", () => {
  let htmlGenerator: HTMLGenerator;
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    htmlGenerator = new HTMLGenerator(mockLogger as any);
  });

  describe("generate", () => {
    it("should generate HTML from processed files", async () => {
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
          format: "html",
        },
        title: "Test Repository",
        repository: {
          url: "https://github.com/test/repo",
        },
      };

      // Mock fs.writeFileSync
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      // Mock path.join
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Call generate method
      const result = await htmlGenerator.generate(processedFiles, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.format).toBe("html");
      expect(result.path).toBe("/output/repo-doc.html");
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Generated HTML output at /output/repo-doc.html",
      );
    });

    it("should handle errors during HTML generation", async () => {
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
          format: "html",
        },
      };

      // Mock fs.writeFileSync to throw an error
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Failed to write file");
      });

      // Mock path.join
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Call generate method and expect it to throw
      await expect(
        htmlGenerator.generate(processedFiles, config),
      ).rejects.toThrow("Failed to generate HTML output");

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("createHTMLContent", () => {
    it("should create valid HTML content with proper structure", () => {
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
        title: "Test Repository",
        repository: {
          url: "https://github.com/test/repo",
        },
      };

      // Call createHTMLContent method
      const htmlContent = (htmlGenerator as any).createHTMLContent(
        processedFiles,
        config,
      );

      // Assertions
      expect(htmlContent).toContain("<!DOCTYPE html>");
      expect(htmlContent).toContain("<title>Test Repository</title>");
      expect(htmlContent).toContain("<h1>Test Repository</h1>");
      expect(htmlContent).toContain("src/index.ts");
      expect(htmlContent).toContain("README.md");
      expect(htmlContent).toContain('console.log("Hello World");');
    });
  });
});
