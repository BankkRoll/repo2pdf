import type { RepoFile } from "../types/file.types";
import crypto from "crypto";
import fs from "fs";
import { logger } from "./logger";
import path from "path";

/**
 * Cache manager for repository data
 */
export class CacheManager {
  private static instance: CacheManager;
  private cacheDir: string;
  private enabled: boolean;
  private ttl: number; // Time to live in milliseconds

  private constructor() {
    this.cacheDir = path.join(process.cwd(), ".repo2pdf-cache");
    this.enabled = true;
    this.ttl = 24 * 60 * 60 * 1000; // 24 hours by default
    this.initializeCache();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Initialize cache directory
   * @throws Error if cache directory cannot be created and caching is enabled
   */
  private initializeCache(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Configure cache settings
   */
  public configure(options: {
    enabled?: boolean;
    ttl?: number;
    cacheDir?: string;
  }): void {
    if (options.enabled !== undefined) {
      this.enabled = options.enabled;
    }
    if (options.ttl !== undefined) {
      this.ttl = options.ttl;
    }
    if (options.cacheDir) {
      this.cacheDir = options.cacheDir;
      this.initializeCache();
    }
  }

  /**
   * Generate cache key from repository URL and branch
   */
  private generateCacheKey(url: string, branch: string): string {
    const hash = crypto
      .createHash("md5")
      .update(`${url}#${branch}`)
      .digest("hex");
    return hash;
  }

  /**
   * Get cache file path for a key
   */
  private getCacheFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  /**
   * Get cache metadata file path for a key
   */
  private getCacheMetaFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.meta.json`);
  }

  /**
   * Check if cache exists and is valid for a key
   */
  public isCacheValid(url: string, branch: string): boolean {
    if (!this.enabled) return false;

    const key = this.generateCacheKey(url, branch);
    const metaFilePath = this.getCacheMetaFilePath(key);

    if (!fs.existsSync(metaFilePath)) {
      return false;
    }

    const metaData = JSON.parse(fs.readFileSync(metaFilePath, "utf-8")) as {
      timestamp: number;
    };
    const now = Date.now();

    // Check if cache has expired
    if (now - metaData.timestamp > this.ttl) {
      logger.debug(`Cache expired for ${url}#${branch}`);
      return false;
    }

    return true;
  }

  /**
   * Get cached repository files
   */
  public getCachedFiles(url: string, branch: string): RepoFile[] | null {
    if (!this.enabled) return null;

    const key = this.generateCacheKey(url, branch);
    const cacheFilePath = this.getCacheFilePath(key);

    if (!this.isCacheValid(url, branch) || !fs.existsSync(cacheFilePath)) {
      return null;
    }

    const cachedData = JSON.parse(
      fs.readFileSync(cacheFilePath, "utf-8"),
    ) as Array<
      RepoFile & { content?: { _type: string; data: number[] } | null }
    >;

    // Convert Buffer data back to Buffer objects
    const files: RepoFile[] = cachedData.map((file) => {
      if (
        file.content &&
        typeof file.content === "object" &&
        "_type" in file.content &&
        file.content._type === "Buffer"
      ) {
        return { ...file, content: Buffer.from(file.content.data) };
      }
      return file as RepoFile;
    });

    logger.info(`Using cached repository data for ${url}#${branch}`);
    return files;
  }

  /**
   * Cache repository files
   */
  public cacheFiles(url: string, branch: string, files: RepoFile[]): void {
    if (!this.enabled) return;

    const key = this.generateCacheKey(url, branch);
    const cacheFilePath = this.getCacheFilePath(key);
    const metaFilePath = this.getCacheMetaFilePath(key);

    // Prepare files for serialization
    const serializedFiles = files.map((file) => {
      // Clone the file to avoid modifying the original
      const clonedFile = { ...file };

      // For binary files, we don't need to cache the content
      if (file.type === "binary") {
        clonedFile.content = null;
      }

      return clonedFile;
    });

    // Write files to cache
    fs.writeFileSync(cacheFilePath, JSON.stringify(serializedFiles));

    // Write metadata
    const metaData = {
      url,
      branch,
      timestamp: Date.now(),
      fileCount: files.length,
    };
    fs.writeFileSync(metaFilePath, JSON.stringify(metaData));

    logger.info(`Cached repository data for ${url}#${branch}`);
  }

  /**
   * Clear cache for a specific repository
   */
  public clearCache(url: string, branch: string): void {
    const key = this.generateCacheKey(url, branch);
    const cacheFilePath = this.getCacheFilePath(key);
    const metaFilePath = this.getCacheMetaFilePath(key);

    if (fs.existsSync(cacheFilePath)) {
      fs.unlinkSync(cacheFilePath);
    }

    if (fs.existsSync(metaFilePath)) {
      fs.unlinkSync(metaFilePath);
    }

    logger.info(`Cleared cache for ${url}#${branch}`);
  }

  /**
   * Clear all cache
   */
  public clearAllCache(): void {
    const files = fs.readdirSync(this.cacheDir);

    for (const file of files) {
      fs.unlinkSync(path.join(this.cacheDir, file));
    }

    logger.info("Cleared all cache");
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    enabled: boolean;
    cacheDir: string;
    ttl: number;
    cacheCount: number;
    totalSize: number;
    repositories: Array<{
      url: string;
      branch: string;
      fileCount: number;
      timestamp: number;
    }>;
  } {
    if (!fs.existsSync(this.cacheDir)) {
      return {
        enabled: this.enabled,
        cacheDir: this.cacheDir,
        ttl: this.ttl,
        cacheCount: 0,
        totalSize: 0,
        repositories: [],
      };
    }

    const files = fs.readdirSync(this.cacheDir);
    const metaFiles = files.filter((file) => file.endsWith(".meta.json"));
    const repositories: Array<{
      url: string;
      branch: string;
      fileCount: number;
      timestamp: number;
    }> = [];
    let totalSize = 0;

    for (const metaFile of metaFiles) {
      const metaFilePath = path.join(this.cacheDir, metaFile);
      const cacheFilePath = path.join(
        this.cacheDir,
        metaFile.replace(".meta.json", ".json"),
      );

      const metaData = JSON.parse(fs.readFileSync(metaFilePath, "utf-8")) as {
        url: string;
        branch: string;
        fileCount: number;
        timestamp: number;
      };

      if (fs.existsSync(cacheFilePath)) {
        const stats = fs.statSync(cacheFilePath);
        totalSize += stats.size;
      }

      repositories.push(metaData);
    }

    return {
      enabled: this.enabled,
      cacheDir: this.cacheDir,
      ttl: this.ttl,
      cacheCount: repositories.length,
      totalSize,
      repositories,
    };
  }
}
