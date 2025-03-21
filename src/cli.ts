#!/usr/bin/env node

import type { OutputFormat, VCSType } from "./types/config.types";

import { CacheManager } from "./utils/cache-manager";
import { Command } from "commander";
import { ConfigLoader } from "./config/config-loader";
import { ErrorHandler } from "./utils/error-handler";
import { Repo2PDF } from "./index";
import chalk from "chalk";
import fs from "fs";
import inquirer from "inquirer";
import { logger } from "./utils/logger";
import ora from "ora";
import path from "path";

/**
 * Command-line interface for repo2pdf
 */
const program = new Command();

// Set up CLI
program
  .name("repo2pdf")
  .description("Convert a repository to PDF, HTML, EPUB, or MOBI")
  .version("2.0.0");

// Add commands
program
  .command("convert")
  .description("Convert a repository to the specified format")
  .argument("<repository>", "Repository URL or local path")
  .option("-o, --output <path>", "Output file path")
  .option(
    "-f, --format <format>",
    "Output format (pdf, html, epub, mobi)",
    "pdf",
  )
  .option("-b, --branch <branch>", "Repository branch")
  .option(
    "-t, --token <token>",
    "GitHub/GitLab/Bitbucket token for private repositories",
  )
  .option(
    "-s, --single-file",
    "Generate a single file for all repository files",
    true,
  )
  .option("--theme <theme>", "Syntax highlighting theme")
  .option("--no-line-numbers", "Disable line numbers")
  .option("--no-page-numbers", "Disable page numbers")
  .option("--no-toc", "Disable table of contents")
  .option("--ignore <patterns...>", "Patterns to ignore (glob format)")
  .option("--include-binary", "Include binary files", false)
  .option("--include-hidden", "Include hidden files", false)
  .option("--remove-comments", "Remove comments from code", false)
  .option("--remove-empty-lines", "Remove empty lines from code", false)
  .option("--concurrency <number>", "Maximum concurrent operations", "5")
  .option("--no-cache", "Disable caching", false)
  .option("--clear-cache", "Clear cache before running", false)
  .option(
    "--incremental",
    "Use incremental processing for large repositories",
    true,
  )
  .option(
    "--chunk-size <number>",
    "Chunk size for incremental processing",
    "100",
  )
  .option("--debug", "Enable debug mode", false)
  .option("--interactive", "Run in interactive mode", false)
  .action(async (repository, options) => {
    try {
      // Set debug mode
      logger.setDebugMode(options.debug);

      // Handle cache clearing if requested
      if (options.clearCache) {
        const cacheManager = CacheManager.getInstance();
        cacheManager.clearAllCache();
      }

      // Parse repository URL or local path
      const repoPath = repository;
      let vcsType: VCSType = "github";
      let localPath: string | undefined;

      if (repoPath.startsWith("http")) {
        // Determine VCS type from URL
        if (repoPath.includes("github.com")) {
          vcsType = "github";
        } else if (repoPath.includes("gitlab.com")) {
          vcsType = "gitlab";
        } else if (repoPath.includes("bitbucket.org")) {
          vcsType = "bitbucket";
        } else {
          throw ErrorHandler.configurationError(
            `Unsupported repository URL: ${repoPath}`,
          );
        }
      } else {
        // Local path
        vcsType = "local";
        localPath = path.resolve(repoPath);

        if (!fs.existsSync(localPath)) {
          throw ErrorHandler.configurationError(
            `Local path does not exist: ${localPath}`,
          );
        }
      }

      // Interactive mode
      if (options.interactive) {
        await runInteractiveMode(repoPath, vcsType, localPath, options);
        return;
      }

      // Determine output path
      let outputPath = options.output;
      if (!outputPath) {
        const repoName = repoPath.endsWith("/")
          ? path.basename(repoPath.slice(0, -1))
          : path.basename(repoPath);

        outputPath = `./${repoName}.${options.format}`;
      }

      // Create configuration
      const configLoader = ConfigLoader.getInstance();
      const config = await configLoader.loadConfig({
        repository: {
          url: vcsType !== "local" ? repoPath : "",
          branch: options.branch,
          token: options.token,
          vcsType,
          localPath,
          useCache: options.cache,
        },
        output: {
          format: options.format as OutputFormat,
          outputPath,
          singleFile: options.singleFile,
        },
        style: {
          theme: options.theme || "github",
          lineNumbers: options.lineNumbers,
          pageNumbers: options.pageNumbers,
          includeTableOfContents: options.toc,
        },
        processing: {
          ignorePatterns: options.ignore || [],
          maxConcurrency: Number.parseInt(options.concurrency, 10),
          removeComments: options.removeComments,
          removeEmptyLines: options.removeEmptyLines,
          includeBinaryFiles: options.includeBinary,
          includeHiddenFiles: options.includeHidden,
          useIncrementalProcessing: options.incremental,
          incrementalChunkSize: Number.parseInt(options.chunkSize, 10),
        },
        cache: {
          enabled: options.cache,
          ttl: 86400000, // 24 hours
        },
        debug: options.debug,
      });

      // Run conversion
      const spinner = ora("Converting repository...").start();

      const repo2pdf = new Repo2PDF(config);
      const result = await repo2pdf.convert();

      spinner.succeed(
        `Repository converted successfully to ${result.outputPath}`,
      );
      console.log(chalk.green(`Output: ${result.outputPath}`));
      console.log(chalk.gray(`Size: ${formatFileSize(result.fileSize)}`));
      console.log(
        chalk.gray(`Time: ${(result.generationTime / 1000).toFixed(2)}s`),
      );
    } catch (error) {
      ErrorHandler.handle(error as Error, "CLI");
    }
  });

