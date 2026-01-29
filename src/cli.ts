#!/usr/bin/env node

import { CacheManager } from "./utils/cache-manager";
import { Command } from "commander";
import { ConfigLoader } from "./config/config-loader";
import { Repo2PDF } from "./index";
import type { VCSType } from "./types/config.types";
import fs from "fs";
import inquirer from "inquirer";
import { logger } from "./utils/logger";
import ora from "ora";
import path from "path";

// ============================================
// Colors & Styling
// ============================================

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[38;5;102m";
const TEXT = "\x1b[38;5;145m";
const SUCCESS = "\x1b[38;5;114m";
const WARNING = "\x1b[38;5;221m";
const ERROR = "\x1b[38;5;203m";

// Gradient grays for logo
const GRAYS = [
  "\x1b[38;5;250m",
  "\x1b[38;5;248m",
  "\x1b[38;5;245m",
  "\x1b[38;5;243m",
  "\x1b[38;5;240m",
  "\x1b[38;5;238m",
];

const LOGO_LINES = [
  "██████╗ ███████╗██████╗  ██████╗ ██████╗ ██████╗ ██████╗ ███████╗",
  "██╔══██╗██╔════╝██╔══██╗██╔═══██╗╚════██╗██╔══██╗██╔══██╗██╔════╝",
  "██████╔╝█████╗  ██████╔╝██║   ██║ █████╔╝██████╔╝██║  ██║█████╗  ",
  "██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║██╔═══╝ ██╔═══╝ ██║  ██║██╔══╝  ",
  "██║  ██║███████╗██║     ╚██████╔╝███████╗██║     ██████╔╝██║     ",
  "╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝ ╚══════╝╚═╝     ╚═════╝ ╚═╝     ",
];

// ============================================
// Version
// ============================================

function getVersion(): string {
  try {
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.version;
  } catch {
    return "3.0.0";
  }
}

const VERSION = getVersion();

// ============================================
// UI Helpers
// ============================================

function showLogo(): void {
  console.log();
  LOGO_LINES.forEach((line, i) => {
    console.log(`${GRAYS[i]}${line}${RESET}`);
  });
}

function showBanner(): void {
  showLogo();
  console.log();
  console.log(`${DIM}Convert any repository to a beautiful PDF${RESET}`);
  console.log();
  console.log(
    `  ${DIM}$${RESET} ${TEXT}repo2pdf convert ${DIM}<repo>${RESET}     ${DIM}Convert a repository${RESET}`,
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}repo2pdf interactive${RESET}        ${DIM}Interactive mode${RESET}`,
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}repo2pdf cache --stats${RESET}      ${DIM}View cache statistics${RESET}`,
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}repo2pdf cache --clear${RESET}      ${DIM}Clear the cache${RESET}`,
  );
  console.log();
  console.log(
    `${DIM}try:${RESET} repo2pdf convert https://github.com/BankkRoll/repo2pdf`,
  );
  console.log();
  console.log(`${DIM}v${VERSION}${RESET}`);
  console.log();
}

