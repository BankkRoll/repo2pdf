import {
  determineFileType,
  determineLanguage,
  extractExtension,
} from "../utils/file-utils";

import { Octokit } from "@octokit/rest";
import type { RepoFile } from "../types/file.types";
import type { RepositoryFetcher } from "./fetcher.interface";
import type { RepositoryOptions } from "../types/config.types";
import { logger } from "../utils/logger";
import pLimit from "p-limit";

/**
 * GitHub repository fetcher using GitHub API
 */
export class GitHubFetcher implements RepositoryFetcher {
  private octokit: Octokit;
  private owner = "";
  private repo = "";
  private branch = "";
  private options: RepositoryOptions;
  private rateLimitRemaining = 5000;
  private rateLimitReset = 0;

  constructor() {
    this.octokit = new Octokit();
    this.options = { url: "" };
  }

  /**
   * Initialize the fetcher with repository options
   */
  public async initialize(options: RepositoryOptions): Promise<void> {
    this.options = options;

    // Parse GitHub URL to extract owner and repo
    const urlMatch = options.url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!urlMatch) {
      throw new Error(`Invalid GitHub URL: ${options.url}`);
    }

    this.owner = urlMatch[1];
    this.repo = urlMatch[2].replace(".git", "");

    // Initialize Octokit with token if provided
    if (options.token) {
      this.octokit = new Octokit({
        auth: options.token,
      });
    } else {
      this.octokit = new Octokit();
    }

    // Resolve the branch: use the explicit branch, else the repo's default.
    this.branch = options.branch || (await this.resolveDefaultBranch());

    // Check rate limit
    try {
      const { data } = await this.octokit.rateLimit.get();
      this.rateLimitRemaining = data.rate.remaining;
      this.rateLimitReset = data.rate.reset;

      if (this.rateLimitRemaining < 10) {
        const resetDate = new Date(this.rateLimitReset * 1000);
        logger.warn(
          `GitHub API rate limit is low: ${this.rateLimitRemaining} requests remaining. Resets at ${resetDate.toLocaleString()}`,
        );
      }
    } catch (error) {
      logger.warn("Failed to check GitHub API rate limit:", error);
    }
  }

  /**
   * Resolve the repository's default branch, falling back to "main".
   */
  private async resolveDefaultBranch(): Promise<string> {
    try {
      const { data } = await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      return data.default_branch || "main";
    } catch (error) {
      logger.warn(
        "Could not determine GitHub default branch, falling back to 'main':",
        error,
      );
      return "main";
    }
  }

  /**
   * Fetch the repository structure
   */
  public async fetchRepository(): Promise<RepoFile[]> {
    try {
      // Validate repository first
      const isValid = await this.validateRepository();
      if (!isValid) {
        throw new Error(
          `Repository "${this.owner}/${this.repo}" not found or is private. Check the URL or provide a token with --token.`,
        );
      }

      // Get the root tree
      let refData;
      try {
        const response = await this.octokit.git.getRef({
          owner: this.owner,
          repo: this.repo,
          ref: `heads/${this.branch}`,
        });
        refData = response.data;
      } catch (error) {
        const apiError = error as { status?: number; message?: string };
        if (apiError.status === 404) {
          // Try to get available branches
          let branchHint = "";
          try {
            const { data: branches } = await this.octokit.repos.listBranches({
              owner: this.owner,
              repo: this.repo,
              per_page: 5,
            });
            if (branches.length > 0) {
              const branchNames = branches.map((b) => b.name).join(", ");
              branchHint = ` Available branches: ${branchNames}`;
            }
          } catch {
            // Ignore errors when fetching branches
          }
          throw new Error(
            `Branch "${this.branch}" not found in ${this.owner}/${this.repo}.${branchHint}`,
          );
        }
        throw error;
      }

      const { data: commitData } = await this.octokit.git.getCommit({
        owner: this.owner,
        repo: this.repo,
        commit_sha: refData.object.sha,
      });

      const { data: treeData } = await this.octokit.git.getTree({
        owner: this.owner,
        repo: this.repo,
        tree_sha: commitData.tree.sha,
        recursive: "1",
      });

      // Process tree items in parallel with rate limiting
      const limit = pLimit(5); // Limit concurrent requests
      const files: RepoFile[] = [];

      const promises = treeData.tree.map((item) =>
        limit(async () => {
          // Skip directories
          if (item.type === "tree") {
            return;
          }

          try {
            const file = await this.fetchFile(item.path!);
            files.push(file);
          } catch (error) {
            logger.debug(`Failed to fetch file ${item.path}:`, error);
          }
        }),
      );

      await Promise.all(promises);
      return files;
    } catch (error) {
      const apiError = error as { status?: number; message?: string };
      // Re-throw our custom errors as-is
      if (apiError.message && !apiError.status) {
        throw error;
      }
      // Handle API errors
      if (apiError.status === 403 && apiError.message?.includes("rate limit")) {
        const resetDate = new Date(this.rateLimitReset * 1000);
        throw new Error(
          `GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}. Use --token for higher limits.`,
        );
      }
      if (apiError.status === 401) {
        throw new Error(`Authentication failed. Check your token is valid.`);
      }
      logger.debug("Error fetching repository structure:", error);
      throw new Error(
        `Failed to fetch repository: ${apiError.message || "Unknown error"}`,
      );
    }
  }

  /**
   * Fetch a specific file from the repository
   */
  public async fetchFile(path: string): Promise<RepoFile> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch,
      });

      if (Array.isArray(data)) {
        throw new Error(`Path ${path} is a directory, not a file`);
      }

      const extension = extractExtension(path);
      const fileType = determineFileType(extension);
      const language = determineLanguage(extension);

      let content: string | Buffer | null = null;
      const size = data.size;

      // Fetch content based on file type
      if (fileType === "code" || fileType === "image") {
        // For code and images, download the content
        if (data.download_url) {
          const response = await fetch(data.download_url);

          if (fileType === "code") {
            content = await response.text();
          } else {
            const arrayBuffer = await response.arrayBuffer();
            content = Buffer.from(arrayBuffer);
          }
        } else if ("content" in data && data.content) {
          // If content is already provided (base64 encoded)
          content = Buffer.from(data.content, "base64");
          if (fileType === "code") {
            content = content.toString("utf-8");
          }
        }
      } else if (fileType === "binary") {
        // For binary files, just store metadata
        content = null;
      }

      return {
        path,
        name: path.split("/").pop() || "",
        type: fileType,
        content,
        size,
        extension,
        language,
        isDirectory: false,
        children: [],
      };
    } catch (error) {
      logger.error(`Error fetching file ${path}:`, error);
      throw new Error(
        `Failed to fetch file ${path}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Check if the repository exists and is accessible
   */
  public async validateRepository(): Promise<boolean> {
    try {
      const { status } = await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      return status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get repository metadata
   */
  public async getRepositoryInfo(): Promise<{
    name: string;
    description?: string;
    owner?: string;
    stars?: number;
    lastUpdated?: Date;
    url: string;
  }> {
    try {
      const { data } = await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });

      return {
        name: data.name,
        description: data.description || undefined,
        owner: data.owner.login,
        stars: data.stargazers_count,
        lastUpdated: new Date(data.updated_at),
        url: data.html_url,
      };
    } catch (error) {
      logger.error("Error fetching repository info:", error);
      return {
        name: this.repo,
        owner: this.owner,
        url: this.options.url,
      };
    }
  }

  /**
   * Clean up any resources used by the fetcher
   */
  public async cleanup(): Promise<void> {
    // No cleanup needed for GitHub API
  }
}
