/**
 * Output types for repo2pdf
 */

export interface GenerationResult {
  success: boolean;
  outputPath: string;
  format: string;
  fileSize: number;
  generationTime: number;
  error?: Error;
}

export interface TOCItem {
  title: string;
  path: string;
  level: number;
  children?: TOCItem[];
}

export interface HTMLGenerationOptions {
  includeTableOfContents: boolean;
  includeLineNumbers: boolean;
  theme: string;
  customCSS?: string;
  title: string;
}

export interface PDFGenerationOptions extends HTMLGenerationOptions {
  pageSize: string;
  landscape: boolean;
  margin: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  includePageNumbers: boolean;
}

export interface EPUBGenerationOptions extends HTMLGenerationOptions {
  author: string;
  publisher?: string;
  cover?: string;
}

export interface MOBIGenerationOptions extends EPUBGenerationOptions {
  // MOBI-specific options if needed
}
