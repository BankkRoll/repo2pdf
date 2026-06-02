/**
 * Unit tests for the centralized processor error helper.
 *
 * `throwProcessorError` normalizes the catch-block behavior shared by the file
 * processors: it always throws (typed `never`) with a consistent, prefixed
 * message of the form `Failed to process <type> file <path>: <cause>`.
 */

import { describe, expect, it } from "vitest";
import { throwProcessorError } from "../src/utils/processor-error";

describe("throwProcessorError", () => {
  it("throws a normalized message including type, path, and cause", () => {
    expect(() =>
      throwProcessorError("code", "x.ts", new Error("boom")),
    ).toThrow("Failed to process code file x.ts: boom");
  });

  it("throws an Error instance", () => {
    let caught: unknown;
    try {
      throwProcessorError("code", "x.ts", new Error("boom"));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe(
      "Failed to process code file x.ts: boom",
    );
  });

  it("always throws, so it narrows as `never` after the call", () => {
    // If `throwProcessorError` were not typed `never`, `value` would be
    // considered possibly-assigned; the code after the call is unreachable.
    const run = (): string => {
      const value = "unreachable";
      throwProcessorError("code", "x.ts", new Error("boom"));
      // The following line is statically unreachable; included to assert the
      // `never` return type lets TypeScript treat it as dead code at compile
      // time. It must not execute at runtime.
      return value;
    };

    expect(run).toThrow("Failed to process code file x.ts: boom");
  });

  it("incorporates the file path and type into the message", () => {
    expect(() =>
      throwProcessorError("image", "assets/logo.png", new Error("decode fail")),
    ).toThrow("Failed to process image file assets/logo.png: decode fail");
  });
});
