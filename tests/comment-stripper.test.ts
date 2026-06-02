/**
 * Tests for the string-aware comment stripper.
 *
 * The key guarantee versus the old naive regex: comment-like sequences that
 * appear INSIDE string literals must be preserved.
 */

import { describe, it, expect } from "vitest";
import { stripComments } from "../src/utils/comment-stripper";

describe("stripComments — C-like languages", () => {
  it("removes a real line comment", () => {
    const out = stripComments("const x = 1; // set x\n", "typescript");
    expect(out).toContain("const x = 1;");
    expect(out).not.toContain("set x");
  });

  it("removes a real block comment", () => {
    const out = stripComments("/* header */\nconst y = 2;\n", "javascript");
    expect(out).not.toContain("header");
    expect(out).toContain("const y = 2;");
  });

  it("preserves // inside a double-quoted string (the classic bug)", () => {
    const out = stripComments('const url = "https://example.com";', "typescript");
    expect(out).toContain("https://example.com");
  });

  it("preserves /* */ inside a string literal", () => {
    const code = 'const s = "a /* not a comment */ b";';
    const out = stripComments(code, "javascript");
    expect(out).toContain("/* not a comment */");
  });

  it("preserves comment markers inside template literals", () => {
    const code = "const t = `// not a comment ${x}`;";
    const out = stripComments(code, "typescript");
    expect(out).toContain("// not a comment");
  });

  it("preserves escaped quotes within strings", () => {
    const code = 'const s = "she said \\"hi //\\""; // real';
    const out = stripComments(code, "typescript");
    expect(out).toContain('she said \\"hi //\\"');
    expect(out).not.toContain("// real");
  });

  it("keeps the newline when removing a line comment (line count stable)", () => {
    const code = "a();\n// comment\nb();\n";
    const out = stripComments(code, "javascript");
    expect(out.split("\n").length).toBe(code.split("\n").length);
  });

  it("preserves CRLF line endings", () => {
    const code = "const a = 1;\r\n// c\r\nconst b = 2;\r\n";
    const out = stripComments(code, "typescript");
    expect(out).toContain("\r\n");
  });

  it("handles CSS block comments", () => {
    const out = stripComments(".a { color: red; } /* c */", "css");
    expect(out).not.toContain("/* c */");
    expect(out).toContain("color: red;");
  });
});

describe("stripComments — hash languages", () => {
  it("removes a python # comment", () => {
    const out = stripComments("x = 1  # assign\n", "python");
    expect(out).toContain("x = 1");
    expect(out).not.toContain("assign");
  });

  it("preserves # inside a string", () => {
    const out = stripComments('s = "a # b"\n', "python");
    expect(out).toContain("# b");
  });

  it("does not treat // as a comment in hash languages", () => {
    const out = stripComments("path = a // b\n", "python");
    expect(out).toContain("// b");
  });
});

describe("stripComments — markup languages", () => {
  it("removes HTML comments", () => {
    const out = stripComments("<div><!-- hi --></div>", "html");
    expect(out).not.toContain("hi");
    expect(out).toContain("<div></div>");
  });
});

describe("stripComments — unsupported / edge", () => {
  it("returns input unchanged for an unknown language", () => {
    const code = "SOME ## weird @@ syntax //";
    expect(stripComments(code, "brainfuck")).toBe(code);
  });

  it("returns input unchanged when language is undefined", () => {
    const code = "// looks like a comment";
    expect(stripComments(code, undefined)).toBe(code);
  });

  it("handles empty input", () => {
    expect(stripComments("", "typescript")).toBe("");
  });
});
