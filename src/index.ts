import { BitbucketFetcher } from "./fetchers/bitbucket-fetcher";
import { CacheManager } from "./utils/cache-manager";
import type { Config } from "./types/config.types";
import { ConfigLoader } from "./config/config-loader";
import { ErrorHandler } from "./utils/error-handler";
import { FileProcessor } from "./processors/file-processor";
import type { GenerationResult } from "./types/output.types";
import type { ProcessedFile, RepoFile } from "./types/file.types";
import { GitHubFetcher } from "./fetchers/github-fetcher";
import { GitLabFetcher } from "./fetchers/gitlab-fetcher";
import { IncrementalProcessor } from "./utils/incremental-processor";
import { LocalFetcher } from "./fetchers/local-fetcher";
import { PDFGenerator } from "./generators/pdf-generator";
import type { RepositoryFetcher } from "./fetchers/fetcher.interface";
import { HookPoint, PluginManager } from "./plugins/plugin-manager";
import { PluginLoader } from "./plugins/plugin-loader";
import { noopPluginRunner, type PluginRunner } from "./plugins/plugin-runner";
import { disposeHighlighters } from "./utils/shiki-manager";
import { Logger, logger } from "./utils/logger";
import fs from "fs";
import path from "path";

/** A repository metadata shape returned by fetchers. */
type RepositoryInfo = {
  name: string;
  description?: string;
  url: string;
};

/** Progress phases reported during conversion. */
export type ConvertPhase = "fetch" | "process" | "generate";

/** Options that can be passed to {@link Repo2PDF.convert}. */
export interface ConvertOptions {
  /** Called when the pipeline enters a new phase (for progress UIs). */
  onPhase?: (phase: ConvertPhase, message: string) => void;
}

/**
 * Main orchestrator for repo2pdf: fetch -> process -> generate, with plugin
 * hooks fired at every stage.
 */
export class Repo2PDF {
  private config: Config;
  private fetcher: RepositoryFetcher | null = null;
  private cacheManager: CacheManager;
  private plugins: PluginRunner = noopPluginRunner;

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
   * Convert the configured repository to a PDF file on disk.
   *
   * @returns The generation result (output path, size, timing).
   */
  public async convert(
    options: ConvertOptions = {},
  ): Promise<GenerationResult> {
    try {
      const { processedFiles, repoInfo } = await this.runPipeline(options);
      const onPhase = options.onPhase ?? (() => {});
      onPhase("generate", "Generating PDF...");
      const result = await this.generate(processedFiles, repoInfo);
      await this.cleanup();
      return result;
    } catch (error) {
      await this.cleanup();
      logger.debug("Error converting repository:", error);
      throw error;
    }
  }

  /**
   * Convert the configured repository and return the PDF as bytes, without
   * writing to disk.
   *
   * @remarks
   * Use this in serverless/edge/HTTP contexts where you want to stream the PDF
   * in a response rather than write a file. The fetch/process steps still use
   * whatever fetcher the config selects (the `local` fetcher needs `fs`); to run
   * the renderer alone on a runtime without `fs`, fetch files yourself and call
   * {@link PDFGenerator.generateToBytes} or `PdfLibRenderer.render` directly.
   *
   * @returns The rendered PDF as a `Uint8Array`.
   */
  public async convertToBytes(
    options: ConvertOptions = {},
  ): Promise<Uint8Array> {
    try {
      const { processedFiles, repoInfo } = await this.runPipeline(options);
      const onPhase = options.onPhase ?? (() => {});
      onPhase("generate", "Generating PDF...");

      if (this.plugins.hasHookHandlers(HookPoint.CUSTOM_GENERATOR)) {
        const custom = (await this.plugins.executeHook(
          HookPoint.CUSTOM_GENERATOR,
          processedFiles,
          this.config,
        )) as GenerationResult;
        // A custom generator writes its own output; read it back as bytes.
        return new Uint8Array(fs.readFileSync(custom.outputPath));
      }

      const pdfGenerator = new PDFGenerator(this.config, {
        plugins: this.plugins,
      });
      const bytes = await pdfGenerator.generateToBytes(
        processedFiles,
        repoInfo,
      );
      await this.cleanup();
      return bytes;
    } catch (error) {
      await this.cleanup();
      logger.debug("Error converting repository:", error);
      throw error;
    }
  }