function showHelp(): void {
  console.log(`
${BOLD}Usage:${RESET} repo2pdf <command> [options]

${BOLD}Commands:${RESET}
  convert <repo>      Convert a repository to PDF
                      Supports: GitHub, GitLab, Bitbucket, local paths
  interactive, -i     Run in interactive mode with guided prompts
  cache               Manage the repository cache

${BOLD}Convert Options:${RESET}
  -o, --output <path>       Output file path (default: ./<repo-name>.pdf)
  -b, --branch <branch>     Repository branch (default: main)
  -t, --token <token>       Auth token for private repositories
  --theme <theme>           Syntax theme (github, github-dark, monokai, dracula, nord)
  --no-line-numbers         Disable line numbers
  --no-page-numbers         Disable page numbers
  --no-toc                  Disable table of contents
  --ignore <patterns...>    Glob patterns to ignore
  --include-binary          Include binary files
  --include-hidden          Include hidden files
  --remove-comments         Remove code comments
  --remove-empty-lines      Remove empty lines
  --concurrency <n>         Max concurrent operations (default: 5)
  --no-cache                Disable caching
  --debug                   Enable debug output

${BOLD}Cache Options:${RESET}
  --clear                   Clear all cached data
  --stats                   Show cache statistics
  --repo <url>              Target specific repository

${BOLD}Examples:${RESET}
  ${DIM}$${RESET} repo2pdf convert https://github.com/user/repo
  ${DIM}$${RESET} repo2pdf convert ./local-project -o docs.pdf
  ${DIM}$${RESET} repo2pdf convert user/repo --theme github-dark
  ${DIM}$${RESET} repo2pdf convert user/repo --ignore "*.test.ts" "node_modules/**"
  ${DIM}$${RESET} repo2pdf interactive
  ${DIM}$${RESET} repo2pdf cache --stats
  ${DIM}$${RESET} repo2pdf cache --clear

${BOLD}Supported Sources:${RESET}
  ${TEXT}GitHub${RESET}      https://github.com/owner/repo
  ${TEXT}GitLab${RESET}      https://gitlab.com/owner/repo
  ${TEXT}Bitbucket${RESET}   https://bitbucket.org/owner/repo
  ${TEXT}Local${RESET}       ./path/to/directory or /absolute/path

${DIM}v${VERSION}${RESET}
`);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(0);
  return `${minutes}m ${remainingSeconds}s`;
}

// ============================================
// Repository Detection
// ============================================

interface RepoInfo {
  vcsType: VCSType;
  url: string;
  localPath?: string;
  name: string;
}

function parseRepository(input: string): RepoInfo {
  // GitHub shorthand: user/repo
  if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(input)) {
    const name = input.split("/")[1];
    return {
      vcsType: "github",
      url: `https://github.com/${input}`,
      name,
    };
  }

  // Full URLs
  if (input.startsWith("http://") || input.startsWith("https://")) {
    if (input.includes("github.com")) {
      const match = input.match(/github\.com\/([^/]+)\/([^/]+)/);
      const name = match ? match[2].replace(/\.git$/, "") : "repository";
      return { vcsType: "github", url: input, name };
    }
    if (input.includes("gitlab.com")) {
      const match = input.match(/gitlab\.com\/([^/]+)\/([^/]+)/);
      const name = match ? match[2].replace(/\.git$/, "") : "repository";
      return { vcsType: "gitlab", url: input, name };
    }
    if (input.includes("bitbucket.org")) {
      const match = input.match(/bitbucket\.org\/([^/]+)\/([^/]+)/);
      const name = match ? match[2].replace(/\.git$/, "") : "repository";
      return { vcsType: "bitbucket", url: input, name };
    }
    throw new Error(`Unsupported repository URL: ${input}`);
  }

  // Local path
  const resolvedPath = path.resolve(input);
  if (fs.existsSync(resolvedPath)) {
    return {
      vcsType: "local",
      url: "",
      localPath: resolvedPath,
      name: path.basename(resolvedPath),
    };
  }

  throw new Error(
    `Invalid repository: ${input}\nProvide a GitHub URL, shorthand (user/repo), or local path.`,
  );
}

// ============================================
// Convert Command
// ============================================

interface ConvertOptions {
  output?: string;
  branch?: string;
  token?: string;
  theme?: string;
  lineNumbers?: boolean;
  pageNumbers?: boolean;
  toc?: boolean;
  ignore?: string[];
  includeBinary?: boolean;
  includeHidden?: boolean;
  removeComments?: boolean;
  removeEmptyLines?: boolean;
  concurrency?: string;
  cache?: boolean;
  debug?: boolean;
}

