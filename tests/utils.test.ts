import { describe, it, expect } from "vitest";
import {
  deepMerge,
  detectLanguage,
  formatFileSize,
  determineFileType,
  extractExtension,
} from "../src/utils/file-utils";

describe("file-utils", () => {
  describe("extractExtension", () => {
    it("extracts from simple filename", () => {
      expect(extractExtension("file.ts")).toBe("ts");
      expect(extractExtension("file.js")).toBe("js");
    });

    it("extracts from path", () => {
      expect(extractExtension("path/to/file.js")).toBe("js");
      expect(extractExtension("src/App.tsx")).toBe("tsx");
    });

    it("extracts from multi-dot filename", () => {
      expect(extractExtension("file.test.ts")).toBe("ts");
      expect(extractExtension("app.module.css")).toBe("css");
    });

    it("returns empty for no extension", () => {
      expect(extractExtension("Makefile")).toBe("");
      expect(extractExtension("Dockerfile")).toBe("");
    });
  });

  describe("determineFileType", () => {
    it("detects code files", () => {
      expect(determineFileType("ts")).toBe("code");
      expect(determineFileType("js")).toBe("code");
      expect(determineFileType("py")).toBe("code");
      expect(determineFileType("go")).toBe("code");
      expect(determineFileType("rs")).toBe("code");
    });

    it("detects config as code", () => {
      expect(determineFileType("json")).toBe("code");
      expect(determineFileType("yaml")).toBe("code");
      expect(determineFileType("toml")).toBe("code");
      expect(determineFileType("md")).toBe("code");
    });

    it("detects images", () => {
      expect(determineFileType("png")).toBe("image");
      expect(determineFileType("jpg")).toBe("image");
      expect(determineFileType("gif")).toBe("image");
      expect(determineFileType("webp")).toBe("image");
    });

    it("treats SVG as code (XML-based)", () => {
      expect(determineFileType("svg")).toBe("code");
    });

    it("detects binaries", () => {
      expect(determineFileType("pdf")).toBe("binary");
      expect(determineFileType("zip")).toBe("binary");
      expect(determineFileType("exe")).toBe("binary");
    });

    it("returns unknown for unrecognized", () => {
      expect(determineFileType("xyz")).toBe("unknown");
      expect(determineFileType("")).toBe("unknown");
    });
  });

  describe("deepMerge", () => {
    it("merges simple objects", () => {
      const target = { a: 1, b: 2, c: 0 };
      const result = deepMerge(target, { b: 3, c: 4 });
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("merges nested objects", () => {
      const target = { a: { x: 1, y: 2, z: 0 } };
      const result = deepMerge(target, { a: { x: 1, y: 3, z: 4 } });
      expect(result).toEqual({ a: { x: 1, y: 3, z: 4 } });
    });

    it("handles multiple sources", () => {
      const target = { a: 1, b: 0, c: 0 };
      const result = deepMerge(target, { b: 2 }, { c: 3 });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("later sources override earlier", () => {
      const target = { a: 1 };
      const result = deepMerge(target, { a: 2 }, { a: 3 });
      expect(result.a).toBe(3);
    });
  });

  describe("detectLanguage", () => {
    it("detects TypeScript", () => {
      expect(detectLanguage("file.ts")).toBe("typescript");
      expect(detectLanguage("file.tsx")).toBe("tsx");
    });

    it("detects JavaScript", () => {
      expect(detectLanguage("file.js")).toBe("javascript");
      expect(detectLanguage("file.jsx")).toBe("jsx");
    });

    it("detects Python", () => {
      expect(detectLanguage("file.py")).toBe("python");
    });

    it("detects data formats", () => {
      expect(detectLanguage("data.json")).toBe("json");
      expect(detectLanguage("config.yml")).toBe("yaml");
      expect(detectLanguage("config.yaml")).toBe("yaml");
    });

    it("detects Markdown", () => {
      expect(detectLanguage("README.md")).toBe("markdown");
    });

    it("returns text for unknown", () => {
      expect(detectLanguage("file.xyz")).toBe("text");
      expect(detectLanguage("file")).toBe("text");
    });
  });

  describe("formatFileSize", () => {
    it("formats bytes", () => {
      expect(formatFileSize(0)).toBe("0 Bytes");
      expect(formatFileSize(500)).toBe("500 Bytes");
    });

    it("formats KB", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(2048)).toBe("2 KB");
    });

    it("formats MB", () => {
      expect(formatFileSize(1048576)).toBe("1 MB");
      expect(formatFileSize(5242880)).toBe("5 MB");
    });

    it("formats GB", () => {
      expect(formatFileSize(1073741824)).toBe("1 GB");
    });
  });
});
