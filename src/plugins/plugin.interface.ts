/**
 * Plugin interface definitions for repo2pdf
 * @module plugins/plugin.interface
 *
 * @description
 * This module defines the contract that all repo2pdf plugins must implement.
 * Plugins can hook into various stages of the PDF generation pipeline to
 * transform, filter, or completely replace the default behavior.
 *
 * @example
 * ```typescript
 * import { IRepo2PDFPlugin, HookPoint } from 'repo2pdf';
 *
 * class MyPlugin implements IRepo2PDFPlugin {
 *   [HookPoint.TRANSFORM_CONTENT] = (content, file, config) => {
 *     return content.toUpperCase();
 *   };
 * }
 *
 * export default new MyPlugin();
 * ```
 */

import { HookPoint } from "./plugin-manager";
import type { Config } from "../types/config.types";
import type { RepoFile, ProcessedFile } from "../types/file.types";
import type { GenerationResult } from "../types/output.types";

/**
 * Output reported to the POST_GENERATE hook after the PDF bytes are produced.
 *
 * @remarks
 * The PDF is rendered directly to bytes by the pure-JS pdf-lib renderer, so
 * there is no intermediate HTML to mutate. POST_GENERATE runs after the bytes
 * exist and is intended for side effects (logging, notifications, telemetry)
 * rather than transforming the rendered document's visual content.
 */
export interface GenerationOutput {
  /** The output format (e.g., "pdf") */
  format: string;
  /** Size of the rendered PDF in bytes */
  byteLength: number;
  /** Path where the output was saved */
  outputPath: string;
  /** Any additional metadata from generation */
  metadata?: Record<string, unknown>;
}

/**
 * Main plugin interface for repo2pdf.
 *
 * @description
 * Plugins implement this interface to extend repo2pdf's functionality.
 * Each method corresponds to a hook point in the processing pipeline.
 * All methods are optional - implement only the hooks you need.
 *
 * @remarks
 * - Hooks are executed in the order plugins are loaded
 * - Each hook receives the result from the previous plugin (chaining)
 * - Returning `undefined` preserves the previous value
 * - Errors in one plugin don't stop other plugins from executing
 *
 * @example
 * ```typescript
 * // Filter out test files
 * class NoTestsPlugin implements IRepo2PDFPlugin {
 *   [HookPoint.FILTER_FILE] = (file: RepoFile): boolean => {
 *     return !file.path.includes('.test.') && !file.path.includes('.spec.');
 *   };
 * }
 * ```
 */
export interface IRepo2PDFPlugin {
  /**
   * Called before fetching repository content.
   *
   * @description
   * Use this hook to modify configuration before the fetch begins.
   * Common uses: adding authentication, modifying branch selection,
   * adjusting ignore patterns.
   *
   * @param config - The current configuration object
   * @returns Modified configuration or undefined to keep original
   *
   * @example
   * ```typescript
   * [HookPoint.PRE_FETCH] = (config: Config): Config => {
   *   // Add default ignore patterns
   *   return {
   *     ...config,
   *     processing: {
   *       ...config.processing,
   *       ignorePatterns: [...config.processing.ignorePatterns, '*.log']
   *     }
   *   };
   * };
   * ```
   */
  [HookPoint.PRE_FETCH]?: (config: Config) => Promise<Config> | Config | void;

  /**
   * Called after fetching repository content.
   *
   * @description
   * Use this hook to modify the fetched files before processing.
   * Common uses: adding virtual files, removing unwanted files,
   * modifying file metadata.
   *
   * @param files - Array of fetched files
   * @param config - The current configuration
   * @returns Modified files array or undefined to keep original
   *
   * @example
   * ```typescript
   * [HookPoint.POST_FETCH] = (files: RepoFile[], config: Config): RepoFile[] => {
   *   // Add a virtual README if none exists
   *   if (!files.some(f => f.name === 'README.md')) {
   *     files.push({ name: 'README.md', content: '# Project', ... });
   *   }
   *   return files;
   * };
   * ```
   */
  [HookPoint.POST_FETCH]?: (
    files: RepoFile[],
    config: Config,
  ) => Promise<RepoFile[]> | RepoFile[] | void;

  /**
   * Called before processing files.
   *
   * @description
   * Use this hook for batch operations on files before individual processing.
   * Common uses: sorting files, grouping related files, pre-validation.
   *
   * @param files - Array of files to be processed
   * @param config - The current configuration
   * @returns Modified files array or undefined to keep original
   */
  [HookPoint.PRE_PROCESS]?: (
    files: RepoFile[],
    config: Config,
  ) => Promise<RepoFile[]> | RepoFile[] | void;

  /**
   * Called after processing files.
   *
   * @description
   * Use this hook to modify processed files before generation.
   * Common uses: reordering or filtering files, rewriting processed content,
   * aggregating statistics.
   *
   * @param processedFiles - Array of processed files
   * @param config - The current configuration
   * @returns Modified processed files or undefined to keep original
   *
   * @example
   * ```typescript
   * [HookPoint.POST_PROCESS] = (files: ProcessedFile[]): ProcessedFile[] => {
   *   // Keep only non-empty files, sorted by path
   *   return files
   *     .filter(file => file.processedContent.trim().length > 0)
   *     .sort((a, b) => a.path.localeCompare(b.path));
   * };
   * ```
   */
  [HookPoint.POST_PROCESS]?: (
    processedFiles: ProcessedFile[],
    config: Config,
  ) => Promise<ProcessedFile[]> | ProcessedFile[] | void;

