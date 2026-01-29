# Plugin Development Guide

Extend repo2pdf's functionality by creating plugins that hook into the processing pipeline.

## Prerequisites

- **Node.js** >= 18.0.0
- **repo2pdf** >= 3.0.0 installed (as a peer dependency)
- **TypeScript** (recommended) - For type-safe plugin development

## Overview

The plugin system uses a hook-based architecture. Plugins can:

- **Transform** file content (syntax highlighting, minification, etc.)
- **Filter** files (include/exclude based on custom logic)
- **Modify** configuration and output
- **Replace** entire pipeline stages (custom fetchers, processors, generators)

## Quick Start

### 1. Create Plugin Directory

```bash
mkdir repo2pdf-plugin-my-plugin
cd repo2pdf-plugin-my-plugin
npm init -y
```

### 2. Create package.json

```json
{
  "name": "repo2pdf-plugin-my-plugin",
  "version": "1.0.0",
  "description": "My custom repo2pdf plugin",
  "main": "index.js",
  "repo2pdfHooks": ["transformContent"],
  "peerDependencies": {
    "repo2pdf": "^3.0.0"
  }
}
```

### 3. Create Plugin Code

```typescript
// index.ts
import { HookPoint } from "repo2pdf";
import type { IRepo2PDFPlugin, RepoFile, Config } from "repo2pdf";

class MyPlugin implements IRepo2PDFPlugin {
  [HookPoint.TRANSFORM_CONTENT] = (
    content: string,
    file: RepoFile,
    config: Config,
  ): string => {
    // Transform the content
    return content.toUpperCase();
  };
}

export default new MyPlugin();
```

### 4. Install Plugin

Place the plugin in one of these locations:

- `node_modules/repo2pdf-plugin-*` (npm install)
- `./plugins/` directory in your project
- Custom directory via `REPO2PDF_PLUGIN_DIR` env var

## Hook Points

### Lifecycle Hooks

Called at specific stages of the pipeline:

| Hook            | When Called           | Parameters                 | Returns          |
| --------------- | --------------------- | -------------------------- | ---------------- |
| `PRE_FETCH`     | Before fetching repo  | `config`                   | Modified config  |
| `POST_FETCH`    | After fetching repo   | `files[], config`          | Modified files[] |
| `PRE_PROCESS`   | Before processing     | `files[], config`          | Modified files[] |
| `POST_PROCESS`  | After processing      | `processedFiles[], config` | Modified files[] |
| `PRE_GENERATE`  | Before PDF generation | `processedFiles[], config` | Modified files[] |
| `POST_GENERATE` | After PDF generation  | `output, config`           | Modified output  |

### Filter/Transform Hooks

Called for each file:

| Hook                | When Called   | Parameters              | Returns          |
| ------------------- | ------------- | ----------------------- | ---------------- |
| `FILTER_FILE`       | For each file | `file, config`          | `boolean`        |
| `TRANSFORM_CONTENT` | For each file | `content, file, config` | Modified content |

### Custom Handler Hooks

Replace entire pipeline stages:

| Hook               | Replaces          | Parameters                 | Returns            |
| ------------------ | ----------------- | -------------------------- | ------------------ |
| `CUSTOM_FETCHER`   | Default fetcher   | `config`                   | `files[]`          |
| `CUSTOM_PROCESSOR` | Default processor | `files[], config`          | `processedFiles[]` |
| `CUSTOM_GENERATOR` | Default generator | `processedFiles[], config` | `GenerationResult` |

## Examples

### Content Transformer

Transform file content during processing:

```typescript
import { HookPoint } from "repo2pdf";
import type { IRepo2PDFPlugin, RepoFile, Config } from "repo2pdf";

class RedactSecretsPlugin implements IRepo2PDFPlugin {
  private patterns = [
    /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
    /password\s*[:=]\s*['"][^'"]+['"]/gi,
    /secret\s*[:=]\s*['"][^'"]+['"]/gi,
  ];

  [HookPoint.TRANSFORM_CONTENT] = (
    content: string,
    file: RepoFile,
    config: Config,
  ): string => {
    let result = content;

    for (const pattern of this.patterns) {
      result = result.replace(pattern, "[REDACTED]");
    }

    return result;
  };
}

export default new RedactSecretsPlugin();
```

### File Filter

Filter files based on custom logic:

