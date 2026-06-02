/**
 * File Filter Plugin for repo2pdf
 *
 * @description
 * This example plugin demonstrates how to use the `FILTER_FILE` hook
 * to selectively include or exclude files from the generated PDF.
 * It supports configuration via environment variables and JSON config files.
 *
 * @example
 * To use this plugin:
 * 1. Copy this directory to your project's `plugins/` folder
 * 2. Optionally create a `repo2pdf-filter.json` config file
 * 3. Or set environment variables (see FilterConfig)
 * 4. The plugin will be automatically loaded by repo2pdf
 *
 * @packageDocumentation
 */

import type { Config, IRepo2PDFPlugin, RepoFile } from "repo2pdf";

import { HookPoint } from "repo2pdf";
import fs from "fs";
import path from "path";

/**
 * Filter configuration options.
 * All options are optional and combine additively.
 */
export interface FilterConfig {
  /**
   * File extensions to include (e.g., [".ts", ".js"]).
   * If specified, only files with these extensions are included.
   */
  includeExtensions?: string[];

  /**
   * File extensions to exclude (e.g., [".test.ts", ".spec.js"]).
   * Files with these extensions are always excluded.
   */
  excludeExtensions?: string[];

  /**
   * Glob-like patterns for paths to include.
   * Supports wildcards: * (any chars), ** (any path segment).
   * Example: ["src/**", "lib/**"]
   */
  includePatterns?: string[];

  /**
   * Glob-like patterns for paths to exclude.
   * Example: ["**\/__tests__/**", "**\/node_modules/**"]
   */
  excludePatterns?: string[];

  /**
   * Maximum file size in bytes.
   * Files larger than this are excluded.
   */
  maxFileSize?: number;

  /**
   * Minimum file size in bytes.
   * Files smaller than this are excluded (useful for filtering empty files).
   */
  minFileSize?: number;

  /**
   * Exclude files matching common test file patterns.
   * Patterns: *.test.*, *.spec.*, __tests__, __mocks__
   */
  excludeTests?: boolean;

  /**
   * Exclude common generated/build files.
   * Patterns: dist, build, .next, coverage, *.min.js, *.bundle.js
   */
  excludeGenerated?: boolean;

  /**
   * Exclude lock files (package-lock.json, yarn.lock, pnpm-lock.yaml, etc.)
   */
  excludeLockFiles?: boolean;

  /**
   * Exclude hidden files and directories (starting with .)
   */
  excludeHidden?: boolean;
}

/**
 * Default filter configuration.
 * Provides sensible defaults for most codebases.
 */
const DEFAULT_CONFIG: FilterConfig = {
  excludeTests: false,
  excludeGenerated: true,
  excludeLockFiles: true,
  excludeHidden: false,
  maxFileSize: 1024 * 1024, // 1MB default max
  minFileSize: 0,
};

/**
 * Common test file patterns.
 */
const TEST_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /__mocks__\//,
  /\.stories\.[jt]sx?$/,
  /\.cy\.[jt]sx?$/, // Cypress
  /\.e2e\.[jt]sx?$/, // E2E tests
];

/**
 * Common generated/build file patterns.
 */
const GENERATED_PATTERNS = [
  /^dist\//,
  /^build\//,
  /^\.next\//,
  /^\.nuxt\//,
  /^\.output\//,
  /^coverage\//,
  /^\.cache\//,
  /\.min\.[jc]ss?$/,
  /\.bundle\.[jt]sx?$/,
  /\.chunk\.[jt]sx?$/,
  /\.d\.ts$/, // TypeScript declarations
  /\.map$/, // Source maps
];

/**
 * Lock file patterns.
 */
const LOCK_FILE_PATTERNS = [
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^pnpm-lock\.yaml$/,
  /^bun\.lockb$/,
  /^Gemfile\.lock$/,
  /^Cargo\.lock$/,
  /^composer\.lock$/,
  /^poetry\.lock$/,
  /^go\.sum$/,
];

