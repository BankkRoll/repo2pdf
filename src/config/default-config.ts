import type { Config } from "../types/config.types";

/**
 * Default configuration for repo2pdf
 */
export const defaultConfig: Config = {
  repository: {
    url: "",
    branch: "main",
    vcsType: "github",
    localPath: "",
    useCache: true,
  },
  output: {
    format: "pdf",
    outputPath: "./output.pdf",
    singleFile: true,
    pageSize: "A4",
    landscape: false,
    margin: {
      top: "1cm",
      right: "1cm",
      bottom: "1cm",
      left: "1cm",
    },
  },
  style: {
    theme: "github",
    fontSize: "14px",
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
    customCSS: "",
  },
  processing: {
    ignorePatterns: [
      "node_modules/**",
      ".git/**",
      "dist/**",
      "build/**",
      "**/*.log",
      "**/*.lock",
      "**/package-lock.json",
      "**/yarn.lock",
    ],
    maxConcurrency: 5,
    removeComments: false,
    removeEmptyLines: false,
    includeBinaryFiles: true,
    includeHiddenFiles: false,
    timeout: 300000, // 5 minutes
    useIncrementalProcessing: true,
    incrementalChunkSize: 100,
  },
  cache: {
    enabled: true,
    ttl: 86400000, // 24 hours
    cacheDir: "./.repo2pdf-cache",
  },
  debug: false,
};