async function runConvert(
  repository: string,
  options: ConvertOptions,
): Promise<void> {
  const startTime = Date.now();

  try {
    // Parse repository
    const repoInfo = parseRepository(repository);

    // Determine output path
    const outputPath = options.output || `./${repoInfo.name}.pdf`;

    console.log();
    console.log(
      `${TEXT}Repository:${RESET}  ${repoInfo.url || repoInfo.localPath}`,
    );
    console.log(`${TEXT}Output:${RESET}      ${outputPath}`);
    console.log(
      `${TEXT}Theme:${RESET}       ${options.theme || "github-dark"}`,
    );
    console.log();

    // Set debug mode
    logger.setDebugMode(options.debug || false);

    // Create configuration
    const configLoader = ConfigLoader.getInstance();
    const config = await configLoader.loadConfig({
      repository: {
        url: repoInfo.url,
        branch: options.branch,
        token: options.token,
        vcsType: repoInfo.vcsType,
        localPath: repoInfo.localPath,
        useCache: options.cache !== false,
      },
      output: {
        format: "pdf",
        outputPath,
        singleFile: true,
      },
      style: {
        theme: options.theme || "github-dark",
        lineNumbers: options.lineNumbers !== false,
        pageNumbers: options.pageNumbers !== false,
        includeTableOfContents: options.toc !== false,
      },
      processing: {
        ignorePatterns: options.ignore?.length ? options.ignore : undefined,
        maxConcurrency: parseInt(options.concurrency || "5", 10),
        removeComments: options.removeComments || false,
        removeEmptyLines: options.removeEmptyLines || false,
        includeBinaryFiles: options.includeBinary || false,
        includeHiddenFiles: options.includeHidden || false,
      },
      cache: {
        enabled: options.cache !== false,
        ttl: 86400000,
      },
      debug: options.debug || false,
    });

    // Run conversion with progress
    const spinner = ora({
      text: "Fetching repository...",
      color: "cyan",
    }).start();

    const repo2pdf = new Repo2PDF(config);

    // Update spinner for each phase
    spinner.text = "Processing files...";

    const result = await repo2pdf.convert();

    spinner.stopAndPersist({
      symbol: `${SUCCESS}[OK]${RESET}`,
      text: `${SUCCESS}PDF generated successfully${RESET}`,
    });

    // Show results
    console.log();
    console.log(`${DIM}────────────────────────────────────────${RESET}`);
    console.log(`${TEXT}Output:${RESET}    ${result.outputPath}`);
    console.log(`${TEXT}Size:${RESET}      ${formatFileSize(result.fileSize)}`);
    console.log(
      `${TEXT}Time:${RESET}      ${formatDuration(Date.now() - startTime)}`,
    );
    console.log(`${DIM}────────────────────────────────────────${RESET}`);
    console.log();
  } catch (error) {
    console.log();
    console.log(`${ERROR}Error:${RESET} ${(error as Error).message}`);
    if (options.debug) {
      console.log();
      console.log(`${DIM}Stack trace:${RESET}`);
      console.log(`${DIM}${(error as Error).stack}${RESET}`);
    } else {
      console.log(`${DIM}Run with --debug for more details${RESET}`);
    }
    console.log();
    process.exit(1);
  }
}

// ============================================
// Interactive Mode
// ============================================

