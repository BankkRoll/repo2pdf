import type { ProcessedFile, RepoFile } from "../../src/types/file.types";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { Config } from "../../src/types/config.types";
import type { FileProcessor } from "../../src/processors/file-processor";
import { IncrementalProcessor } from "../../src/utils/incremental-processor";
import fs from "fs";
import path from "path";

// Mock dependencies
jest.mock("../../src/processors/file-processor");
jest.mock("fs");
jest.mock("path");

describe("IncrementalProcessor", () => {
  let mockConfig: Config;
  let mockFileProcessor: jest.Mocked<FileProcessor>;
  let incrementalProcessor: IncrementalProcessor;
  let mockFiles: RepoFile[];
  let mockProcessedFiles: ProcessedFile[];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock fs functions
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      return JSON.stringify([
        {
          path: "file1.js",
          name: "file1.js",
          type: "code",
          content: 'console.log("test");',
          size: 100,
          extension: "js",
          language: "javascript",
          isDirectory: false,
          processedContent: 'console.log("test");',
          highlightedHtml: '<pre><code>console.log("test");</code></pre>',
        },
      ]);
    });
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    (fs.rmdirSync as jest.Mock).mockImplementation(() => {});

    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

    // Create mock config
    mockConfig = {
      repository: {
        url: "https://github.com/test/repo",
        vcsType: "github",
        useCache: false,
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
        useIncrementalProcessing: true,
        incrementalChunkSize: 2, // Small chunk size for testing
      },
      cache: {
        enabled: false,
        ttl: 3600000,
      },
      debug: false,
    } as Config;

    // Create mock files
    mockFiles = [
      {
        path: "file1.js",
        name: "file1.js",
        type: "code",
        content: 'console.log("test1");',
        size: 100,
        extension: "js",
        language: "javascript",
        isDirectory: false,
      },
      {
        path: "file2.js",
        name: "file2.js",
        type: "code",
        content: 'console.log("test2");',
        size: 100,
        extension: "js",
        language: "javascript",
        isDirectory: false,
      },
      {
        path: "file3.js",
        name: "file3.js",
        type: "code",
        content: 'console.log("test3");',
        size: 100,
        extension: "js",
        language: "javascript",
        isDirectory: false,
      },
    ];

    // Create mock processed files
    mockProcessedFiles = [
      {
        path: "file1.js",
        name: "file1.js",
        type: "code",
        content: 'console.log("test1");',
        size: 100,
        extension: "js",
        language: "javascript",
        isDirectory: false,
        processedContent: 'console.log("test1");',
        highlightedHtml: '<pre><code>console.log("test1");</code></pre>',
      },
      {
        path: "file2.js",
        name: "file2.js",
        type: "code",
        content: 'console.log("test2");',
        size: 100,
        extension: "js",
        language: "javascript",
        isDirectory: false,
        processedContent: 'console.log("test2");',
        highlightedHtml: '<pre><code>console.log("test2");</code></pre>',
      },
      {
        path: "file3.js",
        name: "file3.js",
        type: "code",
        content: 'console.log("test3");',
        size: 100,
        extension: "js",
        language: "javascript",
        isDirectory: false,
        processedContent: 'console.log("test3");',
        highlightedHtml: '<pre><code>console.log("test3");</code></pre>',
      },
    ];

    // Mock FileProcessor
    mockFileProcessor = {
      processFiles: jest.fn().mockImplementation((files: RepoFile[]) => {
        // Return processed files corresponding to the input files
        return Promise.resolve(
          files.map((file) => {
            const index = mockFiles.findIndex((f) => f.path === file.path);
            return mockProcessedFiles[index];
          }),
        );
      }),
    } as unknown as jest.Mocked<FileProcessor>;

    // Create IncrementalProcessor
    incrementalProcessor = new IncrementalProcessor(
      mockConfig,
      mockFileProcessor,
    );
  });

  it("should initialize temporary directory", () => {
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).not.toHaveBeenCalled(); // Directory already exists in our mock
  });

  it("should create temporary directory if it does not exist", () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
    new IncrementalProcessor(mockConfig, mockFileProcessor);
    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), {
      recursive: true,
    });
  });

  it("should process files in a single batch if count is less than chunk size", async () => {
    // Set chunk size larger than file count
    mockConfig.processing.incrementalChunkSize = 10;
    incrementalProcessor = new IncrementalProcessor(
      mockConfig,
      mockFileProcessor,
    );

    const result = await incrementalProcessor.processFilesIncrementally([
      mockFiles[0],
    ]);

    expect(mockFileProcessor.processFiles).toHaveBeenCalledTimes(1);
    expect(mockFileProcessor.processFiles).toHaveBeenCalledWith([mockFiles[0]]);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("file1.js");
  });

  it("should process files incrementally if count exceeds chunk size", async () => {
    const result =
      await incrementalProcessor.processFilesIncrementally(mockFiles);

    // Should process in 2 chunks (2 files + 1 file)
    expect(mockFileProcessor.processFiles).toHaveBeenCalledTimes(2);
    expect(mockFileProcessor.processFiles).toHaveBeenNthCalledWith(1, [
      mockFiles[0],
      mockFiles[1],
    ]);
    expect(mockFileProcessor.processFiles).toHaveBeenNthCalledWith(2, [
      mockFiles[2],
    ]);

    // Should save chunks to disk
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);

    // Should return all processed files
    expect(result).toHaveLength(3);
    expect(result[0].path).toBe("file1.js");
    expect(result[1].path).toBe("file2.js");
    expect(result[2].path).toBe("file3.js");
  });

  it("should handle errors in chunk processing", async () => {
    // Mock error in processing the first chunk
    mockFileProcessor.processFiles.mockRejectedValueOnce(
      new Error("Processing error"),
    );

    const result =
      await incrementalProcessor.processFilesIncrementally(mockFiles);

    // Should continue processing the second chunk
    expect(mockFileProcessor.processFiles).toHaveBeenCalledTimes(2);

    // Should return only the successfully processed files
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("file3.js");
  });

  it("should clean up temporary files", () => {
    // Mock some chunk IDs
    (incrementalProcessor as any).processedChunks = ["chunk-1", "chunk-2"];

    incrementalProcessor.cleanup();

    // Should try to delete each chunk file
    expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    expect(fs.unlinkSync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("chunk-1"),
    );
    expect(fs.unlinkSync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("chunk-2"),
    );

    // Should check if directory is empty
    expect(fs.readdirSync).toHaveBeenCalled();

    // Should try to remove directory if empty
    expect(fs.rmdirSync).toHaveBeenCalled();
  });
});
