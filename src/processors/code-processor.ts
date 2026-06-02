import type { ProcessedFile, RepoFile } from "../types/file.types";
import type { Config } from "../types/config.types";
import { logger } from "../utils/logger";
import { stripComments } from "../utils/comment-stripper";
import { throwProcessorError } from "../utils/processor-error";
import { HookPoint } from "../plugins/plugin-manager";
import { noopPluginRunner, type PluginRunner } from "../plugins/plugin-runner";

/** Files larger than this skip comment stripping to avoid pathological cost. */
const MAX_COMMENT_STRIP_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Processor for code files.
 *
 * @remarks
 * Syntax highlighting is performed downstream by the PDF renderer's own
 * tokenizer, so this processor only applies content transforms (comment
 * stripping, empty-line removal) and the TRANSFORM_CONTENT plugin hook.
 */
export class CodeProcessor {
  private config: Config;
  private plugins: PluginRunner;

  constructor(config: Config, plugins: PluginRunner = noopPluginRunner) {
    this.config = config;
    this.plugins = plugins;
  }

  /**
   * Process a code file: apply processing options and run any
   * TRANSFORM_CONTENT plugins.
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

      // Plugin hook: allow plugins to transform the (post-processing) content.
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

      return {
        ...file,
        processedContent: content,
      };
    } catch (error) {
      throwProcessorError("code", file.path, error);
    }
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
    return code
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0)
      .join("\n");
  }
}
