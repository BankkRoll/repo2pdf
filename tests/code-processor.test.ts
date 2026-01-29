import { describe, expect, it } from "vitest";
import { CodeProcessor } from "../src/processors/code-processor";
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
    theme: "github-dark",
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
    name: "Less",
    file: "styles.less",
    lang: "less",
    code: "@color: #333; body { color: @color; }",
  },
  {
    name: "Vue",
    file: "App.vue",
    lang: "vue",
    code: "<template><div>{{ msg }}</div></template>",
  },
  {
    name: "Svelte",
    file: "App.svelte",
    lang: "svelte",
    code: "<script>let count = 0;</script>",
  },
  {
    name: "CoffeeScript",
    file: "app.coffee",
    lang: "coffeescript",
    code: "square = (x) -> x * x",
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
  {
    name: "Zig",
    file: "main.zig",
    lang: "zig",
    code: 'const std = @import("std");',
  },
  {
    name: "D",
    file: "main.d",
    lang: "d",
    code: "import std.stdio; void main() {}",
  },
  { name: "Nim", file: "main.nim", lang: "nim", code: 'echo "Hello"' },
  { name: "Crystal", file: "main.cr", lang: "crystal", code: 'puts "Hello"' },

  // JVM
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
    name: "Scala",
    file: "Main.scala",
    lang: "scala",
    code: 'object Main extends App { println("Hello") }',
  },
  {
    name: "Groovy",
    file: "Main.groovy",
    lang: "groovy",
    code: 'println "Hello"',
  },
  {
    name: "Clojure",
    file: "main.clj",
    lang: "clojure",
    code: '(ns hello) (defn -main [] (println "Hi"))',
  },

  // .NET
  {
    name: "C#",
    file: "Program.cs",
    lang: "csharp",
    code: "using System; class Program { static void Main() {} }",
  },
  { name: "F#", file: "Program.fs", lang: "fsharp", code: 'printfn "Hello"' },
  {
    name: "VB",
    file: "Main.vb",
    lang: "vb",
    code: "Module Main\nSub Main()\nEnd Sub\nEnd Module",
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
  { name: "Perl", file: "main.pl", lang: "perl", code: 'print "Hello\\n";' },
  { name: "Lua", file: "main.lua", lang: "lua", code: 'print("Hello")' },
  { name: "R", file: "main.r", lang: "r", code: 'print("Hello")' },
  { name: "Julia", file: "main.jl", lang: "julia", code: 'println("Hello")' },
  {
    name: "AWK",
    file: "script.awk",
    lang: "awk",
    code: 'BEGIN { print "Hello" }',
  },

  // Functional
  {
    name: "Haskell",
    file: "Main.hs",
    lang: "haskell",
    code: 'main = putStrLn "Hello"',
  },
  {
    name: "Elixir",
    file: "main.ex",
    lang: "elixir",
    code: 'defmodule Hello do def world, do: IO.puts "Hi" end',
  },
  {
    name: "Erlang",
    file: "main.erl",
    lang: "erlang",
    code: "-module(hello). -export([main/0]).",
  },
  {
    name: "OCaml",
    file: "main.ml",
    lang: "ocaml",
    code: 'let () = print_endline "Hello"',
  },
  {
    name: "Scheme",
    file: "main.scm",
    lang: "scheme",
    code: '(display "Hello")',
  },
  {
    name: "Racket",
    file: "main.rkt",
    lang: "racket",
    code: '#lang racket (displayln "Hello")',
  },
  { name: "Lisp", file: "main.lisp", lang: "lisp", code: '(format t "Hello")' },
  {
    name: "Elm",
    file: "Main.elm",
    lang: "elm",
    code: "module Main exposing (main)",
  },
  {
    name: "PureScript",
    file: "Main.purs",
    lang: "purescript",
    code: "module Main where",
  },

  // Mobile
  { name: "Swift", file: "main.swift", lang: "swift", code: 'print("Hello")' },
  {
    name: "Objective-C",
    file: "main.m",
    lang: "objective-c",
    code: "#import <Foundation/Foundation.h>",
  },
  {
    name: "Dart",
    file: "main.dart",
    lang: "dart",
    code: 'void main() { print("Hello"); }',
  },

  // Shell/DevOps
  {
    name: "Bash",
    file: "script.sh",
    lang: "bash",
    code: '#!/bin/bash\necho "Hello"',
  },
  {
    name: "PowerShell",
    file: "script.ps1",
    lang: "powershell",
    code: 'Write-Host "Hello"',
  },
  {
    name: "Dockerfile",
    file: "Dockerfile",
    lang: "dockerfile",
    code: "FROM node:18\nRUN npm install",
  },
  {
    name: "Makefile",
    file: "Makefile",
    lang: "makefile",
    code: "all: build\nbuild:\n\tgcc main.c",
  },
  {
    name: "Nginx",
    file: "nginx.conf",
    lang: "nginx",
    code: "server { listen 80; }",
  },

  // Data
  { name: "JSON", file: "data.json", lang: "json", code: '{ "name": "test" }' },
  {
    name: "YAML",
    file: "config.yml",
    lang: "yaml",
    code: "name: test\nversion: 1.0",
  },
  {
    name: "TOML",
    file: "config.toml",
    lang: "toml",
    code: '[package]\nname = "test"',
  },
  {
    name: "XML",
    file: "data.xml",
    lang: "xml",
    code: '<?xml version="1.0"?><root/>',
  },
  {
    name: "INI",
    file: "config.ini",
    lang: "ini",
    code: "[section]\nkey = value",
  },

  // Docs
  {
    name: "Markdown",
    file: "README.md",
    lang: "markdown",
    code: "# Title\n\nText here.",
  },
  {
    name: "LaTeX",
    file: "doc.tex",
    lang: "latex",
    code: "\\documentclass{article}",
  },

  // Database
  { name: "SQL", file: "query.sql", lang: "sql", code: "SELECT * FROM users;" },
  {
    name: "GraphQL",
    file: "schema.graphql",
    lang: "graphql",
    code: "type Query { user: User }",
  },
  {
    name: "Prisma",
    file: "schema.prisma",
    lang: "prisma",
    code: "model User { id Int @id }",
  },

  // Legacy
  {
    name: "COBOL",
    file: "main.cob",
    lang: "cobol",
    code: "IDENTIFICATION DIVISION.",
  },
  {
    name: "Fortran",
    file: "main.f90",
    lang: "fortran",
    code: "program hello\nend program",
  },
  {
    name: "Pascal",
    file: "main.pas",
    lang: "pascal",
    code: "program Hello; begin end.",
  },
  { name: "Ada", file: "main.adb", lang: "ada", code: "with Ada.Text_IO;" },

  // Hardware
  {
    name: "Verilog",
    file: "main.v",
    lang: "verilog",
    code: "module hello; endmodule",
  },
  { name: "VHDL", file: "main.vhd", lang: "vhdl", code: "library IEEE;" },
  {
    name: "Assembly",
    file: "main.asm",
    lang: "asm",
    code: "section .text\nglobal _start",
  },

  // Other
  {
    name: "Solidity",
    file: "Contract.sol",
    lang: "solidity",
    code: "pragma solidity ^0.8.0;",
  },
  {
    name: "Prolog",
    file: "main.pro",
    lang: "prolog",
    code: "hello :- write('Hello').",
  },
  { name: "MATLAB", file: "main.m", lang: "matlab", code: "disp('Hello')" },
  {
    name: "CMake",
    file: "CMakeLists.txt",
    lang: "cmake",
    code: "cmake_minimum_required(VERSION 3.10)",
  },
  {
    name: "HCL",
    file: "main.tf",
    lang: "hcl",
    code: 'resource "aws_instance" "example" {}',
  },
  {
    name: "Nix",
    file: "default.nix",
    lang: "nix",
    code: "{ pkgs ? import <nixpkgs> {} }: pkgs.hello",
  },
  {
    name: "Fish",
    file: "script.fish",
    lang: "fish",
    code: "function greet; echo Hello; end",
  },
  { name: "Tcl", file: "main.tcl", lang: "tcl", code: 'puts "Hello"' },
  {
    name: "Handlebars",
    file: "template.hbs",
    lang: "handlebars",
    code: "<h1>{{title}}</h1>",
  },
  {
    name: "Jinja",
    file: "template.j2",
    lang: "jinja",
    code: "<h1>{{ title }}</h1>",
  },
  {
    name: "Twig",
    file: "template.twig",
    lang: "twig",
    code: "{% block content %}{% endblock %}",
  },
  {
    name: "Apex",
    file: "Main.cls",
    lang: "apex",
    code: "public class Main { }",
  },
];

