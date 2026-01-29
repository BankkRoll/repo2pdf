/**
 * Syntax Highlighter Plugin for repo2pdf
 *
 * @description
 * This example plugin demonstrates how to use the `TRANSFORM_CONTENT` hook
 * to apply syntax highlighting to code files. It uses highlight.js to
 * detect and highlight code based on file extensions.
 *
 * @example
 * To use this plugin:
 * 1. Copy this directory to your project's `plugins/` folder
 * 2. Run `npm install` inside the plugin directory
 * 3. The plugin will be automatically loaded by repo2pdf
 *
 * @packageDocumentation
 */

import hljs from "highlight.js";
import { HookPoint } from "repo2pdf";
import type { IRepo2PDFPlugin, RepoFile, Config } from "repo2pdf";

/**
 * Map of file extensions to highlight.js language identifiers.
 * Add new mappings here to support additional languages.
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".jsx": "javascript",
  ".tsx": "typescript",

  // Web
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "scss",
  ".less": "less",

  // Backend Languages
  ".py": "python",
  ".rb": "ruby",
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".scala": "scala",
  ".go": "go",
  ".rs": "rust",
  ".php": "php",
  ".cs": "csharp",
  ".fs": "fsharp",
  ".swift": "swift",
  ".m": "objectivec",
  ".mm": "objectivec",

  // Systems
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".hxx": "cpp",

  // Shell
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".fish": "fish",
  ".ps1": "powershell",
  ".psm1": "powershell",
  ".bat": "dos",
  ".cmd": "dos",

  // Data/Config
  ".json": "json",
  ".jsonc": "json",
  ".json5": "json",
  ".xml": "xml",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "ini",
  ".ini": "ini",
  ".env": "ini",

  // Documentation
  ".md": "markdown",
  ".mdx": "markdown",
  ".rst": "plaintext",
  ".txt": "plaintext",

  // Database
  ".sql": "sql",
  ".graphql": "graphql",
  ".gql": "graphql",

  // Other
  ".dockerfile": "dockerfile",
  ".makefile": "makefile",
  ".cmake": "cmake",
  ".r": "r",
  ".lua": "lua",
  ".perl": "perl",
  ".pl": "perl",
  ".vim": "vim",
  ".asm": "x86asm",
  ".wasm": "wasm",
};

/**
 * Set of file extensions that should be syntax highlighted.
 * Derived from the extension map for efficient lookup.
 */
const CODE_EXTENSIONS = new Set(Object.keys(EXTENSION_TO_LANGUAGE));

/**
 * Syntax Highlighter Plugin implementation.
 *
 * @description
 * This plugin hooks into the `TRANSFORM_CONTENT` stage to apply
 * syntax highlighting to code files using highlight.js.
 *
 * @remarks
 * - Only processes files with known code extensions
 * - Falls back to auto-detection if extension mapping fails
 * - Preserves original content if highlighting fails
 * - Returns HTML-formatted highlighted code
 *
 * @example
 * ```typescript
 * // The plugin is automatically instantiated and exported
 * // No manual configuration required
 *
 * // To customize, modify the EXTENSION_TO_LANGUAGE map above
 * // or create your own plugin extending this one
 * ```
 */
class SyntaxHighlighterPlugin implements IRepo2PDFPlugin {
  /**
   * Transform file content by applying syntax highlighting.
   *
   * @description
   * This hook is called for every file during processing.
   * It checks if the file is a code file and applies highlighting.
   *
   * @param content - The raw file content
   * @param file - File metadata including path and extension
   * @param _config - Configuration (unused in this plugin)
   * @returns Highlighted HTML string, or original content if not applicable
   */
  [HookPoint.TRANSFORM_CONTENT] = (
    content: string,
    file: RepoFile,
    _config: Config,
  ): string => {
    // Skip non-code files
    if (!this.isCodeFile(file.path)) {
      return content;
    }

    // Skip empty files
    if (!content || content.trim().length === 0) {
      return content;
    }

    try {
      const language = this.getLanguageFromPath(file.path);

      if (language) {
        // Use specific language highlighting
        const result = hljs.highlight(content, {
          language,
          ignoreIllegals: true, // Don't throw on invalid syntax
        });
        return result.value;
      }

      // Fallback to auto-detection
      const autoResult = hljs.highlightAuto(content);
      if (autoResult.relevance > 5) {
        // Only use auto-detection if confidence is high
        return autoResult.value;
      }
    } catch (error) {
      // Log but don't fail - return original content
      console.warn(
        `[syntax-highlighter] Failed to highlight ${file.path}:`,
        error instanceof Error ? error.message : error,
      );
    }

    return content;
  };

  /**
   * Check if a file should be syntax highlighted based on its extension.
   *
   * @param filePath - Full path to the file
   * @returns `true` if the file should be highlighted
   */
  private isCodeFile(filePath: string): boolean {
    const extension = this.getExtension(filePath);
    return CODE_EXTENSIONS.has(extension);
  }

  /**
   * Get the highlight.js language identifier for a file.
   *
   * @param filePath - Full path to the file
   * @returns Language identifier or `null` if not found
   */
  private getLanguageFromPath(filePath: string): string | null {
    const extension = this.getExtension(filePath);
    return EXTENSION_TO_LANGUAGE[extension] || null;
  }

  /**
   * Extract the file extension from a path.
   *
   * @param filePath - Full path to the file
   * @returns Lowercase extension including the dot (e.g., ".ts")
   */
  private getExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf(".");
    if (lastDot === -1) {
      return "";
    }
    return filePath.slice(lastDot).toLowerCase();
  }
}

/**
 * Plugin instance export.
 *
 * @remarks
 * The plugin is instantiated once and exported as the default export.
 * The PluginManager will use this instance for all hook executions.
 */
export default new SyntaxHighlighterPlugin();