  /**
   * Run the fetch → process pipeline (everything up to, but not including,
   * generation), firing all lifecycle plugin hooks along the way.
   */
  private async runPipeline(
    options: ConvertOptions,
  ): Promise<{ processedFiles: ProcessedFile[]; repoInfo: RepositoryInfo }> {
    const onPhase = options.onPhase ?? (() => {});

    // Initialize the plugin system (no-op runner if disabled).
    this.plugins = await this.initializePlugins();

    // PRE_FETCH: plugins may modify config before anything happens.
    this.config =
      ((await this.plugins.executeHook(
        HookPoint.PRE_FETCH,
        this.config,
      )) as Config) ?? this.config;

    // ---- Fetch ----
    onPhase("fetch", "Fetching repository...");
    let files = await this.fetchFiles();

    // POST_FETCH: plugins may add/remove/modify fetched files.
    files =
      ((await this.plugins.executeHook(
        HookPoint.POST_FETCH,
        files,
        this.config,
      )) as RepoFile[]) ?? files;

    const repoInfo = await this.getRepositoryInfo();

    // PRE_PROCESS: last chance to modify the file list before processing.
    files =
      ((await this.plugins.executeHook(
        HookPoint.PRE_PROCESS,
        files,
        this.config,
      )) as RepoFile[]) ?? files;

    // ---- Process ----
    onPhase("process", "Processing files...");
    let processedFiles = await this.processFiles(files);
    logger.info(`Processed ${processedFiles.length} files`);

    // POST_PROCESS / PRE_GENERATE hooks.
    processedFiles =
      ((await this.plugins.executeHook(
        HookPoint.POST_PROCESS,
        processedFiles,
        this.config,
      )) as ProcessedFile[]) ?? processedFiles;
    processedFiles =
      ((await this.plugins.executeHook(
        HookPoint.PRE_GENERATE,
        processedFiles,
        this.config,
      )) as ProcessedFile[]) ?? processedFiles;

    return { processedFiles, repoInfo };
  }

  /**
   * Fetch repository files, honoring the cache and any CUSTOM_FETCHER plugin.
   */
  private async fetchFiles(): Promise<RepoFile[]> {
    // CUSTOM_FETCHER replaces the built-in fetcher entirely.
    if (this.plugins.hasHookHandlers(HookPoint.CUSTOM_FETCHER)) {
      logger.info("Using custom fetcher from plugin...");
      const custom = (await this.plugins.executeHook(
        HookPoint.CUSTOM_FETCHER,
        this.config,
      )) as RepoFile[];
      return custom ?? [];
    }

    this.fetcher = this.createFetcher();
    await this.fetcher.initialize(this.config.repository);

    const branch = this.config.repository.branch || "main";

    // Check cache first if enabled.
    if (this.config.repository.useCache && this.config.cache.enabled) {
      const cached = this.cacheManager.getCachedFiles(
        this.config.repository.url,
        branch,
      );
      if (cached) {
        logger.info(`Loaded ${cached.length} files from cache`);
        return cached;
      }
    }

    logger.info("Fetching repository...");
    const files = await this.fetcher.fetchRepository();
    logger.info(`Fetched ${files.length} files`);

    if (this.config.repository.useCache && this.config.cache.enabled) {
      this.cacheManager.cacheFiles(this.config.repository.url, branch, files);
    }

    return files;
  }

  /**
   * Process files, honoring any CUSTOM_PROCESSOR plugin and the
   * incremental-vs-parallel selection for large repos.
   */
  private async processFiles(files: RepoFile[]): Promise<ProcessedFile[]> {
    if (this.plugins.hasHookHandlers(HookPoint.CUSTOM_PROCESSOR)) {
      logger.info("Using custom processor from plugin...");
      const custom = (await this.plugins.executeHook(
        HookPoint.CUSTOM_PROCESSOR,
        files,
        this.config,
      )) as ProcessedFile[];
      return custom ?? [];
    }

    const fileProcessor = new FileProcessor(this.config, this.plugins);

    if (this.config.processing.useIncrementalProcessing && files.length > 100) {
      const incrementalProcessor = new IncrementalProcessor(
        this.config,
        fileProcessor,
      );
      const processed =
        await incrementalProcessor.processFilesIncrementally(files);
      incrementalProcessor.cleanup();
      return processed;
    }

    return fileProcessor.processFiles(files);
  }

  /**
   * Generate output, honoring any CUSTOM_GENERATOR plugin.
   */
  private async generate(
    processedFiles: ProcessedFile[],
    repoInfo: RepositoryInfo,
  ): Promise<GenerationResult> {
    const outputPath = this.config.output.outputPath;
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (this.plugins.hasHookHandlers(HookPoint.CUSTOM_GENERATOR)) {
      logger.info("Using custom generator from plugin...");
      const custom = (await this.plugins.executeHook(
        HookPoint.CUSTOM_GENERATOR,
        processedFiles,
        this.config,
      )) as GenerationResult;
      return custom;
    }

    const pdfGenerator = new PDFGenerator(this.config, {
      plugins: this.plugins,
    });
    const result = await pdfGenerator.generatePDF(
      processedFiles,
      repoInfo,
      outputPath,
    );
    await pdfGenerator.cleanup();
    return result;
  }