/**
 * File Filter Plugin implementation.
 *
 * @description
 * This plugin hooks into the `FILTER_FILE` stage to determine which
 * files should be included in the generated PDF. It supports multiple
 * filtering criteria that can be combined.
 *
 * @remarks
 * Filter configuration is loaded from (in priority order):
 * 1. Environment variables (REPO2PDF_FILTER_*)
 * 2. `repo2pdf-filter.json` in current directory
 * 3. Built-in default configuration
 *
 * Filters are applied in this order:
 * 1. Extension includes (if specified)
 * 2. Extension excludes
 * 3. Pattern includes (if specified)
 * 4. Pattern excludes
 * 5. Size limits
 * 6. Preset excludes (tests, generated, locks, hidden)
 * 7. Custom filter function
 *
 * @example
 * ```json
 * // repo2pdf-filter.json
 * {
 *   "includeExtensions": [".ts", ".tsx", ".js", ".jsx"],
 *   "excludePatterns": ["**\/vendor/**", "**\/__fixtures__/**"],
 *   "excludeTests": true,
 *   "maxFileSize": 524288
 * }
 * ```
 */
class FileFilterPlugin implements IRepo2PDFPlugin {
  /** Merged filter configuration */
  private config: FilterConfig;

  /** Path to the loaded config file (for logging) */
  private loadedConfigPath: string | null = null;

  /** Statistics for logging */
  private stats = {
    total: 0,
    included: 0,
    excluded: 0,
  };

