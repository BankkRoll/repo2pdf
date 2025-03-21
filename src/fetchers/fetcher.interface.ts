import type { RepoFile } from "../types/file.types";
import type { RepositoryOptions } from "../types/config.types";

/**
 * Interface for repository fetchers
 */
export interface RepositoryFetcher {
  /**
   * Initialize the fetcher with repository options
   */
  initialize(options: RepositoryOptions): Promise<void>;

  /**
   * Fetch the repository structure
   */
  fetchRepository(): Promise<RepoFile[]>;

  /**
   * Fetch a specific file from the repository
   */
  fetchFile(path: string): Promise<RepoFile>;

  /**
   * Check if the repository exists and is accessible
   */
  validateRepository(): Promise<boolean>;

  /**
   * Get repository metadata
   */
  getRepositoryInfo(): Promise<{
    name: string;
    description?: string;
    owner?: string;
    stars?: number;
    lastUpdated?: Date;
    url: string;
  }>;

  /**
   * Clean up any resources used by the fetcher
   */
  cleanup(): Promise<void>;
}

/**
 * Factory for creating repository fetchers
 */
export interface RepositoryFetcherFactory {
  createFetcher(vcsType: string): RepositoryFetcher;
}
