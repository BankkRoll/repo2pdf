import { logger } from "./logger";

/**
 * Options for retry handler
 */
export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors?: Array<string | RegExp>;
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

/**
 * Default retry options
 */
const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  retryableErrors: [
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ENOTFOUND",
    "ENETUNREACH",
    "EAI_AGAIN",
    "socket hang up",
    "network error",
    "Network Error",
    "429", // Too Many Requests
    "500", // Internal Server Error
    "502", // Bad Gateway
    "503", // Service Unavailable
    "504", // Gateway Timeout
    /timeout/i,
    /rate limit/i,
  ],
};

/**
 * Retry handler utility for network operations
 */
export class RetryHandler {
  /**
   * Execute a function with retry logic
   */
  public static async withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {},
  ): Promise<T> {
    const retryOptions: RetryOptions = { ...defaultRetryOptions, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= retryOptions.maxRetries + 1; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry
        if (
          attempt <= retryOptions.maxRetries &&
          this.isRetryableError(error as Error, retryOptions.retryableErrors)
        ) {
          // Calculate delay with exponential backoff
          const delay = Math.min(
            retryOptions.initialDelay *
              Math.pow(retryOptions.backoffFactor, attempt - 1),
            retryOptions.maxDelay,
          );

          // Add some jitter to prevent thundering herd
          const jitteredDelay = delay * (0.8 + Math.random() * 0.4);

          logger.warn(
            `Attempt ${attempt} failed with error: ${(error as Error).message}. Retrying in ${Math.round(
              jitteredDelay,
            )}ms...`,
          );

          // Call onRetry callback if provided
          if (retryOptions.onRetry) {
            retryOptions.onRetry(error as Error, attempt, jitteredDelay);
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
        } else {
          // We've exhausted our retries or the error is not retryable
          throw lastError;
        }
      }
    }

    // This should never happen, but TypeScript needs it
    throw lastError;
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(
    error: Error,
    retryableErrors?: Array<string | RegExp>,
  ): boolean {
    if (!retryableErrors || retryableErrors.length === 0) {
      return true; // Retry all errors if no specific errors are provided
    }

    const errorString = error.toString();

    return retryableErrors.some((retryableError) => {
      if (typeof retryableError === "string") {
        return errorString.includes(retryableError);
      } else {
        return retryableError.test(errorString);
      }
    });
  }
}