  /**
   * Get repository info from the active fetcher (or a minimal default when a
   * custom fetcher replaced the built-in one).
   */
  private async getRepositoryInfo(): Promise<RepositoryInfo> {
    if (this.fetcher) {
      return this.fetcher.getRepositoryInfo();
    }
    return {
      name:
        this.config.repository.url.split("/").pop() ||
        path.basename(this.config.repository.localPath || "repository"),
      url: this.config.repository.url,
    };
  }

  /**
   * Initialize the plugin manager from config, or return the no-op runner when
   * plugins are disabled.
   */
  private async initializePlugins(): Promise<PluginRunner> {
    const pluginConfig = this.config.plugins;
    if (pluginConfig?.enabled === false) {
      return noopPluginRunner;
    }
    try {
      const loader = new PluginLoader(new Logger());
      const manager: PluginManager = await loader.initialize({
        pluginDirectories: pluginConfig?.directories,
        disabledPlugins: pluginConfig?.disabled,
      });
      return manager;
    } catch (error) {
      logger.warn("Failed to initialize plugin system:", error);
      return noopPluginRunner;
    }
  }

  /**
   * Create a repository fetcher based on the configured VCS type.
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
   * Clean up resources (fetcher + shared Shiki highlighter).
   */
  private async cleanup(): Promise<void> {
    if (this.fetcher) {
      await this.fetcher.cleanup();
    }
    await disposeHighlighters();
  }
}

// Export types
export * from "./types/config.types";
export * from "./types/file.types";
export * from "./types/output.types";

// Export plugin system
export { HookPoint, PluginManager } from "./plugins/plugin-manager";
export type { PluginMetadata, Plugin } from "./plugins/plugin-manager";
export { PluginLoader } from "./plugins/plugin-loader";
export type { PluginLoaderOptions } from "./plugins/plugin-loader";
export type { PluginRunner } from "./plugins/plugin-runner";
export type {
  IRepo2PDFPlugin,
  GenerationOutput,
} from "./plugins/plugin.interface";

// Export utilities
export { logger } from "./utils/logger";
export { ErrorHandler } from "./utils/error-handler";
export { CacheManager } from "./utils/cache-manager";

// Export the rendering layer so it can be used standalone (e.g. on edge/serverless
// runtimes: fetch files yourself, then render to bytes with no filesystem access).
export { PDFGenerator } from "./generators/pdf-generator";
export type { PdfGeneratorOptions } from "./generators/pdf-generator";
export { PdfLibRenderer } from "./renderers/pdf-lib-renderer";
export type {
  PdfRenderer,
  RenderRepoInfo,
} from "./renderers/renderer.interface";
export type {
  Tokenizer,
  TokenizedLine,
  SyntaxToken,
} from "./renderers/tokenizer.interface";
export {
  resolveTokenizer,
  PlainTokenizer,
  ShikiTokenizer,
} from "./renderers/tokenizers";

/**
 * Convert a repository to a PDF file on disk (programmatic API).
 *
 * @param config - Partial configuration; merged over defaults.
 * @returns The generation result (output path, size, timing).
 */
export async function convertRepository(
  config: Partial<Config>,
): Promise<GenerationResult> {
  try {
    const configLoader = ConfigLoader.getInstance();
    const fullConfig = await configLoader.loadConfig(config);
    const repo2pdf = new Repo2PDF(fullConfig);
    return await repo2pdf.convert();
  } catch (error) {
    logger.debug("Error converting repository:", error);
    throw error;
  }
}

/**
 * Convert a repository and return the PDF as bytes, without writing to disk.
 *
 * @remarks
 * Ideal for serverless / HTTP handlers — return the bytes directly in the
 * response. The fetch step still uses the configured fetcher.
 *
 * @param config - Partial configuration; merged over defaults.
 * @returns The rendered PDF as a `Uint8Array`.
 */
export async function convertRepositoryToBytes(
  config: Partial<Config>,
): Promise<Uint8Array> {
  try {
    const configLoader = ConfigLoader.getInstance();
    const fullConfig = await configLoader.loadConfig(config);
    const repo2pdf = new Repo2PDF(fullConfig);
    return await repo2pdf.convertToBytes();
  } catch (error) {
    logger.debug("Error converting repository:", error);
    throw error;
  }
}
