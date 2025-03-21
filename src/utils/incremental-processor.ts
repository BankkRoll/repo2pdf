import type { ProcessedFile, RepoFile } from "../types/file.types";

import type { Config } from "../types/config.types";
import type { FileProcessor } from "../processors/file-processor";
import crypto from "crypto";
import fs from "fs";
import { logger } from "./logger";
import path from "path";

/**
 * Incremental processor for large repositories
 */
export class IncrementalProcessor {
  private config: Config;
  private fileProcessor: FileProcessor;
  private chunkSize: number;
  private tempDir: string;
  private processedChunks: string[] = [];

  constructor(config: Config, fileProcessor: FileProcessor) {
    this.config = config;
    this.fileProcessor = fileProcessor;
    this.chunkSize = config.processing.incrementalChunkSize || 100;
    this.tempDir = path.join(process.cwd(), ".repo2pdf-temp");
    this.initializeTempDir();
  }

  /**
   * Initialize temporary directory
   */
  private initializeTempDir(): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      logger.warn(
        `Failed to initialize temporary directory: ${(error as Error).message}`,
      );
      // Fall back to in-memory processing if temp directory can't be created
      this.tempDir = "";
    }
  }

  /**
   * Process files incrementally
   */
  public async processFilesIncrementally(
    files: RepoFile[],
  ): Promise<ProcessedFile[]> {
    if (files.length <= this.chunkSize || !this.tempDir) {
      // For small repositories or if temp dir is not available, process all at once
      logger.info(`Processing ${files.length} files in a single batch`);
      return this.fileProcessor.processFiles(files);
    }

    logger.info(
      `Processing ${files.length} files incrementally with chunk size ${this.chunkSize}`,
    );

    // Split files into chunks
    const chunks: RepoFile[][] = [];
    for (let i = 0; i < files.length; i += this.chunkSize) {
      chunks.push(files.slice(i, i + this.chunkSize));
    }

    const allProcessedFiles: ProcessedFile[] = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      logger.info(
        `Processing chunk ${i + 1}/${chunks.length} (${chunk.length} files)`,
      );

      // Process the chunk
      const processedChunk = await this.processChunk(chunk, i);

      // Store the chunk reference
      const chunkId = this.saveChunk(processedChunk, i);
      this.processedChunks.push(chunkId);

      // For memory efficiency, we don't keep all processed files in memory
      // Instead, we'll load them from disk when needed
      if (i === chunks.length - 1) {
        // For the last chunk, keep it in memory for immediate use
        allProcessedFiles.push(...processedChunk);
      }
    }

    // If we have chunks saved to disk, load them all
    if (this.processedChunks.length > 1) {
      for (let i = 0; i < this.processedChunks.length - 1; i++) {
        const chunkId = this.processedChunks[i];
        const chunk = this.loadChunk(chunkId);
        allProcessedFiles.unshift(...chunk); // Add to beginning to maintain order
      }
    }

    logger.info(`Completed incremental processing of ${files.length} files`);
    return allProcessedFiles;
  }

  /**
   * Process a chunk of files
   */
  private async processChunk(
    chunk: RepoFile[],
    chunkIndex: number,
  ): Promise<ProcessedFile[]> {
    try {
      return await this.fileProcessor.processFiles(chunk);
    } catch (error) {
      logger.error(
        `Error processing chunk ${chunkIndex}: ${(error as Error).message}`,
      );
      // Return empty array for this chunk to continue processing
      return [];
    }
  }

  /**
   * Save a processed chunk to disk
   */
  private saveChunk(chunk: ProcessedFile[], chunkIndex: number): string {
    if (!this.tempDir) return "";

    try {
      // Generate a unique ID for this chunk
      const chunkId = `chunk-${chunkIndex}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
      const chunkPath = path.join(this.tempDir, `${chunkId}.json`);

      // Prepare chunk for serialization
      const serializedChunk = chunk.map((file) => {
        // Clone the file to avoid modifying the original
        const clonedFile = { ...file };

        // For binary files, we don't need to save the content
        if (file.type === "binary") {
          clonedFile.content = null;
        }

        // For images, convert Buffer to serializable format
        if (file.type === "image" && file.content instanceof Buffer) {
          clonedFile.content = {
            _type: "Buffer",
            data: Array.from(file.content),
          };
        }

        return clonedFile;
      });

      // Write chunk to disk
      fs.writeFileSync(chunkPath, JSON.stringify(serializedChunk));

      return chunkId;
    } catch (error) {
      logger.warn(
        `Failed to save chunk ${chunkIndex} to disk: ${(error as Error).message}`,
      );
      return "";
    }
  }

  /**
   * Load a processed chunk from disk
   */
  private loadChunk(chunkId: string): ProcessedFile[] {
    if (!this.tempDir || !chunkId) return [];

    try {
      const chunkPath = path.join(this.tempDir, `${chunkId}.json`);

      if (!fs.existsSync(chunkPath)) {
        logger.warn(`Chunk file not found: ${chunkPath}`);
        return [];
      }

      const serializedChunk = JSON.parse(fs.readFileSync(chunkPath, "utf-8"));

      // Convert serialized data back to proper format
      const chunk: ProcessedFile[] = serializedChunk.map((file: any) => {
        // Convert Buffer data back to Buffer objects
        if (file.content && file.content._type === "Buffer") {
          file.content = Buffer.from(file.content.data);
        }
        return file;
      });

      return chunk;
    } catch (error) {
      logger.warn(
        `Failed to load chunk ${chunkId} from disk: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Clean up temporary files
   */
  public cleanup(): void {
    if (!this.tempDir) return;

    try {
      for (const chunkId of this.processedChunks) {
        const chunkPath = path.join(this.tempDir, `${chunkId}.json`);
        if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath);
        }
      }

      // Try to remove the temp directory if it's empty
      const files = fs.readdirSync(this.tempDir);
      if (files.length === 0) {
        fs.rmdirSync(this.tempDir);
      }

      this.processedChunks = [];
    } catch (error) {
      logger.warn(
        `Error cleaning up temporary files: ${(error as Error).message}`,
      );
    }
  }
}
