import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Logger } from "../src/utils/logger";

describe("Logger", () => {
  let logger: Logger;
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    logger = new Logger();
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("info", () => {
    it("logs info messages with prefix", () => {
      logger.info("test message");
      expect(consoleSpy.log).toHaveBeenCalledWith("[INFO] test message");
    });

    it("logs info messages with additional args", () => {
      logger.info("test message", { key: "value" });
      expect(consoleSpy.log).toHaveBeenCalledWith("[INFO] test message", {
        key: "value",
      });
    });
  });

  describe("warn", () => {
    it("logs warning messages with prefix", () => {
      logger.warn("warning message");
      expect(consoleSpy.warn).toHaveBeenCalledWith("[WARN] warning message");
    });

    it("logs warning messages with additional args", () => {
      logger.warn("warning", 123, true);
      expect(consoleSpy.warn).toHaveBeenCalledWith("[WARN] warning", 123, true);
    });
  });

  describe("error", () => {
    it("logs error messages with prefix", () => {
      logger.error("error message");
      expect(consoleSpy.error).toHaveBeenCalledWith("[ERROR] error message");
    });

    it("logs error messages with additional args", () => {
      const err = new Error("test");
      logger.error("error occurred", err);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "[ERROR] error occurred",
        err,
      );
    });
  });

  describe("debug", () => {
    it("does not log debug messages when debug mode is off", () => {
      logger.debug("debug message");
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it("logs debug messages when debug mode is on", () => {
      logger.setDebugMode(true);
      logger.debug("debug message");
      expect(consoleSpy.debug).toHaveBeenCalledWith("[DEBUG] debug message");
    });

    it("logs debug messages with additional args when debug mode is on", () => {
      logger.setDebugMode(true);
      logger.debug("debug", { data: 123 });
      expect(consoleSpy.debug).toHaveBeenCalledWith("[DEBUG] debug", {
        data: 123,
      });
    });

    it("stops logging debug messages after debug mode is turned off", () => {
      logger.setDebugMode(true);
      logger.debug("first");
      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);

      logger.setDebugMode(false);
      logger.debug("second");
      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe("success", () => {
    it("logs success messages with prefix", () => {
      logger.success("operation completed");
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "[SUCCESS] operation completed",
      );
    });
  });

  describe("progress", () => {
    it("logs progress with percentage", () => {
      logger.progress("Processing files", 50, 100);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "[PROGRESS] Processing files: 50/100 (50%)",
      );
    });

    it("calculates percentage correctly", () => {
      logger.progress("Loading", 1, 4);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "[PROGRESS] Loading: 1/4 (25%)",
      );
    });

    it("handles zero total", () => {
      logger.progress("Empty", 0, 0);
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it("rounds percentage", () => {
      logger.progress("Processing", 1, 3);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "[PROGRESS] Processing: 1/3 (33%)",
      );
    });
  });

  describe("setDebugMode", () => {
    it("enables debug mode", () => {
      logger.setDebugMode(true);
      logger.debug("test");
      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it("disables debug mode", () => {
      logger.setDebugMode(true);
      logger.setDebugMode(false);
      logger.debug("test");
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });
  });
});
