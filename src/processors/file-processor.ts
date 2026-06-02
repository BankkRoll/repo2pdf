import type { ProcessedFile, RepoFile } from "../types/file.types";
import type { Config } from "../types/config.types";
import { logger } from "../utils/logger";
import { CodeProcessor } from "./code-processor";
import { ImageProcessor } from "./image-processor";
import { BinaryProcessor } from "./binary-processor";
import { organizeFilesByDirectory } from "../utils/file-utils";
import { HookPoint } from "../plugins/plugin-manager";
import { noopPluginRunner, type PluginRunner } from "../plugins/plugin-runner";
import pLimit from "p-limit";
import { minimatch } from "minimatch";

/**
 * Base file processor that delegates to specific processors based on file type.
 */
export class FileProcessor {
  private codeProcessor: CodeProcessor;
  private imageProcessor: ImageProcessor;
  private binaryProcessor: BinaryProcessor;
  private config: Config;
  private plugins: PluginRunner;

  constructor(config: Config, plugins: PluginRunner = noopPluginRunner) {
    this.config = config;
    this.plugins = plugins;
    this.codeProcessor = new CodeProcessor(config, plugins);
    this.imageProcessor = new ImageProcessor();
    this.binaryProcessor = new BinaryProcessor(config);
  }

  /**
   * Process a list of files in parallel (bounded by maxConcurrency).
   */
  public async processFiles(files: RepoFile[]): Promise<ProcessedFile[]> {
    const { processing } = this.config;
    const limit = pLimit(processing.maxConcurrency);

    // Filter files based on ignore patterns + plugin FILTER_FILE hooks.
    const filteredFiles = await this.filterFiles(files);

    const processPromises = filteredFiles.map((file) =>
      limit(async () => {
        try {
          return await this.processFile(file);
        } catch (error) {
          logger.error(`Error processing file ${file.path}:`, error);
          // Return a minimal processed file on error so one bad file doesn't
          // abort the whole run.
          const fallback: ProcessedFile = {
            ...file,
            processedContent: `Error processing file: ${(error as Error).message}`,
          };
          return fallback;
        }
      }),
    );

    return Promise.all(processPromises);
  }

  /**
   * Apply ignore rules and the FILTER_FILE plugin hook to a file list.
   */
  private async filterFiles(files: RepoFile[]): Promise<RepoFile[]> {
    const hasFilterHook = this.plugins.hasHookHandlers(HookPoint.FILTER_FILE);
    const result: RepoFile[] = [];

    for (const file of files) {
      if (this.shouldIgnore(file)) {
        continue;
      }
      if (hasFilterHook) {
        const include = await this.plugins.executeHook(
          HookPoint.FILTER_FILE,
          file,
          this.config,
        );
        // The hook chains the file as the first arg; a boolean result means
        // "should include". Anything non-false keeps the file.
        if (include === false) {
          continue;
        }
      }
      result.push(file);
    }

    return result;
  }

  /**
   * Process a single file based on its type.
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
   * Determine whether a file should be excluded based on hidden-file rules,
   * binary inclusion, and ignore glob patterns.
   */
  private shouldIgnore(file: RepoFile): boolean {
    const { ignorePatterns, includeHiddenFiles, includeBinaryFiles } =
      this.config.processing;
    const filePath = file.path;

    // Hidden files (dotfiles anywhere in the path).
    if (
      !includeHiddenFiles &&
      (filePath.startsWith(".") || filePath.includes("/."))
    ) {
      return true;
    }

    // Binary/image/unknown files are excluded unless explicitly included.
    if (!includeBinaryFiles && file.type !== "code") {
      return true;
    }

    // Ignore glob patterns.
    if (ignorePatterns) {
      for (const pattern of ignorePatterns) {
        if (minimatch(filePath, pattern, { dot: true })) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Organize processed files into a directory-keyed structure.
   */
  public organizeFilesByDirectory(
    files: ProcessedFile[],
  ): Record<string, ProcessedFile[]> {
    return organizeFilesByDirectory(files);
  }
}
