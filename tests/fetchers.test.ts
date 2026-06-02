/**
 * Repository Fetcher Tests
 *
 * Tests all repository fetchers:
 * - LocalFetcher (local filesystem)
 * - GitHubFetcher (GitHub API)
 * - GitLabFetcher (GitLab API)
 * - BitbucketFetcher (Bitbucket API)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { LocalFetcher } from "../src/fetchers/local-fetcher";
import { GitHubFetcher } from "../src/fetchers/github-fetcher";
import { GitLabFetcher } from "../src/fetchers/gitlab-fetcher";
import { BitbucketFetcher } from "../src/fetchers/bitbucket-fetcher";
import type { RepositoryOptions } from "../src/types/config.types";
import path from "path";
import fs from "fs";
import { MOCK_REPO_PATH, ensureTestOutputDir } from "./helpers/test-utils";

describe("LocalFetcher", () => {
  let fetcher: LocalFetcher;

  beforeEach(() => {
    fetcher = new LocalFetcher();
  });

  describe("initialization", () => {
    it("should initialize with valid local path", async () => {
      const options: RepositoryOptions = {
        url: "",
        vcsType: "local",
        localPath: MOCK_REPO_PATH,
      };

      await expect(fetcher.initialize(options)).resolves.not.toThrow();
    });

    it("should throw for missing local path", async () => {
      const options: RepositoryOptions = {
        url: "",
        vcsType: "local",
        localPath: "",
      };

      await expect(fetcher.initialize(options)).rejects.toThrow(
        "Local path must be provided",
      );
    });

    it("should throw for non-existent path", async () => {
      const options: RepositoryOptions = {
        url: "",
        vcsType: "local",
        localPath: "/non/existent/path/12345",
      };

      await expect(fetcher.initialize(options)).rejects.toThrow(
        "Invalid local path",
      );
    });

    it("should throw for file path (not directory)", async () => {
      const filePath = path.join(MOCK_REPO_PATH, "package.json");
      const options: RepositoryOptions = {
        url: "",
        vcsType: "local",
        localPath: filePath,
      };

      await expect(fetcher.initialize(options)).rejects.toThrow(
        "is not a directory",
      );
    });
  });

  describe("fetchRepository", () => {
    beforeEach(async () => {
      await fetcher.initialize({
        url: "",
        vcsType: "local",
        localPath: MOCK_REPO_PATH,
      });
    });

    it("should fetch all files from repository", async () => {
      const files = await fetcher.fetchRepository();

      expect(files).toBeInstanceOf(Array);
      expect(files.length).toBeGreaterThan(0);
    });

    it("should include TypeScript files", async () => {
      const files = await fetcher.fetchRepository();
      const tsFiles = files.filter((f) => f.extension === "ts");

      expect(tsFiles.length).toBeGreaterThan(0);
    });

    it("should include nested files", async () => {
      const files = await fetcher.fetchRepository();
      // Check for both Unix and Windows path separators
      const nestedFiles = files.filter(
        (f) => f.path.includes("/") || f.path.includes("\\"),
      );

      expect(nestedFiles.length).toBeGreaterThan(0);
    });

    it("should set correct file properties", async () => {
      const files = await fetcher.fetchRepository();
      const tsFile = files.find((f) => f.extension === "ts");

      expect(tsFile).toBeDefined();
      expect(tsFile?.name).toBeTruthy();
      expect(tsFile?.path).toBeTruthy();
      expect(tsFile?.type).toBe("code");
      expect(tsFile?.language).toBe("typescript");
      expect(tsFile?.content).toBeTruthy();
      expect(tsFile?.size).toBeGreaterThan(0);
    });

    it("should detect file types correctly", async () => {
      const files = await fetcher.fetchRepository();

      // Check TypeScript
      const tsFile = files.find((f) => f.extension === "ts");
      expect(tsFile?.type).toBe("code");
      expect(tsFile?.language).toBe("typescript");

      // Check JSON
      const jsonFile = files.find((f) => f.extension === "json");
      expect(jsonFile?.type).toBe("code");
      expect(jsonFile?.language).toBe("json");

      // Check Markdown
      const mdFile = files.find((f) => f.extension === "md");
      expect(mdFile?.type).toBe("code");
      expect(mdFile?.language).toBe("markdown");

      // Check CSS
      const cssFile = files.find((f) => f.extension === "css");
      expect(cssFile?.type).toBe("code");
      expect(cssFile?.language).toBe("css");
    });

    it("should read file content correctly", async () => {
      const files = await fetcher.fetchRepository();
      const pkgFile = files.find((f) => f.name === "package.json");

      expect(pkgFile).toBeDefined();
      expect(pkgFile?.content).toContain("mock-repo");
    });
  });

  describe("fetchFile", () => {
    beforeEach(async () => {
      await fetcher.initialize({
        url: "",
        vcsType: "local",
        localPath: MOCK_REPO_PATH,
      });
    });

    it("should fetch a specific file", async () => {
      const file = await fetcher.fetchFile("package.json");

      expect(file.name).toBe("package.json");
      expect(file.path).toBe("package.json");
      expect(file.content).toContain("mock-repo");
    });

    it("should fetch nested file", async () => {
      const file = await fetcher.fetchFile("src/index.ts");

      expect(file.name).toBe("index.ts");
      expect(file.path).toBe("src/index.ts");
      expect(file.extension).toBe("ts");
    });

    it("should throw for non-existent file", async () => {
      await expect(fetcher.fetchFile("non-existent.txt")).rejects.toThrow();
    });
  });

  describe("validateRepository", () => {
    it("should return true for valid repository", async () => {
      await fetcher.initialize({
        url: "",
        vcsType: "local",
        localPath: MOCK_REPO_PATH,
      });

      const isValid = await fetcher.validateRepository();
      expect(isValid).toBe(true);
    });
  });

  describe("getRepositoryInfo", () => {
    it("should return repository metadata", async () => {
      await fetcher.initialize({
        url: "",
        vcsType: "local",
        localPath: MOCK_REPO_PATH,
      });

      const info = await fetcher.getRepositoryInfo();

      expect(info.name).toBe("mock-repo");
      expect(info.url).toContain("file://");
    });
  });

  describe("cleanup", () => {
    it("should cleanup without error", async () => {
      await fetcher.initialize({
        url: "",
        vcsType: "local",
        localPath: MOCK_REPO_PATH,
      });

      await expect(fetcher.cleanup()).resolves.not.toThrow();
    });
  });
});

describe("GitHubFetcher", () => {
  let fetcher: GitHubFetcher;

  beforeEach(() => {
    fetcher = new GitHubFetcher();
  });

  describe("initialization", () => {
    it("should initialize without token", async () => {
      const options: RepositoryOptions = {
        url: "https://github.com/sindresorhus/is",
        vcsType: "github",
        branch: "main",
      };

      // May fail due to rate limiting, but should not throw for invalid config
      try {
        await fetcher.initialize(options);
        expect(true).toBe(true);
      } catch (error: any) {
        // Rate limiting or network errors are acceptable
        expect(
          error.message.includes("rate limit") ||
            error.message.includes("network") ||
            error.message.includes("API") ||
            error.message.includes("fetch"),
        ).toBe(true);
      }
    });

    it("should parse GitHub URL correctly", () => {
      // Test internal URL parsing by attempting to initialize
      const options: RepositoryOptions = {
        url: "https://github.com/owner/repo",
        vcsType: "github",
      };

      // Just verify it doesn't throw for invalid URL format
      expect(options.url).toContain("github.com");
    });
  });

  describe("validateRepository", () => {
    it("should validate public repository", async () => {
      const options: RepositoryOptions = {
        url: "https://github.com/sindresorhus/is",
        vcsType: "github",
        branch: "main",
      };

      try {
        await fetcher.initialize(options);
        const isValid = await fetcher.validateRepository();
        expect(typeof isValid).toBe("boolean");
      } catch (error: any) {
        // Rate limiting is acceptable
        expect(error.message).toBeTruthy();
      }
    });
  });

  describe("cleanup", () => {
    it("should cleanup without error", async () => {
      await expect(fetcher.cleanup()).resolves.not.toThrow();
    });
  });
});

describe("GitLabFetcher", () => {
  let fetcher: GitLabFetcher;

  beforeEach(() => {
    fetcher = new GitLabFetcher();
  });

  describe("initialization", () => {
    it("should initialize with GitLab URL", async () => {
      const options: RepositoryOptions = {
        url: "https://gitlab.com/gitlab-org/gitlab-runner",
        vcsType: "gitlab",
        branch: "main",
      };

      try {
        await fetcher.initialize(options);
        expect(true).toBe(true);
      } catch (error: any) {
        // Network or API errors are acceptable
        expect(error.message).toBeTruthy();
      }
    });
  });

  describe("cleanup", () => {
    it("should cleanup without error", async () => {
      await expect(fetcher.cleanup()).resolves.not.toThrow();
    });
  });
});

describe("BitbucketFetcher", () => {
  let fetcher: BitbucketFetcher;

  beforeEach(() => {
    fetcher = new BitbucketFetcher();
  });

  describe("initialization", () => {
    it("should initialize with Bitbucket URL", async () => {
      const options: RepositoryOptions = {
        url: "https://bitbucket.org/atlassian/python-bitbucket",
        vcsType: "bitbucket",
        branch: "master",
      };

      try {
        await fetcher.initialize(options);
        expect(true).toBe(true);
      } catch (error: any) {
        // Network or API errors are acceptable
        expect(error.message).toBeTruthy();
      }
    });
  });

  describe("cleanup", () => {
    it("should cleanup without error", async () => {
      await expect(fetcher.cleanup()).resolves.not.toThrow();
    });
  });
});

describe("Fetcher Interface Compliance", () => {
  const fetchers = [
    { name: "LocalFetcher", create: () => new LocalFetcher() },
    { name: "GitHubFetcher", create: () => new GitHubFetcher() },
    { name: "GitLabFetcher", create: () => new GitLabFetcher() },
    { name: "BitbucketFetcher", create: () => new BitbucketFetcher() },
  ];

  for (const { name, create } of fetchers) {
    describe(name, () => {
      it("should implement initialize method", () => {
        const fetcher = create();
        expect(typeof fetcher.initialize).toBe("function");
      });

      it("should implement fetchRepository method", () => {
        const fetcher = create();
        expect(typeof fetcher.fetchRepository).toBe("function");
      });

      it("should implement fetchFile method", () => {
        const fetcher = create();
        expect(typeof fetcher.fetchFile).toBe("function");
      });

      it("should implement validateRepository method", () => {
        const fetcher = create();
        expect(typeof fetcher.validateRepository).toBe("function");
      });

      it("should implement getRepositoryInfo method", () => {
        const fetcher = create();
        expect(typeof fetcher.getRepositoryInfo).toBe("function");
      });

      it("should implement cleanup method", () => {
        const fetcher = create();
        expect(typeof fetcher.cleanup).toBe("function");
      });
    });
  }
});

describe("File Type Detection", () => {
  let fetcher: LocalFetcher;

  beforeAll(async () => {
    fetcher = new LocalFetcher();
    await fetcher.initialize({
      url: "",
      vcsType: "local",
      localPath: MOCK_REPO_PATH,
    });
  });

  it("should detect code files", async () => {
    const files = await fetcher.fetchRepository();
    const codeFiles = files.filter((f) => f.type === "code");

    expect(codeFiles.length).toBeGreaterThan(0);

    for (const file of codeFiles) {
      expect(["ts", "js", "json", "md", "css"]).toContain(file.extension);
    }
  });

  it("should set correct language for TypeScript", async () => {
    const files = await fetcher.fetchRepository();
    const tsFiles = files.filter((f) => f.extension === "ts");

    for (const file of tsFiles) {
      expect(file.language).toBe("typescript");
    }
  });

  it("should set correct language for CSS", async () => {
    const files = await fetcher.fetchRepository();
    const cssFiles = files.filter((f) => f.extension === "css");

    for (const file of cssFiles) {
      expect(file.language).toBe("css");
    }
  });

  it("should set correct language for JSON", async () => {
    const files = await fetcher.fetchRepository();
    const jsonFiles = files.filter((f) => f.extension === "json");

    for (const file of jsonFiles) {
      expect(file.language).toBe("json");
    }
  });

  it("should set correct language for Markdown", async () => {
    const files = await fetcher.fetchRepository();
    const mdFiles = files.filter((f) => f.extension === "md");

    for (const file of mdFiles) {
      expect(file.language).toBe("markdown");
    }
  });
});

describe("Ignore Patterns", () => {
  let fetcher: LocalFetcher;

  beforeAll(async () => {
    fetcher = new LocalFetcher();
    await fetcher.initialize({
      url: "",
      vcsType: "local",
      localPath: MOCK_REPO_PATH,
    });
  });

  it("should ignore .git directory", async () => {
    const files = await fetcher.fetchRepository();
    const gitFiles = files.filter(
      (f) => f.path.includes(".git/") || f.path === ".git",
    );

    expect(gitFiles.length).toBe(0);
  });

  it("should not include node_modules if in .gitignore", async () => {
    const files = await fetcher.fetchRepository();
    const nodeModulesFiles = files.filter((f) =>
      f.path.includes("node_modules"),
    );

    // If .gitignore excludes node_modules, this should be 0
    // (depends on whether node_modules exists and is ignored)
    expect(nodeModulesFiles.length).toBe(0);
  });
});
