/**
 * Classification of file content types.
 * - `code` - Source code files that can be syntax highlighted
 * - `image` - Image files (png, jpg, gif, svg, etc.)
 * - `binary` - Binary files that cannot be displayed as text
 * - `unknown` - Files with unrecognized types
 */
export type FileType = "code" | "image" | "binary" | "unknown";

/**
 * Represents a file or directory in the repository.
 */
export interface RepoFile {
  /** Relative path from repository root */
  path: string;
  /** File or directory name */
  name: string;
  /** The type classification of this file */
  type: FileType;
  /** Raw file content (string for text, Buffer for binary, null if not loaded) */
  content: string | Buffer | null;
  /** File size in bytes */
  size: number;
  /** File extension without the leading dot (e.g., "ts", "js") */
  extension: string;
  /** Detected programming language for syntax highlighting */
  language?: string;
  /** Whether this entry is a directory */
  isDirectory: boolean;
  /** Child files and directories (only populated for directories) */
  children?: RepoFile[];
}

/**
 * A file that has been processed and is ready for output generation.
 * @extends RepoFile
 */
export interface ProcessedFile extends RepoFile {
  /** The content after processing (comments removed, etc.) */
  processedContent: string;
}

/**
 * Recursive structure representing the repository's directory tree.
 * Keys are file/directory names, values are either nested structures or processed files.
 */
export interface DirectoryStructure {
  [key: string]: DirectoryStructure | ProcessedFile;
}
