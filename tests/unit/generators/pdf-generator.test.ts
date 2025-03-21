import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { HTMLGenerator } from "../../../src/generators/html-generator";
import { PDFGenerator } from "../../../src/generators/pdf-generator";
import fs from "fs";
import path from "path";

// Mock dependencies
jest.mock("fs");
jest.mock("path");
jest.mock("../../../src/generators/html-generator");

// Mock puppeteer
jest.mock("puppeteer", () => ({
  launch: jest.fn().mockImplementation(() => ({
    newPage: jest.fn().mockImplementation(() => ({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from("PDF content")),
      close: jest.fn().mockResolvedValue(undefined),
    })),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("PDFGenerator", () => {
  let pdfGenerator: PDFGenerator;
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    pdfGenerator = new PDFGenerator(mockLogger as any);
  });

  describe("generate", () => {
    it("should generate PDF from processed files", async () => {
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
          format: "pdf",
        },
        title: "Test Repository",
        repository: {
          url: "https://github.com/test/repo",
        },
      };

      // Mock HTMLGenerator.prototype.createHTMLContent
      (HTMLGenerator.prototype as any).createHTMLContent = jest
        .fn()
        .mockReturnValue("<html>Test HTML</html>");

      // Mock fs.writeFileSync
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      // Mock path.join
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Call generate method
      const result = await pdfGenerator.generate(processedFiles, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.format).toBe("pdf");
      expect(result.path).toBe("/output/repo-doc.pdf");
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Generated PDF output at /output/repo-doc.pdf",
      );
    });

    it("should handle errors during PDF generation", async () => {
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
          format: "pdf",
        },
      };

      // Mock HTMLGenerator.prototype.createHTMLContent to throw an error
      (HTMLGenerator.prototype as any).createHTMLContent = jest
        .fn()
        .mockImplementation(() => {
          throw new Error("Failed to create HTML content");
        });

      // Mock path.join
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Call generate method and expect it to throw
      await expect(
        pdfGenerator.generate(processedFiles, config),
      ).rejects.toThrow("Failed to generate PDF output");

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
