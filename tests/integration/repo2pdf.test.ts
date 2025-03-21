import { Repo2PDF, convertRepository } from "../../src/index";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ConfigLoader } from "../../src/config/config-loader";
import { EPUBGenerator } from "../../src/generators/epub-generator";
import { FileProcessor } from "../../src/processors/file-processor";
import { GitHubFetcher } from "../../src/fetchers/github-fetcher";
import { HTMLGenerator } from "../../src/generators/html-generator";
import { LocalFetcher } from "../../src/fetchers/local-fetcher";
import { PDFGenerator } from "../../src/generators/pdf-generator";
import fs from "fs";
import path from "path";

// Mock dependencies
jest.mock("../../src/config/config-loader");
jest.mock("../../src/fetchers/github-fetcher");
jest.mock("../../src/fetchers/local-fetcher");
jest.mock("../../src/processors/file-processor");
jest.mock("../../src/generators/html-generator");
jest.mock("../../src/generators/pdf-generator");
jest.mock("../../src/generators/epub-generator");
jest.mock("fs");
jest.mock("path");

describe("Repo2PDF Integration", () => {
  let mockConfigLoader: jest.Mocked<ConfigLoader>;
  let mockGitHubFetcher: jest.Mocked<GitHubFetcher>;
  let mockLocalFetcher: jest.Mocked<LocalFetcher>;
  let mockFileProcessor: jest.Mocked<FileProcessor>;
  let mockHTMLGenerator: jest.Mocked<HTMLGenerator>;
  let mockPDFGenerator: jest.Mocked<PDFGenerator>;
  let mockEPUBGenerator: jest.Mocked<EPUBGenerator>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ConfigLoader
    mockConfigLoader = {
      loadConfig: jest.fn().mockResolvedValue({
        repository: {
          url: "https://github.com/test-owner/test-repo",
          vcsType: "github",
        },
        output: {
          format: "pdf",
          outputPath: "/path/to/output.pdf",
          singleFile: true,
        },
        style: {
          theme: "github",
          lineNumbers: true,
          pageNumbers: true,
          includeTableOfContents: true,
        },
        processing: {
          ignorePatterns: [],
          maxConcurrency: 5,
          removeComments: false,
          removeEmptyLines: false,
          includeBinaryFiles: true,
          includeHiddenFiles: false,
        },
        debug: false,
      }),
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
    } as unknown as jest.Mocked<ConfigLoader>;
    (ConfigLoader.getInstance as jest.Mock).mockReturnValue(mockConfigLoader);

    // Mock GitHubFetcher
    mockGitHubFetcher = {
      initialize: jest.fn().mockResolvedValue(undefined),
      fetchRepository: jest.fn().mockResolvedValue([
        {
          path: "file1.js",
          name: "file1.js",
          type: "code",
          content: 'console.log("Hello");',
          size: 100,
          extension: "js",
          language: "javascript",
          isDirectory: false,
        },
        {
          path: "file2.md",
          name: "file2.md",
          type: "code",
          content: "# Test",
          size: 200,
          extension: "md",
          language: "markdown",
          isDirectory: false,
        },
      ]),
      getRepositoryInfo: jest.fn().mockResolvedValue({
        name: "test-repo",
        description: "Test repository",
        owner: "test-owner",
        url: "https://github.com/test-owner/test-repo",
      }),
      validateRepository: jest.fn().mockResolvedValue(true),
      fetchFile: jest.fn(),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<GitHubFetcher>;
    (
      GitHubFetcher as jest.MockedClass<typeof GitHubFetcher>
    ).mockImplementation(() => mockGitHubFetcher);

    // Mock LocalFetcher
    mockLocalFetcher = {
      initialize: jest.fn().mockResolvedValue(undefined),
      fetchRepository: jest.fn().mockResolvedValue([]),
      getRepositoryInfo: jest.fn().mockResolvedValue({
        name: "local-repo",
        url: "file:///path/to/local-repo",
      }),
      validateRepository: jest.fn().mockResolvedValue(true),
      fetchFile: jest.fn(),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<LocalFetcher>;
    (LocalFetcher as jest.MockedClass<typeof LocalFetcher>).mockImplementation(
      () => mockLocalFetcher,
    );

    // Mock FileProcessor
    mockFileProcessor = {
      processFiles: jest.fn().mockResolvedValue([
        {
          path: "file1.js",
          name: "file1.js",
          type: "code",
          content: 'console.log("Hello");',
          size: 100,
          extension: "js",
          language: "javascript",
          isDirectory: false,
          processedContent: 'console.log("Hello");',
          highlightedHtml: '<pre><code>console.log("Hello");</code></pre>',
        },
        {
          path: "file2.md",
          name: "file2.md",
          type: "code",
          content: "# Test",
          size: 200,
          extension: "md",
          language: "markdown",
          isDirectory: false,
          processedContent: "# Test",
          highlightedHtml: "<pre><code># Test</code></pre>",
        },
      ]),
    } as unknown as jest.Mocked<FileProcessor>;
    (
      FileProcessor as jest.MockedClass<typeof FileProcessor>
    ).mockImplementation(() => mockFileProcessor);

    // Mock HTMLGenerator
    mockHTMLGenerator = {
      generateHTML: jest.fn().mockResolvedValue("<html>...</html>"),
    } as unknown as jest.Mocked<HTMLGenerator>;
    (
      HTMLGenerator as jest.MockedClass<typeof HTMLGenerator>
    ).mockImplementation(() => mockHTMLGenerator);

    // Mock PDFGenerator
    mockPDFGenerator = {
      generatePDF: jest.fn().mockResolvedValue({
        success: true,
        outputPath: "/path/to/output.pdf",
        format: "pdf",
        fileSize: 12345,
        generationTime: 1000,
      }),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PDFGenerator>;
    (PDFGenerator as jest.MockedClass<typeof PDFGenerator>).mockImplementation(
      () => mockPDFGenerator,
    );

    // Mock EPUBGenerator
    mockEPUBGenerator = {
      generateEPUB: jest.fn().mockResolvedValue({
        success: true,
        outputPath: "/path/to/output.epub",
        format: "epub",
        fileSize: 54321,
        generationTime: 2000,
      }),
    } as unknown as jest.Mocked<EPUBGenerator>;
    (
      EPUBGenerator as jest.MockedClass<typeof EPUBGenerator>
    ).mockImplementation(() => mockEPUBGenerator);

    // Mock fs
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.statSync as jest.Mock).mockReturnValue({ size: 12345 });
    (fs.renameSync as jest.Mock).mockImplementation(() => {});

    // Mock path
    (path.dirname as jest.Mock).mockReturnValue("/path/to");
  });

  it("should convert GitHub repository to PDF", async () => {
    const repo2pdf = new Repo2PDF(await mockConfigLoader.loadConfig());
    const result = await repo2pdf.convert();

    // Should initialize fetcher
    expect(mockGitHubFetcher.initialize).toHaveBeenCalled();

    // Should fetch repository
    expect(mockGitHubFetcher.fetchRepository).toHaveBeenCalled();

    // Should get repository info
    expect(mockGitHubFetcher.getRepositoryInfo).toHaveBeenCalled();

    // Should process files
    expect(mockFileProcessor.processFiles).toHaveBeenCalled();

    // Should generate HTML
    expect(mockHTMLGenerator.generateHTML).toHaveBeenCalled();

    // Should generate PDF
    expect(mockPDFGenerator.generatePDF).toHaveBeenCalled();

    // Should clean up
    expect(mockGitHubFetcher.cleanup).toHaveBeenCalled();
    expect(mockPDFGenerator.cleanup).toHaveBeenCalled();

    // Should return result
    expect(result).toEqual({
      success: true,
      outputPath: "/path/to/output.pdf",
      format: "pdf",
      fileSize: 12345,
      generationTime: 1000,
    });
  });

  it("should convert repository to HTML", async () => {
    // Update config to use HTML format
    mockConfigLoader.loadConfig.mockResolvedValue({
      repository: {
        url: "https://github.com/test-owner/test-repo",
        vcsType: "github",
      },
      output: {
        format: "html",
        outputPath: "/path/to/output.html",
        singleFile: true,
      },
      style: {
        theme: "github",
        lineNumbers: true,
        pageNumbers: true,
        includeTableOfContents: true,
      },
      processing: {
        ignorePatterns: [],
        maxConcurrency: 5,
        removeComments: false,
        removeEmptyLines: false,
        includeBinaryFiles: true,
        includeHiddenFiles: false,
      },
      debug: false,
    });

    const repo2pdf = new Repo2PDF(await mockConfigLoader.loadConfig());
    const result = await repo2pdf.convert();

    // Should write HTML file
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/path/to/output.html",
      "<html>...</html>",
    );

    // Should return result
    expect(result).toEqual({
      success: true,
      outputPath: "/path/to/output.html",
      format: "html",
      fileSize: 12345,
      generationTime: 0,
    });
  });

  it("should convert repository to EPUB", async () => {
    // Update config to use EPUB format
    mockConfigLoader.loadConfig.mockResolvedValue({
      repository: {
        url: "https://github.com/test-owner/test-repo",
        vcsType: "github",
      },
      output: {
        format: "epub",
        outputPath: "/path/to/output.epub",
        singleFile: true,
      },
      style: {
        theme: "github",
        lineNumbers: true,
        pageNumbers: true,
        includeTableOfContents: true,
      },
      processing: {
        ignorePatterns: [],
        maxConcurrency: 5,
        removeComments: false,
        removeEmptyLines: false,
        includeBinaryFiles: true,
        includeHiddenFiles: false,
      },
      debug: false,
    });

    const repo2pdf = new Repo2PDF(await mockConfigLoader.loadConfig());
    const result = await repo2pdf.convert();

    // Should generate EPUB
    expect(mockEPUBGenerator.generateEPUB).toHaveBeenCalled();

    // Should return result
    expect(result).toEqual({
      success: true,
      outputPath: "/path/to/output.epub",
      format: "epub",
      fileSize: 54321,
      generationTime: 2000,
    });
  });

  it("should use programmatic API", async () => {
    const result = await convertRepository({
      repository: {
        url: "https://github.com/test-owner/test-repo",
      },
      output: {
        format: "pdf",
        outputPath: "/path/to/output.pdf",
      },
    });

    // Should load config
    expect(mockConfigLoader.loadConfig).toHaveBeenCalled();

    // Should return result
    expect(result).toEqual({
      success: true,
      outputPath: "/path/to/output.pdf",
      format: "pdf",
      fileSize: 12345,
      generationTime: 1000,
    });
  });
});
