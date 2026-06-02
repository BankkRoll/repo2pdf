import type { Highlighter } from "shiki";
import type { ProcessedFile, RepoFile } from "../types/file.types";
import type { Config } from "../types/config.types";
import { logger } from "../utils/logger";
import { escapeHtml } from "../utils/string-utils";
import { stripComments } from "../utils/comment-stripper";
import { getHighlighter, ensureLanguage } from "../utils/shiki-manager";
import { HookPoint } from "../plugins/plugin-manager";
import { noopPluginRunner, type PluginRunner } from "../plugins/plugin-runner";

/** Files larger than this skip comment stripping to avoid pathological cost. */
const MAX_COMMENT_STRIP_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Processor for code files using Shiki for syntax highlighting.
 *
 * @remarks
 * Highlighting is delegated to a shared, theme-keyed singleton highlighter
 * (see {@link getHighlighter}) so we never create one instance per file.
 */
export class CodeProcessor {
  private config: Config;
  private plugins: PluginRunner;

  constructor(config: Config, plugins: PluginRunner = noopPluginRunner) {
    this.config = config;
    this.plugins = plugins;
  }

  /**
   * Process a code file: apply processing options, run any TRANSFORM_CONTENT
   * plugins, then syntax-highlight.
   */
  public async process(file: RepoFile): Promise<ProcessedFile> {
    try {
      if (!file.content) {
        throw new Error(`File content is empty for ${file.path}`);
      }

      let content = file.content as string;

      if (this.config.processing.removeComments) {
        content = this.removeComments(content, file.language);
      }

      if (this.config.processing.removeEmptyLines) {
        content = this.removeEmptyLines(content);
      }

      // Plugin hook: allow plugins to transform the (post-processing) content
      // before highlighting.
      if (this.plugins.hasHookHandlers(HookPoint.TRANSFORM_CONTENT)) {
        const transformed = await this.plugins.executeHook(
          HookPoint.TRANSFORM_CONTENT,
          content,
          file,
          this.config,
        );
        if (typeof transformed === "string") {
          content = transformed;
        }
      }

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
   * Highlight code using the shared Shiki highlighter, loading the language on
   * demand and falling back to plain text when highlighting is not possible.
   */
  private async highlightCode(code: string, language: string): Promise<string> {
    const theme = this.config.style.theme || "github-dark";
    let highlighter: Highlighter;

    try {
      highlighter = await getHighlighter(theme);
    } catch (error) {
      logger.warn("Failed to initialize syntax highlighter:", error);
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    }

    try {
      const mappedLang = await ensureLanguage(
        highlighter,
        this.mapLanguage(language),
      );

      return this.postProcessHighlight(
        highlighter.codeToHtml(code, { lang: mappedLang, theme }),
      );
    } catch (error) {
      logger.warn(`Failed to highlight code with language ${language}:`, error);
      // Fallback to plain text highlighting (always-loaded "text" grammar).
      try {
        return this.postProcessHighlight(
          highlighter.codeToHtml(code, { lang: "text", theme }),
        );
      } catch {
        return `<pre><code>${escapeHtml(code)}</code></pre>`;
      }
    }
  }

  /**
   * Strip the inline background-color (we apply our own) and collapse the
   * newlines Shiki inserts between line spans (they create visible gaps).
   */
  private postProcessHighlight(html: string): string {
    return html
      .replace(/background-color:[^;"]+;?/g, "")
      .replace(/<\/span>\n<span class="line">/g, '</span><span class="line">');
  }

  /**
   * Map a detected language to a Shiki-supported language id.
   */
  private mapLanguage(language: string): string {
    const languageMap: Record<string, string> = {
      js: "javascript",
      ts: "typescript",
      jsx: "jsx",
      tsx: "tsx",
      mjs: "javascript",
      cjs: "javascript",
      py: "python",
      rb: "ruby",
      md: "markdown",
      yml: "yaml",
      sh: "bash",
      zsh: "bash",
      cs: "csharp",
      "c++": "cpp",
      cc: "cpp",
      h: "c",
      hpp: "cpp",
      rs: "rust",
      kt: "kotlin",
      kts: "kotlin",
      gradle: "groovy",
      conf: "ini",
      ini: "ini",
      properties: "ini",
      htm: "html",
      txt: "text",
      svg: "xml",
    };

    return languageMap[language.toLowerCase()] || language;
  }

  /**
   * Remove comments from code in a string-aware way (does not touch comment-like
   * sequences inside string literals). Best-effort and bounded by file size.
   */
  private removeComments(code: string, language?: string): string {
    if (!language) return code;
    if (code.length > MAX_COMMENT_STRIP_BYTES) {
      logger.warn(
        `Skipping comment removal for large file (${code.length} bytes)`,
      );
      return code;
    }
    try {
      return stripComments(code, language);
    } catch (error) {
      logger.warn(`Failed to remove comments from ${language} code:`, error);
      return code;
    }
  }

  /**
   * Remove empty (whitespace-only) lines from code.
   */
  private removeEmptyLines(code: string): string {
    return code.replace(/^\s*[\r\n]/gm, "");
  }
}