// Add cache management commands
program
  .command("cache")
  .description("Manage repository cache")
  .option("--clear", "Clear all cache")
  .option("--stats", "Show cache statistics")
  .option("--repo <url>", "Repository URL for specific cache operations")
  .option(
    "--branch <branch>",
    "Repository branch for specific cache operations",
  )
  .action(async (options) => {
    try {
      const cacheManager = CacheManager.getInstance();

      if (options.clear) {
        if (options.repo) {
          cacheManager.clearCache(options.repo, options.branch || "main");
          console.log(
            chalk.green(
              `Cleared cache for ${options.repo}#${options.branch || "main"}`,
            ),
          );
        } else {
          cacheManager.clearAllCache();
          console.log(chalk.green("Cleared all cache"));
        }
      } else if (options.stats) {
        const stats = cacheManager.getCacheStats();
        console.log(chalk.blue("Cache Statistics:"));
        console.log(chalk.gray(`Enabled: ${stats.enabled}`));
        console.log(chalk.gray(`Cache Directory: ${stats.cacheDir}`));
        console.log(chalk.gray(`TTL: ${stats.ttl / (60 * 60 * 1000)} hours`));
        console.log(chalk.gray(`Cache Count: ${stats.cacheCount}`));
        console.log(
          chalk.gray(`Total Size: ${formatFileSize(stats.totalSize)}`),
        );

        if (stats.repositories.length > 0) {
          console.log(chalk.blue("\nCached Repositories:"));
          stats.repositories.forEach((repo) => {
            console.log(chalk.gray(`- ${repo.url}#${repo.branch}`));
            console.log(chalk.gray(`  Files: ${repo.fileCount}`));
            console.log(
              chalk.gray(
                `  Cached: ${new Date(repo.timestamp).toLocaleString()}`,
              ),
            );
          });
        }
      } else {
        console.log(
          chalk.yellow("No cache operation specified. Use --clear or --stats."),
        );
      }
    } catch (error) {
      ErrorHandler.handle(error as Error, "Cache");
    }
  });