async function runInteractive(): Promise<void> {
  showLogo();
  console.log();
  console.log(`${TEXT}Interactive Mode${RESET}`);
  console.log(
    `${DIM}Answer the prompts to configure your PDF generation${RESET}`,
  );
  console.log();

  try {
    // Repository source
    const { source } = await inquirer.prompt([
      {
        type: "input",
        name: "source",
        message: "Repository URL or path:",
        validate: (input: string) => {
          if (!input.trim()) return "Please enter a repository";
          try {
            parseRepository(input.trim());
            return true;
          } catch (err) {
            return (err as Error).message;
          }
        },
      },
    ]);

    const repoInfo = parseRepository(source.trim());

    // Output options
    const { outputPath, theme } = await inquirer.prompt([
      {
        type: "input",
        name: "outputPath",
        message: "Output file path:",
        default: `./${repoInfo.name}.pdf`,
      },
      {
        type: "list",
        name: "theme",
        message: "Syntax highlighting theme:",
        choices: [
          { name: "GitHub Dark", value: "github-dark" },
          { name: "GitHub Light", value: "github-light" },
          { name: "Monokai", value: "monokai" },
          { name: "Dracula", value: "dracula" },
          { name: "Nord", value: "nord" },
          { name: "One Dark Pro", value: "one-dark-pro" },
          { name: "Solarized Light", value: "solarized-light" },
          { name: "Solarized Dark", value: "solarized-dark" },
        ],
        default: "github-dark",
      },
    ]);

    // Include options
    const { includeLineNumbers, includePageNumbers, includeToc } =
      await inquirer.prompt([
        {
          type: "confirm",
          name: "includeLineNumbers",
          message: "Include line numbers?",
          default: true,
        },
        {
          type: "confirm",
          name: "includePageNumbers",
          message: "Include page numbers?",
          default: true,
        },
        {
          type: "confirm",
          name: "includeToc",
          message: "Include table of contents?",
          default: true,
        },
      ]);

    // Processing options
    const { ignorePatterns, includeBinary, includeHidden } =
      await inquirer.prompt([
        {
          type: "input",
          name: "ignorePatterns",
          message: "Patterns to ignore (comma-separated):",
          default: "node_modules/**, .git/**, *.lock",
          filter: (input: string) =>
            input
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean),
        },
        {
          type: "confirm",
          name: "includeBinary",
          message: "Include binary files?",
          default: false,
        },
        {
          type: "confirm",
          name: "includeHidden",
          message: "Include hidden files?",
          default: false,
        },
      ]);

    // Branch for remote repos
    let branch = "main";
    if (repoInfo.vcsType !== "local") {
      const { repoBranch } = await inquirer.prompt([
        {
          type: "input",
          name: "repoBranch",
          message: "Branch:",
          default: "main",
        },
      ]);
      branch = repoBranch;
    }

    // Confirm
    console.log();
    console.log(`${DIM}────────────────────────────────────────${RESET}`);
    console.log(
      `${TEXT}Repository:${RESET}  ${repoInfo.url || repoInfo.localPath}`,
    );
    console.log(`${TEXT}Output:${RESET}      ${outputPath}`);
    console.log(`${TEXT}Theme:${RESET}       ${theme}`);
    console.log(`${TEXT}Branch:${RESET}      ${branch}`);
    console.log(`${DIM}────────────────────────────────────────${RESET}`);
    console.log();

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Start conversion?",
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(`${WARNING}Cancelled${RESET}`);
      return;
    }

    // Run conversion
    await runConvert(source.trim(), {
      output: outputPath,
      branch,
      theme,
      lineNumbers: includeLineNumbers,
      pageNumbers: includePageNumbers,
      toc: includeToc,
      ignore: ignorePatterns,
      includeBinary,
      includeHidden,
    });
  } catch (error) {
    if ((error as any).isTtyError) {
      console.log(`${ERROR}Interactive mode requires a TTY${RESET}`);
    } else {
      console.log(`${ERROR}Error:${RESET} ${(error as Error).message}`);
    }
    process.exit(1);
  }
}

// ============================================
// Cache Command
// ============================================

interface CacheOptions {
  clear?: boolean;
  stats?: boolean;
  repo?: string;
  branch?: string;
}

