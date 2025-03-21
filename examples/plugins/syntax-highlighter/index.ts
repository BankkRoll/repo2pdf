import * as hljs from "highlight.js";

import { HookPoint } from "../../../src/plugins/plugin-manager";
import { IRepo2PDFPlugin } from "../../../src/plugins/plugin.interface";

/**
 * Syntax Highlighter Plugin for repo2pdf
 *
 * This plugin adds syntax highlighting to code files in the generated output.
 */
class SyntaxHighlighterPlugin implements IRepo2PDFPlugin {
  /**
   * Transform file content by adding syntax highlighting
   */
  [HookPoint.TRANSFORM_CONTENT] = (
    content: string,
    file: any,
    config: any,
  ): string => {
    // Only process code files
    if (!this.isCodeFile(file.path)) {
      return content;
    }

    try {
      // Determine language from file extension
      const language = this.getLanguageFromPath(file.path);

      // Apply syntax highlighting
      if (language) {
        const highlighted = hljs.highlight(content, { language }).value;
        return highlighted;
      }
    } catch (error) {
      console.error(`Error highlighting syntax for ${file.path}:`, error);
    }

    return content;
  };

  /**
   * Check if a file is a code file based on its extension
   */
  private isCodeFile(filePath: string): boolean {
    const codeExtensions = [
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".py",
      ".rb",
      ".java",
      ".c",
      ".cpp",
      ".cs",
      ".go",
      ".rs",
      ".php",
      ".swift",
      ".kt",
      ".scala",
      ".sh",
      ".bash",
      ".html",
      ".css",
      ".scss",
      ".less",
      ".json",
      ".xml",
      ".yaml",
      ".yml",
      ".md",
      ".sql",
    ];

    return codeExtensions.some((ext) => filePath.endsWith(ext));
  }

  /**
   * Get the highlight.js language from file path
   */
  private getLanguageFromPath(filePath: string): string | null {
    const extensionMap: Record<string, string> = {
      ".js": "javascript",
      ".ts": "typescript",
      ".jsx": "javascript",
      ".tsx": "typescript",
      ".py": "python",
      ".rb": "ruby",
      ".java": "java",
      ".c": "c",
      ".cpp": "cpp",
      ".cs": "csharp",
      ".go": "go",
      ".rs": "rust",
      ".php": "php",
      ".swift": "swift",
      ".kt": "kotlin",
      ".scala": "scala",
      ".sh": "bash",
      ".bash": "bash",
      ".html": "html",
      ".css": "css",
      ".scss": "scss",
      ".less": "less",
      ".json": "json",
      ".xml": "xml",
      ".yaml": "yaml",
      ".yml": "yaml",
      ".md": "markdown",
      ".sql": "sql",
    };

    const extension = Object.keys(extensionMap).find((ext) =>
      filePath.endsWith(ext),
    );
    return extension ? extensionMap[extension] : null;
  }
}

export default new SyntaxHighlighterPlugin();