// Add benchmark command
program
  .command("benchmark")
  .description("Run performance benchmarks")
  .option("--repo <url>", "Repository URL to benchmark")
  .option("--iterations <number>", "Number of benchmark iterations", "3")
  .option("--format <format>", "Output format to benchmark", "pdf")
  .option("--cache", "Use cache for benchmarks", false)
  .action(async (options) => {
    try {
      if (!options.repo) {
        console.log(
          chalk.yellow(
            "Repository URL is required for benchmarking. Use --repo <url>.",
          ),
        );
        return;
      }

      const iterations = Number.parseInt(options.iterations, 10);
      const format = options.format as OutputFormat;
      const useCache = options.cache;

      console.log(chalk.blue(`Running benchmark on ${options.repo}`));
      console.log(chalk.gray(`Format: ${format}`));
      console.log(chalk.gray(`Iterations: ${iterations}`));
      console.log(chalk.gray(`Cache: ${useCache ? "enabled" : "disabled"}`));

      const results = [];

      for (let i = 0; i < iterations; i++) {
        console.log(chalk.blue(`\nIteration ${i + 1}/${iterations}`));

        // Clear cache if not using it
        if (!useCache) {
          const cacheManager = CacheManager.getInstance();
          cacheManager.clearCache(options.repo, "main");
        }

        const configLoader = ConfigLoader.getInstance();
        const config = await configLoader.loadConfig({
          repository: {
            url: options.repo,
            vcsType: "github",
            useCache,
          },
          output: {
            format,
            outputPath: `./benchmark-${i + 1}.${format}`,
            singleFile: true,
          },
          cache: {
            enabled: useCache,
          },
        });

        const startTime = Date.now();
        const spinner = ora("Running benchmark...").start();

        const repo2pdf = new Repo2PDF(config);
        const result = await repo2pdf.convert();

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        spinner.succeed(
          `Benchmark completed in ${(totalTime / 1000).toFixed(2)}s`,
        );

        results.push({
          iteration: i + 1,
          time: totalTime,
          fileSize: result.fileSize,
        });
      }

      // Calculate statistics
      const times = results.map((r) => r.time);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(chalk.blue("\nBenchmark Results:"));
      console.log(chalk.gray(`Average Time: ${(avgTime / 1000).toFixed(2)}s`));
      console.log(chalk.gray(`Minimum Time: ${(minTime / 1000).toFixed(2)}s`));
      console.log(chalk.gray(`Maximum Time: ${(maxTime / 1000).toFixed(2)}s`));
      console.log(
        chalk.gray(`Standard Deviation: ${calculateStdDev(times) / 1000}s`),
      );

      console.log(chalk.blue("\nDetailed Results:"));
      results.forEach((r) => {
        console.log(
          chalk.gray(
            `Iteration ${r.iteration}: ${(r.time / 1000).toFixed(2)}s, ${formatFileSize(r.fileSize)}`,
          ),
        );
      });
    } catch (error) {
      ErrorHandler.handle(error as Error, "Benchmark");
    }
  });

/**
 * Run interactive mode
 */
