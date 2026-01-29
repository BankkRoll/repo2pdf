import { describe, expect, it } from "vitest";
import {
  ErrorHandler,
  ErrorType,
  Repo2PDFError,
} from "../src/utils/error-handler";

describe("Repo2PDFError", () => {
  it("creates error with message and type", () => {
    const error = new Repo2PDFError("test error", ErrorType.CONFIGURATION);

    expect(error.message).toBe("test error");
    expect(error.type).toBe(ErrorType.CONFIGURATION);
    expect(error.name).toBe(ErrorType.CONFIGURATION);
  });

  it("defaults to UNKNOWN type", () => {
    const error = new Repo2PDFError("test error");

    expect(error.type).toBe(ErrorType.UNKNOWN);
  });

  it("stores original error", () => {
    const originalError = new Error("original");
    const error = new Repo2PDFError(
      "wrapper",
      ErrorType.NETWORK,
      originalError,
    );

    expect(error.originalError).toBe(originalError);
    expect(error.originalError?.message).toBe("original");
  });

  it("is instanceof Error", () => {
    const error = new Repo2PDFError("test");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(Repo2PDFError);
  });
});

describe("ErrorType", () => {
  it("has all expected error types", () => {
    expect(ErrorType.CONFIGURATION).toBe("ConfigurationError");
    expect(ErrorType.REPOSITORY).toBe("RepositoryError");
    expect(ErrorType.FILE_PROCESSING).toBe("FileProcessingError");
    expect(ErrorType.GENERATION).toBe("GenerationError");
    expect(ErrorType.NETWORK).toBe("NetworkError");
    expect(ErrorType.AUTHENTICATION).toBe("AuthenticationError");
    expect(ErrorType.PERMISSION).toBe("PermissionError");
    expect(ErrorType.TIMEOUT).toBe("TimeoutError");
    expect(ErrorType.UNKNOWN).toBe("UnknownError");
  });
});

describe("ErrorHandler", () => {
  describe("configurationError", () => {
    it("creates configuration error", () => {
      const error = ErrorHandler.configurationError("invalid config");

      expect(error).toBeInstanceOf(Repo2PDFError);
      expect(error.type).toBe(ErrorType.CONFIGURATION);
      expect(error.message).toBe("invalid config");
    });

    it("includes original error", () => {
      const original = new Error("parse failed");
      const error = ErrorHandler.configurationError("invalid config", original);

      expect(error.originalError).toBe(original);
    });
  });

  describe("repositoryError", () => {
    it("creates repository error", () => {
      const error = ErrorHandler.repositoryError("repo not found");

      expect(error.type).toBe(ErrorType.REPOSITORY);
      expect(error.message).toBe("repo not found");
    });
  });

  describe("fileProcessingError", () => {
    it("creates file processing error", () => {
      const error = ErrorHandler.fileProcessingError("failed to process file");

      expect(error.type).toBe(ErrorType.FILE_PROCESSING);
      expect(error.message).toBe("failed to process file");
    });
  });

  describe("generationError", () => {
    it("creates generation error", () => {
      const error = ErrorHandler.generationError("PDF generation failed");

      expect(error.type).toBe(ErrorType.GENERATION);
      expect(error.message).toBe("PDF generation failed");
    });
  });

  describe("networkError", () => {
    it("creates network error", () => {
      const error = ErrorHandler.networkError("connection refused");

      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.message).toBe("connection refused");
    });
  });

  describe("authenticationError", () => {
    it("creates authentication error", () => {
      const error = ErrorHandler.authenticationError("invalid token");

      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.message).toBe("invalid token");
    });
  });

  describe("permissionError", () => {
    it("creates permission error", () => {
      const error = ErrorHandler.permissionError("access denied");

      expect(error.type).toBe(ErrorType.PERMISSION);
      expect(error.message).toBe("access denied");
    });
  });

  describe("timeoutError", () => {
    it("creates timeout error", () => {
      const error = ErrorHandler.timeoutError("operation timed out");

      expect(error.type).toBe(ErrorType.TIMEOUT);
      expect(error.message).toBe("operation timed out");
    });
  });

  describe("error factory methods preserve stack trace", () => {
    it("includes stack trace", () => {
      const error = ErrorHandler.networkError("test");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("networkError");
    });
  });

  describe("error chaining", () => {
    it("chains multiple errors", () => {
      const rootCause = new Error("socket closed");
      const networkError = ErrorHandler.networkError(
        "connection failed",
        rootCause,
      );
      const repoError = ErrorHandler.repositoryError(
        "could not fetch repo",
        networkError,
      );

      expect(repoError.originalError).toBe(networkError);
      expect((repoError.originalError as Repo2PDFError).originalError).toBe(
        rootCause,
      );
    });
  });
});
