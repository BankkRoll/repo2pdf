import {
  ErrorHandler,
  ErrorType,
  Repo2PDFError,
} from "../../src/utils/error-handler";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { logger } from "../../src/utils/logger";

// Mock logger
jest.mock("../../src/utils/logger", () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock process.exit
const mockExit = jest.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`Process.exit called with code ${code}`);
});

describe("ErrorHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Repo2PDFError", () => {
    it("should create a custom error with type", () => {
      const error = new Repo2PDFError("Test error", ErrorType.CONFIGURATION);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Test error");
      expect(error.name).toBe(ErrorType.CONFIGURATION);
      expect(error.type).toBe(ErrorType.CONFIGURATION);
    });

    it("should store original error if provided", () => {
      const originalError = new Error("Original error");
      const error = new Repo2PDFError(
        "Test error",
        ErrorType.NETWORK,
        originalError,
      );

      expect(error.originalError).toBe(originalError);
    });
  });

  describe("handle", () => {
    it("should log Repo2PDFError with type", () => {
      const error = new Repo2PDFError("Test error", ErrorType.CONFIGURATION);

      expect(() => ErrorHandler.handle(error)).toThrow(
        "Process.exit called with code 1",
      );
      expect(logger.error).toHaveBeenCalledWith(
        "ConfigurationError: Test error",
      );
    });

    it("should log original error if available", () => {
      const originalError = new Error("Original error");
      const error = new Repo2PDFError(
        "Test error",
        ErrorType.NETWORK,
        originalError,
      );

      expect(() => ErrorHandler.handle(error)).toThrow(
        "Process.exit called with code 1",
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "Original error:",
        originalError,
      );
    });

    it("should log regular Error", () => {
      const error = new Error("Regular error");

      expect(() => ErrorHandler.handle(error)).toThrow(
        "Process.exit called with code 1",
      );
      expect(logger.error).toHaveBeenCalledWith("Error: Regular error");
      expect(logger.debug).toHaveBeenCalledWith("Stack trace:", error.stack);
    });

    it("should include context if provided", () => {
      const error = new Error("Test error");

      expect(() => ErrorHandler.handle(error, "TestContext")).toThrow(
        "Process.exit called with code 1",
      );
      expect(logger.error).toHaveBeenCalledWith(
        "[TestContext] Error: Test error",
      );
    });
  });

  describe("error factory methods", () => {
    it("should create configuration error", () => {
      const error = ErrorHandler.configurationError("Config error");

      expect(error).toBeInstanceOf(Repo2PDFError);
      expect(error.message).toBe("Config error");
      expect(error.type).toBe(ErrorType.CONFIGURATION);
    });

    it("should create repository error", () => {
      const error = ErrorHandler.repositoryError("Repo error");

      expect(error).toBeInstanceOf(Repo2PDFError);
      expect(error.message).toBe("Repo error");
      expect(error.type).toBe(ErrorType.REPOSITORY);
    });

    it("should create file processing error", () => {
      const error = ErrorHandler.fileProcessingError("Processing error");

      expect(error).toBeInstanceOf(Repo2PDFError);
      expect(error.message).toBe("Processing error");
      expect(error.type).toBe(ErrorType.FILE_PROCESSING);
    });

    it("should create generation error", () => {
      const error = ErrorHandler.generationError("Generation error");

      expect(error).toBeInstanceOf(Repo2PDFError);
      expect(error.message).toBe("Generation error");
      expect(error.type).toBe(ErrorType.GENERATION);
    });

    it("should create network error", () => {
      const error = ErrorHandler.networkError("Network error");

      expect(error).toBeInstanceOf(Repo2PDFError);
      expect(error.message).toBe("Network error");
      expect(error.type).toBe(ErrorType.NETWORK);
    });

    it("should create authentication error", () => {
      const error = ErrorHandler.authenticationError("Auth error");

      expect(error).toBeInstanceOf(Repo2PDFError);
      expect(error.message).toBe("Auth error");
      expect(error.type).toBe(ErrorType.AUTHENTICATION);
    });

    it("should create permission error", () => {
      const error = ErrorHandler.permissionError("Permission error");

      expect(error).toBeInstanceOf(Repo2PDFError);
      expect(error.message).toBe("Permission error");
      expect(error.type).toBe(ErrorType.PERMISSION);
    });

    it("should create timeout error", () => {
      const error = ErrorHandler.timeoutError("Timeout error");

      expect(error).toBeInstanceOf(Repo2PDFError);
      expect(error.message).toBe("Timeout error");
      expect(error.type).toBe(ErrorType.TIMEOUT);
    });
  });
});
