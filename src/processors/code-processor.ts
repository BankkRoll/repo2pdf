import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
} from "shiki";
import type { ProcessedFile, RepoFile } from "../types/file.types";
import type { Config } from "../types/config.types";
import { logger } from "../utils/logger";

/**
 * Processor for code files using Shiki for syntax highlighting
 */
export class CodeProcessor {
  private config: Config;
  private highlighter: Highlighter | null = null;
  private highlighterPromise: Promise<Highlighter> | null = null;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Process a code file
   */
  public async process(file: RepoFile): Promise<ProcessedFile> {
    try {
      if (!file.content) {
        throw new Error(`File content is empty for ${file.path}`);
      }

      // Initialize highlighter if not already done
      if (!this.highlighter && !this.highlighterPromise) {
        this.initializeHighlighter();
      }

      // Ensure highlighter is ready
      if (!this.highlighter) {
        this.highlighter = await this.highlighterPromise!;
      }

      let content = file.content as string;

      // Apply processing options
      if (this.config.processing.removeComments) {
        content = this.removeComments(content, file.language);
      }

      if (this.config.processing.removeEmptyLines) {
        content = this.removeEmptyLines(content);
      }

      // Highlight code
      const highlightedHtml = await this.highlightCode(
        content,
        file.language || "text",
      );

      return {
        ...file,
        processedContent: content,
        highlightedHtml,
      };
    } catch (error) {
      logger.error(`Error processing code file ${file.path}:`, error);
      throw new Error(
        `Failed to process code file ${file.path}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Initialize the Shiki highlighter
   */
  private initializeHighlighter(): void {
    this.highlighterPromise = createHighlighter({
      themes: [this.config.style.theme || "github-dark"],
      langs: [
        "javascript",
        "typescript",
        "jsx",
        "tsx",
        "html",
        "css",
        "json",
        "markdown",
        "python",
        "java",
        "c",
        "cpp",
        "csharp",
        "go",
        "rust",
        "php",
        "ruby",
        "swift",
        "bash",
        "yaml",
        "toml",
        "sql",
        "graphql",
        "xml",
        "dockerfile",
        "shellscript",
        "text",
      ],
    });
  }

  /**
   * Highlight code using Shiki
   */
  private async highlightCode(code: string, language: string): Promise<string> {
    try {
      if (!this.highlighter) {
        throw new Error("Highlighter not initialized");
      }

      // Map language to Shiki supported language
      const mappedLang = this.mapLanguage(language);
      const theme = this.config.style.theme || "github-dark";

      // Highlight the code
      let html = this.highlighter.codeToHtml(code, {
        lang: mappedLang as BundledLanguage,
        theme,
      });

      // Remove background-color from inline styles (we set our own)
      html = html.replace(/background-color:[^;"]+;?/g, "");

      // Remove newlines between line spans (they cause gaps)
      html = html.replace(
        /<\/span>\n<span class="line">/g,
        '</span><span class="line">',
      );

      return html;
    } catch (error) {
      logger.warn(`Failed to highlight code with language ${language}:`, error);

      // Fallback to plain text if highlighting fails
      if (this.highlighter) {
        let html = this.highlighter.codeToHtml(code, {
          lang: "text",
          theme: this.config.style.theme || "github-dark",
        });
        html = html.replace(/background-color:[^;"]+;?/g, "");
        return html;
      }

      // If highlighter is not available, return pre-formatted HTML
      return `<pre><code>${this.escapeHtml(code)}</code></pre>`;
    }
  }

  /**
   * Map language to Shiki supported language
   */
  private mapLanguage(language: string): string {
    const languageMap: Record<string, string> = {
      js: "javascript",
      ts: "typescript",
      jsx: "jsx",
      tsx: "tsx",
      py: "python",
      rb: "ruby",
      md: "markdown",
      yml: "yaml",
      sh: "bash",
      zsh: "bash",
      cs: "csharp",
      "c++": "cpp",
      h: "c",
      hpp: "cpp",
      rs: "rust",
      kt: "kotlin",
      kts: "kotlin",
      gradle: "groovy",
      tf: "terraform",
      hcl: "terraform",
      conf: "ini",
      ini: "ini",
      properties: "ini",
      txt: "text",
      svg: "xml",
    };

    return languageMap[language.toLowerCase()] || language;
  }

  /**
   * Remove comments from code (basic implementation)
   */
  private removeComments(code: string, language?: string): string {
    if (!language) return code;

    try {
      // Simple comment removal for common languages
      switch (language.toLowerCase()) {
        case "javascript":
        case "typescript":
        case "jsx":
        case "tsx":
        case "java":
        case "c":
        case "cpp":
        case "csharp":
        case "go":
        case "swift":
        case "php":
          // Remove single-line comments
          code = code.replace(/\/\/.*$/gm, "");
          // Remove multi-line comments
          code = code.replace(/\/\*[\s\S]*?\*\//g, "");
          break;
        case "python":
        case "ruby":
        case "shell":
        case "bash":
        case "yaml":
          // Remove single-line comments
          code = code.replace(/#.*$/gm, "");
          break;
        case "html":
        case "xml":
          // Remove HTML comments
          code = code.replace(/<!--[\s\S]*?-->/g, "");
          break;
        case "css":
          // Remove CSS comments
          code = code.replace(/\/\*[\s\S]*?\*\//g, "");
          break;
      }

      return code;
    } catch (error) {
      logger.warn(`Failed to remove comments from ${language} code:`, error);
      return code;
    }
  }

  /**
   * Remove empty lines from code
   */
  private removeEmptyLines(code: string): string {
    return code.replace(/^\s*[\r\n]/gm, "");
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