async function runInteractiveMode(
  repoPath: string,
  vcsType: VCSType,
  localPath: string | undefined,
  cliOptions: any,
): Promise<void> {
  try {
    console.log(chalk.blue("Running in interactive mode"));

    // Ask for repository details
    const repoAnswers = await inquirer.prompt([
      {
        type: "input",
        name: "repository",
        message: "Repository URL or local path:",
        default: repoPath,
      },
      {
        type: "list",
        name: "vcsType",
        message: "Repository type:",
        choices: [
          { name: "GitHub", value: "github" },
          { name: "GitLab", value: "gitlab" },
          { name: "Bitbucket", value: "bitbucket" },
          { name: "Local", value: "local" },
        ],
        default: vcsType,
      },
      {
        type: "input",
        name: "branch",
        message: "Branch:",
        default: cliOptions.branch || "main",
        when: (answers) => answers.vcsType !== "local",
      },
      {
        type: "password",
        name: "token",
        message: "Access token (for private repositories):",
        default: cliOptions.token,
        when: (answers) => answers.vcsType !== "local",
      },
    ]);

    // Ask for output options
    const outputAnswers = await inquirer.prompt([
      {
        type: "list",
        name: "format",
        message: "Output format:",
        choices: [
          { name: "PDF", value: "pdf" },
          { name: "HTML", value: "html" },
          { name: "EPUB", value: "epub" },
          { name: "MOBI", value: "mobi" },
        ],
        default: cliOptions.format || "pdf",
      },
      {
        type: "input",
        name: "outputPath",
        message: "Output path:",
        default:
          cliOptions.output ||
          `./${path.basename(repoAnswers.repository)}.${cliOptions.format || "pdf"}`,
      },
      {
        type: "confirm",
        name: "singleFile",
        message: "Generate a single file for all repository files?",
        default:
          cliOptions.singleFile !== undefined ? cliOptions.singleFile : true,
      },
    ]);

    // Ask for style options
    const styleAnswers = await inquirer.prompt([
      {
        type: "list",
        name: "theme",
        message: "Syntax highlighting theme:",
        choices: [
          "github",
          "github-dark",
          "monokai",
          "dracula",
          "solarized-light",
          "solarized-dark",
          "nord",
          "one-dark",
          "one-light",
        ],
        default: cliOptions.theme || "github",
      },
      {
        type: "confirm",
        name: "lineNumbers",
        message: "Include line numbers?",
        default:
          cliOptions.lineNumbers !== undefined ? cliOptions.lineNumbers : true,
      },
      {
        type: "confirm",
        name: "pageNumbers",
        message: "Include page numbers?",
        default:
          cliOptions.pageNumbers !== undefined ? cliOptions.pageNumbers : true,
        when: (answers) => outputAnswers.format === "pdf",
      },
      {
        type: "confirm",
        name: "includeTableOfContents",
        message: "Include table of contents?",
        default: cliOptions.toc !== undefined ? cliOptions.toc : true,
      },
    ]);

    // Ask for processing options
    const processingAnswers = await inquirer.prompt([
      {
        type: "input",
        name: "ignorePatterns",
        message: "Patterns to ignore (comma-separated):",
        default: (cliOptions.ignore || []).join(","),
        filter: (input) =>
          input
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
      },
      {
        type: "confirm",
        name: "includeBinaryFiles",
        message: "Include binary files?",
        default:
          cliOptions.includeBinary !== undefined
            ? cliOptions.includeBinary
            : false,
      },
      {
        type: "confirm",
        name: "includeHiddenFiles",
        message: "Include hidden files?",
        default:
          cliOptions.includeHidden !== undefined
            ? cliOptions.includeHidden
            : false,
      },
      {
        type: "confirm",
        name: "removeComments",
        message: "Remove comments from code?",
        default:
          cliOptions.removeComments !== undefined
            ? cliOptions.removeComments
            : false,
      },
      {
        type: "confirm",
        name: "removeEmptyLines",
        message: "Remove empty lines from code?",
        default:
          cliOptions.removeEmptyLines !== undefined
            ? cliOptions.removeEmptyLines
            : false,
      },
      {
        type: "input",
        name: "maxConcurrency",
        message: "Maximum concurrent operations:",
        default: cliOptions.concurrency || "5",
        validate: (input) =>
          !isNaN(Number.parseInt(input, 10)) ? true : "Please enter a number",
      },
      {
        type: "confirm",
        name: "useCache",
        message: "Use cache?",
        default: cliOptions.cache !== undefined ? cliOptions.cache : true,
      },
      {
        type: "confirm",
        name: "useIncrementalProcessing",
        message: "Use incremental processing for large repositories?",
        default:
          cliOptions.incremental !== undefined ? cliOptions.incremental : true,
      },
    ]);

    // Create configuration
    const configLoader = ConfigLoader.getInstance();
    const config = await configLoader.loadConfig({
      repository: {
        url: repoAnswers.vcsType !== "local" ? repoAnswers.repository : "",
        branch: repoAnswers.branch,
        token: repoAnswers.token,
        vcsType: repoAnswers.vcsType,
        localPath:
          repoAnswers.vcsType === "local"
            ? path.resolve(repoAnswers.repository)
            : undefined,
        useCache: processingAnswers.useCache,
      },
      output: {
        format: outputAnswers.format as OutputFormat,
        outputPath: outputAnswers.outputPath,
        singleFile: outputAnswers.singleFile,
      },
      style: {
        theme: styleAnswers.theme,
        lineNumbers: styleAnswers.lineNumbers,
        pageNumbers: styleAnswers.pageNumbers,
        includeTableOfContents: styleAnswers.includeTableOfContents,
      },
      processing: {
        ignorePatterns: processingAnswers.ignorePatterns,
        maxConcurrency: Number.parseInt(processingAnswers.maxConcurrency, 10),
        removeComments: processingAnswers.removeComments,
        removeEmptyLines: processingAnswers.removeEmptyLines,
        includeBinaryFiles: processingAnswers.includeBinaryFiles,
        includeHiddenFiles: processingAnswers.includeHiddenFiles,
        useIncrementalProcessing: processingAnswers.useIncrementalProcessing,
      },
      cache: {
        enabled: processingAnswers.useCache,
        ttl: 86400000, // 24 hours
      },
      debug: cliOptions.debug,
    });

    // Confirm and run conversion
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Start conversion?",
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow("Conversion cancelled"));
      return;
    }

    const spinner = ora("Converting repository...").start();

    const repo2pdf = new Repo2PDF(config);
    const result = await repo2pdf.convert();

    spinner.succeed(
      `Repository converted successfully to ${result.outputPath}`,
    );
    console.log(chalk.green(`Output: ${result.outputPath}`));
    console.log(chalk.gray(`Size: ${formatFileSize(result.fileSize)}`));
    console.log(
      chalk.gray(`Time: ${(result.generationTime / 1000).toFixed(2)}s`),
    );
  } catch (error) {
    ErrorHandler.handle(error as Error, "Interactive Mode");
  }
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((value) => {
    const diff = value - avg;
    return diff * diff;
  });
  const avgSquareDiff =
    squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

// Run the program
program.parse(process.argv);
