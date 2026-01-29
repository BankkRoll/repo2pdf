import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigLoader } from "../src/config/config-loader";
import type { Config } from "../src/types/config.types";

const createConfig = (overrides: Partial<Config> = {}): Config => ({
  repository: {
    url: "https://github.com/test/repo",
    branch: "main",
    vcsType: "github",
    localPath: "",
    useCache: true,
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
    ignorePatterns: ["node_modules/**", ".git/**"],
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
    enabled: true,
    ttl: 86400000,
    cacheDir: "./.repo2pdf-cache",
    ...overrides.cache,
  },
  debug: overrides.debug ?? false,
});

describe("ConfigLoader", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("getInstance", () => {
    it("returns singleton instance", () => {
      const a = ConfigLoader.getInstance();
      const b = ConfigLoader.getInstance();
      expect(a).toBe(b);
    });
  });

  describe("loadConfig", () => {
    it("loads config with custom output path", async () => {
      const loader = ConfigLoader.getInstance();
      const config = await loader.loadConfig(
        createConfig({
          output: {
            format: "pdf",
            outputPath: "./custom.pdf",
            singleFile: true,
            pageSize: "A4",
            landscape: false,
            margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
          },
        }),
      );

      expect(config.output.outputPath).toBe("./custom.pdf");
    });

    it("preserves default values", async () => {
      const loader = ConfigLoader.getInstance();
      const config = await loader.loadConfig(createConfig());

      expect(config.style.lineNumbers).toBe(true);
      expect(config.style.pageNumbers).toBe(true);
      expect(config.style.theme).toBe("github-dark");
      expect(config.cache.enabled).toBe(true);
    });

    it("applies style customizations", async () => {
      const loader = ConfigLoader.getInstance();
      const config = await loader.loadConfig(
        createConfig({
          style: {
            theme: "monokai",
            fontSize: "12px",
            fontFamily: "monospace",
            lineNumbers: false,
            pageNumbers: false,
            includeTableOfContents: false,
            customCSS: "",
          },
        }),
      );

      expect(config.style.theme).toBe("monokai");
      expect(config.style.fontSize).toBe("12px");
      expect(config.style.lineNumbers).toBe(false);
    });

    it("applies processing options", async () => {
      const loader = ConfigLoader.getInstance();
      const config = await loader.loadConfig(
        createConfig({
          processing: {
            ignorePatterns: ["**/*.test.ts"],
            maxConcurrency: 10,
            removeComments: true,
            removeEmptyLines: true,
            includeBinaryFiles: false,
            includeHiddenFiles: true,
            timeout: 600000,
            useIncrementalProcessing: false,
            incrementalChunkSize: 50,
          },
        }),
      );

      expect(config.processing.removeComments).toBe(true);
      expect(config.processing.maxConcurrency).toBe(10);
    });

    it("applies cache settings", async () => {
      const loader = ConfigLoader.getInstance();
      const config = await loader.loadConfig(
        createConfig({
          cache: {
            enabled: false,
            ttl: 3600000,
            cacheDir: "./custom-cache",
          },
        }),
      );

      expect(config.cache.enabled).toBe(false);
      expect(config.cache.ttl).toBe(3600000);
    });
  });

  describe("getConfig", () => {
    it("returns loaded config", async () => {
      const loader = ConfigLoader.getInstance();
      await loader.loadConfig(createConfig());

      const config = loader.getConfig();

      expect(config).toBeDefined();
      expect(config.repository).toBeDefined();
      expect(config.output).toBeDefined();
      expect(config.style).toBeDefined();
    });
  });

  describe("updateConfig", () => {
    it("updates debug mode", async () => {
      const loader = ConfigLoader.getInstance();
      await loader.loadConfig(createConfig());

      const updated = loader.updateConfig({ debug: true });

      expect(updated.debug).toBe(true);
    });

    it("updates nested style config", async () => {
      const loader = ConfigLoader.getInstance();
      await loader.loadConfig(createConfig());

      const updated = loader.updateConfig({
        style: {
          theme: "dracula",
          fontSize: "16px",
          fontFamily: "monospace",
          lineNumbers: false,
          pageNumbers: true,
          includeTableOfContents: true,
          customCSS: "",
        },
      });

      expect(updated.style.theme).toBe("dracula");
      expect(updated.style.lineNumbers).toBe(false);
    });

    it("preserves unmodified values", async () => {
      const loader = ConfigLoader.getInstance();
      await loader.loadConfig(createConfig());

      const updated = loader.updateConfig({ debug: true });

      expect(updated.repository.url).toBe("https://github.com/test/repo");
    });
  });
});
