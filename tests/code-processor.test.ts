import { describe, expect, it } from "vitest";
import { CodeProcessor } from "../src/processors/code-processor";
import { HookPoint } from "../src/plugins/plugin-manager";
import type { PluginRunner } from "../src/plugins/plugin-runner";
import type { Config } from "../src/types/config.types";
import type { RepoFile } from "../src/types/file.types";

const createConfig = (overrides: Partial<Config> = {}): Config => ({
  repository: {
    url: "https://github.com/test/repo",
    branch: "main",
    vcsType: "github",
    localPath: "",
    useCache: false,
    ...overrides.repository,
  },
  output: {
    format: "pdf",
    outputPath: "./test.pdf",
    singleFile: true,
    pageSize: "A4",
    landscape: false,
    margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
    ...overrides.output,
  },
  style: {
    theme: "github-light",
    fontSize: "14px",
    fontFamily: "monospace",
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
    customCSS: "",
    ...overrides.style,
  },
  processing: {
    ignorePatterns: [],
    maxConcurrency: 5,
    removeComments: false,
    removeEmptyLines: false,
    includeBinaryFiles: true,
    includeHiddenFiles: false,
    timeout: 300000,
    useIncrementalProcessing: true,
    incrementalChunkSize: 100,
    ...overrides.processing,
  },
  cache: {
    enabled: false,
    ttl: 86400000,
    cacheDir: "./.repo2pdf-cache",
    ...overrides.cache,
  },
  debug: overrides.debug ?? false,
});

const createFile = (overrides: Partial<RepoFile> = {}): RepoFile => ({
  name: "test.ts",
  path: "src/test.ts",
  content: "const x = 1;",
  size: 12,
  type: "code",
  extension: "ts",
  language: "typescript",
  isDirectory: false,
  ...overrides,
});

/**
 * A representative spread of languages. Highlighting now happens in the
 * renderer's tokenizer (covered by the tokenizer tests), so here we only assert
 * that `process()` preserves the raw content across languages when no
 * transforms are enabled.
 */
const LANGUAGES = [
  // Web
  {
    name: "TypeScript",
    file: "test.ts",
    lang: "typescript",
    code: 'const x: string = "hello";',
  },
  {
    name: "JavaScript",
    file: "test.js",
    lang: "javascript",
    code: 'function greet() { return "hi"; }',
  },
  {
    name: "TSX",
    file: "App.tsx",
    lang: "tsx",
    code: "const App = () => <div>Hello</div>;",
  },
  {
    name: "JSX",
    file: "App.jsx",
    lang: "jsx",
    code: "function App() { return <div>Hi</div>; }",
  },
  {
    name: "HTML",
    file: "index.html",
    lang: "html",
    code: "<!DOCTYPE html><html><body></body></html>",
  },
  { name: "CSS", file: "styles.css", lang: "css", code: "body { margin: 0; }" },
  {
    name: "SCSS",
    file: "styles.scss",
    lang: "scss",
    code: "$color: #333; body { color: $color; }",
  },
  {
    name: "Vue",
    file: "App.vue",
    lang: "vue",
    code: "<template><div>{{ msg }}</div></template>",
  },

  // Systems
  {
    name: "C",
    file: "main.c",
    lang: "c",
    code: "#include <stdio.h>\nint main() { return 0; }",
  },
  {
    name: "C++",
    file: "main.cpp",
    lang: "cpp",
    code: "#include <iostream>\nint main() { return 0; }",
  },
  {
    name: "Rust",
    file: "main.rs",
    lang: "rust",
    code: 'fn main() { println!("Hello"); }',
  },
  {
    name: "Go",
    file: "main.go",
    lang: "go",
    code: "package main\nfunc main() {}",
  },

  // JVM / .NET
  {
    name: "Java",
    file: "Main.java",
    lang: "java",
    code: "public class Main { public static void main(String[] args) {} }",
  },
  {
    name: "Kotlin",
    file: "Main.kt",
    lang: "kotlin",
    code: 'fun main() { println("Hello") }',
  },
  {
    name: "C#",
    file: "Program.cs",
    lang: "csharp",
    code: "using System; class Program { static void Main() {} }",
  },

  // Scripting
  {
    name: "Python",
    file: "main.py",
    lang: "python",
    code: 'def hello(): return "world"',
  },
  {
    name: "Ruby",
    file: "main.rb",
    lang: "ruby",
    code: 'def hello; puts "Hi"; end',
  },
  {
    name: "PHP",
    file: "index.php",
    lang: "php",
    code: "<?php echo 'Hello'; ?>",
  },

  // Shell / DevOps
  {
    name: "Bash",
    file: "script.sh",
    lang: "bash",
    code: '#!/bin/bash\necho "Hello"',
  },
  {
    name: "Dockerfile",
    file: "Dockerfile",
    lang: "dockerfile",
    code: "FROM node:18\nRUN npm install",
  },

  // Data / Docs
  { name: "JSON", file: "data.json", lang: "json", code: '{ "name": "test" }' },
  {
    name: "YAML",
    file: "config.yml",
    lang: "yaml",
    code: "name: test\nversion: 1.0",
  },
  {
    name: "Markdown",
    file: "README.md",
    lang: "markdown",
    code: "# Title\n\nText here.",
  },

  // Database
  { name: "SQL", file: "query.sql", lang: "sql", code: "SELECT * FROM users;" },
];

