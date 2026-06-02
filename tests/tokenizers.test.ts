/**
 * Tests for the renderer tokenizers.
 *
 * - PlainTokenizer: zero-dependency, one uncolored run per line, blank lines
 *   become empty arrays.
 * - ShikiTokenizer: real syntax tokenization in Node — tokens carry text and
 *   (for at least some runs) a hex color, with one line per source line.
 * - resolveTokenizer: picks plain for "none", a colored tokenizer for "auto" in
 *   Node, and respects an injected custom tokenizer.
 *
 * These run offline and deterministically (Shiki loads its bundled grammars in
 * Node — no network).
 */

import { describe, it, expect, afterAll } from "vitest";
import { PlainTokenizer } from "../src/renderers/tokenizers/plain-tokenizer";
import { ShikiTokenizer } from "../src/renderers/tokenizers/shiki-tokenizer";
import { resolveTokenizer } from "../src/renderers/tokenizers/index";
import type {
  Tokenizer,
  TokenizedLine,
} from "../src/renderers/tokenizer.interface";

/** True if any token in any line carries a hex color. */
function hasHexColor(lines: TokenizedLine[]): boolean {
  return lines.some((line) =>
    line.some(
      (token) =>
        typeof token.color === "string" &&
        /^#[0-9a-fA-F]{3,8}$/.test(token.color),
    ),
  );
}

describe("PlainTokenizer", () => {
  it("emits one line per source line", () => {
    const tokenizer = new PlainTokenizer();
    const code = "const a = 1;\nconst b = 2;\nconst c = 3;";
    const lines = tokenizer.tokenize(code);
    expect(lines).toHaveLength(3);
  });

  it("represents blank lines as empty arrays", () => {
    const tokenizer = new PlainTokenizer();
    const code = "first\n\nthird";
    const lines = tokenizer.tokenize(code);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual([{ text: "first" }]);
    expect(lines[1]).toEqual([]);
    expect(lines[2]).toEqual([{ text: "third" }]);
  });

  it("emits a single uncolored run per non-empty line", () => {
    const tokenizer = new PlainTokenizer();
    const lines = tokenizer.tokenize("hello world");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveLength(1);
    expect(lines[0][0].text).toBe("hello world");
    expect(lines[0][0].color).toBeUndefined();
  });

  it("applies no colors anywhere", () => {
    const tokenizer = new PlainTokenizer();
    const lines = tokenizer.tokenize("function f() {\n  return 1;\n}");
    expect(hasHexColor(lines)).toBe(false);
  });
});

describe("ShikiTokenizer", () => {
  const tokenizer = new ShikiTokenizer();

  afterAll(async () => {
    if (typeof tokenizer.dispose === "function") {
      await tokenizer.dispose();
    }
  });

  it("tokenizes TypeScript with at least one colored token", async () => {
    const code = 'const greeting: string = "hello";\nconsole.log(greeting);';
    const lines = await tokenizer.tokenize(code, "typescript", "github-light");

    expect(lines).toHaveLength(2);
    // Every token must carry text.
    for (const line of lines) {
      for (const token of line) {
        expect(typeof token.text).toBe("string");
      }
    }
    // Real highlighting => at least some token has a hex color.
    expect(hasHexColor(lines)).toBe(true);
  });

  it("matches the source line count for several languages", async () => {
    const cases: Array<{ language: string; code: string }> = [
      {
        language: "typescript",
        code: "export const x: number = 1;\nexport const y: number = 2;",
      },
      {
        language: "python",
        code: "def add(a, b):\n    return a + b\n\nprint(add(1, 2))",
      },
      {
        language: "json",
        code: '{\n  "name": "repo2pdf",\n  "version": 3\n}',
      },
      {
        language: "rust",
        code: 'fn main() {\n    println!("Hello, world!");\n}',
      },
    ];

    for (const { language, code } of cases) {
      const lines = await tokenizer.tokenize(code, language, "github-light");
      const expectedLineCount = code.split("\n").length;
      expect(lines, `line count for ${language}`).toHaveLength(
        expectedLineCount,
      );
      expect(hasHexColor(lines), `colors for ${language}`).toBe(true);
    }
  });
});

describe("resolveTokenizer", () => {
  it('returns a PlainTokenizer instance for "none"', async () => {
    const tokenizer = await resolveTokenizer("none");
    expect(tokenizer).toBeInstanceOf(PlainTokenizer);
  });

  it('returns a colored tokenizer for "auto" in Node', async () => {
    const tokenizer = await resolveTokenizer("auto");
    const lines = await tokenizer.tokenize(
      "const x: number = 1;",
      "typescript",
      "github-light",
    );
    expect(hasHexColor(lines)).toBe(true);

    if (typeof tokenizer.dispose === "function") {
      await tokenizer.dispose();
    }
  });

  it("returns the injected tokenizer when one is provided", async () => {
    const injected: Tokenizer = {
      tokenize: () => [[{ text: "injected" }]],
    };
    const resolved = await resolveTokenizer("auto", injected);
    expect(resolved).toBe(injected);

    // Injection takes precedence even over "none".
    const resolvedNone = await resolveTokenizer("none", injected);
    expect(resolvedNone).toBe(injected);
  });
});
