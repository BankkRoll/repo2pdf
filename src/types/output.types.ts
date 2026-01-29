/**
 * Result returned after generating output (PDF).
 */
export interface GenerationResult {
  /** Whether the generation completed successfully */
  success: boolean;
  /** Path to the generated output file */
  outputPath: string;
  /** The format of the generated file (e.g., "pdf") */
  format: string;
  /** Size of the generated file in bytes */
  fileSize: number;
  /** Time taken to generate the output in milliseconds */
  generationTime: number;
  /** Error details if generation failed */
  error?: Error;
}

/**
 * Represents an item in the table of contents.
 */
export interface TOCItem {
  /** Display title for this entry */
  title: string;
  /** File path this entry links to */
  path: string;
  /** Nesting level (0 = root, 1 = first child, etc.) */
  level: number;
  /** Nested child entries */
  children?: TOCItem[];
}

/**
 * Options for generating HTML output.
 */
export interface HTMLGenerationOptions {
  /** Whether to include a table of contents */
  includeTableOfContents: boolean;
  /** Whether to display line numbers in code blocks */
  includeLineNumbers: boolean;
  /** Syntax highlighting theme name */
  theme: string;
  /** Custom CSS to inject into the HTML */
  customCSS?: string;
  /** Document title for the HTML page */
  title: string;
}

/**
 * Options for generating PDF output.
 * @extends HTMLGenerationOptions
 */
export interface PDFGenerationOptions extends HTMLGenerationOptions {
  /** Page size (e.g., "A4", "Letter", "Legal") */
  pageSize: string;
  /** Whether to use landscape orientation */
  landscape: boolean;
  /** Page margins in CSS units */
  margin: {
    /** Top margin (e.g., "10mm") */
    top: string;
    /** Right margin (e.g., "10mm") */
    right: string;
    /** Bottom margin (e.g., "10mm") */
    bottom: string;
    /** Left margin (e.g., "10mm") */
    left: string;
  };
  /** Whether to include page numbers in the footer */
  includePageNumbers: boolean;
}
