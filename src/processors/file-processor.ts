import type { ProcessedFile, RepoFile } from "../types/file.types";
import type { Config } from "../types/config.types";
import { logger } from "../utils/logger";
import { CodeProcessor } from "./code-processor";
import { ImageProcessor } from "./image-processor";
import { BinaryProcessor } from "./binary-processor";
import pLimit from "p-limit";
import { minimatch } from "minimatch";

/**
 * Base file processor that delegates to specific processors based on file type
 */
export class FileProcessor {
  private codeProcessor: CodeProcessor;
  private imageProcessor: ImageProcessor;
  private binaryProcessor: BinaryProcessor;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.codeProcessor = new CodeProcessor(config);
    this.imageProcessor = new ImageProcessor(config);
    this.binaryProcessor = new BinaryProcessor(config);
  }

  /**
   * Process a list of files in parallel
   */
  public async processFiles(files: RepoFile[]): Promise<ProcessedFile[]> {
    const { processing } = this.config;
    const limit = pLimit(processing.maxConcurrency);

    // Filter files based on ignore patterns
    const filteredFiles = files.filter((file) => !this.shouldIgnore(file.path));

    // Process files in parallel with concurrency limit
    const processPromises = filteredFiles.map((file) =>
      limit(async () => {
        try {
          return await this.processFile(file);
        } catch (error) {
          logger.error(`Error processing file ${file.path}:`, error);
          // Return a minimal processed file on error
          return {
            ...file,
            processedContent: `Error processing file: ${(error as Error).message}`,
          } as ProcessedFile;
        }
      }),
    );

    const processedFiles = await Promise.all(processPromises);
    return processedFiles;
  }

  /**
   * Process a single file based on its type
   */
  public async processFile(file: RepoFile): Promise<ProcessedFile> {
    switch (file.type) {
      case "code":
        return this.codeProcessor.process(file);
      case "image":
        return this.imageProcessor.process(file);
      case "binary":
      case "unknown":
        return this.binaryProcessor.process(file);
      default:
        throw new Error(`Unknown file type: ${file.type}`);
    }
  }

  /**
   * Check if a file should be ignored based on ignore patterns
   */
  private shouldIgnore(filePath: string): boolean {
    const { ignorePatterns, includeHiddenFiles } = this.config.processing;

    // Check for hidden files (starting with .)
    if (
      !includeHiddenFiles &&
      (filePath.startsWith(".") || filePath.includes("/."))
    ) {
      return true;
    }

    // Check against ignore patterns
    for (const pattern of ignorePatterns) {
      if (minimatch(filePath, pattern, { dot: true })) {
        return true;
      }
    }

    return false;
  }

  /**
   * Organize processed files into a directory structure
   */
  public organizeFilesByDirectory(
    files: ProcessedFile[],
  ): Record<string, ProcessedFile[]> {
    const directories: Record<string, ProcessedFile[]> = {};

    for (const file of files) {
      const dirPath = file.path.includes("/")
        ? file.path.substring(0, file.path.lastIndexOf("/"))
        : "";

      if (!directories[dirPath]) {
        directories[dirPath] = [];
      }

      directories[dirPath].push(file);
    }

    return directories;
  }
}
