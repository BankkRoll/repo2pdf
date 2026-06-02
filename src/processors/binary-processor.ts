import type { ProcessedFile, RepoFile } from "../types/file.types";
import type { Config } from "../types/config.types";
import { logger } from "../utils/logger";
import { formatFileSize } from "../utils/file-utils";

/**
 * Processor for binary files
 */
export class BinaryProcessor {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Process a binary file
   */
  public async process(file: RepoFile): Promise<ProcessedFile> {
    try {
      // Create metadata for the binary file
      const metadata = {
        size: formatFileSize(file.size),
        type: this.getBinaryType(file.extension),
      };

      // For binary files, we just store metadata
      return {
        ...file,
        processedContent: `Binary file: ${file.path} (${metadata.size})`,
        metadata,
      };
    } catch (error) {
      logger.error(`Error processing binary file ${file.path}:`, error);
      throw new Error(
        `Failed to process binary file ${file.path}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get binary file type from extension
   */
  private getBinaryType(extension: string): string {
    const binaryTypes: Record<string, string> = {
      pdf: "PDF Document",
      doc: "Word Document",
      docx: "Word Document",
      xls: "Excel Spreadsheet",
      xlsx: "Excel Spreadsheet",
      ppt: "PowerPoint Presentation",
      pptx: "PowerPoint Presentation",
      zip: "ZIP Archive",
      rar: "RAR Archive",
      tar: "TAR Archive",
      gz: "GZip Archive",
      exe: "Executable",
      dll: "Dynamic Link Library",
      so: "Shared Object",
      bin: "Binary File",
      dat: "Data File",
    };

    return binaryTypes[extension.toLowerCase()] || "Binary File";
  }
}
