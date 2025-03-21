import { logger } from "./logger";

/**
 * Error types for repo2pdf
 */
export enum ErrorType {
  CONFIGURATION = "ConfigurationError",
  REPOSITORY = "RepositoryError",
  FILE_PROCESSING = "FileProcessingError",
  GENERATION = "GenerationError",
  NETWORK = "NetworkError",
  AUTHENTICATION = "AuthenticationError",
  PERMISSION = "PermissionError",
  TIMEOUT = "TimeoutError",
  UNKNOWN = "UnknownError",
}

/**
 * Custom error class for repo2pdf
 */
export class Repo2PDFError extends Error {
  public type: ErrorType;
  public originalError?: Error;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    originalError?: Error,
  ) {
    super(message);
    this.name = type;
    this.type = type;
    this.originalError = originalError;
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Handle an error
   */
  public static handle(error: Error | Repo2PDFError, context?: string): never {
    if (error instanceof Repo2PDFError) {
      logger.error(
        `${context ? `[${context}] ` : ""}${error.type}: ${error.message}`,
      );

      if (error.originalError) {
        logger.debug("Original error:", error.originalError);
      }
    } else {
      logger.error(`${context ? `[${context}] ` : ""}Error: ${error.message}`);
      logger.debug("Stack trace:", error.stack);
    }

    process.exit(1);
  }

  /**
   * Create a configuration error
   */
  public static configurationError(
    message: string,
    originalError?: Error,
  ): Repo2PDFError {
    return new Repo2PDFError(message, ErrorType.CONFIGURATION, originalError);
  }

  /**
   * Create a repository error
   */
  public static repositoryError(
    message: string,
    originalError?: Error,
  ): Repo2PDFError {
    return new Repo2PDFError(message, ErrorType.REPOSITORY, originalError);
  }

  /**
   * Create a file processing error
   */
  public static fileProcessingError(
    message: string,
    originalError?: Error,
  ): Repo2PDFError {
    return new Repo2PDFError(message, ErrorType.FILE_PROCESSING, originalError);
  }

  /**
   * Create a generation error
   */
  public static generationError(
    message: string,
    originalError?: Error,
  ): Repo2PDFError {
    return new Repo2PDFError(message, ErrorType.GENERATION, originalError);
  }

  /**
   * Create a network error
   */
  public static networkError(
    message: string,
    originalError?: Error,
  ): Repo2PDFError {
    return new Repo2PDFError(message, ErrorType.NETWORK, originalError);
  }

  /**
   * Create an authentication error
   */
  public static authenticationError(
    message: string,
    originalError?: Error,
  ): Repo2PDFError {
    return new Repo2PDFError(message, ErrorType.AUTHENTICATION, originalError);
  }

  /**
   * Create a permission error
   */
  public static permissionError(
    message: string,
    originalError?: Error,
  ): Repo2PDFError {
    return new Repo2PDFError(message, ErrorType.PERMISSION, originalError);
  }

  /**
   * Create a timeout error
   */
  public static timeoutError(
    message: string,
    originalError?: Error,
  ): Repo2PDFError {
    return new Repo2PDFError(message, ErrorType.TIMEOUT, originalError);
  }
}
