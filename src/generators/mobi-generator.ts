import type { Config } from "../types/config.types";
import type { GenerationResult } from "../types/output.types";
import type { ProcessedFile } from "../types/file.types";
import { logger } from "../utils/logger";
import { EPUBGenerator } from "./epub-generator";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Generator for MOBI output
 */
export class MOBIGenerator {
  private config: Config;
  private epubGenerator: EPUBGenerator;

  constructor(config: Config) {
    this.config = config;
    this.epubGenerator = new EPUBGenerator(config);
  }

  /**
   * Generate MOBI from processed files
   */
  public async generateMOBI(
    files: ProcessedFile[],
    repoInfo: { name: string; description?: string; url: string },
    outputPath: string,
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // First, generate EPUB
      const tempEpubPath = outputPath.replace(/\.mobi$/, ".temp.epub");

      logger.info("Generating intermediate EPUB file...");
      await this.epubGenerator.generateEPUB(files, repoInfo, tempEpubPath);

      // Check if Calibre's ebook-convert is available
      const hasCalibre = await this.checkCalibreAvailability();

      if (hasCalibre) {
        // Convert EPUB to MOBI using Calibre
        logger.info("Converting EPUB to MOBI using Calibre...");
        await this.convertWithCalibre(tempEpubPath, outputPath);
      } else {
        // Fallback: just rename the EPUB file
        logger.warn("Calibre not found. Using EPUB file as fallback.");
        fs.copyFileSync(tempEpubPath, outputPath);
      }

      // Clean up temporary EPUB file
      fs.unlinkSync(tempEpubPath);

      // Get file size
      const stats = fs.statSync(outputPath);

      return {
        success: true,
        outputPath,
        format: "mobi",
        fileSize: stats.size,
        generationTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error("Error generating MOBI:", error);
      throw new Error(`Failed to generate MOBI: ${(error as Error).message}`);
    }
  }

  /**
   * Check if Calibre's ebook-convert is available
   */
  private async checkCalibreAvailability(): Promise<boolean> {
    try {
      await execAsync("ebook-convert --version");
      return true;
    } catch (error) {
      logger.warn(
        "Calibre ebook-convert not found. MOBI conversion will be limited.",
      );
      return false;
    }
  }

  /**
   * Convert EPUB to MOBI using Calibre
   */
  private async convertWithCalibre(
    epubPath: string,
    mobiPath: string,
  ): Promise<void> {
    try {
      const { style } = this.config;

      // Build conversion options
      const options = [
        "--output-profile=kindle",
        "--mobi-file-type=both", // Create both MOBI6 and KF8 formats
        "--no-inline-toc", // Don't add inline ToC
        style.includeTableOfContents
          ? '--toc-title="Table of Contents"'
          : "--no-toc",
      ];

      // Execute conversion
      const command = `ebook-convert "${epubPath}" "${mobiPath}" ${options.join(" ")}`;
      await execAsync(command);

      logger.info(`MOBI file generated successfully: ${mobiPath}`);
    } catch (error) {
      logger.error("Error converting EPUB to MOBI:", error);
      throw new Error(
        `Failed to convert EPUB to MOBI: ${(error as Error).message}`,
      );
    }
  }
}
