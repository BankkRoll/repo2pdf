import { HookPoint } from "./plugin-manager";

/**
 * Interface for a repo2pdf plugin
 * Plugins can implement any of these methods to hook into the application
 */
export interface IRepo2PDFPlugin {
  /**
   * Called before fetching repository content
   * @param config The current configuration
   * @returns Modified configuration or void
   */
  [HookPoint.PRE_FETCH]?: (config: any) => Promise<any> | any;

  /**
   * Called after fetching repository content
   * @param files The fetched files
   * @param config The current configuration
   * @returns Modified files or void
   */
  [HookPoint.POST_FETCH]?: (
    files: any[],
    config: any,
  ) => Promise<any[]> | any[];

  /**
   * Called before processing files
   * @param files The files to process
   * @param config The current configuration
   * @returns Modified files or void
   */
  [HookPoint.PRE_PROCESS]?: (
    files: any[],
    config: any,
  ) => Promise<any[]> | any[];

  /**
   * Called after processing files
   * @param processedFiles The processed files
   * @param config The current configuration
   * @returns Modified processed files or void
   */
  [HookPoint.POST_PROCESS]?: (
    processedFiles: any[],
    config: any,
  ) => Promise<any[]> | any[];

  /**
   * Called before generating output
   * @param processedFiles The processed files
   * @param config The current configuration
   * @returns Modified processed files or void
   */
  [HookPoint.PRE_GENERATE]?: (
    processedFiles: any[],
    config: any,
  ) => Promise<any[]> | any[];

  /**
   * Called after generating output
   * @param output The generated output
   * @param config The current configuration
   * @returns Modified output or void
   */
  [HookPoint.POST_GENERATE]?: (output: any, config: any) => Promise<any> | any;

  /**
   * Filter files before processing
   * @param file The file to filter
   * @param config The current configuration
   * @returns Boolean indicating whether to include the file
   */
  [HookPoint.FILTER_FILE]?: (
    file: any,
    config: any,
  ) => Promise<boolean> | boolean;

  /**
   * Transform file content
   * @param content The file content
   * @param file The file metadata
   * @param config The current configuration
   * @returns Transformed content or void
   */
  [HookPoint.TRANSFORM_CONTENT]?: (
    content: string,
    file: any,
    config: any,
  ) => Promise<string> | string;

  /**
   * Custom repository fetcher
   * @param config The current configuration
   * @returns Fetched files
   */
  [HookPoint.CUSTOM_FETCHER]?: (config: any) => Promise<any[]> | any[];

  /**
   * Custom file processor
   * @param files The files to process
   * @param config The current configuration
   * @returns Processed files
   */
  [HookPoint.CUSTOM_PROCESSOR]?: (
    files: any[],
    config: any,
  ) => Promise<any[]> | any[];

  /**
   * Custom output generator
   * @param processedFiles The processed files
   * @param config The current configuration
   * @returns Generated output
   */
  [HookPoint.CUSTOM_GENERATOR]?: (
    processedFiles: any[],
    config: any,
  ) => Promise<any> | any;
}