const THEMES = [
  "github-dark",
  "github-light",
  "monokai",
  "dracula",
  "nord",
  "one-dark-pro",
  "solarized-light",
  "solarized-dark",
];

describe("CodeProcessor", () => {
  describe("language support", () => {
    it("highlights all 84 supported languages", async () => {
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

          if (!result.processedContent.includes(code.split("\n")[0])) {
            failed.push(`${name}: content mismatch`);
          }
          if (!result.highlightedHtml?.includes("shiki")) {
            failed.push(`${name}: missing shiki`);
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
      ).rejects.toThrow("File content is empty");
    });

    it("throws on null content", async () => {
      const processor = new CodeProcessor(createConfig());
      await expect(
        processor.process(createFile({ content: null as any })),
      ).rejects.toThrow();
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
      expect(result.highlightedHtml).toBeDefined();
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

  describe("comment removal", () => {
    const configWithCommentRemoval = () =>
      createConfig({
        processing: {
          ignorePatterns: [],
          maxConcurrency: 5,
          removeComments: true,
          removeEmptyLines: false,
          includeBinaryFiles: true,
          includeHiddenFiles: false,
          timeout: 300000,
          useIncrementalProcessing: true,
          incrementalChunkSize: 100,
        },
      });

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
      createConfig({
        processing: {
          ignorePatterns: [],
          maxConcurrency: 5,
          removeComments: false,
          removeEmptyLines: true,
          includeBinaryFiles: true,
          includeHiddenFiles: false,
          timeout: 300000,
          useIncrementalProcessing: true,
          incrementalChunkSize: 100,
        },
      });

    it("removes empty lines", async () => {
      const processor = new CodeProcessor(configWithEmptyLineRemoval());
      const result = await processor.process(
        createFile({ content: "const x = 1;\n\nconst y = 2;\n\nconst z = 3;" }),
      );

      const lines = result.processedContent
        .split("\n")
        .filter((l: string) => l.trim());
      expect(lines.length).toBe(3);
    });

    it("preserves empty lines when disabled", async () => {
      const processor = new CodeProcessor(createConfig());
      const result = await processor.process(
        createFile({ content: "const x = 1;\n\nconst y = 2;" }),
      );

      expect(result.processedContent).toContain("\n\n");
    });
  });

  describe("themes", () => {
    it.each(THEMES)("%s", async (theme) => {
      const processor = new CodeProcessor(
        createConfig({
          style: {
            theme,
            fontSize: "14px",
            fontFamily: "monospace",
            lineNumbers: true,
            pageNumbers: true,
            includeTableOfContents: true,
            customCSS: "",
          },
        }),
      );

      const result = await processor.process(createFile());

      expect(result.highlightedHtml).toContain("shiki");
    });
  });
});
