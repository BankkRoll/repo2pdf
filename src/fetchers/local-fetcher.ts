import {
  determineFileType,
  determineLanguage,
  extractExtension,
} from "../utils/file-utils";

import type { RepoFile } from "../types/file.types";
import type { RepositoryFetcher } from "./fetcher.interface";
import type { RepositoryOptions } from "../types/config.types";
import fs from "fs";
import { logger } from "../utils/logger";
import { minimatch } from "minimatch";
import pLimit from "p-limit";
import path from "path";
import { promisify } from "util";

const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);

/**
 * Local repository fetcher
 */
export class LocalFetcher implements RepositoryFetcher {
  private basePath = "";
  private ignorePatterns: string[] = [];
  private options: RepositoryOptions;

  constructor() {
    this.options = { url: "", localPath: "" };
  }

  /**
   * Initialize the fetcher with repository options
   */
  public async initialize(options: RepositoryOptions): Promise<void> {
    this.options = options;

    if (!options.localPath) {
      throw new Error(
        "Local path must be provided for local repository fetcher",
      );
    }

    this.basePath = path.resolve(options.localPath);

    // Check if the path exists
    try {
      const stats = await statAsync(this.basePath);
      if (!stats.isDirectory()) {
        throw new Error(`Path ${this.basePath} is not a directory`);
      }
    } catch (error) {
      throw new Error(
        `Invalid local path: ${this.basePath}. ${(error as Error).message}`,
      );
    }

    // Check for .gitignore file
    try {
      const gitignorePath = path.join(this.basePath, ".gitignore");
      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = await readFileAsync(gitignorePath, "utf-8");
        this.ignorePatterns = gitignoreContent
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"))
          .map((line) => line.trim());
      }
    } catch (error) {
      logger.warn("Failed to read .gitignore file:", error);
    }

    // Check for repo2pdf.ignore file
    try {
      const repo2pdfIgnorePath = path.join(this.basePath, "repo2pdf.ignore");
      if (fs.existsSync(repo2pdfIgnorePath)) {
        const repo2pdfIgnoreContent = await readFileAsync(
          repo2pdfIgnorePath,
          "utf-8",
        );
        this.ignorePatterns = [
          ...this.ignorePatterns,
          ...repo2pdfIgnoreContent
            .split("\n")
            .filter((line) => line.trim() && !line.startsWith("#"))
            .map((line) => line.trim()),
        ];
      }
    } catch (error) {
      logger.warn("Failed to read repo2pdf.ignore file:", error);
    }
  }

  /**
   * Fetch the repository structure
   */
  public async fetchRepository(): Promise<RepoFile[]> {
    try {
      // Validate repository first
      const isValid = await this.validateRepository();
      if (!isValid) {
        throw new Error(
          `Repository path ${this.basePath} is not accessible or does not exist`,
        );
      }

      const files: RepoFile[] = [];
      await this.traverseDirectory(this.basePath, "", files);
      return files;
    } catch (error) {
      logger.error("Error fetching local repository structure:", error);
      throw new Error(
        `Failed to fetch local repository structure: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Recursively traverse a directory and collect files
   */
  private async traverseDirectory(
    dirPath: string,
    relativePath: string,
    files: RepoFile[],
  ): Promise<void> {
    const entries = await readdirAsync(dirPath);

    // Process entries in parallel with concurrency limit
    const limit = pLimit(10);
    const promises = entries.map((entry) =>
      limit(async () => {
        const entryPath = path.join(dirPath, entry);
        const entryRelativePath = relativePath
          ? path.join(relativePath, entry)
          : entry;

        // Check if the entry should be ignored
        if (this.shouldIgnore(entryRelativePath)) {
          return;
        }

        try {
          const stats = await statAsync(entryPath);

          if (stats.isDirectory()) {
            // Recursively process subdirectory
            await this.traverseDirectory(entryPath, entryRelativePath, files);
          } else {
            // Process file
            const file = await this.fetchFile(entryRelativePath);
            files.push(file);
          }
        } catch (error) {
          logger.error(`Error processing ${entryPath}:`, error);
        }
      }),
    );

    await Promise.all(promises);
  }

  /**
   * Check if a file or directory should be ignored
   */
  private shouldIgnore(filePath: string): boolean {
    // Always ignore .git directory
    if (filePath.includes(".git/") || filePath === ".git") {
      return true;
    }

    // Check against ignore patterns
    for (const pattern of this.ignorePatterns) {
      if (minimatch(filePath, pattern, { dot: true })) {
        return true;
      }
    }

    return false;
  }

  /**
   * Fetch a specific file from the repository
   */
  public async fetchFile(relativePath: string): Promise<RepoFile> {
    try {
      const filePath = path.join(this.basePath, relativePath);
      const stats = await statAsync(filePath);

      const extension = extractExtension(relativePath);
      const fileType = determineFileType(extension);
      const language = determineLanguage(extension);

      let content: string | Buffer | null = null;

      // Fetch content based on file type
      if (fileType === "code") {
        content = await readFileAsync(filePath, "utf-8");
      } else if (fileType === "image") {
        content = await readFileAsync(filePath);
      } else if (fileType === "binary") {
        // For binary files, just store metadata
        content = null;
      }

      return {
        path: relativePath,
        name: path.basename(relativePath),
        type: fileType,
        content,
        size: stats.size,
        extension,
        language,
        isDirectory: false,
        children: [],
      };
    } catch (error) {
      logger.error(`Error fetching file ${relativePath}:`, error);
      throw new Error(
        `Failed to fetch file ${relativePath}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Check if the repository exists and is accessible
   */
  public async validateRepository(): Promise<boolean> {
    try {
      const stats = await statAsync(this.basePath);
      return stats.isDirectory();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get repository metadata
   */
  public async getRepositoryInfo(): Promise<{
    name: string;
    description?: string;
    owner?: string;
    stars?: number;
    lastUpdated?: Date;
    url: string;
  }> {
    try {
      const stats = await statAsync(this.basePath);

      return {
        name: path.basename(this.basePath),
        lastUpdated: stats.mtime,
        url: `file://${this.basePath}`,
      };
    } catch (error) {
      logger.error("Error fetching repository info:", error);
      return {
        name: path.basename(this.basePath),
        url: `file://${this.basePath}`,
      };
    }
  }

  /**
   * Clean up any resources used by the fetcher
   */
  public async cleanup(): Promise<void> {
    // No cleanup needed for local fetcher
  }
}
