import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { BitbucketFetcher } from "../../src/fetchers/bitbucket-fetcher";

// Mock global fetch
global.fetch = jest.fn();

describe("BitbucketFetcher", () => {
  let fetcher: BitbucketFetcher;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock successful fetch responses
    const mockSuccessResponse = {
      ok: true,
      status: 200,
      json: jest.fn(),
      text: jest.fn(),
      arrayBuffer: jest.fn(),
      headers: new Headers(),
    };

    // Default mock implementation
    (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse);

    // Create fetcher
    fetcher = new BitbucketFetcher();
  });

  it("should initialize with repository options", async () => {
    await fetcher.initialize({
      url: "https://bitbucket.org/test-workspace/test-repo",
      branch: "main",
      token: "test-token",
    });

    // Should extract workspace and repo slug from URL
    expect((fetcher as any).workspace).toBe("test-workspace");
    expect((fetcher as any).repoSlug).toBe("test-repo");
    expect((fetcher as any).branch).toBe("main");
    expect((fetcher as any).token).toBe("test-token");
  });

  it("should validate repository", async () => {
    // Setup fetcher
    await setupFetcher();

    // Mock response for repository endpoint
    const mockRepoResponse = {
      ...createMockResponse(),
      status: 200,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockRepoResponse);

    const isValid = await fetcher.validateRepository();

    expect(isValid).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.bitbucket.org/2.0/repositories/test-workspace/test-repo",
      expect.any(Object),
    );
  });

  it("should return false for invalid repository", async () => {
    // Setup fetcher
    await setupFetcher();

    // Mock response for repository endpoint
    const mockRepoResponse = {
      ...createMockResponse(),
      status: 404,
      ok: false,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockRepoResponse);

    const isValid = await fetcher.validateRepository();

    expect(isValid).toBe(false);
  });

  it("should fetch repository structure", async () => {
    // Setup fetcher
    await setupFetcher();

    // Mock response for validation
    const mockValidationResponse = {
      ...createMockResponse(),
      status: 200,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockValidationResponse);

    // Mock response for source endpoint
    const mockSourceResponse = {
      ...createMockResponse(),
      json: jest.fn().mockResolvedValue({
        values: [
          {
            type: "commit_file",
            path: "file1.js",
          },
          {
            type: "commit_file",
            path: "file2.md",
          },
          {
            type: "commit_directory",
            path: "dir",
          },
        ],
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockSourceResponse);

    // Mock fetchFile method
    jest.spyOn(fetcher, "fetchFile").mockImplementation((path: string) => {
      if (path === "file1.js") {
        return Promise.resolve({
          path: "file1.js",
          name: "file1.js",
          type: "code",
          content: 'console.log("Hello");',
          size: 100,
          extension: "js",
          language: "javascript",
          isDirectory: false,
        });
      } else if (path === "file2.md") {
        return Promise.resolve({
          path: "file2.md",
          name: "file2.md",
          type: "code",
          content: "# Test",
          size: 200,
          extension: "md",
          language: "markdown",
          isDirectory: false,
        });
      } else {
        return Promise.reject(new Error(`File not found: ${path}`));
      }
    });

    // Mock traverseDirectory to avoid recursion
    jest
      .spyOn(fetcher as any, "traverseDirectory")
      .mockImplementation(async (path: string, files: any[]) => {
        if (path === "") {
          // This is the initial call, let it proceed to the real implementation
          return (
            fetcher as any
          ).traverseDirectory.mock.originalImplementation.call(
            fetcher,
            path,
            files,
          );
        }
        // For recursive calls, do nothing
        return Promise.resolve();
      });

    const files = await fetcher.fetchRepository();

    expect(files).toHaveLength(2);
    expect(files[0].path).toBe("file1.js");
    expect(files[0].type).toBe("code");
    expect(files[1].path).toBe("file2.md");
    expect(files[1].type).toBe("code");

    // Should call fetchFile for each file
    expect(fetcher.fetchFile).toHaveBeenCalledTimes(2);
  });

  it("should fetch file content", async () => {
    // Setup fetcher
    await setupFetcher();

    // Mock response for file content
    const mockFileContentResponse = {
      ...createMockResponse(),
      text: jest.fn().mockResolvedValue('console.log("Hello");'),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
      headers: new Headers({
        "content-length": "100",
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockFileContentResponse);

    const file = await fetcher.fetchFile("file1.js");

    expect(file.path).toBe("file1.js");
    expect(file.name).toBe("file1.js");
    expect(file.type).toBe("code");
    expect(file.content).toBe('console.log("Hello");');
    expect(file.size).toBe(100);
    expect(file.extension).toBe("js");
    expect(file.language).toBe("javascript");

    // Should make API request for file content
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.bitbucket.org/2.0/repositories/test-workspace/test-repo/src/main/file1.js",
      expect.any(Object),
    );
  });

  it("should fetch repository info", async () => {
    // Setup fetcher
    await setupFetcher();

    // Mock response for repository endpoint
    const mockRepoResponse = {
      ...createMockResponse(),
      json: jest.fn().mockResolvedValue({
        name: "test-repo",
        description: "Test repository",
        owner: {
          display_name: "Test Workspace",
        },
        updated_on: "2023-01-01T00:00:00Z",
        links: {
          html: {
            href: "https://bitbucket.org/test-workspace/test-repo",
          },
        },
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockRepoResponse);

    const info = await fetcher.getRepositoryInfo();

    expect(info).toEqual({
      name: "test-repo",
      description: "Test repository",
      owner: "Test Workspace",
      lastUpdated: expect.any(Date),
      url: "https://bitbucket.org/test-workspace/test-repo",
    });

    // Should make API request for repository info
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.bitbucket.org/2.0/repositories/test-workspace/test-repo",
      expect.any(Object),
    );
  });

  it("should handle rate limit exceeded", async () => {
    // Setup fetcher
    await setupFetcher();

    // Mock response for rate limit exceeded
    const mockRateLimitResponse = {
      ok: false,
      status: 429,
      headers: new Headers({
        "Retry-After": "1",
      }),
    };

    // Mock successful response after retry
    const mockSuccessResponse = {
      ...createMockResponse(),
      json: jest.fn().mockResolvedValue({ name: "test-repo" }),
    };

    // First call returns rate limit exceeded, second call succeeds
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockRateLimitResponse)
      .mockResolvedValueOnce(mockSuccessResponse);

    // Mock setTimeout to resolve immediately
    jest.spyOn(global, "setTimeout").mockImplementation((callback: any) => {
      callback();
      return 0 as any;
    });

    const info = await fetcher.getRepositoryInfo();

    expect(info.name).toBe("test-repo");

    // Should make API request twice (once for rate limit, once after retry)
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  // Helper functions

  async function setupFetcher() {
    await fetcher.initialize({
      url: "https://bitbucket.org/test-workspace/test-repo",
      branch: "main",
      token: "test-token",
    });

    // Reset mock to avoid counting the initialization call
    jest.clearAllMocks();
  }

  function createMockResponse() {
    return {
      ok: true,
      status: 200,
      json: jest.fn(),
      text: jest.fn(),
      arrayBuffer: jest.fn(),
      headers: new Headers(),
    };
  }
});
