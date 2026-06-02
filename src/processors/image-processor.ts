import type { ProcessedFile, RepoFile } from "../types/file.types";
import { throwProcessorError } from "../utils/processor-error";

/**
 * Processor for image files.
 *
 * @remarks
 * The pure-JS PDF renderer represents images with a placeholder rather than
 * embedding pixels, so this processor only validates that content exists and
 * normalizes the file into a {@link ProcessedFile}.
 */
export class ImageProcessor {
  /**
   * Process an image file.
   */
  public async process(file: RepoFile): Promise<ProcessedFile> {
    try {
      if (!file.content) {
        throw new Error(`Image content is empty for ${file.path}`);
      }

      return {
        ...file,
        processedContent: "",
      };
    } catch (error) {
      throwProcessorError("image", file.path, error);
    }
  }
}