describe("CodeProcessor", () => {
  describe("language support", () => {
    it.each(LANGUAGES)(
      "preserves $name content through process()",
      async ({ file, lang, code }) => {
        const processor = new CodeProcessor(createConfig());
        const result = await processor.process(
          createFile({
            name: file,
            path: `src/${file}`,
            content: code,
            size: code.length,
            language: lang,
            extension: file.split(".").pop() || "",
          }),
        );

        // No transforms enabled, so content is preserved verbatim.
        expect(result.processedContent).toBe(code);
      },
    );

    it("preserves content for every sampled language", async () => {
      const processor = new CodeProcessor(createConfig());
      const failed: string[] = [];

      for (const { name, file, lang, code } of LANGUAGES) {
        try {
          const result = await processor.process(
            createFile({
              name: file,
              path: `src/${file}`,
              content: code,
              size: code.length,
              language: lang,
              extension: file.split(".").pop() || "",
            }),
          );

          if (result.processedContent !== code) {
            failed.push(`${name}: content mismatch`);
          }
        } catch (e) {
          failed.push(`${name}: ${(e as Error).message}`);
        }
      }

      expect(failed).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("throws on empty content", async () => {
      const processor = new CodeProcessor(createConfig());
      await expect(
        processor.process(createFile({ content: "", size: 0 })),
      ).rejects.toThrow("Failed to process code file");
    });

    it("wraps the empty-content cause in the processor error", async () => {
      const processor = new CodeProcessor(createConfig());
      await expect(
        processor.process(createFile({ content: "", size: 0 })),
      ).rejects.toThrow("File content is empty");
    });

    it("throws on null content", async () => {
      const processor = new CodeProcessor(createConfig());
      await expect(
        processor.process(createFile({ content: null as any })),
      ).rejects.toThrow("Failed to process code file");
    });

    it("handles unknown language", async () => {
      const processor = new CodeProcessor(createConfig());
      const result = await processor.process(
        createFile({
          name: "unknown.xyz",
          content: "some text",
          language: "xyz",
          extension: "xyz",
        }),
      );

      expect(result.processedContent).toBe("some text");
    });

    it("handles long content", async () => {
      const processor = new CodeProcessor(createConfig());
      const longContent = "x".repeat(10000);
      const result = await processor.process(
        createFile({ content: longContent, size: longContent.length }),
      );

      expect(result.processedContent).toBe(longContent);
    });

    it("handles special characters", async () => {
      const processor = new CodeProcessor(createConfig());
      const content = '<script>alert("xss")</script>';
      const result = await processor.process(
        createFile({ content, size: content.length }),
      );

      expect(result.processedContent).toBe(content);
    });

    it("handles unicode", async () => {
      const processor = new CodeProcessor(createConfig());
      const content = 'const msg = "Hello, 世界!";';
      const result = await processor.process(
        createFile({ content, size: content.length }),
      );

      expect(result.processedContent).toBe(content);
    });
  });

  describe("content preservation", () => {
    it("returns the file shape with processedContent and no highlightedHtml", async () => {
      const processor = new CodeProcessor(createConfig());
      const file = createFile({ content: "const x = 1;" });
      const result = await processor.process(file);

      expect(result.processedContent).toBe("const x = 1;");
      expect(result.path).toBe(file.path);
      expect(result.language).toBe(file.language);
      // Highlighting moved to the renderer; the processor must not emit HTML.
      expect("highlightedHtml" in result).toBe(false);
    });

    it("preserves content verbatim when no transforms are enabled", async () => {
      const processor = new CodeProcessor(createConfig());
      const content = "const x = 1; // comment\n\nconst y = 2;";
      const result = await processor.process(createFile({ content }));

      expect(result.processedContent).toBe(content);
    });
  });

  describe("comment removal", () => {
    const configWithCommentRemoval = () =>
      createConfig({ processing: { removeComments: true } as any });

    it("removes single-line comments", async () => {
      const processor = new CodeProcessor(configWithCommentRemoval());
      const result = await processor.process(
        createFile({ content: "const x = 1; // comment\nconst y = 2;" }),
      );

      expect(result.processedContent).not.toContain("// comment");
      expect(result.processedContent).toContain("const x = 1");
    });

    it("removes multi-line comments", async () => {
      const processor = new CodeProcessor(configWithCommentRemoval());
      const result = await processor.process(
        createFile({ content: "/* comment */\nconst x = 1;" }),
      );

      expect(result.processedContent).not.toContain("comment");
      expect(result.processedContent).toContain("const x = 1");
    });

    it("does not strip comment markers inside string literals", async () => {
      const processor = new CodeProcessor(configWithCommentRemoval());
      const result = await processor.process(
        createFile({ content: 'const url = "https://example.com";' }),
      );

      expect(result.processedContent).toContain("https://example.com");
    });

    it("removes Python comments", async () => {
      const processor = new CodeProcessor(configWithCommentRemoval());
      const result = await processor.process(
        createFile({
          name: "test.py",
          content: "x = 1 # comment",
          language: "python",
          extension: "py",
        }),
      );

      expect(result.processedContent).not.toContain("# comment");
      expect(result.processedContent).toContain("x = 1");
    });

    it("removes HTML comments", async () => {
      const processor = new CodeProcessor(configWithCommentRemoval());
      const result = await processor.process(
        createFile({
          name: "index.html",
          content: "<div><!-- comment --></div>",
          language: "html",
          extension: "html",
        }),
      );

      expect(result.processedContent).not.toContain("comment");
      expect(result.processedContent).toContain("<div>");
    });

    it("preserves comments when disabled", async () => {
      const processor = new CodeProcessor(createConfig());
      const result = await processor.process(
        createFile({ content: "const x = 1; // keep this" }),
      );

      expect(result.processedContent).toContain("// keep this");
    });
  });

  describe("empty line removal", () => {
    const configWithEmptyLineRemoval = () =>
      createConfig({ processing: { removeEmptyLines: true } as any });

    it("removes empty lines", async () => {
      const processor = new CodeProcessor(configWithEmptyLineRemoval());
      const result = await processor.process(
        createFile({ content: "const x = 1;\n\nconst y = 2;\n\nconst z = 3;" }),
      );

      const lines = result.processedContent.split("\n");
      expect(lines).toEqual(["const x = 1;", "const y = 2;", "const z = 3;"]);
    });

    it("collapses whitespace-only lines", async () => {
      const processor = new CodeProcessor(configWithEmptyLineRemoval());
      const result = await processor.process(
        createFile({ content: "a\n   \n\t\nb" }),
      );

      // All blank/whitespace-only lines are dropped.
      expect(result.processedContent).toBe("a\nb");
    });

    it("preserves empty lines when disabled", async () => {
      const processor = new CodeProcessor(createConfig());
      const result = await processor.process(
        createFile({ content: "const x = 1;\n\nconst y = 2;" }),
      );

      expect(result.processedContent).toContain("\n\n");
    });
  });

  describe("plugin hooks", () => {
    it("applies the TRANSFORM_CONTENT plugin hook to processed content", async () => {
      const pluginRunner: PluginRunner = {
        hasHookHandlers: (hook) => hook === HookPoint.TRANSFORM_CONTENT,
        executeHook: async (hook, ...args) => {
          if (hook === HookPoint.TRANSFORM_CONTENT) {
            return `${args[0] as string}\n// added by plugin`;
          }
          return args[0];
        },
      };

      const processor = new CodeProcessor(createConfig(), pluginRunner);
      const result = await processor.process(
        createFile({ content: "const x = 1;" }),
      );

      expect(result.processedContent).toBe("const x = 1;\n// added by plugin");
    });

    it("ignores a non-string TRANSFORM_CONTENT result", async () => {
      const pluginRunner: PluginRunner = {
        hasHookHandlers: (hook) => hook === HookPoint.TRANSFORM_CONTENT,
        executeHook: async () => 42 as unknown,
      };

      const processor = new CodeProcessor(createConfig(), pluginRunner);
      const result = await processor.process(
        createFile({ content: "const x = 1;" }),
      );

      expect(result.processedContent).toBe("const x = 1;");
    });

    it("runs the TRANSFORM_CONTENT hook after content transforms", async () => {
      const seen: string[] = [];
      const pluginRunner: PluginRunner = {
        hasHookHandlers: (hook) => hook === HookPoint.TRANSFORM_CONTENT,
        executeHook: async (_hook, ...args) => {
          const content = args[0] as string;
          seen.push(content);
          return content;
        },
      };

      const processor = new CodeProcessor(
        createConfig({ processing: { removeComments: true } as any }),
        pluginRunner,
      );
      await processor.process(
        createFile({ content: "const x = 1; // strip me" }),
      );

      // The hook should receive the comment-stripped content.
      expect(seen).toHaveLength(1);
      expect(seen[0]).not.toContain("// strip me");
    });
  });
});