```typescript
import { HookPoint } from "repo2pdf";
import type { IRepo2PDFPlugin, RepoFile, Config } from "repo2pdf";

class SizeFilterPlugin implements IRepo2PDFPlugin {
  private maxSize = 100 * 1024; // 100KB

  [HookPoint.FILTER_FILE] = (file: RepoFile, config: Config): boolean => {
    // Exclude files larger than maxSize
    if (file.size > this.maxSize) {
      console.log(`Excluding large file: ${file.path} (${file.size} bytes)`);
      return false;
    }
    return true;
  };
}

export default new SizeFilterPlugin();
```

### Config Modifier

Modify configuration before fetching:

```typescript
import { HookPoint } from "repo2pdf";
import type { IRepo2PDFPlugin, Config } from "repo2pdf";

class DefaultIgnoresPlugin implements IRepo2PDFPlugin {
  private defaultIgnores = [
    "node_modules/**",
    ".git/**",
    "dist/**",
    "coverage/**",
    "**/*.min.js",
    "**/*.map",
  ];

  [HookPoint.PRE_FETCH] = (config: Config): Config => {
    const existingPatterns = config.processing.ignorePatterns || [];

    return {
      ...config,
      processing: {
        ...config.processing,
        ignorePatterns: [...existingPatterns, ...this.defaultIgnores],
      },
    };
  };
}

export default new DefaultIgnoresPlugin();
```

### Output Modifier

Modify the generated output:

```typescript
import { HookPoint } from "repo2pdf";
import type { IRepo2PDFPlugin, GenerationOutput, Config } from "repo2pdf";

class WatermarkPlugin implements IRepo2PDFPlugin {
  [HookPoint.POST_GENERATE] = (
    output: GenerationOutput,
    config: Config,
  ): GenerationOutput => {
    if (!output.content) return output;

    // Inject watermark CSS
    const watermarkCSS = `
      .watermark {
        position: fixed;
        bottom: 10px;
        right: 10px;
        opacity: 0.5;
        font-size: 10px;
      }
    `;

    const watermarkHTML = `
      <div class="watermark">
        Generated by repo2pdf on ${new Date().toISOString()}
      </div>
    `;

    let html = output.content;
    html = html.replace("</head>", `<style>${watermarkCSS}</style></head>`);
    html = html.replace("</body>", `${watermarkHTML}</body>`);

    return { ...output, content: html };
  };
}

export default new WatermarkPlugin();
```

### Custom Fetcher

Replace the default repository fetcher:

```typescript
import { HookPoint } from "repo2pdf";
import type { IRepo2PDFPlugin, RepoFile, Config } from "repo2pdf";

class APIFetcherPlugin implements IRepo2PDFPlugin {
  [HookPoint.CUSTOM_FETCHER] = async (config: Config): Promise<RepoFile[]> => {
    // Fetch from custom API
    const response = await fetch(
      `https://api.example.com/repos/${config.repository.url}`,
    );
    const data = await response.json();

    return data.files.map((f: any) => ({
      path: f.path,
      name: f.name,
      type: "code" as const,
      content: f.content,
      size: f.size,
      extension: f.path.split(".").pop() || "",
      isDirectory: false,
    }));
  };
}

export default new APIFetcherPlugin();
```

### Multiple Hooks

A single plugin can implement multiple hooks:

```typescript
import { HookPoint } from "repo2pdf";
import type {
  IRepo2PDFPlugin,
  RepoFile,
  Config,
  GenerationOutput,
} from "repo2pdf";

class AnalyticsPlugin implements IRepo2PDFPlugin {
  private startTime = 0;
  private fileCount = 0;

  [HookPoint.PRE_FETCH] = (config: Config): void => {
    this.startTime = Date.now();
    console.log(`Starting conversion: ${config.repository.url}`);
  };

  [HookPoint.POST_FETCH] = (files: RepoFile[], config: Config): RepoFile[] => {
    this.fileCount = files.length;
    console.log(`Fetched ${files.length} files`);
    return files;
  };

  [HookPoint.POST_GENERATE] = (
    output: GenerationOutput,
    config: Config,
  ): GenerationOutput => {
    const duration = Date.now() - this.startTime;
    console.log(`Conversion complete:`);
    console.log(`  Files: ${this.fileCount}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Output: ${output.outputPath}`);
    return output;
  };
}

