import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { CacheManager } from "../../src/utils/cache-manager";
import fs from "fs";
import path from "path";

// Mock fs
jest.mock("fs");
jest.mock("path");

describe("CacheManager", () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock fs.existsSync and fs.mkdirSync
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes(".meta.json")) {
        return JSON.stringify({
          url: "https://github.com/test/repo",
          branch: "main",
          timestamp: Date.now() - 1000, // 1 second ago
          fileCount: 10,
        });
      } else {
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
          },
        ]);
      }
    });
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    (fs.readdirSync as jest.Mock).mockReturnValue([
      "test-repo.json",
      "test-repo.meta.json",
    ]);
    (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });

    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

    // Get cache manager instance
    cacheManager = CacheManager.getInstance();
    cacheManager.configure({ enabled: true, ttl: 3600000 }); // 1 hour
  });

  it("should be a singleton", () => {
    const instance1 = CacheManager.getInstance();
    const instance2 = CacheManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("should initialize cache directory", () => {
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).not.toHaveBeenCalled(); // Directory already exists in our mock
  });

  it("should create cache directory if it does not exist", () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
    cacheManager.configure({ cacheDir: "/new/cache/dir" });
    expect(fs.mkdirSync).toHaveBeenCalledWith("/new/cache/dir", {
      recursive: true,
    });
  });

  it("should check if cache is valid", () => {
    const isValid = cacheManager.isCacheValid(
      "https://github.com/test/repo",
      "main",
    );
    expect(isValid).toBe(true);
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalled();
  });

  it("should return false for invalid cache", () => {
    // Mock expired cache
    (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
      return JSON.stringify({
        url: "https://github.com/test/repo",
        branch: "main",
        timestamp: Date.now() - 7200000, // 2 hours ago, beyond TTL
        fileCount: 10,
      });
    });

    const isValid = cacheManager.isCacheValid(
      "https://github.com/test/repo",
      "main",
    );
    expect(isValid).toBe(false);
  });

  it("should get cached files", () => {
    const files = cacheManager.getCachedFiles(
      "https://github.com/test/repo",
      "main",
    );
    expect(files).toHaveLength(1);
    expect(files![0].path).toBe("file1.js");
    expect(files![0].content).toBe('console.log("test");');
  });

  it("should return null if cache is invalid", () => {
    // Mock invalid cache
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

    const files = cacheManager.getCachedFiles(
      "https://github.com/test/repo",
      "main",
    );
    expect(files).toBeNull();
  });

  it("should cache files", () => {
    const files = [
      {
        path: "file1.js",
        name: "file1.js",
        type: "code",
        content: 'console.log("test");',
        size: 100,
        extension: "js",
        language: "javascript",
        isDirectory: false,
      },
    ];

    cacheManager.cacheFiles("https://github.com/test/repo", "main", files);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2); // One for files, one for metadata
  });

  it("should clear cache for a specific repository", () => {
    cacheManager.clearCache("https://github.com/test/repo", "main");
    expect(fs.unlinkSync).toHaveBeenCalledTimes(2); // One for files, one for metadata
  });

  it("should clear all cache", () => {
    cacheManager.clearAllCache();
    expect(fs.readdirSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalledTimes(2); // Two files in our mock
  });

  it("should get cache statistics", () => {
    const stats = cacheManager.getCacheStats();
    expect(stats.enabled).toBe(true);
    expect(stats.cacheCount).toBe(1); // One repository in our mock
    expect(stats.totalSize).toBe(1024);
    expect(stats.repositories).toHaveLength(1);
  });
});
