import { logger } from "./logger";

/**
 * Log and throw a normalized processor error.
 *
 * @remarks
 * Centralizes the error handling shared by the file processors so each catch
 * block produces a consistent log entry and thrown message.
 *
 * @param type - The processor/file category (e.g. "code", "image", "binary").
 * @param filePath - The path of the file that failed to process.
 * @param err - The underlying error that was caught.
 * @returns Never returns; always throws.
 */
export function throwProcessorError(
  type: string,
  filePath: string,
  err: unknown,
): never {
  logger.error(`Error processing ${type} file ${filePath}:`, err);
  throw new Error(
    `Failed to process ${type} file ${filePath}: ${(err as Error).message}`,
  );
}
