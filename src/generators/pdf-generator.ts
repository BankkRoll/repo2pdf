/**
 * PDF generation orchestrator.
 * @module generators/pdf-generator
 *
 * @description
 * Thin orchestrator over a {@link PdfRenderer}. The default renderer is the
 * pure-JS {@link PdfLibRenderer}, which runs in any runtime (Node, serverless,
 * edge, browser) and returns PDF bytes. This class adds the pieces the renderer
 * stays agnostic about: firing the POST_GENERATE plugin hook and (optionally)
 * writing the bytes to disk for the CLI.
 *
 * The renderer never touches the filesystem — `generateToBytes` returns a
 * `Uint8Array` suitable for an HTTP response, and `generatePDF` is a convenience
 * that also writes the file (Node only).
 */

import fs from "fs";
import type { Config } from "../types/config.types";
import type { GenerationResult } from "../types/output.types";
import type { ProcessedFile } from "../types/file.types";
import { logger } from "../utils/logger";
import { HookPoint } from "../plugins/plugin-manager";
import { noopPluginRunner, type PluginRunner } from "../plugins/plugin-runner";
import { PdfLibRenderer } from "../renderers/pdf-lib-renderer";
import type {
  PdfRenderer,
  RenderRepoInfo,
} from "../renderers/renderer.interface";
import type { HighlightMode } from "../renderers/tokenizers";
import type { Tokenizer } from "../renderers/tokenizer.interface";

/** Options for the PDF generator. */
export interface PdfGeneratorOptions {
  /** Plugin runner for the POST_GENERATE hook (defaults to no-op). */
  plugins?: PluginRunner;
  /** A custom renderer (defaults to the pure-JS pdf-lib renderer). */
  renderer?: PdfRenderer;
  /** Highlight mode for the default renderer: `auto` | `shiki` | `none`. */
  highlight?: HighlightMode;
  /** A custom tokenizer for the default renderer. */
  tokenizer?: Tokenizer;
}

/**
 * Generates PDF documents from processed files.
 */
export class PDFGenerator {
  private config: Config;
  private plugins: PluginRunner;
  private renderer: PdfRenderer;

  constructor(config: Config, options: PdfGeneratorOptions = {}) {
    this.config = config;
    this.plugins = options.plugins ?? noopPluginRunner;
    this.renderer =
      options.renderer ??
      new PdfLibRenderer({
        highlight: options.highlight,
        tokenizer: options.tokenizer,
      });
  }

  /**
   * Render the document to PDF bytes — no filesystem access.
   *
   * @remarks
   * This is the runtime-agnostic entry point: a Next.js route or edge function
   * returns these bytes directly in the HTTP response.
   */
  public async generateToBytes(
    files: ProcessedFile[],
    repoInfo: RenderRepoInfo,
  ): Promise<Uint8Array> {
    const bytes = await this.renderer.render(files, repoInfo, this.config);

    // POST_GENERATE: notify plugins after the bytes are produced.
    await this.plugins.executeHook(
      HookPoint.POST_GENERATE,
      {
        format: "pdf",
        outputPath: this.config.output.outputPath,
        byteLength: bytes.length,
      },
      this.config,
    );

    return bytes;
  }

  /**
   * Render the document and write it to `outputPath` (Node only).
   */
  public async generatePDF(
    files: ProcessedFile[],
    repoInfo: RenderRepoInfo,
    outputPath: string,
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    try {
      const bytes = await this.generateToBytes(files, repoInfo);
      fs.writeFileSync(outputPath, bytes);
      const stats = fs.statSync(outputPath);
      return {
        success: true,
        outputPath,
        format: "pdf",
        fileSize: stats.size,
        generationTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error("Error generating PDF:", error);
      throw new Error(`Failed to generate PDF: ${(error as Error).message}`);
    }
  }

  /**
   * No-op cleanup retained for API compatibility (the pure-JS renderer holds no
   * external resources).
   */
  public async cleanup(): Promise<void> {
    // Nothing to clean up.
  }
}
