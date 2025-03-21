import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { GitLabFetcher } from "../../src/fetchers/gitlab-fetcher";

// Mock global fetch
global.fetch = jest.fn();

describe("GitLabFetcher", () => {
  let fetcher: GitLabFetcher;

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
      headers: new Headers({
        "RateLimit-Remaining": "100",
        "RateLimit-Reset": (Math.floor(Date.now() / 1000) + 3600).toString(),
      }),
    };

    // Default mock implementation
    (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse);

    // Create fetcher
    fetcher = new GitLabFetcher();
  });

  it("should initialize with repository options", async () => {
    // Mock response for user endpoint
    const mockUserResponse = {
      ...createMockResponse(),
      json: jest.fn().mockResolvedValue({ username: "test-user" }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockUserResponse);

    await fetcher.initialize({
      url: "https://gitlab.com/test-group/test-repo",
      branch: "main",
      token: "test-token",
    });

    // Should make API request to check rate limit
    expect(global.fetch).toHaveBeenCalledWith(
      "https://gitlab.com/api/v4/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          "PRIVATE-TOKEN": "test-token",
        }),
      }),
    );

    // Should extract project ID from URL
    expect((fetcher as any).projectId).toBe("test-group%2Ftest-repo");
  });

  it("should validate repository", async () => {
    // Setup fetcher
    await setupFetcher();

    // Mock response for project endpoint
    const mockProjectResponse = {
      ...createMockResponse(),
      status: 200,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockProjectResponse);

    const isValid = await fetcher.validateRepository();

    expect(isValid).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://gitlab.com/api/v4/projects/test-group%2Ftest-repo",
      expect.any(Object),
    );
  });

  it("should return false for invalid repository", async () => {
    // Setup fetcher
    await setupFetcher();

    // Mock response for project endpoint
    const mockProjectResponse = {
      ...createMockResponse(),
      status: 404,
      ok: false,
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockProjectResponse);

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

    // Mock response for tree endpoint
    const mockTreeResponse = {
      ...createMockResponse(),
      json: jest.fn().mockResolvedValue([
        {
          id: "file1-id",
          name: "file1.js",
          type: "blob",
          path: "file1.js",
        },
        {
          id: "file2-id",
          name: "file2.md",
          type: "blob",
          path: "file2.md",
        },
        {
          id: "dir-id",
          name: "dir",
          type: "tree",
          path: "dir",
        },
      ]),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockTreeResponse);

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

    // Mock response for file metadata
    const mockFileMetaResponse = {
      ...createMockResponse(),
      json: jest.fn().mockResolvedValue({
        name: "file1.js",
        path: "file1.js",
        size: 100,
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockFileMetaResponse);

    // Mock response for file content
    const mockFileContentResponse = {
      ...createMockResponse(),
      text: jest.fn().mockResolvedValue('console.log("Hello");'),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
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

    // Should make API requests for file metadata and content
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("should fetch repository info", async () => {
    // Setup fetcher
    await setupFetcher();

    // Mock response for project endpoint
    const mockProjectResponse = {
      ...createMockResponse(),
      json: jest.fn().mockResolvedValue({
        name: "test-repo",
        description: "Test repository",
        namespace: {
          name: "test-group",
        },
        star_count: 42,
        last_activity_at: "2023-01-01T00:00:00Z",
        web_url: "https://gitlab.com/test-group/test-repo",
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockProjectResponse);

    const info = await fetcher.getRepositoryInfo();

    expect(info).toEqual({
      name: "test-repo",
      description: "Test repository",
      owner: "test-group",
      stars: 42,
      lastUpdated: expect.any(Date),
      url: "https://gitlab.com/test-group/test-repo",
    });

    // Should make API request for project info
    expect(global.fetch).toHaveBeenCalledWith(
      "https://gitlab.com/api/v4/projects/test-group%2Ftest-repo",
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

  it("should fetch all pages of a paginated API endpoint", async () => {
    // Setup fetcher
    await setupFetcher();

    // Mock responses for paginated endpoint
    const mockPage1Response = {
      ...createMockResponse(),
      json: jest.fn().mockResolvedValue([{ id: 1, name: "item1" }]),
      headers: new Headers({
        "X-Total-Pages": "2",
      }),
    };

    const mockPage2Response = {
      ...createMockResponse(),
      json: jest.fn().mockResolvedValue([{ id: 2, name: "item2" }]),
      headers: new Headers({
        "X-Total-Pages": "2",
      }),
    };

    // First call returns page 1, second call returns page 2
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockPage1Response)
      .mockResolvedValueOnce(mockPage2Response);

    const items = await (fetcher as any).fetchAllPages("/test-endpoint");

    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(1);
    expect(items[1].id).toBe(2);

    // Should make API request for each page
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://gitlab.com/api/v4/test-endpoint&page=1",
      expect.any(Object),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "https://gitlab.com/api/v4/test-endpoint&page=2",
      expect.any(Object),
    );
  });

  // Helper functions

  async function setupFetcher() {
    // Mock response for user endpoint
    const mockUserResponse = {
      ...createMockResponse(),
      json: jest.fn().mockResolvedValue({ username: "test-user" }),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(mockUserResponse);

    await fetcher.initialize({
      url: "https://gitlab.com/test-group/test-repo",
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