  /**
   * Initialize the plugin and load filter configuration.
   */
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfiguration();
  }

  /**
   * Load filter configuration from environment and files.
   */
  private loadConfiguration(): void {
    // First, try to load from JSON config file
    const configPath = path.join(process.cwd(), "repo2pdf-filter.json");
    if (fs.existsSync(configPath)) {
      try {
        const configData = fs.readFileSync(configPath, "utf8");
        const fileConfig = JSON.parse(configData) as Partial<FilterConfig>;

        if (typeof fileConfig === "object" && fileConfig !== null) {
          this.config = { ...DEFAULT_CONFIG, ...fileConfig };
          this.loadedConfigPath = configPath;
        }
      } catch {
        // Config file exists but is invalid - use defaults
      }
    }

    // Override with environment variables
    this.loadEnvironmentConfig();
  }

  /**
   * Load configuration from environment variables.
   */
  private loadEnvironmentConfig(): void {
    const env = process.env;

    if (env.REPO2PDF_FILTER_INCLUDE_EXT) {
      this.config.includeExtensions =
        env.REPO2PDF_FILTER_INCLUDE_EXT.split(",");
    }

    if (env.REPO2PDF_FILTER_EXCLUDE_EXT) {
      this.config.excludeExtensions =
        env.REPO2PDF_FILTER_EXCLUDE_EXT.split(",");
    }

    if (env.REPO2PDF_FILTER_MAX_SIZE) {
      this.config.maxFileSize = parseInt(env.REPO2PDF_FILTER_MAX_SIZE, 10);
    }

    if (env.REPO2PDF_FILTER_EXCLUDE_TESTS === "true") {
      this.config.excludeTests = true;
    }

    if (env.REPO2PDF_FILTER_EXCLUDE_GENERATED === "true") {
      this.config.excludeGenerated = true;
    }

    if (env.REPO2PDF_FILTER_EXCLUDE_HIDDEN === "true") {
      this.config.excludeHidden = true;
    }
  }

  /**
   * Filter files based on configuration.
   *
   * @description
   * This hook is called for every file during processing.
   * Returns `true` to include the file, `false` to exclude it.
   *
   * @param file - File to evaluate
   * @param _config - repo2pdf configuration (unused)
   * @returns `true` if file should be included
   */
  [HookPoint.FILTER_FILE] = (file: RepoFile, _config: Config): boolean => {
    this.stats.total++;

    const result = this.shouldIncludeFile(file);

    if (result) {
      this.stats.included++;
    } else {
      this.stats.excluded++;
    }

    return result;
  };

  /**
   * Determine if a file should be included based on all filter criteria.
   *
   * @param file - File to evaluate
   * @returns `true` if file passes all filters
   */
  private shouldIncludeFile(file: RepoFile): boolean {
    const { path: filePath, size } = file;
    const normalizedPath = filePath.replace(/\\/g, "/");

    // 1. Extension includes (whitelist)
    if (this.config.includeExtensions?.length) {
      const hasIncludedExt = this.config.includeExtensions.some((ext) =>
        normalizedPath.endsWith(ext),
      );
      if (!hasIncludedExt) {
        return false;
      }
    }

    // 2. Extension excludes (blacklist)
    if (this.config.excludeExtensions?.length) {
      const hasExcludedExt = this.config.excludeExtensions.some((ext) =>
        normalizedPath.endsWith(ext),
      );
      if (hasExcludedExt) {
        return false;
      }
    }

    // 3. Pattern includes (whitelist)
    if (this.config.includePatterns?.length) {
      const matchesInclude = this.config.includePatterns.some((pattern) =>
        this.matchPattern(normalizedPath, pattern),
      );
      if (!matchesInclude) {
        return false;
      }
    }

    // 4. Pattern excludes (blacklist)
    if (this.config.excludePatterns?.length) {
      const matchesExclude = this.config.excludePatterns.some((pattern) =>
        this.matchPattern(normalizedPath, pattern),
      );
      if (matchesExclude) {
        return false;
      }
    }

    // 5. Size limits
    if (
      this.config.maxFileSize !== undefined &&
      size > this.config.maxFileSize
    ) {
      return false;
    }
    if (
      this.config.minFileSize !== undefined &&
      size < this.config.minFileSize
    ) {
      return false;
    }

    // 6. Preset excludes
    if (this.config.excludeTests) {
      if (TEST_PATTERNS.some((pattern) => pattern.test(normalizedPath))) {
        return false;
      }
    }

    if (this.config.excludeGenerated) {
      if (GENERATED_PATTERNS.some((pattern) => pattern.test(normalizedPath))) {
        return false;
      }
    }

    if (this.config.excludeLockFiles) {
      const fileName = path.basename(normalizedPath);
      if (LOCK_FILE_PATTERNS.some((pattern) => pattern.test(fileName))) {
        return false;
      }
    }

    if (this.config.excludeHidden) {
      const segments = normalizedPath.split("/");
      if (
        segments.some(
          (segment: string) => segment.startsWith(".") && segment !== ".",
        )
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Simple glob-like pattern matching.
   *
   * @param filePath - Path to match
   * @param pattern - Glob pattern (supports * and **)
   * @returns `true` if path matches pattern
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    // Escape regex special characters except * and **
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "{{GLOBSTAR}}")
      .replace(/\*/g, "[^/]*")
      .replace(/\{\{GLOBSTAR\}\}/g, ".*");

    // Anchor pattern if it doesn't start with **
    if (!pattern.startsWith("**")) {
      regexPattern = "^" + regexPattern;
    }

    // Anchor pattern if it doesn't end with **
    if (!pattern.endsWith("**")) {
      regexPattern = regexPattern + "$";
    }

    const regex = new RegExp(regexPattern);
    return regex.test(filePath);
  }

  /**
   * Get filter statistics.
   *
   * @returns Object with total, included, and excluded counts
   */
  public getStats(): Readonly<typeof this.stats> {
    return { ...this.stats };
  }

  /**
   * Get current filter configuration.
   *
   * @returns Current configuration
   */
  public getConfig(): Readonly<FilterConfig> {
    return { ...this.config };
  }

  /**
   * Get the path to the loaded configuration file.
   *
   * @returns Config file path or null if using defaults
   */
  public getConfigPath(): string | null {
    return this.loadedConfigPath;
  }

  /**
   * Reset statistics counters.
   */
  public resetStats(): void {
    this.stats = { total: 0, included: 0, excluded: 0 };
  }
}

/**
 * Plugin instance export.
 *
 * @remarks
 * The plugin is instantiated once and exported as the default export.
 * Configuration is loaded at instantiation time.
 */
export default new FileFilterPlugin();
