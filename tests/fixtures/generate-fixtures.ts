/**
 * Deterministic test fixture generator.
 *
 * @description
 * Produces self-contained, network-free fixtures used by the test suite:
 *   - edge-cases/       : tricky files (empty, CRLF, unicode, long lines, ...)
 *   - multi-language/   : one minimal file per supported language
 *   - synthetic-large/  : 1000+ deterministic files for the incremental path
 *
 * The output is generated procedurally (seeded, no randomness) so CI never needs
 * to clone anything. Generated directories are git-ignored; tests call
 * {@link generateAllFixtures} from a global setup step.
 */

import fs from "fs";
import path from "path";

export const FIXTURES_DIR = __dirname;
export const EDGE_CASES_DIR = path.join(FIXTURES_DIR, "edge-cases");
export const MULTI_LANGUAGE_DIR = path.join(FIXTURES_DIR, "multi-language");
export const SYNTHETIC_LARGE_DIR = path.join(FIXTURES_DIR, "synthetic-large");

/** Languages with a minimal sample, keyed by file extension. */
const LANGUAGE_SAMPLES: Record<string, string> = {
  ts: `export const greet = (name: string): string => \`Hi \${name}\`;\n`,
  js: `function add(a, b) {\n  return a + b;\n}\n`,
  jsx: `export const App = () => <div>Hello</div>;\n`,
  tsx: `export const App = (): JSX.Element => <div>Hi</div>;\n`,
  py: `def fib(n):\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\n`,
  rb: `def greet(name)\n  "Hello #{name}"\nend\n`,
  go: `package main\n\nimport "fmt"\n\nfunc main() { fmt.Println("hi") }\n`,
  rs: `fn main() {\n    println!("Hello");\n}\n`,
  java: `public class Main {\n  public static void main(String[] a) {}\n}\n`,
  c: `#include <stdio.h>\nint main(void) { return 0; }\n`,
  cpp: `#include <iostream>\nint main() { std::cout << "hi"; }\n`,
  cs: `class Program { static void Main() {} }\n`,
  php: `<?php\nfunction greet($n) { return "Hi $n"; }\n`,
  swift: `func greet(_ name: String) -> String { "Hi \\(name)" }\n`,
  kt: `fun main() { println("Hello") }\n`,
  sh: `#!/bin/bash\necho "hello"\n`,
  yml: `name: test\nvalues:\n  - one\n  - two\n`,
  yaml: `key: value\nlist:\n  - a\n  - b\n`,
  toml: `[package]\nname = "demo"\nversion = "1.0.0"\n`,
  json: `{\n  "name": "demo",\n  "version": "1.0.0"\n}\n`,
  md: `# Title\n\nSome **markdown** text with a [link](https://example.com).\n`,
  html: `<!DOCTYPE html>\n<html><body><h1>Hi</h1></body></html>\n`,
  css: `.button {\n  color: #fff;\n  background: #000;\n}\n`,
  scss: `$primary: #fff;\n.button { color: $primary; }\n`,
  sql: `SELECT id, name FROM users WHERE active = 1;\n`,
  xml: `<?xml version="1.0"?>\n<root><item>value</item></root>\n`,
};

/** Write a file, creating parent directories as needed. */
function writeFile(filePath: string, content: string | Buffer): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

/**
 * Generate edge-case fixtures: files that exercise unusual content/paths.
 */
export function generateEdgeCases(): void {
  const dir = EDGE_CASES_DIR;

  // Empty file
  writeFile(path.join(dir, "empty.txt"), "");

  // File with no extension (README-style)
  writeFile(path.join(dir, "LICENSE"), "MIT License\n\nCopyright (c) 2025\n");
  writeFile(path.join(dir, "Makefile"), "all:\n\techo build\n");

  // CRLF line endings preserved
  writeFile(
    path.join(dir, "crlf.js"),
    "const a = 1;\r\nconst b = 2;\r\nconsole.log(a + b);\r\n",
  );

  // Mixed EOL
  writeFile(path.join(dir, "mixed-eol.txt"), "line1\nline2\r\nline3\n");

  // Unicode + emoji content
  writeFile(
    path.join(dir, "unicode.ts"),
    'const greeting = "こんにちは 🌍 café";\nexport default greeting;\n',
  );

  // Unicode filename
  writeFile(path.join(dir, "café-☕.md"), "# Unicode filename\n");

  // Very long single line (15k chars)
  writeFile(
    path.join(dir, "long-line.js"),
    `const data = "${"x".repeat(15000)}";\n`,
  );

  // Comment-with-string edge cases (for the string-aware comment stripper)
  writeFile(
    path.join(dir, "comment-edge.ts"),
    [
      'const url = "https://example.com"; // real comment',
      "const block = `/* not a comment */`;",
      "/* a real block comment */",
      "const x = 1; // trailing",
      "",
    ].join("\n"),
  );

  // Deeply nested directory
  const deep = path.join(dir, "a", "b", "c", "d", "e", "f");
  writeFile(path.join(deep, "deep.ts"), "export const depth = 6;\n");

  // Small binary file (non-UTF8 bytes)
  writeFile(
    path.join(dir, "data.bin"),
    Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]),
  );

  // Minimal valid PNG (1x1 transparent pixel)
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAQDQ2QkAAAAASUVORK5CYII=",
    "base64",
  );
  writeFile(path.join(dir, "pixel.png"), png);

  // Hidden dotfile
  writeFile(path.join(dir, ".hidden-config.json"), '{ "hidden": true }\n');
}

/**
 * Generate one minimal file per supported language.
 */
export function generateMultiLanguage(): void {
  for (const [ext, content] of Object.entries(LANGUAGE_SAMPLES)) {
    writeFile(path.join(MULTI_LANGUAGE_DIR, `sample.${ext}`), content);
  }
}

/**
 * Generate a synthetic large repo with `count` deterministic files spread
 * across nested directories — enough to trigger the incremental-processing path
 * (which activates above 100 files).
 *
 * @param count - Number of files to generate (default 250)
 */
export function generateSyntheticLarge(count = 250): void {
  for (let i = 0; i < count; i++) {
    const dirIndex = i % 10;
    const filePath = path.join(
      SYNTHETIC_LARGE_DIR,
      `module-${dirIndex}`,
      `file-${i}.ts`,
    );
    const content =
      `// Generated file ${i}\n` +
      `export const value${i} = ${i};\n` +
      `export function compute${i}(x: number): number {\n` +
      `  return x * ${i} + ${dirIndex};\n` +
      `}\n`;
    writeFile(filePath, content);
  }
}

/**
 * Generate all fixtures. Idempotent — skips generation if the directories
 * already look populated (so repeated test runs are fast).
 *
 * @param force - Regenerate even if the directories already exist
 */
export function generateAllFixtures(force = false): void {
  const exists =
    fs.existsSync(EDGE_CASES_DIR) &&
    fs.existsSync(MULTI_LANGUAGE_DIR) &&
    fs.existsSync(SYNTHETIC_LARGE_DIR);
  if (exists && !force) {
    return;
  }
  generateEdgeCases();
  generateMultiLanguage();
  generateSyntheticLarge();
}

// Allow running directly: `ts-node tests/fixtures/generate-fixtures.ts`
if (require.main === module) {
  generateAllFixtures(true);
  // eslint-disable-next-line no-console
  console.log("Fixtures generated.");
}
