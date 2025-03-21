/**
 * File types for repo2pdf
 */

export type FileType = "code" | "image" | "binary" | "unknown";

export interface RepoFile {
  path: string;
  name: string;
  type: FileType;
  content: string | Buffer | null;
  size: number;
  extension: string;
  language?: string;
  isDirectory: boolean;
  children?: RepoFile[];
}

export interface ProcessedFile extends RepoFile {
  processedContent: string;
  highlightedHtml?: string;
  base64Content?: string;
  metadata?: Record<string, any>;
}

export interface DirectoryStructure {
  [key: string]: DirectoryStructure | ProcessedFile;
}
