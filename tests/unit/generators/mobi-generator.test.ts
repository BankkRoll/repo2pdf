import { EPUBGenerator } from "../../../src/generators/epub-generator";
import { MOBIGenerator } from "../../../src/generators/mobi-generator";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

// Mock dependencies
jest.mock("fs");
jest.mock("path");
jest.mock("child_process");

// Mock EPUBGenerator
jest.mock("../../../src/generators/epub-generator");

describe("MOBIGenerator", () => {
  let mobiGenerator: MOBIGenerator;
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mobiGenerator = new MOBIGenerator(mockLogger as any);
  });

  describe("generate", () => {
    it("should generate MOBI from processed files", async () => {
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
          format: "mobi",
        },
        title: "Test Repository",
        repository: {
          url: "https://github.com/test/repo",
        },
      };

      // Mock EPUBGenerator.prototype.generate
      (EPUBGenerator.prototype.generate as jest.Mock).mockResolvedValue({
        format: "epub",
        path: "/output/repo-doc.epub",
      });

      // Mock path.join
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Mock exec to simulate successful conversion
      (exec as jest.Mock).mockImplementation((cmd, callback) => {
        callback(null, "Conversion successful", "");
      });

      // Call generate method
      const result = await mobiGenerator.generate(processedFiles, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.format).toBe("mobi");
      expect(result.path).toBe("/output/repo-doc.mobi");
      expect(EPUBGenerator.prototype.generate).toHaveBeenCalled();
      expect(exec).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Generated MOBI output at /output/repo-doc.mobi",
      );
    });

    it("should handle errors during MOBI generation", async () => {
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
          format: "mobi",
        },
      };

      // Mock EPUBGenerator.prototype.generate
      (EPUBGenerator.prototype.generate as jest.Mock).mockResolvedValue({
        format: "epub",
        path: "/output/repo-doc.epub",
      });

      // Mock path.join
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Mock exec to simulate failed conversion
      (exec as jest.Mock).mockImplementation((cmd, callback) => {
        callback(
          new Error("Conversion failed"),
          "",
          "Error: kindlegen not found",
        );
      });

      // Call generate method and expect it to throw
      await expect(
        mobiGenerator.generate(processedFiles, config),
      ).rejects.toThrow("Failed to generate MOBI output");

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
