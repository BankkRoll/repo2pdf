import {
  deepMerge,
  determineFileType,
  determineLanguage,
  extractExtension,
} from "../../src/utils/file-utils";
import { describe, expect, it } from "vitest";

describe("File Utils", () => {
  describe("extractExtension", () => {
    it("should extract extension from file path", () => {
      expect(extractExtension("file.js")).toBe("js");
      expect(extractExtension("path/to/file.tsx")).toBe("tsx");
      expect(extractExtension("path/to/file.with.multiple.dots.md")).toBe("md");
      expect(extractExtension("path/to/file")).toBe("");
      expect(extractExtension(".gitignore")).toBe("gitignore");
    });
  });

  describe("determineFileType", () => {
    it("should determine code file types", () => {
      expect(determineFileType("js")).toBe("code");
      expect(determineFileType("py")).toBe("code");
      expect(determineFileType("md")).toBe("code");
      expect(determineFileType("json")).toBe("code");
      expect(determineFileType("html")).toBe("code");
      expect(determineFileType("css")).toBe("code");
      expect(determineFileType("gitignore")).toBe("code");
    });

    it("should determine image file types", () => {
      expect(determineFileType("png")).toBe("image");
      expect(determineFileType("jpg")).toBe("image");
      expect(determineFileType("jpeg")).toBe("image");
      expect(determineFileType("gif")).toBe("image");
      expect(determineFileType("webp")).toBe("image");
    });

    it("should determine binary file types", () => {
      expect(determineFileType("pdf")).toBe("binary");
      expect(determineFileType("exe")).toBe("binary");
      expect(determineFileType("zip")).toBe("binary");
      expect(determineFileType("mp3")).toBe("binary");
      expect(determineFileType("ttf")).toBe("binary");
    });

    it("should return unknown for unrecognized extensions", () => {
      expect(determineFileType("xyz")).toBe("unknown");
      expect(determineFileType("")).toBe("unknown");
    });
  });

  describe("determineLanguage", () => {
    it("should map extensions to languages", () => {
      expect(determineLanguage("js")).toBe("javascript");
      expect(determineLanguage("ts")).toBe("typescript");
      expect(determineLanguage("py")).toBe("python");
      expect(determineLanguage("rb")).toBe("ruby");
      expect(determineLanguage("md")).toBe("markdown");
      expect(determineLanguage("yml")).toBe("yaml");
    });

    it("should return text for unmapped extensions", () => {
      expect(determineLanguage("xyz")).toBe("text");
      expect(determineLanguage("")).toBe("text");
    });
  });

  describe("deepMerge", () => {
    it("should merge objects deeply", () => {
      const target = {
        a: 1,
        b: {
          c: 2,
          d: 3,
        },
      };

      const source = {
        b: {
          d: 4,
          e: 5,
        },
        f: 6,
      };

      const expected = {
        a: 1,
        b: {
          c: 2,
          d: 4,
          e: 5,
        },
        f: 6,
      };

      expect(deepMerge(target, source)).toEqual(expected);
    });

    it("should handle multiple sources", () => {
      const target = { a: 1 };
      const source1 = { b: 2 };
      const source2 = { c: 3 };

      expect(deepMerge(target, source1, source2)).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("should return target if no sources provided", () => {
      const target = { a: 1 };

      expect(deepMerge(target)).toBe(target);
    });

    it("should handle nested objects correctly", () => {
      const target = {
        a: {
          b: {
            c: 1,
          },
        },
      };

      const source = {
        a: {
          b: {
            d: 2,
          },
          e: 3,
        },
      };

      const expected = {
        a: {
          b: {
            c: 1,
            d: 2,
          },
          e: 3,
        },
      };

      expect(deepMerge(target, source)).toEqual(expected);
    });
  });
});