export default new AnalyticsPlugin();
```

## Plugin Configuration

### package.json Fields

| Field              | Required    | Description                                           |
| ------------------ | ----------- | ----------------------------------------------------- |
| `name`             | Yes         | Must start with `repo2pdf-plugin-` for auto-discovery |
| `version`          | Yes         | Semantic version                                      |
| `main`             | Yes         | Entry point file                                      |
| `repo2pdfHooks`    | Yes         | Array of hook names the plugin implements             |
| `peerDependencies` | Recommended | Should include `repo2pdf: "^3.0.0"`                   |

### Loading Plugins

Plugins are automatically discovered in:

1. `node_modules/repo2pdf-plugin-*`
2. `./plugins/*` (project local)
3. `$REPO2PDF_PLUGIN_DIR/*` (environment variable)

### Programmatic Loading

```typescript
import { PluginLoader, logger } from "repo2pdf";

const loader = new PluginLoader(logger);
const manager = await loader.initialize({
  pluginDirectories: ["/path/to/custom/plugins"],
  disabledPlugins: ["repo2pdf-plugin-unwanted"],
});

// Check loaded plugins
for (const [name, plugin] of manager.getPlugins()) {
  console.log(`${name}: ${plugin.metadata.hooks.join(", ")}`);
}

// Check for specific hooks
if (manager.hasHookHandlers(HookPoint.CUSTOM_FETCHER)) {
  console.log("Custom fetcher available");
}
```

## Type Reference

### IRepo2PDFPlugin

```typescript
interface IRepo2PDFPlugin {
  [HookPoint.PRE_FETCH]?: (config: Config) => Promise<Config> | Config | void;
  [HookPoint.POST_FETCH]?: (
    files: RepoFile[],
    config: Config,
  ) => Promise<RepoFile[]> | RepoFile[] | void;
  [HookPoint.PRE_PROCESS]?: (
    files: RepoFile[],
    config: Config,
  ) => Promise<RepoFile[]> | RepoFile[] | void;
  [HookPoint.POST_PROCESS]?: (
    files: ProcessedFile[],
    config: Config,
  ) => Promise<ProcessedFile[]> | ProcessedFile[] | void;
  [HookPoint.PRE_GENERATE]?: (
    files: ProcessedFile[],
    config: Config,
  ) => Promise<ProcessedFile[]> | ProcessedFile[] | void;
  [HookPoint.POST_GENERATE]?: (
    output: GenerationOutput,
    config: Config,
  ) => Promise<GenerationOutput> | GenerationOutput | void;
  [HookPoint.FILTER_FILE]?: (
    file: RepoFile,
    config: Config,
  ) => Promise<boolean> | boolean;
  [HookPoint.TRANSFORM_CONTENT]?: (
    content: string,
    file: RepoFile,
    config: Config,
  ) => Promise<string> | string | void;
  [HookPoint.CUSTOM_FETCHER]?: (
    config: Config,
  ) => Promise<RepoFile[]> | RepoFile[];
  [HookPoint.CUSTOM_PROCESSOR]?: (
    files: RepoFile[],
    config: Config,
  ) => Promise<ProcessedFile[]> | ProcessedFile[];
  [HookPoint.CUSTOM_GENERATOR]?: (
    files: ProcessedFile[],
    config: Config,
  ) => Promise<GenerationResult> | GenerationResult;
}
```

### GenerationOutput

```typescript
interface GenerationOutput {
  format: string;
  content?: string;
  outputPath: string;
  metadata?: Record<string, unknown>;
}
```

## Best Practices

1. **Declare hooks** in `package.json` - The `repo2pdfHooks` array tells repo2pdf which hooks your plugin uses
2. **Handle errors gracefully** - Don't let plugin errors crash the pipeline
3. **Return undefined to pass through** - If you don't want to modify data, return `undefined`
4. **Log with context** - Prefix logs with plugin name: `[my-plugin] Processing...`
5. **Keep plugins focused** - One plugin per concern
6. **Type your code** - Use TypeScript for better IDE support and fewer bugs

## Example Plugins

See the [examples/plugins](../examples/plugins) directory for complete, working examples:

- **syntax-highlighter** - Syntax highlighting with highlight.js
- **theme-customizer** - Custom CSS theme injection
- **file-filter** - Advanced file filtering

## See Also

- [Configuration](./configuration.md) - Configuration reference
- [Programmatic API](./programmatic.md) - Using repo2pdf in code
