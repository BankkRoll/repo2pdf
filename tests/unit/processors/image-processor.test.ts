import { ImageProcessor } from "../../../src/processors/image-processor";
import fs from "fs";
import sharp from "sharp";

// Mock dependencies
jest.mock("sharp");
jest.mock("fs");

describe("ImageProcessor", () => {
  let imageProcessor: ImageProcessor;
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    imageProcessor = new ImageProcessor(mockLogger as any);
  });

  describe("process", () => {
    it("should process image files", async () => {
      // Mock file
      const file = {
        path: "images/logo.png",
        content: Buffer.from("fake image data"),
        type: "file",
      };

      // Mock configuration
      const config = {
        images: {
          optimize: true,
          maxWidth: 800,
          maxHeight: 600,
          quality: 80,
        },
      };

      // Mock sharp functions
      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue({
          width: 1200,
          height: 900,
          format: "png",
        }),
        resize: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toBuffer: jest
          .fn()
          .mockResolvedValue(Buffer.from("optimized image data")),
      };

      (sharp as jest.Mock).mockReturnValue(mockSharpInstance);

      // Call process method
      const result = await imageProcessor.process(file, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.processed).toBe(true);
      expect(result.type).toBe("image");
      expect(result.format).toBe("png");
      expect(result.width).toBe(1200);
      expect(result.height).toBe(900);
      expect(result.optimizedContent).toEqual(
        Buffer.from("optimized image data"),
      );
      expect(sharp).toHaveBeenCalledWith(Buffer.from("fake image data"));
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(800, 600, {
        fit: "inside",
      });
    });

    it("should skip image optimization when disabled", async () => {
      // Mock file
      const file = {
        path: "images/logo.png",
        content: Buffer.from("fake image data"),
        type: "file",
      };

      // Mock configuration with optimization disabled
      const config = {
        images: {
          optimize: false,
        },
      };

      // Mock sharp metadata function
      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue({
          width: 1200,
          height: 900,
          format: "png",
        }),
      };

      (sharp as jest.Mock).mockReturnValue(mockSharpInstance);

      // Call process method
      const result = await imageProcessor.process(file, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.processed).toBe(true);
      expect(result.type).toBe("image");
      expect(result.format).toBe("png");
      expect(result.optimizedContent).toBeUndefined();
      expect(mockSharpInstance.metadata).toHaveBeenCalled();
    });

    it("should handle errors during processing", async () => {
      // Mock file
      const file = {
        path: "images/logo.png",
        content: Buffer.from("fake image data"),
        type: "file",
      };

      // Mock configuration
      const config = {
        images: {
          optimize: true,
        },
      };

      // Mock sharp to throw an error
      (sharp as jest.Mock).mockImplementation(() => {
        throw new Error("Image processing error");
      });

      // Call process method
      const result = await imageProcessor.process(file, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.processed).toBe(false);
      expect(result.error).toBe("Image processing error");
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("isImageFile", () => {
    it("should detect image files by extension", () => {
      // Test various file extensions
      expect((imageProcessor as any).isImageFile("image.png")).toBe(true);
      expect((imageProcessor as any).isImageFile("image.jpg")).toBe(true);
      expect((imageProcessor as any).isImageFile("image.jpeg")).toBe(true);
      expect((imageProcessor as any).isImageFile("image.gif")).toBe(true);
      expect((imageProcessor as any).isImageFile("image.svg")).toBe(true);
      expect((imageProcessor as any).isImageFile("document.pdf")).toBe(false);
      expect((imageProcessor as any).isImageFile("script.js")).toBe(false);
    });
  });
});
