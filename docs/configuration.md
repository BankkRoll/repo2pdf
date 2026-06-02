# Configuration Reference

repo2pdf can be configured via CLI options, configuration files, or programmatically.

PDF generation is pure JavaScript (via [pdf-lib](https://pdf-lib.js.org/)) — there is
no Chromium, Puppeteer, or browser involved, and no HTML/CSS output. Appearance is
controlled by `style.theme`, `style.highlight`, and `style.fonts`.

## Configuration Files

repo2pdf looks for configuration in these locations (in order):

1. `repo2pdf.config.js`
2. `repo2pdf.config.mjs`
3. `repo2pdf.config.cjs`
4. `.repo2pdfrc`
5. `.repo2pdfrc.json`
6. `package.json` (`repo2pdf` field)

### JavaScript Config

```javascript
// repo2pdf.config.js
module.exports = {
  repository: {
    branch: "main",
    useCache: true,
  },
  output: {
    format: "pdf",
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
    highlight: "auto",
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
    fontSize: "12px",
  },
  processing: {
    ignorePatterns: [
      "node_modules/**",
      ".git/**",
      "dist/**",
      "coverage/**",
      "**/*.lock",
      "**/*.log",
    ],
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
};
```

### JSON Config

```json
// .repo2pdfrc.json
{
  "style": {
    "theme": "dracula",
    "lineNumbers": true,
    "pageNumbers": true,
    "includeTableOfContents": true
  },
  "processing": {
    "ignorePatterns": ["node_modules/**", ".git/**"]
  },
  "cache": {
    "enabled": true,
    "ttl": 86400000
  }
}
```

### package.json

```json
{
  "name": "my-project",
  "repo2pdf": {
    "style": {
      "theme": "nord"
    },
    "processing": {
      "ignorePatterns": ["node_modules/**"]
    }
  }
}
```

## Configuration Schema

### Repository Options

```typescript
interface RepositoryOptions {
  /** Repository URL or local path */
  url: string;

  /** Branch to clone (defaults to main/master) */
  branch?: string;

  /** Authentication token for private repos */
  token?: string;

  /** VCS type: 'github' | 'gitlab' | 'bitbucket' | 'local' */
  vcsType?: VCSType;

  /** Path for local repositories */
  localPath?: string;

  /** Use cached repository data if available */
  useCache?: boolean;
}
```

### Output Options

```typescript
interface OutputOptions {
  /** Output format (currently only 'pdf') */
  format: OutputFormat;

  /** Output file path */
  outputPath: string;

  /** Generate single file or multiple */
  singleFile: boolean;

  /** Page size: 'A4' | 'Letter' | 'Legal' | custom */
  pageSize?: string;

  /** Landscape orientation */
  landscape?: boolean;

  /** Page margins */
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}
```

### Style Options

```typescript
interface StyleOptions {
  /** Syntax highlighting theme (default: 'github-light') */
  theme: ThemeType;

  /**
   * How syntax highlighting is resolved (default: 'auto').
   * - 'auto'  - use Shiki when it can load (Node), else fall back to plain text
   * - 'shiki' - force Shiki (fails if it cannot be loaded)
   * - 'none'  - never highlight; universal, dependency-free, edge-safe
   */
  highlight?: "auto" | "shiki" | "none";

  /**
   * Per-role font overrides for the PDF renderer. Each role accepts raw font
   * bytes (.ttf/.otf as a Uint8Array). Any role left undefined uses repo2pdf's
   * bundled default (Inter for UI text, JetBrains Mono for code). Supplying bytes
   * is also how rendering works on runtimes without `fs` (edge, browser) — import
   * or fetch the font and pass the bytes in.
   */
  fonts?: FontSet;

  /** Font size for code (e.g., '12px', '14pt') */
  fontSize?: string;

  /** Show line numbers */
  lineNumbers: boolean;

  /** Show page numbers */
  pageNumbers: boolean;

  /** Generate table of contents */
  includeTableOfContents: boolean;

  /**
   * @deprecated No-op in the pure-JS renderer. There is no HTML/CSS layer to
   * style — use `theme`, `fonts`, and `highlight` instead. Accepted for backward
   * compatibility but ignored.
   */
  fontFamily?: string;

  /**
   * @deprecated No-op in the pure-JS renderer. The PDF is drawn directly with
   * pdf-lib, so there is no CSS to inject. Accepted for backward compatibility
   * but ignored.
   */
  customCSS?: string;
}

interface FontSet {
  /** UI/body text (default: Inter Regular). */
  sans?: Uint8Array;
  /** Semibold UI text (default: Inter SemiBold). */
  sansSemibold?: Uint8Array;
  /** Bold UI text / titles (default: Inter Bold). */
  sansBold?: Uint8Array;
  /** Code text (default: JetBrains Mono Regular). */
  mono?: Uint8Array;
  /** Bold code / file paths (default: JetBrains Mono Bold). */
  monoBold?: Uint8Array;
  /** Italic code / comments (default: JetBrains Mono Italic). */
  monoItalic?: Uint8Array;
}
```

> **PDF rendering is pure JavaScript** (via [pdf-lib](https://pdf-lib.js.org/)) — no
> Chromium, Puppeteer, or browser is involved. As a result there is no HTML/CSS
> output: visual appearance is controlled by `theme`, `highlight`, and `fonts`,
> not by `customCSS` or `fontFamily`.

### Processing Options

```typescript
interface ProcessingOptions {
  /** Glob patterns to ignore */
  ignorePatterns?: string[];

  /** Max concurrent file operations */
  maxConcurrency: number;

  /** Strip comments from code */
  removeComments: boolean;

  /** Remove empty lines */
  removeEmptyLines: boolean;

  /** Include binary files */
  includeBinaryFiles: boolean;

  /** Include hidden files (dotfiles) */
  includeHiddenFiles: boolean;

  /** Processing timeout in ms */
  timeout?: number;

  /** Use incremental processing for large repos */
  useIncrementalProcessing?: boolean;

  /** Files per chunk in incremental mode */
  incrementalChunkSize?: number;
}
```

### Cache Options

```typescript
interface CacheOptions {
  /** Enable caching */
  enabled: boolean;

  /** Time-to-live in milliseconds */
  ttl: number;

  /** Custom cache directory */
  cacheDir?: string;
}
```

### Plugin Options

```typescript
interface PluginOptions {
  /** Whether the plugin system is enabled (default: true) */
  enabled?: boolean;

  /** Additional directories to search for plugins */
  directories?: string[];

  /** Plugin names to disable after loading */
  disabled?: string[];
}
```

See the [Plugins guide](./plugins.md) for the available hooks and how to author plugins.

### Full Config

```typescript
interface Config {
  repository: RepositoryOptions;
  output: OutputOptions;
  style: StyleOptions;
  processing: ProcessingOptions;
  cache: CacheOptions;
  plugins?: PluginOptions;
  debug: boolean;
}
```

## Environment Variables

Override configuration with environment variables:

| Variable                 | Description          | Example               |
| ------------------------ | -------------------- | --------------------- |
| `REPO2PDF_TOKEN`         | Auth token           | `ghp_xxxxx`           |
| `REPO2PDF_BRANCH`        | Default branch       | `main`                |
| `REPO2PDF_DEBUG`         | Enable debug         | `true`                |
| `REPO2PDF_CACHE_ENABLED` | Enable cache         | `true`                |
| `REPO2PDF_CACHE_TTL`     | Cache TTL (ms)       | `86400000`            |
| `REPO2PDF_PLUGIN_DIR`    | Plugin directory     | `/path/to/plugins`    |
| `REPO2PDF_THEME_PATH`    | Custom theme file    | `/path/to/theme.json` |
| `REPO2PDF_FILTER_*`      | Filter plugin config | See below             |

### Filter Plugin Variables

| Variable                            | Description           | Example             |
| ----------------------------------- | --------------------- | ------------------- |
| `REPO2PDF_FILTER_INCLUDE_EXT`       | Extensions to include | `.ts,.js,.tsx`      |
| `REPO2PDF_FILTER_EXCLUDE_EXT`       | Extensions to exclude | `.test.ts,.spec.js` |
| `REPO2PDF_FILTER_MAX_SIZE`          | Max file size (bytes) | `1048576`           |
| `REPO2PDF_FILTER_EXCLUDE_TESTS`     | Exclude test files    | `true`              |
| `REPO2PDF_FILTER_EXCLUDE_GENERATED` | Exclude generated     | `true`              |
| `REPO2PDF_FILTER_EXCLUDE_HIDDEN`    | Exclude dotfiles      | `true`              |

## Default Values

```javascript
{
  repository: {
    branch: 'main',
    vcsType: 'github', // auto-detected from URL
    useCache: true,
  },
  output: {
    format: 'pdf',
    outputPath: './<repo-name>.pdf',
    singleFile: true,
    pageSize: 'A4',
    landscape: false,
    margin: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm',
    },
  },
  style: {
    theme: 'github-light',
    highlight: 'auto',
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
  },
  processing: {
    ignorePatterns: [ /* sensible built-in defaults (node_modules, .git, dist, lock files, ...) */ ],
    maxConcurrency: 5,
    removeComments: false,
    removeEmptyLines: false,
    includeBinaryFiles: false,
    includeHiddenFiles: false,
    useIncrementalProcessing: true,
    incrementalChunkSize: 100,
  },
  cache: {
    enabled: true,
    ttl: 86400000, // 24 hours
  },
  debug: false,
}
```

## Configuration Precedence

Configuration is merged in this order (later overrides earlier):

1. Default values
2. Configuration file
3. Environment variables
4. CLI options
5. Programmatic options

## Examples

### Minimal Config

```javascript
// repo2pdf.config.js
module.exports = {
  style: {
    theme: "dracula",
  },
};
```

### Production Config

```javascript
// repo2pdf.config.js
module.exports = {
  output: {
    pageSize: "A4",
    margin: {
      top: "15mm",
      right: "15mm",
      bottom: "15mm",
      left: "15mm",
    },
  },
  style: {
    theme: "github-light", // Better for printing
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
    fontSize: "11px",
  },
  processing: {
    ignorePatterns: [
      "node_modules/**",
      ".git/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "**/*.test.*",
      "**/*.spec.*",
      "**/__tests__/**",
      "**/__mocks__/**",
      "**/*.lock",
      "**/*.log",
      "**/*.map",
      "**/*.min.js",
    ],
    maxConcurrency: 3,
    includeBinaryFiles: false,
    includeHiddenFiles: false,
  },
  cache: {
    enabled: true,
    ttl: 3600000, // 1 hour
  },
};
```

### Large Repository Config

```javascript
// repo2pdf.config.js
module.exports = {
  processing: {
    maxConcurrency: 2, // Lower to reduce memory
    useIncrementalProcessing: true,
    incrementalChunkSize: 25,
    ignorePatterns: [
      "node_modules/**",
      ".git/**",
      "vendor/**",
      "**/*.min.*",
      "**/*.bundle.*",
    ],
  },
  cache: {
    enabled: true,
    ttl: 86400000,
  },
};
```

### Custom Styling Config

```javascript
// repo2pdf.config.js
module.exports = {
  style: {
    theme: "tokyo-night",
    highlight: "auto",
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
    fontSize: "13px",
  },
};
```

### Custom Fonts Config

Override the bundled fonts by passing raw `.ttf`/`.otf` bytes. Any role you leave
out keeps repo2pdf's default (Inter for UI, JetBrains Mono for code).

```javascript
// repo2pdf.config.js
const fs = require("node:fs");

module.exports = {
  style: {
    theme: "github-light",
    fonts: {
      mono: fs.readFileSync("./fonts/FiraCode-Regular.ttf"),
      monoBold: fs.readFileSync("./fonts/FiraCode-Bold.ttf"),
    },
  },
};
```

### Highlight-Free / Edge-Safe Config

Disable highlighting entirely for a universal, dependency-free render (no Shiki).
Useful for serverless and edge runtimes.

```javascript
// repo2pdf.config.js
module.exports = {
  style: {
    theme: "github-light",
    highlight: "none",
  },
};
```

## See Also

- [CLI Reference](./cli.md) - Command-line options
- [Themes](./themes.md) - Available themes
- [Programmatic API](./programmatic.md) - API usage
