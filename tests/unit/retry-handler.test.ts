import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { RetryHandler } from "../../src/utils/retry-handler";

describe("RetryHandler", () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock setTimeout to resolve immediately
    jest.spyOn(global, "setTimeout").mockImplementation((callback: any) => {
      callback();
      return 0 as any;
    });
  });

  it("should execute a function successfully without retries", async () => {
    const mockFn = jest.fn().mockResolvedValue("success");

    const result = await RetryHandler.withRetry(mockFn);

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(setTimeout).not.toHaveBeenCalled();
  });

  it("should retry on failure and eventually succeed", async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockResolvedValue("success");

    const result = await RetryHandler.withRetry(mockFn);

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(setTimeout).toHaveBeenCalledTimes(2);
  });

  it("should fail after exhausting retries", async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error("ECONNRESET"));

    await expect(
      RetryHandler.withRetry(mockFn, { maxRetries: 2 }),
    ).rejects.toThrow("ECONNRESET");

    expect(mockFn).toHaveBeenCalledTimes(3); // Initial attempt + 2 retries
    expect(setTimeout).toHaveBeenCalledTimes(2);
  });

  it("should not retry for non-retryable errors", async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValue(new Error("Non-retryable error"));

    await expect(
      RetryHandler.withRetry(mockFn, {
        retryableErrors: ["ECONNRESET", "ETIMEDOUT"],
      }),
    ).rejects.toThrow("Non-retryable error");

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(setTimeout).not.toHaveBeenCalled();
  });

  it("should use exponential backoff for delays", async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockResolvedValue("success");

    // Capture the actual delays
    const delays: number[] = [];
    jest
      .spyOn(global, "setTimeout")
      .mockImplementation((callback: any, delay: number) => {
        delays.push(delay);
        callback();
        return 0 as any;
      });

    await RetryHandler.withRetry(mockFn, {
      initialDelay: 1000,
      backoffFactor: 2,
      maxDelay: 10000,
    });

    // Check that the second delay is approximately twice the first
    // (with some allowance for jitter)
    expect(delays[1]).toBeGreaterThan(delays[0] * 1.5);
    expect(delays[1]).toBeLessThan(delays[0] * 2.5);
  });

  it("should respect maxDelay", async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockRejectedValueOnce(new Error("ENOTFOUND"))
      .mockResolvedValue("success");

    // Capture the actual delays
    const delays: number[] = [];
    jest
      .spyOn(global, "setTimeout")
      .mockImplementation((callback: any, delay: number) => {
        delays.push(delay);
        callback();
        return 0 as any;
      });

    await RetryHandler.withRetry(mockFn, {
      initialDelay: 1000,
      backoffFactor: 10, // Large backoff factor to hit maxDelay quickly
      maxDelay: 5000,
    });

    // Check that no delay exceeds maxDelay
    expect(Math.max(...delays)).toBeLessThanOrEqual(5000 * 1.2); // Allow for jitter
  });

  it("should call onRetry callback", async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValue("success");

    const onRetry = jest.fn();

    await RetryHandler.withRetry(mockFn, { onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ message: "ECONNRESET" }),
      1,
      expect.any(Number),
    );
  });

  it("should match regex patterns for retryable errors", async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("Connection timeout"))
      .mockResolvedValue("success");

    await RetryHandler.withRetry(mockFn, {
      retryableErrors: [/timeout/i],
    });

    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
