import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { BinaryProcessor } from "../../../src/processors/binary-processor";
import { CodeProcessor } from "../../../src/processors/code-processor";
import { FileProcessor } from "../../../src/processors/file-processor";
import { ImageProcessor } from "../../../src/processors/image-processor";

// Mock dependencies
jest.mock("../../../src/processors/code-processor");
jest.mock("../../../src/processors/image-processor");
jest.mock("../../../src/processors/binary-processor");

describe("FileProcessor", () => {
  let fileProcessor: FileProcessor;
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  // Mock processor instances
  const mockCodeProcessor = {
    process: jest.fn(),
    isCodeFile: jest.fn(),
  };

  const mockImageProcessor = {
    process: jest.fn(),
    isImageFile: jest.fn(),
  };

  const mockBinaryProcessor = {
    process: jest.fn(),
    isBinaryFile: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementations
    (CodeProcessor as jest.Mock).mockImplementation(() => mockCodeProcessor);
    (ImageProcessor as jest.Mock).mockImplementation(() => mockImageProcessor);
    (BinaryProcessor as jest.Mock).mockImplementation(
      () => mockBinaryProcessor,
    );

    fileProcessor = new FileProcessor(mockLogger as any);
  });

  describe("processFiles", () => {
    it("should process multiple files using appropriate processors", async () => {
      // Mock files
      const files = [
        {
          path: "src/index.ts",
          content: 'console.log("Hello World");',
          type: "file",
        },
        {
          path: "images/logo.png",
          content: Buffer.from("fake image data"),
          type: "file",
        },
        {
          path: "assets/document.pdf",
          content: Buffer.from("fake binary data"),
          type: "file",
        },
      ];

      // Mock configuration
      const config = {
        excludePatterns: ["node_modules/**", "**/*.log"],
      };

      // Setup processor mock implementations
      mockCodeProcessor.isCodeFile.mockImplementation((path) =>
        path.endsWith(".ts"),
      );
      mockImageProcessor.isImageFile.mockImplementation((path) =>
        path.endsWith(".png"),
      );
      mockBinaryProcessor.isBinaryFile.mockImplementation((path) =>
        path.endsWith(".pdf"),
      );

      mockCodeProcessor.process.mockResolvedValue({
        processed: true,
        type: "code",
        language: "typescript",
      });

      mockImageProcessor.process.mockResolvedValue({
        processed: true,
        type: "image",
        format: "png",
      });

      mockBinaryProcessor.process.mockResolvedValue({
        processed: true,
        type: "binary",
        outputPath: "/output/assets/document.pdf",
      });

      // Call processFiles method
      const result = await fileProcessor.processFiles(files, config);

      // Assertions
      expect(result).toHaveLength(3);
      expect(mockCodeProcessor.process).toHaveBeenCalledTimes(1);
      expect(mockImageProcessor.process).toHaveBeenCalledTimes(1);
      expect(mockBinaryProcessor.process).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith("Processed 3 files");
    });

    it("should filter files based on exclude patterns", async () => {
      // Mock files
      const files = [
        {
          path: "src/index.ts",
          content: 'console.log("Hello World");',
          type: "file",
        },
        {
          path: "node_modules/package/index.js",
          content: "module.exports = {};",
          type: "file",
        },
        {
          path: "logs/app.log",
          content: "Log data",
          type: "file",
        },
      ];

      // Mock configuration with exclude patterns
      const config = {
        excludePatterns: ["node_modules/**", "**/*.log"],
      };

      // Setup processor mock implementations
      mockCodeProcessor.isCodeFile.mockImplementation(
        (path) => path.endsWith(".ts") || path.endsWith(".js"),
      );

      mockCodeProcessor.process.mockResolvedValue({
        processed: true,
        type: "code",
        language: "typescript",
      });

      // Call processFiles method
      const result = await fileProcessor.processFiles(files, config);

      // Assertions
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("src/index.ts");
      expect(mockCodeProcessor.process).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith("Processed 1 files");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Skipped 2 files due to exclude patterns",
      );
    });

    it("should handle errors during processing", async () => {
      // Mock files
      const files = [
        {
          path: "src/index.ts",
          content: 'console.log("Hello World");',
          type: "file",
        },
      ];

      // Mock configuration
      const config = {};

      // Setup processor mock implementations
      mockCodeProcessor.isCodeFile.mockReturnValue(true);
      mockCodeProcessor.process.mockRejectedValue(
        new Error("Processing error"),
      );

      // Call processFiles method
      const result = await fileProcessor.processFiles(files, config);

      // Assertions
      expect(result).toHaveLength(1);
      expect(result[0].processed).toBe(false);
      expect(result[0].error).toBe("Processing error");
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("shouldExcludeFile", () => {
    it("should correctly match exclude patterns", () => {
      const excludePatterns = [
        "node_modules/**",
        "**/*.log",
        "dist/**",
        ".git/**",
      ];

      // Test various file paths
      expect(
        (fileProcessor as any).shouldExcludeFile(
          "src/index.ts",
          excludePatterns,
        ),
      ).toBe(false);
      expect(
        (fileProcessor as any).shouldExcludeFile(
          "node_modules/package/index.js",
          excludePatterns,
        ),
      ).toBe(true);
      expect(
        (fileProcessor as any).shouldExcludeFile(
          "logs/app.log",
          excludePatterns,
        ),
      ).toBe(true);
      expect(
        (fileProcessor as any).shouldExcludeFile(
          "dist/bundle.js",
          excludePatterns,
        ),
      ).toBe(true);
      expect(
        (fileProcessor as any).shouldExcludeFile(".git/HEAD", excludePatterns),
      ).toBe(true);
    });
  });
});
