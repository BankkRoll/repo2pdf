/**
 * Configuration types for repo2pdf
 */

export type ThemeType = "light" | "dark" | "github" | "monokai" | string;
export type OutputFormat = "pdf" | "html" | "epub" | "mobi";
export type VCSType = "github" | "gitlab" | "bitbucket" | "local";

export interface RepositoryOptions {
  url: string;
  branch?: string;
  token?: string;
  vcsType?: VCSType;
  localPath?: string;
  useCache?: boolean;
}

export interface OutputOptions {
  format: OutputFormat;
  outputPath: string;
  singleFile: boolean;
  pageSize?: "A4" | "Letter" | "Legal" | string;
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

export interface StyleOptions {
  theme: ThemeType;
  fontSize?: string;
  fontFamily?: string;
  lineNumbers: boolean;
  pageNumbers: boolean;
  includeTableOfContents: boolean;
  customCSS?: string;
}

export interface ProcessingOptions {
  ignorePatterns: string[];
  maxConcurrency: number;
  removeComments: boolean;
  removeEmptyLines: boolean;
  includeBinaryFiles: boolean;
  includeHiddenFiles: boolean;
  timeout?: number;
  useIncrementalProcessing?: boolean;
  incrementalChunkSize?: number;
}

export interface CacheOptions {
  enabled: boolean;
  ttl: number;
  cacheDir?: string;
}

export interface Config {
  repository: RepositoryOptions;
  output: OutputOptions;
  style: StyleOptions;
  processing: ProcessingOptions;
  cache: CacheOptions;
  debug: boolean;
}
