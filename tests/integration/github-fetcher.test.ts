import { GitHubFetcher } from "../../src/fetchers/github-fetcher";
import { Octokit } from "@octokit/rest";

// Mock Octokit
jest.mock("@octokit/rest");

describe("GitHubFetcher Integration", () => {
  let fetcher: GitHubFetcher;
  let mockOctokit: jest.Mocked<Octokit>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock Octokit
    mockOctokit = {
      git: {
        getRef: jest.fn().mockResolvedValue({
          data: {
            object: {
              sha: "test-ref-sha",
            },
          },
        }),
        getCommit: jest.fn().mockResolvedValue({
          data: {
            tree: {
              sha: "test-tree-sha",
            },
          },
        }),
        getTree: jest.fn().mockResolvedValue({
          data: {
            tree: [
              {
                path: "file1.js",
                type: "blob",
                sha: "file1-sha",
              },
              {
                path: "file2.md",
                type: "blob",
                sha: "file2-sha",
              },
              {
                path: "dir",
                type: "tree",
                sha: "dir-sha",
              },
            ],
          },
        }),
      },
      repos: {
        get: jest.fn().mockResolvedValue({
          status: 200,
          data: {
            name: "test-repo",
            description: "Test repository",
            owner: {
              login: "test-owner",
            },
            stargazers_count: 42,
            updated_at: "2023-01-01T00:00:00Z",
            html_url: "https://github.com/test-owner/test-repo",
          },
        }),
        getContent: jest.fn().mockImplementation(({ path }) => {
          if (path === "file1.js") {
            return Promise.resolve({
              data: {
                type: "file",
                size: 100,
                name: "file1.js",
                path: "file1.js",
                content: Buffer.from('console.log("Hello");').toString(
                  "base64",
                ),
                download_url:
                  "https://raw.githubusercontent.com/test-owner/test-repo/main/file1.js",
              },
            });
          } else if (path === "file2.md") {
            return Promise.resolve({
              data: {
                type: "file",
                size: 200,
                name: "file2.md",
                path: "file2.md",
                content: Buffer.from("# Test").toString("base64"),
                download_url:
                  "https://raw.githubusercontent.com/test-owner/test-repo/main/file2.md",
              },
            });
          } else {
            return Promise.reject(new Error(`File not found: ${path}`));
          }
        }),
      },
      rateLimit: {
        get: jest.fn().mockResolvedValue({
          data: {
            rate: {
              remaining: 5000,
              reset: Math.floor(Date.now() / 1000) + 3600,
            },
          },
        }),
      },
    } as unknown as jest.Mocked<Octokit>;

    // Mock Octokit constructor
    (Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(
      () => mockOctokit,
    );

    // Create fetcher
    fetcher = new GitHubFetcher();
  });

  it("should initialize with repository options", async () => {
    await fetcher.initialize({
      url: "https://github.com/test-owner/test-repo",
      branch: "main",
      token: "test-token",
    });

    // Should create Octokit with token
    expect(Octokit).toHaveBeenCalledWith({
      auth: "test-token",
    });

    // Should check rate limit
    expect(mockOctokit.rateLimit.get).toHaveBeenCalled();
  });

  it("should validate repository", async () => {
    await fetcher.initialize({
      url: "https://github.com/test-owner/test-repo",
    });

    const isValid = await fetcher.validateRepository();

    expect(isValid).toBe(true);
    expect(mockOctokit.repos.get).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
    });
  });

  it("should fetch repository structure", async () => {
    await fetcher.initialize({
      url: "https://github.com/test-owner/test-repo",
    });

    // Setup global fetch mock for download_url
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes("file1.js")) {
        return Promise.resolve({
          text: () => Promise.resolve('console.log("Hello");'),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        });
      } else if (url.includes("file2.md")) {
        return Promise.resolve({
          text: () => Promise.resolve("# Test"),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        });
      } else {
        return Promise.reject(new Error(`URL not found: ${url}`));
      }
    }) as jest.Mock;

    const files = await fetcher.fetchRepository();

    expect(files).toHaveLength(2);
    expect(files[0].path).toBe("file1.js");
    expect(files[0].type).toBe("code");
    expect(files[0].content).toBe('console.log("Hello");');
    expect(files[1].path).toBe("file2.md");
    expect(files[1].type).toBe("code");
    expect(files[1].content).toBe("# Test");

    // Should get ref, commit, and tree
    expect(mockOctokit.git.getRef).toHaveBeenCalled();
    expect(mockOctokit.git.getCommit).toHaveBeenCalled();
    expect(mockOctokit.git.getTree).toHaveBeenCalled();

    // Should get content for each file
    expect(mockOctokit.repos.getContent).toHaveBeenCalledTimes(2);
  });

  it("should fetch repository info", async () => {
    await fetcher.initialize({
      url: "https://github.com/test-owner/test-repo",
    });

    const info = await fetcher.getRepositoryInfo();

    expect(info).toEqual({
      name: "test-repo",
      description: "Test repository",
      owner: "test-owner",
      stars: 42,
      lastUpdated: expect.any(Date),
      url: "https://github.com/test-owner/test-repo",
    });
  });
});
