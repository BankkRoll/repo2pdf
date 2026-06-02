import {
  determineFileType,
  determineLanguage,
  extractExtension,
} from "../utils/file-utils";

import type { RepoFile } from "../types/file.types";
import type { RepositoryFetcher } from "./fetcher.interface";
import type { RepositoryOptions } from "../types/config.types";
import { logger } from "../utils/logger";
import { RetryHandler } from "../utils/retry-handler";
import pLimit from "p-limit";

/**
 * GitLab repository fetcher using GitLab API
 */
export class GitLabFetcher implements RepositoryFetcher {
  private baseUrl = "https://gitlab.com/api/v4";
  private projectId = "";
  private branch = "";
  private token: string | undefined;
  private options: RepositoryOptions;
  private rateLimitRemaining = 600; // GitLab default rate limit
  private rateLimitReset = 0;

  constructor() {
    this.options = { url: "" };
  }

  /**
   * Initialize the fetcher with repository options
   */
  public async initialize(options: RepositoryOptions): Promise<void> {
    this.options = options;
    this.token = options.token;

    // Parse GitLab URL to extract project ID
    const urlMatch = options.url.match(/gitlab\.com\/([^/]+\/[^/]+)/);
    if (!urlMatch) {
      throw new Error(`Invalid GitLab URL: ${options.url}`);
    }

    // URL encode the project path
    const projectPath = urlMatch[1];
    this.projectId = encodeURIComponent(projectPath);

    // Resolve the branch: use the explicit branch, else the project's default.
    this.branch = options.branch || (await this.resolveDefaultBranch());

    // Check rate limit
    try {
      const response = await this.makeApiRequest("/user");
      const rateLimitHeader = response.headers.get("RateLimit-Remaining");
      const rateLimitResetHeader = response.headers.get("RateLimit-Reset");

      if (rateLimitHeader) {
        this.rateLimitRemaining = Number.parseInt(rateLimitHeader, 10);
      }

      if (rateLimitResetHeader) {
        this.rateLimitReset = Number.parseInt(rateLimitResetHeader, 10);
      }

      if (this.rateLimitRemaining < 10) {
        const resetDate = new Date(this.rateLimitReset * 1000);
        logger.warn(
          `GitLab API rate limit is low: ${this.rateLimitRemaining} requests remaining. Resets at ${resetDate.toLocaleString()}`,
        );
      }
    } catch (error) {
      logger.warn("Failed to check GitLab API rate limit:", error);
    }
  }

  /**
   * Resolve the project's default branch, falling back to "main".
   */
  private async resolveDefaultBranch(): Promise<string> {
    try {
      const data = await this.makeApiRequest(
        `/projects/${this.projectId}`,
      ).then((res) => res.json());
      return data?.default_branch || "main";
    } catch (error) {
      logger.warn(
        "Could not determine GitLab default branch, falling back to 'main':",
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
          `Repository ${this.projectId} is not accessible or does not exist`,
        );
      }

      // Get repository tree
      const treeUrl = `/projects/${this.projectId}/repository/tree?recursive=true&ref=${this.branch}&per_page=100`;
      const treeItems = await this.fetchAllPages(treeUrl);

      // Process tree items in parallel with rate limiting
      const limit = pLimit(5); // Limit concurrent requests
      const files: RepoFile[] = [];

      const promises = treeItems
        .filter((item) => item.type === "blob") // Only process files, not directories
        .map((item) =>
          limit(async () => {
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
      // Get file metadata
      const fileUrl = `/projects/${this.projectId}/repository/files/${encodeURIComponent(path)}?ref=${this.branch}`;
      const fileData = await this.makeApiRequest(fileUrl).then((res) =>
        res.json(),
      );

      const extension = extractExtension(path);
      const fileType = determineFileType(extension);
      const language = determineLanguage(extension);
      const size = fileData.size || 0;

      let content: string | Buffer | null = null;

      // Fetch content based on file type
      if (fileType === "code" || fileType === "image") {
        // For code and images, download the content
        const contentUrl = `/projects/${this.projectId}/repository/files/${encodeURIComponent(path)}/raw?ref=${this.branch}`;
        const response = await this.makeApiRequest(contentUrl);

        if (fileType === "code") {
          content = await response.text();
        } else {
          const arrayBuffer = await response.arrayBuffer();
          content = Buffer.from(arrayBuffer);
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
      const url = `/projects/${this.projectId}`;
      const response = await this.makeApiRequest(url);
      return response.status === 200;
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
      const url = `/projects/${this.projectId}`;
      const data = await this.makeApiRequest(url).then((res) => res.json());

      return {
        name: data.name,
        description: data.description || undefined,
        owner: data.namespace?.name,
        stars: data.star_count,
        lastUpdated: new Date(data.last_activity_at),
        url: data.web_url,
      };
    } catch (error) {
      logger.error("Error fetching repository info:", error);
      return {
        name: this.projectId.split("/").pop() || "",
        url: this.options.url,
      };
    }
  }

  /**
   * Clean up any resources used by the fetcher
   */
  public async cleanup(): Promise<void> {
    // No cleanup needed for GitLab API
  }

  /**
   * Make an API request to GitLab
   */
  private async makeApiRequest(endpoint: string): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (this.token) {
      headers["PRIVATE-TOKEN"] = this.token;
    }

    // RetryHandler owns retry behavior (including 429/5xx). The throw on a
    // non-ok response happens inside the retried function so its status code is
    // surfaced in the thrown message and matched by RetryHandler.retryableErrors.
    return RetryHandler.withRetry(async () => {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        // Avoid leaking the raw API body (which can echo the token on 401/403);
        // surface only a public message field if one is present.
        const safe = (() => {
          try {
            const j = JSON.parse(errorText);
            return j?.message ?? j?.error;
          } catch {
            return undefined;
          }
        })();
        throw new Error(
          `GitLab API error (${response.status}): ${safe ?? "request failed"}`,
        );
      }

      return response;
    });
  }

  /**
   * Fetch all pages of a paginated API endpoint
   */
  private async fetchAllPages(
    endpoint: string,
  ): Promise<Array<{ type: string; path: string }>> {
    let page = 1;
    let hasMorePages = true;
    const allItems: Array<{ type: string; path: string }> = [];

    while (hasMorePages) {
      const pageUrl = `${endpoint}&page=${page}`;
      const response = await this.makeApiRequest(pageUrl);
      const items = (await response.json()) as Array<{
        type: string;
        path: string;
      }>;

      if (Array.isArray(items) && items.length > 0) {
        allItems.push(...items);
        page++;
      } else {
        hasMorePages = false;
      }

      // Check if we've reached the last page
      const totalPages = response.headers.get("X-Total-Pages");
      if (totalPages && page > Number.parseInt(totalPages, 10)) {
        hasMorePages = false;
      }
    }

    return allItems;
  }
}
