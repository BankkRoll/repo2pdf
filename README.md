# Full rewrite of repo2pdf in progress..
# Full rewrite of repo2pdf in progress..
# Full rewrite of repo2pdf in progress..

# repo2pdf

![npm](https://img.shields.io/npm/v/repo2pdf)
![npm](https://img.shields.io/npm/dt/repo2pdf)
![NPM](https://img.shields.io/npm/l/repo2pdf)
![GitHub issues](https://img.shields.io/github/issues/BankkRoll/repo2pdf)
![GitHub pull requests](https://img.shields.io/github/issues-pr/BankkRoll/repo2pdf)
![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)
![GitHub Stars](https://img.shields.io/github/stars/BankkRoll/repo2pdf)
![GitHub Forks](https://img.shields.io/github/forks/BankkRoll/repo2pdf)

#### NPM: https://www.npmjs.com/package/repo2pdf

#### Website: https://repo2pdf.site

## Table of Contents
<details>
 <summary>View Table of Contents</summary>
- [repo2pdf](#repo2pdf)
      - [NPM: https://www.npmjs.com/package/repo2pdf](#npm-httpswwwnpmjscompackagerepo2pdf)
      - [Website: https://repo2pdf.site](#website-httpsrepo2pdfsite)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Installation](#installation)
    - [Global Installation](#global-installation)
    - [Local Installation](#local-installation)
  - [Usage](#usage)
    - [Command Line](#command-line)
    - [Interactive Mode](#interactive-mode)
    - [Programmatic API](#programmatic-api)
  - [Configuration](#configuration)
    - [Configuration File](#configuration-file)
    - [Environment Variables](#environment-variables)
  - [Architecture](#architecture)
    - [Core Components](#core-components)
    - [Extension Points](#extension-points)
  - [Advanced Usage](#advanced-usage)
    - [Custom Styling](#custom-styling)
    - [Filtering Files](#filtering-files)
    - [Performance Optimization](#performance-optimization)
  - [Development](#development)
    - [Building from Source](#building-from-source)
    - [Running Tests](#running-tests)
    - [Contributing](#contributing)
  - [License](#license)
  - [Technical Architecture Details](#technical-architecture-details)
    - [Repository Fetching](#repository-fetching)
    - [File Processing](#file-processing)
    - [Output Generation](#output-generation)
    - [Parallel Processing](#parallel-processing)
    - [Error Handling](#error-handling)
    - [Testing](#testing)
    - [File Directory](#file-directory)
    - [repo2pdf Architecture](#repo2pdf-architecture)
</details>

## Overview

repo2pdf is a comprehensive TypeScript tool designed to convert Git repositories (GitHub, GitLab, Bitbucket, or local) into various document formats (PDF, HTML, EPUB, MOBI) while preserving code syntax highlighting, directory structure, and metadata. It's perfect for code documentation, archiving, offline reading, or sharing code in a more accessible format.

## Features

- **Multiple VCS Support**: GitHub, GitLab, Bitbucket, and local repositories
- **Multiple Output Formats**: PDF, HTML, EPUB, and MOBI
- **Advanced Syntax Highlighting**: Using Shiki with support for 25+ programming languages
- **Customizable Styling**: Themes, fonts, line numbers, and custom CSS
- **Binary File Support**: Handles images and provides metadata for binary files
- **Performance Optimization**: Parallel processing with concurrency control
- **Comprehensive Filtering**: Ignore patterns, hidden files, and binary files
- **Interactive CLI Mode**: User-friendly command-line interface
- **Programmatic API**: Use as a library in your Node.js applications
- **Robust Error Handling**: Detailed error messages and logging
- **Extensive Configuration**: Via CLI, config file, or environment variables

## Installation

### Global Installation

```bash
npm install -g repo2pdf
```

### Local Installation

```bash
npm install repo2pdf
```

## Usage

### Command Line

Convert a GitHub repository to PDF:

```bash
repo2pdf convert https://github.com/username/repository --output repo.pdf
```

Convert a local repository to HTML:

```bash
repo2pdf convert /path/to/local/repo --format html --output repo.html
```

With additional options:

```bash
repo2pdf convert https://github.com/username/repository \
  --output repo.pdf \
  --branch develop \
  --token YOUR_GITHUB_TOKEN \
  --theme monokai \
  --no-line-numbers \
  --ignore node_modules dist .git \
  --include-binary \
  --debug
```

### Interactive Mode

For a guided experience:

```bash
repo2pdf convert --interactive
```

This will prompt you for all necessary options with sensible defaults.

### Programmatic API

```javascript
import { convertRepository } from "repo2pdf";

async function main() {
  try {
    const result = await convertRepository({
      repository: {
        url: "https://github.com/username/repository",
        branch: "main",
        token: "YOUR_GITHUB_TOKEN", // Optional for private repos
      },
      output: {
        format: "pdf",
        outputPath: "./output.pdf",
        singleFile: true,
      },
      style: {
        theme: "github-dark",
        lineNumbers: true,
        pageNumbers: true,
        includeTableOfContents: true,
      },
      processing: {
        ignorePatterns: ["node_modules/**", "dist/**"],
        includeBinaryFiles: true,
      },
    });

    console.log(`Repository converted successfully: ${result.outputPath}`);
    console.log(`File size: ${result.fileSize} bytes`);
    console.log(`Generation time: ${result.generationTime}ms`);
  } catch (error) {
    console.error("Error converting repository:", error);
  }
}

main();
```

## Configuration

### Configuration File

repo2pdf uses [cosmiconfig](https://github.com/davidtheclark/cosmiconfig) to find and load a configuration file. It looks for:

- `repo2pdf.config.js`
- `repo2pdf.config.json`
- `.repo2pdfrc`
- `.repo2pdfrc.json`
- `.repo2pdfrc.js`
- `repo2pdf` property in `package.json`

Example configuration file (repo2pdf.config.js):

```javascript
module.exports = {
  repository: {
    branch: "main",
  },
  output: {
    format: "pdf",
    pageSize: "A4",
    landscape: false,
    margin: {
      top: "1cm",
      right: "1cm",
      bottom: "1cm",
      left: "1cm",
    },
  },
  style: {
    theme: "github-dark",
    fontSize: "14px",
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
  },
  processing: {
    ignorePatterns: ["node_modules/**", ".git/**", "dist/**", "build/**"],
    maxConcurrency: 5,
    removeComments: false,
    removeEmptyLines: false,
    includeBinaryFiles: true,
    includeHiddenFiles: false,
  },
  debug: false,
};
```

### Environment Variables

- `REPO2PDF_TOKEN`: GitHub/GitLab/Bitbucket token for private repositories
- `REPO2PDF_BRANCH`: Repository branch to use
- `REPO2PDF_DEBUG`: Enable debug mode (set to "true")

## Architecture

repo2pdf has been fully rebuilt with a modular, extensible architecture that separates concerns and allows for easy customization.

### Core Components

1. **Configuration Management**

   - `ConfigLoader`: Loads and merges configuration from various sources
   - `default-config.ts`: Provides sensible defaults

2. **Repository Fetching**

   - `RepositoryFetcher` interface: Common contract for all fetchers
   - Implementations for GitHub, GitLab, Bitbucket, and local repositories

3. **File Processing**

   - `FileProcessor`: Orchestrates processing of different file types
   - Specialized processors for code, images, and binary files
   - Syntax highlighting with Shiki

4. **Output Generation**

   - HTML generation as the base format
   - PDF generation using Puppeteer
   - EPUB generation for e-readers
   - MOBI generation for Kindle (using Calibre if available)

5. **Utilities**
   - Logging with different levels
   - Parallel processing with concurrency control
   - File type detection and handling
   - Comprehensive error handling

### Extension Points

repo2pdf is designed to be extensible. Key extension points include:

1. **Custom Fetchers**: Implement the `RepositoryFetcher` interface for additional VCS platforms
2. **Custom Processors**: Extend the processing pipeline for special file types
3. **Custom Generators**: Add support for additional output formats
4. **Custom Styling**: Apply custom CSS to the generated output

## Advanced Usage

### Custom Styling

You can provide custom CSS to style the output:

```bash
repo2pdf convert https://github.com/username/repository \
  --output repo.pdf \
  --theme github-dark \
  --custom-css path/to/custom.css
```

Or in the configuration file:

```javascript
{
  style: {
    customCSS: `
      body {
        font-family: 'Fira Code', monospace;
      }
      .file-header {
        background-color: #2d2d2d;
        color: #ffffff;
      }
    `;
  }
}
```

### Filtering Files

Ignore specific files or directories:

```bash
repo2pdf convert https://github.com/username/repository \
  --output repo.pdf \
  --ignore node_modules dist .git "**/*.log" "**/*.lock"
```

Include or exclude binary and hidden files:

```bash
repo2pdf convert https://github.com/username/repository \
  --output repo.pdf \
  --include-binary \
  --include-hidden
```

### Performance Optimization

Control concurrency for large repositories:

```bash
repo2pdf convert https://github.com/username/repository \
  --output repo.pdf \
  --concurrency 10
```

Process only specific parts of the code:

```bash
repo2pdf convert https://github.com/username/repository \
  --output repo.pdf \
  --remove-comments \
  --remove-empty-lines
```

## Development

### Building from Source

```bash
git clone https://github.com/BankkRoll/repo2pdf.git
cd repo2pdf
npm install
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](/license) file for details.

---

## Technical Architecture Details

### Repository Fetching

The repository fetching system is built around the `RepositoryFetcher` interface, which defines methods for initializing, fetching, and validating repositories. Each implementation (GitHub, GitLab, Bitbucket, local) handles the specifics of its platform:

- **GitHubFetcher**: Uses the Octokit REST client to interact with the GitHub API
- **GitLabFetcher**: Uses the GitLab API v4 with pagination support
- **BitbucketFetcher**: Uses the Bitbucket API v2 with recursive directory traversal
- **LocalFetcher**: Reads from the local filesystem with .gitignore support

Each fetcher converts the repository structure into a common `RepoFile` format that can be processed uniformly.

### File Processing

The file processing system is designed to handle different file types appropriately:

- **CodeProcessor**: Uses Shiki for syntax highlighting with support for 25+ languages
- **ImageProcessor**: Converts images to base64 for embedding in the output
- **BinaryProcessor**: Extracts metadata for binary files

The `FileProcessor` class orchestrates this process, applying filters and organizing files by directory.

### Output Generation

The output generation system starts with HTML as the base format:

- **HTMLGenerator**: Creates a structured HTML document with syntax highlighting
- **PDFGenerator**: Uses Puppeteer to convert HTML to PDF with customizable page settings
- **EPUBGenerator**: Creates EPUB files for e-readers
- **MOBIGenerator**: Creates MOBI files for Kindle, using Calibre if available

### Parallel Processing

The `ParallelProcessor` utility enables efficient processing of large repositories by:

- Limiting concurrent operations to prevent memory issues
- Providing progress tracking
- Handling errors gracefully
- Supporting early termination

### Error Handling

The error handling system uses custom error types for different scenarios:

- **ConfigurationError**: Issues with user configuration
- **RepositoryError**: Problems accessing or parsing repositories
- **FileProcessingError**: Issues during file processing
- **GenerationError**: Problems generating output files
- **NetworkError**: Network connectivity issues
- **AuthenticationError**: Authentication failures
- **PermissionError**: Permission-related issues
- **TimeoutError**: Operation timeouts

Each error includes context and, when available, the original error for debugging.

### Testing

The testing strategy includes:

- **Unit Tests**: Testing individual components in isolation
- **Integration Tests**: Testing the interaction between components
- **End-to-End Tests**: Testing the complete workflow

Tests use Jest with mocking for external dependencies.

### File Directory

```
repo2pdf/
├── .env                         # Environment variables file (ignored in production)
├── .env.example                 # Example environment variables file for reference
├── package-lock.json            # Lock file for npm dependencies
├── package.json                 # Project metadata and dependencies
├── README.md                    # Project documentation
├── tsconfig.json                 # TypeScript configuration file
│
├── bin/                         # Executable scripts
│   └── repo2pdf.js              # CLI entry point for generating PDFs
│
├── examples/                    # Example plugins for extending functionality
│   └── plugins/
│       ├── syntax-highlighter/
│       │   ├── index.ts         # Example syntax highlighting plugin
│       │   └── package.json     # Plugin-specific dependencies
│       └── theme-customizer/
│           ├── index.ts         # Example theme customization plugin
│           └── package.json     # Plugin-specific dependencies
│
├── src/                         # Source code directory
│   ├── cli.ts                   # Command-line interface
│   ├── index.ts                 # Main entry point and API
│   │
│   ├── config/                   # Configuration-related modules
│   │   ├── config-loader.ts      # Loads project configuration
│   │   └── default-config.ts     # Default configuration settings
│   │
│   ├── fetchers/                 # Fetchers for different repository sources
│   │   ├── fetcher.interface.ts  # Interface for repository fetchers
│   │   ├── github-fetcher.ts     # GitHub repository fetcher
│   │   ├── gitlab-fetcher.ts     # GitLab repository fetcher
│   │   ├── bitbucket-fetcher.ts  # Bitbucket repository fetcher
│   │   └── local-fetcher.ts      # Fetcher for local repositories
│   │
│   ├── generators/               # Content generation modules
│   │   ├── html-generator.ts     # HTML output generator
│   │   ├── pdf-generator.ts      # PDF output generator
│   │   ├── epub-generator.ts     # EPUB output generator
│   │   └── mobi-generator.ts     # MOBI output generator
│   │
│   ├── plugins/                  # Plugin system for extending functionality
│   │   ├── plugin-loader.ts      # Loads plugins dynamically
│   │   ├── plugin-manager.ts     # Manages plugin lifecycle
│   │   └── plugin.interface.ts   # Interface for plugin development
│   │
│   ├── processors/               # Processing modules for different file types
│   │   ├── file-processor.ts     # Processes general files
│   │   ├── code-processor.ts     # Processes code files
│   │   ├── image-processor.ts    # Processes image files
│   │   └── binary-processor.ts   # Processes binary files
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── config.types.ts       # Types for configuration
│   │   ├── file.types.ts         # Types for files
│   │   └── output.types.ts       # Types for output formats
│   │
│   └── utils/                    # Utility modules
│       ├── cache-manager.ts      # Manages caching to optimize performance
│       ├── error-handler.ts      # Handles errors and exceptions
│       ├── file-utils.ts         # File manipulation utilities
│       ├── incremental-processor.ts # Processes files incrementally
│       ├── logger.ts             # Logging utility
│       ├── parallel-processor.ts # Handles parallel processing tasks
│       ├── retry-handler.ts      # Retries failed network operations
│       └── secure-token-manager.ts # Manages secure authentication tokens
│
└── tests/                        # Testing directory
```

---

Created with ❤️ by BankkRoll
