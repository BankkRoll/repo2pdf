import type { ProcessedFile, RepoFile } from "../types/file.types";
import type { Config } from "../types/config.types";
import { logger } from "../utils/logger";

/**
 * Processor for image files
 */
export class ImageProcessor {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Process an image file
   */
  public async process(file: RepoFile): Promise<ProcessedFile> {
    try {
      if (!file.content) {
        throw new Error(`Image content is empty for ${file.path}`);
      }

      // Convert image to base64 for embedding in HTML/PDF
      const base64Content = this.convertToBase64(
        file.content as Buffer,
        file.extension,
      );

      // Create metadata for the image
      const metadata = {
        width: "auto",
        height: "auto",
        alt: file.name,
        mimeType: this.getMimeType(file.extension),
      };

      return {
        ...file,
        processedContent: "",
        base64Content,
        metadata,
      };
    } catch (error) {
      logger.error(`Error processing image file ${file.path}:`, error);
      throw new Error(
        `Failed to process image file ${file.path}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Convert image buffer to base64 string
   */
  private convertToBase64(buffer: Buffer, extension: string): string {
    const mimeType = this.getMimeType(extension);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",
      bmp: "image/bmp",
      ico: "image/x-icon",
    };

    return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
  }
}
