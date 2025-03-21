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
    this.branch = options.branch || "main";

    // Initialize Octokit with token if provided
    if (options.token) {
      this.octokit = new Octokit({
        auth: options.token,
      });
    } else {
      this.octokit = new Octokit();
    }

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
   * Fetch the repository structure
   */
  public async fetchRepository(): Promise<RepoFile[]> {
    try {
      // Validate repository first
      const isValid = await this.validateRepository();
      if (!isValid) {
        throw new Error(
          `Repository ${this.owner}/${this.repo} is not accessible or does not exist`,
        );
      }

      // Get the root tree
      const { data: refData } = await this.octokit.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${this.branch}`,
      });

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
            const file = await this.fetchFile(item.path);
            files.push(file);
          } catch (error) {
            logger.error(`Failed to fetch file ${item.path}:`, error);
          }
        }),
      );

      await Promise.all(promises);
      return files;
    } catch (error) {
      logger.error("Error fetching repository structure:", error);
      throw new Error(
        `Failed to fetch repository structure: ${(error as Error).message}`,
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
        } else if (data.content) {
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
