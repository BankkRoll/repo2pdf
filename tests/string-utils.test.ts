/**
 * Tests for shared string utilities, focused on HTML escaping / XSS safety.
 */

import { describe, it, expect } from "vitest";
import { escapeHtml } from "../src/utils/string-utils";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml("&")).toBe("&amp;");
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml(">")).toBe("&gt;");
    expect(escapeHtml('"')).toBe("&quot;");
    expect(escapeHtml("'")).toBe("&#039;");
  });

  it("neutralizes a script-tag XSS payload", () => {
    const out = escapeHtml('<script>alert("xss")</script>');
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("escapes attribute-breaking quotes for safe attribute context", () => {
    const out = escapeHtml('" onmouseover="alert(1)');
    expect(out).not.toContain('"');
    expect(out).toContain("&quot;");
  });

  it("escapes ampersand first so existing entities are not double-mangled incorrectly", () => {
    // & must become &amp; (the < that follows is independently escaped)
    expect(escapeHtml("a & b < c")).toBe("a &amp; b &lt; c");
  });

  it("leaves plain text and URLs without special chars unchanged", () => {
    expect(escapeHtml("https://example.com/path")).toBe(
      "https://example.com/path",
    );
    expect(escapeHtml("hello world 123")).toBe("hello world 123");
  });

  it("handles unicode and emoji without altering them", () => {
    expect(escapeHtml("café ☕ 🌍 こんにちは")).toBe("café ☕ 🌍 こんにちは");
  });

  it("returns an empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("escapes a javascript: URI's angle/quote chars (defense in depth)", () => {
    const out = escapeHtml("<a href=\"javascript:alert('x')\">");
    expect(out).not.toContain("<a");
    expect(out).not.toContain('"');
    expect(out).not.toContain("'");
  });
});
