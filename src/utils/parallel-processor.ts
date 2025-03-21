import { logger } from "./logger";
import pLimit from "p-limit";

/**
 * Parallel processor utility
 */
export class ParallelProcessor {
  private concurrency: number;
  private limit: ReturnType<typeof pLimit>;

  constructor(concurrency = 5) {
    this.concurrency = concurrency;
    this.limit = pLimit(concurrency);
  }

  /**
   * Process items in parallel with concurrency limit
   */
  public async process<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: {
      onProgress?: (processed: number, total: number) => void;
      onError?: (error: Error, item: T, index: number) => void;
      stopOnError?: boolean;
    } = {},
  ): Promise<R[]> {
    const { onProgress, onError, stopOnError = false } = options;
    const results: R[] = [];
    let processed = 0;
    let hasError = false;

    const promises = items.map((item, index) =>
      this.limit(async () => {
        if (stopOnError && hasError) {
          return;
        }

        try {
          const result = await processor(item, index);
          results[index] = result;

          processed++;
          if (onProgress) {
            onProgress(processed, items.length);
          }

          return result;
        } catch (error) {
          hasError = true;

          if (onError) {
            onError(error as Error, item, index);
          } else {
            logger.error(`Error processing item ${index}:`, error);
          }

          if (stopOnError) {
            throw error;
          }
        }
      }),
    );

    await Promise.all(promises);
    return results.filter((result) => result !== undefined) as R[];
  }

  /**
   * Set concurrency limit
   */
  public setConcurrency(concurrency: number): void {
    this.concurrency = concurrency;
    this.limit = pLimit(concurrency);
  }

  /**
   * Get current concurrency limit
   */
  public getConcurrency(): number {
    return this.concurrency;
  }
}
