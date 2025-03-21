import {
  determineFileType,
  determineLanguage,
  extractExtension,
} from "../utils/file-utils";

import type { RepoFile } from "../types/file.types";
import type { RepositoryFetcher } from "./fetcher.interface";
import type { RepositoryOptions } from "../types/config.types";
import { logger } from "../utils/logger";
import pLimit from "p-limit";

/**
 * Bitbucket repository fetcher using Bitbucket API
 */
export class BitbucketFetcher implements RepositoryFetcher {
  private baseUrl = "https://api.bitbucket.org/2.0";
  private workspace = "";
  private repoSlug = "";
  private branch = "";
  private token: string | undefined;
  private options: RepositoryOptions;

  constructor() {
    this.options = { url: "" };
  }

  /**
   * Initialize the fetcher with repository options
   */
  public async initialize(options: RepositoryOptions): Promise<void> {
    this.options = options;
    this.token = options.token;
    this.branch = options.branch || "main";

    // Parse Bitbucket URL to extract workspace and repo slug
    const urlMatch = options.url.match(/bitbucket\.org\/([^/]+)\/([^/]+)/);
    if (!urlMatch) {
      throw new Error(`Invalid Bitbucket URL: ${options.url}`);
    }

    this.workspace = urlMatch[1];
    this.repoSlug = urlMatch[2].replace(".git", "");
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
          `Repository ${this.workspace}/${this.repoSlug} is not accessible or does not exist`,
        );
      }

      // Get repository source
      const files: RepoFile[] = [];
      await this.traverseDirectory("", files);

      return files;
    } catch (error) {
      logger.error("Error fetching repository structure:", error);
      throw new Error(
        `Failed to fetch repository structure: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Recursively traverse a directory and collect files
   */
  private async traverseDirectory(
    path: string,
    files: RepoFile[],
  ): Promise<void> {
    try {
      const endpoint = `/repositories/${this.workspace}/${this.repoSlug}/src/${this.branch}/${path}`;
      const data = await this.makeApiRequest(endpoint).then((res) =>
        res.json(),
      );

      // Process files and directories in parallel with rate limiting
      const limit = pLimit(5); // Limit concurrent requests

      const promises = [];

      // Process files
      if (data.values) {
        for (const item of data.values) {
          if (item.type === "commit_file") {
            // This is a file
            promises.push(
              limit(async () => {
                try {
                  const filePath = path ? `${path}/${item.path}` : item.path;
                  const file = await this.fetchFile(filePath);
                  files.push(file);
                } catch (error) {
                  logger.error(`Failed to fetch file ${item.path}:`, error);
                }
              }),
            );
          } else if (item.type === "commit_directory") {
            // This is a directory, recursively process it
            promises.push(
              limit(async () => {
                const dirPath = path ? `${path}/${item.path}` : item.path;
                await this.traverseDirectory(dirPath, files);
              }),
            );
          }
        }
      }

      await Promise.all(promises);
    } catch (error) {
      logger.error(`Error traversing directory ${path}:`, error);
      throw new Error(
        `Failed to traverse directory ${path}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Fetch a specific file from the repository
   */
  public async fetchFile(path: string): Promise<RepoFile> {
    try {
      const endpoint = `/repositories/${this.workspace}/${this.repoSlug}/src/${this.branch}/${path}`;
      const response = await this.makeApiRequest(endpoint);

      const extension = extractExtension(path);
      const fileType = determineFileType(extension);
      const language = determineLanguage(extension);

      // Get file size from headers if available
      const contentLength = response.headers.get("content-length");
      const size = contentLength ? Number.parseInt(contentLength, 10) : 0;

      let content: string | Buffer | null = null;

      // Fetch content based on file type
      if (fileType === "code") {
        content = await response.text();
      } else if (fileType === "image") {
        const arrayBuffer = await response.arrayBuffer();
        content = Buffer.from(arrayBuffer);
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
      const endpoint = `/repositories/${this.workspace}/${this.repoSlug}`;
      const response = await this.makeApiRequest(endpoint);
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
      const endpoint = `/repositories/${this.workspace}/${this.repoSlug}`;
      const data = await this.makeApiRequest(endpoint).then((res) =>
        res.json(),
      );

      return {
        name: data.name,
        description: data.description || undefined,
        owner: data.owner?.display_name,
        lastUpdated: new Date(data.updated_on),
        url: data.links?.html?.href || this.options.url,
      };
    } catch (error) {
      logger.error("Error fetching repository info:", error);
      return {
        name: this.repoSlug,
        owner: this.workspace,
        url: this.options.url,
      };
    }
  }

  /**
   * Clean up any resources used by the fetcher
   */
  public async cleanup(): Promise<void> {
    // No cleanup needed for Bitbucket API
  }

  /**
   * Make an API request to Bitbucket
   */
  private async makeApiRequest(endpoint: string): Promise<Response> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (this.token) {
      // Bitbucket uses Basic Auth with app passwords
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });

    if (response.status === 429) {
      // Rate limit exceeded
      const retryAfter = response.headers.get("Retry-After");
      const waitTime = retryAfter
        ? Number.parseInt(retryAfter, 10) * 1000
        : 60000;

      logger.warn(
        `Bitbucket API rate limit exceeded. Waiting for ${waitTime / 1000} seconds...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Retry the request
      return this.makeApiRequest(endpoint);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bitbucket API error (${response.status}): ${errorText}`);
    }

    return response;
  }
}
