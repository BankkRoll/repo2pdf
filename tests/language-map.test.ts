/**
 * Tests for shared language normalization.
 *
 * Verifies normalizeLanguage resolves aliases/dialects to the highlighter's
 * preferred identifiers, defaults undefined to "text", and passes unknown ids
 * through lowercased.
 */

import { describe, it, expect } from "vitest";
import { normalizeLanguage } from "../src/utils/language-map";

describe("normalizeLanguage", () => {
  it("resolves JavaScript/TypeScript family aliases", () => {
    expect(normalizeLanguage("mjs")).toBe("javascript");
    expect(normalizeLanguage("cjs")).toBe("javascript");
    expect(normalizeLanguage("js")).toBe("javascript");
    expect(normalizeLanguage("ts")).toBe("typescript");
    expect(normalizeLanguage("mts")).toBe("typescript");
    expect(normalizeLanguage("cts")).toBe("typescript");
  });

  it("resolves C-family aliases", () => {
    expect(normalizeLanguage("c++")).toBe("cpp");
    expect(normalizeLanguage("cc")).toBe("cpp");
    expect(normalizeLanguage("cxx")).toBe("cpp");
    expect(normalizeLanguage("hpp")).toBe("cpp");
    expect(normalizeLanguage("h")).toBe("c");
    expect(normalizeLanguage("cs")).toBe("csharp");
  });

  it("resolves JVM aliases", () => {
    expect(normalizeLanguage("kt")).toBe("kotlin");
    expect(normalizeLanguage("kts")).toBe("kotlin");
    expect(normalizeLanguage("gradle")).toBe("groovy");
  });

  it("resolves shell aliases", () => {
    expect(normalizeLanguage("sh")).toBe("bash");
    expect(normalizeLanguage("zsh")).toBe("bash");
    expect(normalizeLanguage("shell")).toBe("bash");
  });

  it("resolves misc dialect aliases", () => {
    expect(normalizeLanguage("rb")).toBe("ruby");
    expect(normalizeLanguage("py")).toBe("python");
    expect(normalizeLanguage("rs")).toBe("rust");
    expect(normalizeLanguage("md")).toBe("markdown");
    expect(normalizeLanguage("yml")).toBe("yaml");
    expect(normalizeLanguage("htm")).toBe("html");
    expect(normalizeLanguage("conf")).toBe("ini");
    expect(normalizeLanguage("properties")).toBe("ini");
    expect(normalizeLanguage("svg")).toBe("xml");
    expect(normalizeLanguage("txt")).toBe("text");
  });

  it("is case-insensitive when matching aliases", () => {
    expect(normalizeLanguage("MJS")).toBe("javascript");
    expect(normalizeLanguage("KTS")).toBe("kotlin");
    expect(normalizeLanguage("CS")).toBe("csharp");
    expect(normalizeLanguage("C++")).toBe("cpp");
    expect(normalizeLanguage("HTM")).toBe("html");
  });

  it('defaults undefined to "text"', () => {
    expect(normalizeLanguage(undefined)).toBe("text");
  });

  it('defaults empty string to "text"', () => {
    // Empty string is falsy, so it takes the same path as undefined.
    expect(normalizeLanguage("")).toBe("text");
  });

  it("passes unknown languages through lowercased", () => {
    expect(normalizeLanguage("typescript")).toBe("typescript");
    expect(normalizeLanguage("Python")).toBe("python");
    expect(normalizeLanguage("ELIXIR")).toBe("elixir");
    expect(normalizeLanguage("SomeUnknownLang")).toBe("someunknownlang");
  });
});
