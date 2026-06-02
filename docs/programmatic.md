# Programmatic API

Use repo2pdf directly in your applications.

## Runtime support

PDF rendering is **pure JavaScript** (built on [pdf-lib](https://pdf-lib.js.org)) —
there is no Chromium, Puppeteer, or native-module dependency, and nothing to
install at the system level.

| Entry point                                | Needs `fs`?  | Where it runs                   |
| ------------------------------------------ | ------------ | ------------------------------- |
| `convertRepository` (writes a file)        | Yes          | Node                            |
| `convertRepositoryToBytes` (returns bytes) | Fetch step\* | Node, serverless                |
| `PDFGenerator` / `PdfLibRenderer`          | No           | Node, serverless, edge, browser |

\* `convertRepositoryToBytes` runs the built-in fetchers; the `local` fetcher
needs `fs`, while the GitHub/GitLab/Bitbucket fetchers use `fetch`. For a true
edge runtime, fetch the files yourself and call the renderer directly — see
[Serverless / Next.js / Edge](#serverless--nextjs--edge).

The only hard requirement is **Node.js >= 18.0.0** for the CLI and the
file-writing API.

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

Convert a repository to a PDF and **write it to disk** at `config.output.outputPath`.
Node-only (uses `fs`).

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
    theme: "github-light",
    highlight: "auto", // "auto" (default) | "shiki" | "none"
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
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
  console.log(`PDF generated: ${result.outputPath}`);
  console.log(`  Size: ${(result.fileSize / 1024).toFixed(2)} KB`);
  console.log(`  Time: ${result.generationTime}ms`);
} else {
  console.error(`Generation failed:`, result.error);
}
```

### `convertRepositoryToBytes(config)`

Run the exact same fetch -> process -> render pipeline as `convertRepository`,
but **return the PDF as bytes** instead of writing a file. Use this in HTTP
handlers and serverless functions to send the PDF directly in a response.

**Parameters:**

- `config` - Partial configuration object (see [Configuration](./configuration.md))

**Returns:** `Promise<Uint8Array>`

```typescript
import { convertRepositoryToBytes } from "repo2pdf";
import { writeFile } from "node:fs/promises";

const bytes = await convertRepositoryToBytes({
  repository: { url: "https://github.com/user/repo" },
  output: { format: "pdf", outputPath: "repo.pdf", singleFile: true },
});

// Do anything with the bytes — write them, upload them, stream them...
await writeFile("./repo.pdf", bytes);
```

> `output.outputPath` is still required by the config schema (it is reported to
> the `POST_GENERATE` hook), but no file is written by this function.

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
    highlight: "auto",
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

// Write a file...
const result = await repo2pdf.convert();

// ...or get the bytes without touching the filesystem.
const bytes = await repo2pdf.convertToBytes();
```

## Syntax Highlighting

`config.style.highlight` controls how code is colored:

| Value              | Behavior                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `"auto"` (default) | Use [Shiki](https://shiki.style) when it can load (Node); fall back to plain text otherwise |
| `"shiki"`          | Force Shiki. Fails if Shiki cannot load                                                     |
| `"none"`           | Never highlight. Universal, dependency-free, and edge-safe                                  |

Shiki is **optional** — it is never required to produce a PDF. On runtimes where
Shiki cannot load (or when you choose `"none"`), code is rendered as readable
plain text in the configured theme's foreground color.

```typescript
await convertRepository({
  repository: { url: "https://github.com/user/repo" },
  output: { format: "pdf", outputPath: "./output.pdf", singleFile: true },
  style: {
    theme: "github-light",
    highlight: "none", // dependency-free, smallest footprint
  },
});
```

## Fonts

repo2pdf bundles **Inter** (UI text) and **JetBrains Mono** (code), both
OFL-licensed, so the default output needs no font setup. To override any role,
pass raw font bytes (`.ttf`/`.otf` as a `Uint8Array`) via `config.style.fonts`.
Passing bytes is also how you supply fonts on runtimes without `fs` (edge,
browser).

The `FontSet` shape — every field is optional, and any role you omit uses the
bundled default:

```typescript
interface FontSet {
  sans?: Uint8Array; // UI/body text (default: Inter Regular)
  sansSemibold?: Uint8Array; // semibold UI text (default: Inter SemiBold)
  sansBold?: Uint8Array; // bold UI text / titles (default: Inter Bold)
  mono?: Uint8Array; // code (default: JetBrains Mono Regular)
  monoBold?: Uint8Array; // bold code / file paths (default: JetBrains Mono Bold)
  monoItalic?: Uint8Array; // italic code / comments (default: JetBrains Mono Italic)
}
```

```typescript
import { readFile } from "node:fs/promises";
import { convertRepository } from "repo2pdf";

const mono = new Uint8Array(await readFile("./fonts/FiraCode-Regular.ttf"));

await convertRepository({
  repository: { url: "https://github.com/user/repo" },
  output: { format: "pdf", outputPath: "./output.pdf", singleFile: true },
  style: {
    theme: "github-light",
    fonts: { mono }, // override just the code font; the rest stay bundled
  },
});
```

## Serverless / Next.js / Edge

### Next.js (Node runtime) API route

`convertRepositoryToBytes` returns a `Uint8Array`, which you can hand straight to
a `Response`:

```typescript
// app/api/pdf/route.ts
import { convertRepositoryToBytes } from "repo2pdf";

export async function GET() {
  const bytes = await convertRepositoryToBytes({
    repository: { url: "https://github.com/user/repo" },
    output: { format: "pdf", outputPath: "repo.pdf", singleFile: true },
    style: { theme: "github-light", highlight: "auto" },
  });

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="repo.pdf"',
    },
  });
}
```

This works on Node serverless platforms (Vercel, Netlify, AWS Lambda) with no
extra setup — there is no browser to provision.

### True edge (no filesystem)

On a real edge runtime there is no `fs`, so the built-in `local` fetcher cannot
run and Shiki may be unavailable. Fetch the files yourself, then call the
renderer directly. Two equivalent entry points:

- `PDFGenerator#generateToBytes(files, repoInfo)` — adds the `POST_GENERATE`
  plugin hook on top of the renderer.
- `PdfLibRenderer#render(files, repoInfo, config)` — the lowest-level renderer.

Both return a `Uint8Array` and never touch the filesystem.

```typescript
// app/api/pdf/route.ts
export const runtime = "edge";

import {
  PDFGenerator,
  type ProcessedFile,
  type RenderRepoInfo,
  type Config,
} from "repo2pdf";

export async function GET() {
  // 1. Fetch / build your files however you like (e.g. the GitHub API).
  const files: ProcessedFile[] = [
    {
      path: "src/index.ts",
      name: "index.ts",
      type: "code",
      content: "export const hello = 'world';\n",
      processedContent: "export const hello = 'world';\n",
      size: 31,
      extension: "ts",
      language: "typescript",
      isDirectory: false,
    },
  ];

  const repoInfo: RenderRepoInfo = {
    name: "repo",
    url: "https://github.com/user/repo",
  };

  // 2. A full Config. On edge, set highlight: "none" so no Shiki load is
  //    attempted, and pass font bytes since there is no fs to read defaults from.
  const config: Config = {
    repository: { url: repoInfo.url },
    output: { format: "pdf", outputPath: "repo.pdf", singleFile: true },
    style: {
      theme: "github-light",
      highlight: "none",
      lineNumbers: true,
      pageNumbers: true,
      includeTableOfContents: true,
      // fonts: { mono, sans },  // supply Uint8Array bytes if running where fs is unavailable
    },
    processing: {
      maxConcurrency: 4,
      removeComments: false,
      removeEmptyLines: false,
      includeBinaryFiles: false,
      includeHiddenFiles: false,
    },
    cache: { enabled: false, ttl: 0 },
    debug: false,
  };

  // 3. Render to bytes and return them.
  const generator = new PDFGenerator(config, { highlight: "none" });
  const bytes = await generator.generateToBytes(files, repoInfo);

  return new Response(bytes, {
    headers: { "Content-Type": "application/pdf" },
  });
}
```

> Images render as a placeholder rather than being embedded, and binary files
> render as `Binary file: <path> (<size>)`, so the renderer has no image-decoding
> dependency and stays edge-safe.

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
  PluginOptions,
  ThemeType,
  HighlightMode,
  FontSet,
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

### Rendering Types

For standalone rendering (edge/browser, where you fetch files yourself):

```typescript
import {
  PDFGenerator,
  PdfLibRenderer,
  resolveTokenizer,
  PlainTokenizer,
  ShikiTokenizer,
} from "repo2pdf";

import type {
  PdfGeneratorOptions,
  PdfRenderer,
  RenderRepoInfo,
  Tokenizer,
  TokenizedLine,
  SyntaxToken,
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

> `POST_GENERATE` now runs **after** the PDF bytes are produced, so it cannot
> mutate the rendered document's visual content — use it for side effects
> (logging, telemetry, notifications). Its `GenerationOutput` payload is
> `{ format, outputPath, byteLength }`; the old HTML `content` field has been
> removed.

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

// Clear the cache for a specific repository + branch
cache.clearCache("https://github.com/user/repo", "main");

// Clear all cached data
cache.clearAllCache();

// Get cache statistics
const stats = cache.getCacheStats();
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
