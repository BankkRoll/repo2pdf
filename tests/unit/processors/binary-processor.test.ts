import { BinaryProcessor } from "../../../src/processors/binary-processor";
import fs from "fs";
import path from "path";

// Mock dependencies
jest.mock("fs");
jest.mock("path");

describe("BinaryProcessor", () => {
  let binaryProcessor: BinaryProcessor;
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    binaryProcessor = new BinaryProcessor(mockLogger as any);
  });

  describe("process", () => {
    it("should process binary files", async () => {
      // Mock file
      const file = {
        path: "assets/document.pdf",
        content: Buffer.from("fake binary data"),
        type: "file",
      };

      // Mock configuration
      const config = {
        output: {
          directory: "/output",
          assetsDir: "assets",
        },
      };

      // Mock fs.existsSync
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock fs.mkdirSync
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      // Mock fs.writeFileSync
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      // Mock path.join
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Mock path.dirname
      (path.dirname as jest.Mock).mockImplementation((p) =>
        p.split("/").slice(0, -1).join("/"),
      );

      // Mock path.basename
      (path.basename as jest.Mock).mockImplementation((p) =>
        p.split("/").pop(),
      );

      // Call process method
      const result = await binaryProcessor.process(file, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.processed).toBe(true);
      expect(result.type).toBe("binary");
      expect(result.outputPath).toBe("/output/assets/document.pdf");
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/output/assets/document.pdf",
        Buffer.from("fake binary data"),
      );
    });

    it("should handle errors during processing", async () => {
      // Mock file
      const file = {
        path: "assets/document.pdf",
        content: Buffer.from("fake binary data"),
        type: "file",
      };

      // Mock configuration
      const config = {
        output: {
          directory: "/output",
          assetsDir: "assets",
        },
      };

      // Mock fs.existsSync
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock fs.mkdirSync to throw an error
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {
        throw new Error("Directory creation error");
      });

      // Mock path.join
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Mock path.dirname
      (path.dirname as jest.Mock).mockImplementation((p) =>
        p.split("/").slice(0, -1).join("/"),
      );

      // Call process method
      const result = await binaryProcessor.process(file, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.processed).toBe(false);
      expect(result.error).toBe("Directory creation error");
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("isBinaryFile", () => {
    it("should detect binary files by extension", () => {
      // Test various file extensions
      expect((binaryProcessor as any).isBinaryFile("document.pdf")).toBe(true);
      expect((binaryProcessor as any).isBinaryFile("archive.zip")).toBe(true);
      expect((binaryProcessor as any).isBinaryFile("executable.exe")).toBe(
        true,
      );
      expect((binaryProcessor as any).isBinaryFile("image.png")).toBe(false); // Images handled by ImageProcessor
      expect((binaryProcessor as any).isBinaryFile("script.js")).toBe(false);
    });
  });
});