async function runCache(options: CacheOptions): Promise<void> {
  const cacheManager = CacheManager.getInstance();

  if (options.clear) {
    if (options.repo) {
      cacheManager.clearCache(options.repo, options.branch || "main");
      console.log(
        `${SUCCESS}[OK]${RESET} Cleared cache for ${options.repo}#${options.branch || "main"}`,
      );
    } else {
      cacheManager.clearAllCache();
      console.log(`${SUCCESS}[OK]${RESET} Cleared all cache`);
    }
    return;
  }

  if (options.stats) {
    const stats = cacheManager.getCacheStats();

    console.log();
    console.log(`${TEXT}Cache Statistics${RESET}`);
    console.log(`${DIM}────────────────────────────────────────${RESET}`);
    console.log(
      `${TEXT}Status:${RESET}      ${stats.enabled ? `${SUCCESS}Enabled${RESET}` : `${DIM}Disabled${RESET}`}`,
    );
    console.log(`${TEXT}Directory:${RESET}   ${stats.cacheDir}`);
    console.log(
      `${TEXT}TTL:${RESET}         ${stats.ttl / (60 * 60 * 1000)} hours`,
    );
    console.log(`${TEXT}Entries:${RESET}     ${stats.cacheCount}`);
    console.log(
      `${TEXT}Total Size:${RESET}  ${formatFileSize(stats.totalSize)}`,
    );

    if (stats.repositories && stats.repositories.length > 0) {
      console.log();
      console.log(`${TEXT}Cached Repositories:${RESET}`);
      for (const repo of stats.repositories) {
        console.log(`  ${DIM}•${RESET} ${repo.url}#${repo.branch}`);
        console.log(
          `    ${DIM}${repo.fileCount} files • ${new Date(repo.timestamp).toLocaleDateString()}${RESET}`,
        );
      }
    }

    console.log(`${DIM}────────────────────────────────────────${RESET}`);
    console.log();
    return;
  }

  // Default: show help for cache command
  console.log(`
${BOLD}Usage:${RESET} repo2pdf cache [options]

${BOLD}Options:${RESET}
  --clear              Clear all cached data
  --stats              Show cache statistics
  --repo <url>         Target specific repository
  --branch <branch>    Target specific branch

${BOLD}Examples:${RESET}
  ${DIM}$${RESET} repo2pdf cache --stats
  ${DIM}$${RESET} repo2pdf cache --clear
  ${DIM}$${RESET} repo2pdf cache --clear --repo https://github.com/user/repo
`);
}

// ============================================
// Main CLI Setup
// ============================================

const program = new Command();

program
  .name("repo2pdf")
  .description("Convert any repository to a beautiful PDF")
  .version(VERSION);

// Convert command
program
  .command("convert")
  .description("Convert a repository to PDF")
  .argument(
    "<repository>",
    "Repository URL, shorthand (user/repo), or local path",
  )
  .option("-o, --output <path>", "Output file path")
  .option("-b, --branch <branch>", "Repository branch")
  .option("-t, --token <token>", "Auth token for private repositories")
  .option("--theme <theme>", "Syntax highlighting theme", "github-dark")
  .option("--no-line-numbers", "Disable line numbers")
  .option("--no-page-numbers", "Disable page numbers")
  .option("--no-toc", "Disable table of contents")
  .option("--ignore <patterns...>", "Patterns to ignore")
  .option("--include-binary", "Include binary files")
  .option("--include-hidden", "Include hidden files")
  .option("--remove-comments", "Remove code comments")
  .option("--remove-empty-lines", "Remove empty lines")
  .option("--concurrency <number>", "Max concurrent operations", "5")
  .option("--no-cache", "Disable caching")
  .option("--debug", "Enable debug output")
  .action(async (repository: string, options: ConvertOptions) => {
    showLogo();
    await runConvert(repository, options);
  });

// Interactive command
program
  .command("interactive")
  .alias("i")
  .description("Run in interactive mode with guided prompts")
  .action(async () => {
    await runInteractive();
  });

// Cache command
program
  .command("cache")
  .description("Manage the repository cache")
  .option("--clear", "Clear all cached data")
  .option("--stats", "Show cache statistics")
  .option("--repo <url>", "Target specific repository")
  .option("--branch <branch>", "Target specific branch")
  .action(async (options: CacheOptions) => {
    showLogo();
    console.log();
    await runCache(options);
  });

// Default action (no command)
program.action(() => {
  showBanner();
});

// Parse arguments
program.parse(process.argv);

// If no arguments, show banner
if (process.argv.length === 2) {
  showBanner();
}
