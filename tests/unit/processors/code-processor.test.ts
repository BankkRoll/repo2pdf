import * as hljs from "highlight.js";

import { CodeProcessor } from "../../../src/processors/code-processor";

// Mock dependencies
jest.mock("highlight.js", () => ({
  highlight: jest.fn(),
  getLanguage: jest.fn(),
}));

describe("CodeProcessor", () => {
  let codeProcessor: CodeProcessor;
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    codeProcessor = new CodeProcessor(mockLogger as any);
  });

  describe("process", () => {
    it("should process code files with syntax highlighting", async () => {
      // Mock file
      const file = {
        path: "src/index.ts",
        content: 'console.log("Hello World");',
        type: "file",
      };

      // Mock configuration
      const config = {
        syntaxHighlighting: true,
      };

      // Mock hljs.getLanguage to return true for typescript
      (hljs.getLanguage as jest.Mock).mockReturnValue(true);

      // Mock hljs.highlight to return highlighted content
      (hljs.highlight as jest.Mock).mockReturnValue({
        value:
          '<span class="hljs-keyword">console</span>.log(<span class="hljs-string">"Hello World"</span>);',
      });

      // Call process method
      const result = await codeProcessor.process(file, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.processed).toBe(true);
      expect(result.language).toBe("typescript");
      expect(result.highlightedContent).toBe(
        '<span class="hljs-keyword">console</span>.log(<span class="hljs-string">"Hello World"</span>);',
      );
      expect(hljs.highlight).toHaveBeenCalledWith(
        'console.log("Hello World");',
        { language: "typescript" },
      );
    });

    it("should process code files without syntax highlighting when disabled", async () => {
      // Mock file
      const file = {
        path: "src/index.ts",
        content: 'console.log("Hello World");',
        type: "file",
      };

      // Mock configuration with syntax highlighting disabled
      const config = {
        syntaxHighlighting: false,
      };

      // Call process method
      const result = await codeProcessor.process(file, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.processed).toBe(true);
      expect(result.language).toBe("typescript");
      expect(result.highlightedContent).toBeUndefined();
      expect(hljs.highlight).not.toHaveBeenCalled();
    });

    it("should handle unknown file extensions", async () => {
      // Mock file with unknown extension
      const file = {
        path: "data.xyz",
        content: "Some unknown content",
        type: "file",
      };

      // Mock configuration
      const config = {
        syntaxHighlighting: true,
      };

      // Mock hljs.getLanguage to return false (unknown language)
      (hljs.getLanguage as jest.Mock).mockReturnValue(false);

      // Call process method
      const result = await codeProcessor.process(file, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.processed).toBe(true);
      expect(result.language).toBe("plaintext");
      expect(hljs.highlight).not.toHaveBeenCalled();
    });

    it("should handle errors during processing", async () => {
      // Mock file
      const file = {
        path: "src/index.ts",
        content: 'console.log("Hello World");',
        type: "file",
      };

      // Mock configuration
      const config = {
        syntaxHighlighting: true,
      };

      // Mock hljs.getLanguage to throw an error
      (hljs.getLanguage as jest.Mock).mockImplementation(() => {
        throw new Error("Highlighting error");
      });

      // Call process method
      const result = await codeProcessor.process(file, config);

      // Assertions
      expect(result).toBeDefined();
      expect(result.processed).toBe(true);
      expect(result.language).toBe("plaintext");
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("getLanguageFromPath", () => {
    it("should detect language from file extension", () => {
      // Test various file extensions
      expect((codeProcessor as any).getLanguageFromPath("file.js")).toBe(
        "javascript",
      );
      expect((codeProcessor as any).getLanguageFromPath("file.ts")).toBe(
        "typescript",
      );
      expect((codeProcessor as any).getLanguageFromPath("file.py")).toBe(
        "python",
      );
      expect((codeProcessor as any).getLanguageFromPath("file.rb")).toBe(
        "ruby",
      );
      expect((codeProcessor as any).getLanguageFromPath("file.unknown")).toBe(
        "plaintext",
      );
    });
  });
});
