import type { ProcessedFile, RepoFile } from "../types/file.types";
import type { Config } from "../types/config.types";
import { formatFileSize } from "../utils/file-utils";
import { throwProcessorError } from "../utils/processor-error";

/**
 * Processor for binary files
 */
export class BinaryProcessor {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Process a binary file
   */
  public async process(file: RepoFile): Promise<ProcessedFile> {
    try {
      return {
        ...file,
        processedContent: `Binary file: ${file.path} (${formatFileSize(file.size)})`,
      };
    } catch (error) {
      throwProcessorError("binary", file.path, error);
    }
  }
}
