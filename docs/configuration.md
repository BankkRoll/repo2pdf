# Configuration Reference

repo2pdf can be configured via CLI options, configuration files, or programmatically.

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
    theme: "github-dark",
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
    fontSize: "12px",
    fontFamily: "monospace",
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
  /** Syntax highlighting theme */
  theme: ThemeType;

  /** Font size (e.g., '12px', '14pt') */
  fontSize?: string;

  /** Font family */
  fontFamily?: string;

  /** Show line numbers */
  lineNumbers: boolean;

  /** Show page numbers */
  pageNumbers: boolean;

  /** Generate table of contents */
  includeTableOfContents: boolean;

  /** Custom CSS to inject */
  customCSS?: string;
}
```

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

### Full Config

```typescript
interface Config {
  repository: RepositoryOptions;
  output: OutputOptions;
  style: StyleOptions;
  processing: ProcessingOptions;
  cache: CacheOptions;
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
    theme: 'github-dark',
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
    useIncrementalProcessing: false,
    incrementalChunkSize: 50,
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
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
    fontSize: "13px",
    fontFamily: '"Fira Code", "JetBrains Mono", monospace',
    customCSS: `
      /* Rounded corners */
      .file-container {
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 20px;
      }

      /* File header styling */
      .file-header {
        padding: 12px 16px;
        font-size: 13px;
      }

      /* Code block padding */
      .code-content {
        padding: 16px;
      }

      /* TOC styling */
      .toc-item {
        padding: 4px 0;
      }

      /* Page break before each file */
      .file-container {
        page-break-before: auto;
        page-break-inside: avoid;
      }
    `,
  },
};
```

## See Also

- [CLI Reference](./cli.md) - Command-line options
- [Themes](./themes.md) - Available themes
- [Programmatic API](./programmatic.md) - API usage