  /**
   * Called before generating output.
   *
   * @description
   * Final opportunity to modify processed files before PDF generation.
   * Common uses: final sorting, adding separators, table of contents prep.
   *
   * @param processedFiles - Array of processed files
   * @param config - The current configuration
   * @returns Modified processed files or undefined to keep original
   */
  [HookPoint.PRE_GENERATE]?: (
    processedFiles: ProcessedFile[],
    config: Config,
  ) => Promise<ProcessedFile[]> | ProcessedFile[] | void;

  /**
   * Called after the PDF bytes have been produced.
   *
   * @description
   * Runs after the pure-JS pdf-lib renderer has produced the final PDF bytes.
   * Because the document is rendered straight to bytes (there is no intermediate
   * HTML), this hook cannot mutate the rendered document's visual content.
   * Use it for side effects: logging render statistics, emitting telemetry,
   * or sending notifications.
   *
   * @param output - The generation output describing the rendered PDF
   * @param config - The current configuration
   * @returns Modified output or undefined to keep original
   *
   * @example
   * ```typescript
   * [HookPoint.POST_GENERATE] = (output: GenerationOutput): void => {
   *   // Log render stats and notify an external service.
   *   console.log(`Rendered ${output.outputPath} (${output.byteLength} bytes)`);
   *   void fetch('https://hooks.example.com/notify', {
   *     method: 'POST',
   *     body: JSON.stringify({ path: output.outputPath, bytes: output.byteLength }),
   *   });
   * };
   * ```
   */
  [HookPoint.POST_GENERATE]?: (
    output: GenerationOutput,
    config: Config,
  ) => Promise<GenerationOutput> | GenerationOutput | void;

  /**
   * Filter individual files during processing.
   *
   * @description
   * Called for each file to determine if it should be included.
   * Return `true` to include the file, `false` to exclude it.
   * This is more efficient than modifying the files array for simple filtering.
   *
   * @param file - The file to evaluate
   * @param config - The current configuration
   * @returns `true` to include the file, `false` to exclude
   *
   * @example
   * ```typescript
   * [HookPoint.FILTER_FILE] = (file: RepoFile): boolean => {
   *   // Exclude files larger than 1MB
   *   return file.size < 1024 * 1024;
   * };
   * ```
   */
  [HookPoint.FILTER_FILE]?: (
    file: RepoFile,
    config: Config,
  ) => Promise<boolean> | boolean;

  /**
   * Transform file content during processing.
   *
   * @description
   * Called for each file to transform its content.
   * Common uses: syntax highlighting, minification, obfuscation,
   * adding line numbers, stripping sensitive data.
   *
   * @param content - The file's text content
   * @param file - The file metadata
   * @param config - The current configuration
   * @returns Transformed content or undefined to keep original
   *
   * @example
   * ```typescript
   * [HookPoint.TRANSFORM_CONTENT] = (
   *   content: string,
   *   file: RepoFile
   * ): string => {
   *   // Redact API keys
   *   return content.replace(/api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, 'API_KEY=REDACTED');
   * };
   * ```
   */
  [HookPoint.TRANSFORM_CONTENT]?: (
    content: string,
    file: RepoFile,
    config: Config,
  ) => Promise<string> | string | void;

  /**
   * Custom repository fetcher.
   *
   * @description
   * Completely replaces the default fetch behavior.
   * Use this to implement custom VCS integrations or fetch from
   * non-standard sources (databases, APIs, etc.).
   *
   * @remarks
   * When implemented, the default fetcher is skipped entirely.
   * You are responsible for returning properly formatted RepoFile objects.
   *
   * @param config - The current configuration
   * @returns Array of fetched files
   *
   * @example
   * ```typescript
   * [HookPoint.CUSTOM_FETCHER] = async (config: Config): Promise<RepoFile[]> => {
   *   // Fetch from a custom API
   *   const response = await fetch(config.repository.url);
   *   const data = await response.json();
   *   return data.files.map(f => ({
   *     path: f.path,
   *     name: f.name,
   *     content: f.content,
   *     // ... other RepoFile properties
   *   }));
   * };
   * ```
   */
  [HookPoint.CUSTOM_FETCHER]?: (
    config: Config,
  ) => Promise<RepoFile[]> | RepoFile[];

  /**
   * Custom file processor.
   *
   * @description
   * Completely replaces the default file processing behavior.
   * Use this to implement custom syntax highlighting, content transformation,
   * or specialized processing for specific file types.
   *
   * @remarks
   * When implemented, the default processor is skipped entirely.
   * You are responsible for returning properly formatted ProcessedFile objects.
   *
   * @param files - Array of files to process
   * @param config - The current configuration
   * @returns Array of processed files
   */
  [HookPoint.CUSTOM_PROCESSOR]?: (
    files: RepoFile[],
    config: Config,
  ) => Promise<ProcessedFile[]> | ProcessedFile[];

  /**
   * Custom output generator.
   *
   * @description
   * Completely replaces the default PDF generation behavior.
   * Use this to implement custom output formats or generation logic.
   *
   * @remarks
   * When implemented, the default generator is skipped entirely.
   * You are responsible for writing the output file and returning results.
   *
   * @param processedFiles - Array of processed files
   * @param config - The current configuration
   * @returns Generation result with output path and metadata
   */
  [HookPoint.CUSTOM_GENERATOR]?: (
    processedFiles: ProcessedFile[],
    config: Config,
  ) => Promise<GenerationResult> | GenerationResult;
}
