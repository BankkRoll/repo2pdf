# Programmatic API

Use repo2pdf directly in your Node.js applications.

## Installation

```bash
npm install repo2pdf
```

## Quick Start

```typescript
import { convertRepository } from "repo2pdf";

const result = await convertRepository({
  repository: {
    url: "https://github.com/user/repo",
  },
  output: {
    format: "pdf",
    outputPath: "./output.pdf",
    singleFile: true,
  },
});

console.log(`PDF generated: ${result.outputPath}`);
```

## API Reference

### `convertRepository(config)`

Main function to convert a repository to PDF.

**Parameters:**

- `config` - Partial configuration object (see [Configuration](./configuration.md))

**Returns:** `Promise<GenerationResult>`

```typescript
interface GenerationResult {
  success: boolean;
  outputPath: string;
  format: string;
  fileSize: number;
  generationTime: number;
  error?: Error;
}
```

**Example:**

```typescript
import { convertRepository } from "repo2pdf";

const result = await convertRepository({
  repository: {
    url: "https://github.com/user/repo",
    branch: "main",
    token: process.env.GITHUB_TOKEN, // Optional for private repos
  },
  output: {
    format: "pdf",
    outputPath: "./documentation.pdf",
    singleFile: true,
    pageSize: "A4",
    landscape: false,
    margin: {
      top: "10mm",
      right: "10mm",
      bottom: "10mm",
      left: "10mm",
    },
  },
  style: {
    theme: "github-dark",
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
    fontSize: "12px",
    fontFamily: "monospace",
  },
  processing: {
    ignorePatterns: ["node_modules/**", "**/*.test.ts"],
    maxConcurrency: 5,
    removeComments: false,
    removeEmptyLines: false,
    includeBinaryFiles: false,
    includeHiddenFiles: false,
  },
  cache: {
    enabled: true,
    ttl: 86400000, // 24 hours
  },
  debug: false,
});

if (result.success) {
  console.log(`✓ PDF generated: ${result.outputPath}`);
  console.log(`  Size: ${(result.fileSize / 1024).toFixed(2)} KB`);
  console.log(`  Time: ${result.generationTime}ms`);
} else {
  console.error(`✗ Generation failed:`, result.error);
}
```

### `Repo2PDF` Class

For more control, use the `Repo2PDF` class directly:

```typescript
import { Repo2PDF, Config } from "repo2pdf";

const config: Config = {
  repository: {
    url: "https://github.com/user/repo",
    branch: "main",
    vcsType: "github",
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
    ignorePatterns: [],
    maxConcurrency: 5,
    removeComments: false,
    removeEmptyLines: false,
    includeBinaryFiles: false,
    includeHiddenFiles: false,
  },
  cache: {
    enabled: true,
    ttl: 86400000,
  },
  debug: false,
};

const repo2pdf = new Repo2PDF(config);
const result = await repo2pdf.convert();
```

## Type Definitions

### Config Types

```typescript
import type {
  Config,
  RepositoryOptions,
  OutputOptions,
  StyleOptions,
  ProcessingOptions,
  CacheOptions,
  ThemeType,
  OutputFormat,
  VCSType,
} from "repo2pdf";
```

### File Types

```typescript
import type {
  RepoFile,
  ProcessedFile,
  FileType,
  DirectoryStructure,
} from "repo2pdf";
```

### Output Types

```typescript
import type {
  GenerationResult,
  TOCItem,
  HTMLGenerationOptions,
  PDFGenerationOptions,
} from "repo2pdf";
```

### Plugin Types

```typescript
import type {
  IRepo2PDFPlugin,
  GenerationOutput,
  PluginMetadata,
  Plugin,
} from "repo2pdf";

import { HookPoint, PluginManager, PluginLoader } from "repo2pdf";
```

## Utilities

### Logger

```typescript
import { logger } from "repo2pdf";

// Set debug mode
logger.setDebugMode(true);

// Log messages
logger.info("Processing files...");
logger.debug("Debug details:", { count: 10 });
logger.warn("Warning message");
logger.error("Error occurred:", error);
```

### Error Handler

```typescript
import { ErrorHandler } from "repo2pdf";

// Create typed errors
throw ErrorHandler.configurationError("Invalid theme");
throw ErrorHandler.fetchError("Repository not found");
throw ErrorHandler.processingError("Failed to process file");
throw ErrorHandler.generationError("PDF generation failed");
```

### Cache Manager

```typescript
import { CacheManager } from "repo2pdf";

const cache = CacheManager.getInstance();

// Configure cache
cache.configure({
  enabled: true,
  ttl: 86400000,
  cacheDir: "./.repo2pdf-cache",
});

// Check for cached files
const files = cache.getCachedFiles("https://github.com/user/repo", "main");

// Cache files
cache.cacheFiles("https://github.com/user/repo", "main", files);

// Clear cache
cache.clear();

// Get stats
const stats = cache.getStats();
```

## Examples

### Convert Multiple Repositories

```typescript
import { convertRepository } from "repo2pdf";

const repos = ["user/repo1", "user/repo2", "user/repo3"];

for (const repo of repos) {
  const result = await convertRepository({
    repository: { url: `https://github.com/${repo}` },
    output: {
      format: "pdf",
      outputPath: `./${repo.replace("/", "-")}.pdf`,
      singleFile: true,
    },
  });

  console.log(`${repo}: ${result.success ? "✓" : "✗"}`);
}
```

### Custom Processing Pipeline

```typescript
import { Repo2PDF, PluginLoader, HookPoint } from "repo2pdf";
import { logger } from "repo2pdf";

// Initialize plugin system
const pluginLoader = new PluginLoader(logger);
const pluginManager = await pluginLoader.initialize({
  pluginDirectories: ["./my-plugins"],
});

// Check for custom handlers
if (pluginManager.hasHookHandlers(HookPoint.CUSTOM_PROCESSOR)) {
  console.log("Using custom processor plugin");
}

// List loaded plugins
for (const [name, plugin] of pluginManager.getPlugins()) {
  console.log(`Loaded: ${name} v${plugin.metadata.version}`);
}
```

### Error Handling

```typescript
import { convertRepository, ErrorHandler } from "repo2pdf";

try {
  const result = await convertRepository({
    repository: { url: "https://github.com/user/repo" },
    output: {
      format: "pdf",
      outputPath: "./output.pdf",
      singleFile: true,
    },
  });

  if (!result.success) {
    throw result.error;
  }
} catch (error) {
  if (error.code === "REPO_NOT_FOUND") {
    console.error("Repository not found");
  } else if (error.code === "AUTH_FAILED") {
    console.error("Authentication failed - check your token");
  } else {
    console.error("Unexpected error:", error.message);
  }
}
```

### Stream Processing for Large Repos

```typescript
import { convertRepository } from "repo2pdf";

const result = await convertRepository({
  repository: {
    url: "https://github.com/large/repository",
  },
  output: {
    format: "pdf",
    outputPath: "./large-repo.pdf",
    singleFile: true,
  },
  processing: {
    maxConcurrency: 3, // Lower concurrency for large repos
    useIncrementalProcessing: true, // Process in chunks
    incrementalChunkSize: 50, // Files per chunk
    ignorePatterns: ["node_modules/**", "dist/**", "**/*.min.js"],
  },
});
```

## See Also

- [Configuration](./configuration.md) - Full configuration reference
- [Plugins](./plugins.md) - Extending repo2pdf with plugins
- [Themes](./themes.md) - Theme customization
