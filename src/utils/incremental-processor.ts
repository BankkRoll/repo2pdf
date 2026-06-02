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
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Process files incrementally
   */
  public async processFilesIncrementally(
    files: RepoFile[],
  ): Promise<ProcessedFile[]> {
    if (files.length <= this.chunkSize) {
      // For small repositories, process all at once
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

    // For memory efficiency we don't keep every processed file in memory while
    // running; each chunk is flushed to disk and reloaded at the end. The final
    // chunk is held in memory so it can be reused without a round-trip to disk.
    let lastChunk: ProcessedFile[] = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      logger.info(
        `Processing chunk ${i + 1}/${chunks.length} (${chunk.length} files)`,
      );

      // Process the chunk
      const processedChunk = await this.processChunk(chunk);

      // Store the chunk reference
      const chunkId = this.saveChunk(processedChunk, i);
      this.processedChunks.push(chunkId);

      if (i === chunks.length - 1) {
        // Keep the last chunk in memory for immediate use.
        lastChunk = processedChunk;
      }
    }

    // Reconstruct in forward order: load earlier chunks (0..n-2) from disk and
    // append in sequence, then append the in-memory last chunk. Using push (O(n))
    // instead of unshift avoids the quadratic cost of repeated front insertions.
    const allProcessedFiles: ProcessedFile[] = [];
    for (let i = 0; i < this.processedChunks.length - 1; i++) {
      const chunk = this.loadChunk(this.processedChunks[i]);
      allProcessedFiles.push(...chunk);
    }
    allProcessedFiles.push(...lastChunk);

    logger.info(`Completed incremental processing of ${files.length} files`);
    return allProcessedFiles;
  }

  /**
   * Process a chunk of files
   */
  private async processChunk(chunk: RepoFile[]): Promise<ProcessedFile[]> {
    return this.fileProcessor.processFiles(chunk);
  }

  /**
   * Save a processed chunk to disk
   */
  private saveChunk(chunk: ProcessedFile[], chunkIndex: number): string {
    // Generate a unique ID for this chunk
    const chunkId = `chunk-${chunkIndex}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const chunkPath = path.join(this.tempDir, `${chunkId}.json`);

    // Prepare chunk for serialization
    const serializedChunk = chunk.map((file) => {
      // For binary files, we don't need to save the content
      if (file.type === "binary") {
        return { ...file, content: null };
      }

      // For images, convert Buffer to serializable format
      if (file.type === "image" && file.content instanceof Buffer) {
        return {
          ...file,
          content: {
            _type: "Buffer" as const,
            data: Array.from(file.content),
          },
        };
      }

      return file;
    });

    // Write chunk to disk
    fs.writeFileSync(chunkPath, JSON.stringify(serializedChunk));

    return chunkId;
  }

  /**
   * Load a processed chunk from disk
   */
  private loadChunk(chunkId: string): ProcessedFile[] {
    if (!chunkId) {
      throw new Error("Chunk ID is required");
    }

    const chunkPath = path.join(this.tempDir, `${chunkId}.json`);

    if (!fs.existsSync(chunkPath)) {
      throw new Error(`Chunk file not found: ${chunkPath}`);
    }

    const serializedChunk = JSON.parse(
      fs.readFileSync(chunkPath, "utf-8"),
    ) as Array<
      ProcessedFile & {
        content?: { _type: string; data: number[] } | string | null;
      }
    >;

    // Convert serialized data back to proper format
    return serializedChunk.map((file) => {
      // Convert Buffer data back to Buffer objects
      if (
        file.content &&
        typeof file.content === "object" &&
        "_type" in file.content &&
        file.content._type === "Buffer"
      ) {
        return {
          ...file,
          content: Buffer.from(file.content.data),
        } as ProcessedFile;
      }
      return file as ProcessedFile;
    });
  }

  /**
   * Clean up temporary files
   */
  public cleanup(): void {
    for (const chunkId of this.processedChunks) {
      const chunkPath = path.join(this.tempDir, `${chunkId}.json`);
      if (fs.existsSync(chunkPath)) {
        fs.unlinkSync(chunkPath);
      }
    }

    // Try to remove the temp directory if it's empty
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      if (files.length === 0) {
        fs.rmdirSync(this.tempDir);
      }
    }

    this.processedChunks = [];
  }
}
