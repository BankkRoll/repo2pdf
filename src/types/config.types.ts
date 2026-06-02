/**
 * Available syntax highlighting themes for code display.
 * @remarks
 * Built-in themes: "light", "dark", "github", "monokai".
 * Custom theme names can also be provided as strings.
 */
export type ThemeType = "light" | "dark" | "github" | "monokai" | string;

/**
 * Supported output file formats.
 * @remarks Currently only PDF is supported.
 */
export type OutputFormat = "pdf";

/**
 * Supported version control system types.
 * - `github` - GitHub repositories
 * - `gitlab` - GitLab repositories
 * - `bitbucket` - Bitbucket repositories
 * - `local` - Local filesystem paths
 */
export type VCSType = "github" | "gitlab" | "bitbucket" | "local";

/**
 * Options for specifying the source repository.
 */
export interface RepositoryOptions {
  /** The URL of the repository or local path */
  url: string;
  /** The branch to clone (defaults to main/master) */
  branch?: string;
  /** Authentication token for private repositories */
  token?: string;
  /** The type of version control system */
  vcsType?: VCSType;
  /** Path to local repository (for local VCS type) */
  localPath?: string;
  /** Whether to use cached repository data if available */
  useCache?: boolean;
}

/**
 * Options for configuring the output file.
 */
export interface OutputOptions {
  /** The output format (currently only "pdf") */
  format: OutputFormat;
  /** File path where the output will be saved */
  outputPath: string;
  /** Whether to generate a single file or multiple files */
  singleFile: boolean;
  /** Page size for PDF output (e.g., "A4", "Letter", "Legal") */
  pageSize?: "A4" | "Letter" | "Legal" | string;
  /** Whether to use landscape orientation */
  landscape?: boolean;
  /** Page margins in CSS units (e.g., "10mm", "1in") */
  margin?: {
    /** Top margin */
    top?: string;
    /** Right margin */
    right?: string;
    /** Bottom margin */
    bottom?: string;
    /** Left margin */
    left?: string;
  };
}

/**
 * Per-role font overrides for the PDF renderer.
 *
 * @remarks
 * Each role accepts raw font bytes (`.ttf`/`.otf` as a `Uint8Array`). Any role
 * left undefined uses repo2pdf's bundled default (Inter / JetBrains Mono).
 * Supplying bytes is also how rendering works on runtimes without `fs` (edge,
 * browser): import or fetch the font and pass the bytes in.
 */
export interface FontSet {
  /** UI/body text (default: Inter Regular). */
  sans?: Uint8Array;
  /** Semibold UI text (default: Inter SemiBold). */
  sansSemibold?: Uint8Array;
  /** Bold UI text / titles (default: Inter Bold). */
  sansBold?: Uint8Array;
  /** Code text (default: JetBrains Mono Regular). */
  mono?: Uint8Array;
  /** Bold code / file paths (default: JetBrains Mono Bold). */
  monoBold?: Uint8Array;
  /** Italic code / comments (default: JetBrains Mono Italic). */
  monoItalic?: Uint8Array;
}

/**
 * How syntax highlighting is resolved.
 * - `auto` (default): use Shiki when it can load (Node), else plain text.
 * - `shiki`: force Shiki (fails if unavailable).
 * - `none`: never highlight — universal, dependency-free, edge-safe.
 */
export type HighlightMode = "auto" | "shiki" | "none";

/**
 * Options for styling the generated output.
 */
export interface StyleOptions {
  /** Syntax highlighting theme to use */
  theme: ThemeType;
  /** How to resolve syntax highlighting (default: "auto"). */
  highlight?: HighlightMode;
  /** Optional font overrides for the PDF renderer. */
  fonts?: FontSet;
  /** Font size for code (e.g., "12px", "14pt") */
  fontSize?: string;
  /** Font family for code (e.g., "Fira Code", "monospace") */
  fontFamily?: string;
  /** Whether to display line numbers next to code */
  lineNumbers: boolean;
  /** Whether to include page numbers in the output */
  pageNumbers: boolean;
  /** Whether to generate a table of contents */
  includeTableOfContents: boolean;
  /** Custom CSS to inject into the output */
  customCSS?: string;
}

/**
 * Options for controlling file processing behavior.
 */
export interface ProcessingOptions {
  /** Glob patterns for files/directories to ignore (e.g., ["node_modules", "*.log"]) */
  ignorePatterns?: string[];
  /** Maximum number of files to process concurrently */
  maxConcurrency: number;
  /** Whether to strip comments from code files */
  removeComments: boolean;
  /** Whether to remove empty lines from code files */
  removeEmptyLines: boolean;
  /** Whether to include binary files (as base64 or placeholders) */
  includeBinaryFiles: boolean;
  /** Whether to include hidden files (dotfiles) */
  includeHiddenFiles: boolean;
  /** Timeout in milliseconds for processing operations */
  timeout?: number;
  /** Whether to process files incrementally to reduce memory usage */
  useIncrementalProcessing?: boolean;
  /** Number of files to process in each incremental chunk */
  incrementalChunkSize?: number;
}

/**
 * Options for caching repository data.
 */
export interface CacheOptions {
  /** Whether caching is enabled */
  enabled: boolean;
  /** Time-to-live for cached data in milliseconds */
  ttl: number;
  /** Directory path for storing cache files */
  cacheDir?: string;
}

/**
 * Options for the plugin system.
 */
export interface PluginOptions {
  /** Whether the plugin system is enabled (default: true). */
  enabled?: boolean;
  /** Additional directories to search for plugins. */
  directories?: string[];
  /** Plugin names to disable after loading. */
  disabled?: string[];
}

/**
 * Main configuration object for repo2pdf.
 * @example
 * ```typescript
 * const config: Config = {
 *   repository: { url: "https://github.com/user/repo" },
 *   output: { format: "pdf", outputPath: "./output.pdf", singleFile: true },
 *   style: { theme: "github", lineNumbers: true, pageNumbers: true, includeTableOfContents: true },
 *   processing: { ignorePatterns: ["node_modules"], maxConcurrency: 4, removeComments: false, removeEmptyLines: false, includeBinaryFiles: false, includeHiddenFiles: false },
 *   cache: { enabled: true, ttl: 3600000 },
 *   debug: false
 * };
 * ```
 */
export interface Config {
  /** Repository source configuration */
  repository: RepositoryOptions;
  /** Output file configuration */
  output: OutputOptions;
  /** Styling configuration */
  style: StyleOptions;
  /** File processing configuration */
  processing: ProcessingOptions;
  /** Caching configuration */
  cache: CacheOptions;
  /** Plugin system configuration */
  plugins?: PluginOptions;
  /** Whether to enable debug logging */
  debug: boolean;
}
