import { BitbucketFetcher } from "./fetchers/bitbucket-fetcher";
import { CacheManager } from "./utils/cache-manager";
import type { Config } from "./types/config.types";
import { ConfigLoader } from "./config/config-loader";
import { EPUBGenerator } from "./generators/epub-generator";
import { ErrorHandler } from "./utils/error-handler";
import { FileProcessor } from "./processors/file-processor";
import type { GenerationResult } from "./types/output.types";
import { GitHubFetcher } from "./fetchers/github-fetcher";
import { GitLabFetcher } from "./fetchers/gitlab-fetcher";
import { HTMLGenerator } from "./generators/html-generator";
import { IncrementalProcessor } from "./utils/incremental-processor";
import { LocalFetcher } from "./fetchers/local-fetcher";
import { MOBIGenerator } from "./generators/mobi-generator";
import { PDFGenerator } from "./generators/pdf-generator";
import type { RepositoryFetcher } from "./fetchers/fetcher.interface";
import fs from "fs";
import { logger } from "./utils/logger";
import path from "path";

/**
 * Main class for repo2pdf
 */
export class Repo2PDF {
  private config: Config;
  private fetcher: RepositoryFetcher | null = null;
  private cacheManager: CacheManager;

  constructor(config: Config) {
    this.config = config;
    this.cacheManager = CacheManager.getInstance();
    this.cacheManager.configure({
      enabled: config.cache.enabled,
      ttl: config.cache.ttl,
      cacheDir: config.cache.cacheDir,
    });
    logger.setDebugMode(config.debug);
  }

  /**
   * Convert repository to the specified format
   */
  public async convert(): Promise<GenerationResult> {
    try {
      // Initialize fetcher
      this.fetcher = this.createFetcher();
      await this.fetcher.initialize(this.config.repository);

      // Check cache first if enabled
      let files = null;
      if (this.config.repository.useCache && this.config.cache.enabled) {
        files = this.cacheManager.getCachedFiles(
          this.config.repository.url,
          this.config.repository.branch || "main",
        );
      }

      // Fetch repository if not in cache
      if (!files) {
        logger.info("Fetching repository...");
        files = await this.fetcher.fetchRepository();
        logger.info(`Fetched ${files.length} files`);

        // Cache the fetched files if caching is enabled
        if (this.config.repository.useCache && this.config.cache.enabled) {
          this.cacheManager.cacheFiles(
            this.config.repository.url,
            this.config.repository.branch || "main",
            files,
          );
        }
      }

      // Get repository info
      const repoInfo = await this.fetcher.getRepositoryInfo();

      // Process files
      logger.info("Processing files...");
      const fileProcessor = new FileProcessor(this.config);

      let processedFiles;
      if (
        this.config.processing.useIncrementalProcessing &&
        files.length > 100
      ) {
        // Use incremental processing for large repositories
        const incrementalProcessor = new IncrementalProcessor(
          this.config,
          fileProcessor,
        );
        processedFiles =
          await incrementalProcessor.processFilesIncrementally(files);
        incrementalProcessor.cleanup();
      } else {
        // Process all files at once for smaller repositories
        processedFiles = await fileProcessor.processFiles(files);
      }

      logger.info(`Processed ${processedFiles.length} files`);

      // Generate HTML
      logger.info("Generating HTML...");
      const htmlGenerator = new HTMLGenerator(this.config);
      const htmlContent = await htmlGenerator.generateHTML(
        processedFiles,
        repoInfo,
      );

      // Generate output based on format
      const { format, outputPath } = this.config.output;

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      let result: GenerationResult;

      switch (format) {
        case "pdf":
          logger.info("Generating PDF...");
          const pdfGenerator = new PDFGenerator(this.config);
          result = await pdfGenerator.generatePDF(htmlContent, outputPath);
          await pdfGenerator.cleanup();
          break;

        case "html":
          logger.info("Saving HTML...");
          fs.writeFileSync(outputPath, htmlContent);
          result = {
            success: true,
            outputPath,
            format: "html",
            fileSize: fs.statSync(outputPath).size,
            generationTime: 0,
          };
          break;

        case "epub":
          logger.info("Generating EPUB...");
          const epubGenerator = new EPUBGenerator(this.config);
          result = await epubGenerator.generateEPUB(
            processedFiles,
            repoInfo,
            outputPath,
          );
          break;

        case "mobi":
          logger.info("Generating MOBI...");
          const mobiGenerator = new MOBIGenerator(this.config);
          result = await mobiGenerator.generateMOBI(
            processedFiles,
            repoInfo,
            outputPath,
          );
          break;

        default:
          throw ErrorHandler.configurationError(
            `Unsupported output format: ${format}`,
          );
      }

      // Clean up
      await this.cleanup();

      return result;
    } catch (error) {
      // Clean up on error
      await this.cleanup();

      logger.error("Error converting repository:", error);
      throw error;
    }
  }

  /**
   * Create a repository fetcher based on VCS type
   */
  private createFetcher(): RepositoryFetcher {
    const { vcsType } = this.config.repository;

    switch (vcsType) {
      case "github":
        return new GitHubFetcher();
      case "gitlab":
        return new GitLabFetcher();
      case "bitbucket":
        return new BitbucketFetcher();
      case "local":
        return new LocalFetcher();
      default:
        throw ErrorHandler.configurationError(
          `Unsupported VCS type: ${vcsType}`,
        );
    }
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    if (this.fetcher) {
      await this.fetcher.cleanup();
    }
  }
}

// Export types
export * from "./types/config.types";
export * from "./types/file.types";
export * from "./types/output.types";

// Export utilities
export { logger } from "./utils/logger";
export { ErrorHandler } from "./utils/error-handler";
export { CacheManager } from "./utils/cache-manager";

// Export main function for programmatic usage
export async function convertRepository(
  config: Partial<Config>,
): Promise<GenerationResult> {
  try {
    // Load configuration
    const configLoader = ConfigLoader.getInstance();
    const fullConfig = await configLoader.loadConfig(config);

    // Create repo2pdf instance
    const repo2pdf = new Repo2PDF(fullConfig);

    // Convert repository
    return await repo2pdf.convert();
  } catch (error) {
    logger.error("Error converting repository:", error);
    throw error;
  }
}
