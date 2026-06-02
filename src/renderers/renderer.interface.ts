/**
 * PDF renderer contract.
 * @module renderers/renderer.interface
 *
 * @description
 * A {@link PdfRenderer} turns processed files into PDF bytes. Returning a
 * `Uint8Array` (rather than writing to disk) is what makes repo2pdf usable in
 * any runtime — a Next.js route returns the bytes in the HTTP response, the CLI
 * writes them to a file, an edge function streams them. No `fs`, no file path
 * baked into the core.
 */

import type { Config } from "../types/config.types";
import type { ProcessedFile } from "../types/file.types";

/** Minimal repository metadata shown on the cover page. */
export interface RenderRepoInfo {
  name: string;
  description?: string;
  url: string;
}

/**
 * Renders processed files to PDF bytes.
 *
 * @remarks
 * Implementations must be self-contained with respect to output: they return
 * the PDF as a `Uint8Array` and never touch the filesystem. Disk writing is the
 * caller's responsibility (the CLI), which keeps the renderer runtime-agnostic.
 */
export interface PdfRenderer {
  /**
   * Render the document to PDF bytes.
   *
   * @param files - Processed files to include
   * @param repoInfo - Repository metadata for the cover page
   * @param config - Full configuration (style, output options, etc.)
   * @returns The complete PDF as bytes
   */
  render(
    files: ProcessedFile[],
    repoInfo: RenderRepoInfo,
    config: Config,
  ): Promise<Uint8Array>;
}
