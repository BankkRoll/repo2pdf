import fs from "fs";
import path from "path";
import { cosmiconfig } from "cosmiconfig";
import type { Config } from "../types/config.types";
import { defaultConfig } from "./default-config";
import { logger } from "../utils/logger";
import { deepMerge } from "../utils/file-utils";

/**
 * Configuration loader for repo2pdf
 */
export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: Config = defaultConfig;
  private explorer = cosmiconfig("repo2pdf");

  private constructor() {}

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Load configuration from various sources
   * Priority: CLI args > config file > environment variables > default config
   */
  public async loadConfig(cliOptions: Partial<Config> = {}): Promise<Config> {
    try {
      // Load from config file
      const result = await this.explorer.search();
      const fileConfig = (result?.config as Partial<Config>) || {};

      // Load from environment variables
      const envConfig = this.loadFromEnv();

      // Merge configs with priority
      this.config = deepMerge(
        defaultConfig,
        envConfig,
        fileConfig,
        cliOptions,
      ) as Config;

      // Validate the final config
      this.validateConfig();

      return this.config;
    } catch (error) {
      logger.error("Error loading configuration:", error);
      throw new Error(
        `Failed to load configuration: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnv(): Partial<Config> {
    const envConfig: Partial<Config> = {
      repository: {
        token: process.env.REPO2PDF_TOKEN,
        branch: process.env.REPO2PDF_BRANCH,
        useCache: process.env.REPO2PDF_USE_CACHE === "true",
      },
      processing: {
        useIncrementalProcessing:
          process.env.REPO2PDF_USE_INCREMENTAL === "true",
        incrementalChunkSize: process.env.REPO2PDF_CHUNK_SIZE
          ? Number.parseInt(process.env.REPO2PDF_CHUNK_SIZE, 10)
          : undefined,
      },
      cache: {
        enabled: process.env.REPO2PDF_CACHE_ENABLED === "true",
        ttl: process.env.REPO2PDF_CACHE_TTL
          ? Number.parseInt(process.env.REPO2PDF_CACHE_TTL, 10)
          : undefined,
      },
      debug: process.env.REPO2PDF_DEBUG === "true",
    };

    return envConfig;
  }

  /**
   * Validate the configuration
   */
  private validateConfig(): void {
    const { repository, output } = this.config;

    // Check if repository URL or local path is provided
    if (!repository.url && !repository.localPath) {
      throw new Error("Repository URL or local path must be provided");
    }

    // Validate output path
    if (!output.outputPath) {
      throw new Error("Output path must be provided");
    }

    // Ensure output directory exists
    const outputDir = path.dirname(output.outputPath);
    if (!fs.existsSync(outputDir)) {
      try {
        fs.mkdirSync(outputDir, { recursive: true });
      } catch (error) {
        throw new Error(
          `Failed to create output directory: ${(error as Error).message}`,
        );
      }
    }

    // Validate incremental processing settings
    if (this.config.processing.useIncrementalProcessing) {
      if (
        this.config.processing.incrementalChunkSize &&
        this.config.processing.incrementalChunkSize <= 0
      ) {
        logger.warn("Invalid incrementalChunkSize, using default value");
        this.config.processing.incrementalChunkSize = 100;
      }
    }

    // Validate cache settings
    if (this.config.cache.enabled) {
      if (this.config.cache.ttl && this.config.cache.ttl <= 0) {
        logger.warn("Invalid cache TTL, using default value");
        this.config.cache.ttl = 86400000; // 24 hours
      }
    }
  }

  /**
   * Get the current configuration
   */
  public getConfig(): Config {
    return this.config;
  }

  /**
   * Update the configuration
   */
  public updateConfig(partialConfig: Partial<Config>): Config {
    this.config = deepMerge(this.config, partialConfig) as Config;
    return this.config;
  }
}
