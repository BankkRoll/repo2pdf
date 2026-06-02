# repo2pdf

Convert any repository to a beautiful PDF with syntax highlighting, table of contents, and more.

```
██████╗ ███████╗██████╗  ██████╗ ██████╗ ██████╗ ██████╗ ███████╗
██╔══██╗██╔════╝██╔══██╗██╔═══██╗╚════██╗██╔══██╗██╔══██╗██╔════╝
██████╔╝█████╗  ██████╔╝██║   ██║ █████╔╝██████╔╝██║  ██║█████╗
██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║██╔═══╝ ██╔═══╝ ██║  ██║██╔══╝
██║  ██║███████╗██║     ╚██████╔╝███████╗██║     ██████╔╝██║
╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝ ╚══════╝╚═╝     ╚═════╝ ╚═╝
```

![npm](https://img.shields.io/npm/v/repo2pdf)
![npm](https://img.shields.io/npm/dt/repo2pdf)
![NPM](https://img.shields.io/npm/l/repo2pdf)

## Features

- **Pure JavaScript** - PDFs are rendered with [pdf-lib](https://pdf-lib.js.org). No Chromium, no Puppeteer, no native modules
- **Runs Anywhere** - Node, serverless (Vercel, Netlify, Lambda), edge (Cloudflare, Vercel Edge), and the browser
- **Multiple Sources** - GitHub, GitLab, Bitbucket, or local directories
- **Optional Syntax Highlighting** - Powered by Shiki (VS Code's engine) when available, with a zero-dependency plain-text fallback
- **Configurable Fonts** - Bundled Inter and JetBrains Mono (OFL), or supply your own font bytes
- **10+ Themes** - GitHub Light (default), GitHub Dark, Dracula, Nord, Tokyo Night, and more
- **Table of Contents** - GitHub-style file tree with folder/file icons
- **Plugin System** - Extend functionality with custom plugins
- **Smart Caching** - Faster repeated conversions

## Installation

```bash
npm install -g repo2pdf
```

## Quick Start

```bash
# Convert a GitHub repository
repo2pdf convert https://github.com/user/repo

# Use GitHub shorthand
repo2pdf convert user/repo

# Convert a local directory
repo2pdf convert ./my-project

# With a specific theme
repo2pdf convert user/repo --theme dracula

# Interactive mode
repo2pdf interactive
```

## Documentation

| Guide                                          | Description                        |
| ---------------------------------------------- | ---------------------------------- |
| **[CLI Reference](./docs/cli.md)**             | Command-line options and examples  |
| **[Programmatic API](./docs/programmatic.md)** | Using repo2pdf in Node.js          |
| **[Themes](./docs/themes.md)**                 | Available themes and customization |
| **[Configuration](./docs/configuration.md)**   | Config file reference              |
| **[Plugins](./docs/plugins.md)**               | Creating and using plugins         |

## CLI Options

```bash
repo2pdf convert <repository> [options]

Options:
  -o, --output <path>      Output file path
  -b, --branch <branch>    Repository branch (default: repo's default branch)
  -t, --token <token>      Auth token for private repos
  --theme <theme>          Syntax highlighting theme (default: github-light)
  --no-line-numbers        Disable line numbers
  --no-page-numbers        Disable page numbers
  --no-toc                 Disable table of contents
  --ignore <patterns...>   Glob patterns to ignore
  --debug                  Enable debug output
```

See [CLI Reference](./docs/cli.md) for all options.

## Programmatic Usage

```typescript
import { convertRepository } from "repo2pdf";

const result = await convertRepository({
  repository: {
    url: "https://github.com/user/repo",
    branch: "main",
  },
  output: {
    format: "pdf",
    outputPath: "./output.pdf",
    singleFile: true,
  },
  style: {
    theme: "github-light",
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
  },
  processing: {
    ignorePatterns: ["node_modules/**", "*.test.ts"],
  },
});

console.log(`PDF generated: ${result.outputPath}`);
```

### Use Anywhere (serverless / edge)

Because rendering is pure JavaScript, you can return a PDF straight from an HTTP
handler with `convertRepositoryToBytes` — it runs the same pipeline but returns
the PDF bytes instead of writing a file:

```typescript
// app/api/pdf/route.ts (Next.js App Router)
import { convertRepositoryToBytes } from "repo2pdf";

export async function GET() {
  const bytes = await convertRepositoryToBytes({
    repository: { url: "https://github.com/user/repo" },
    output: { format: "pdf", outputPath: "repo.pdf", singleFile: true },
  });

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="repo.pdf"',
    },
  });
}
```

See [Programmatic API](./docs/programmatic.md) for full documentation, including
true-edge rendering with `PDFGenerator` / `PdfLibRenderer`.

## Themes

| Dark             | Light                    |
| ---------------- | ------------------------ |
| `github-dark`    | `github-light` (default) |
| `dracula`        | `solarized-light`        |
| `nord`           |                          |
| `monokai`        |                          |
| `one-dark-pro`   |                          |
| `tokyo-night`    |                          |
| `solarized-dark` |                          |
| `vitesse-dark`   |                          |

See [Themes](./docs/themes.md) for previews and customization.

## Configuration

Create a `repo2pdf.config.js` file:

```javascript
module.exports = {
  style: {
    theme: "tokyo-night",
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
  },
  processing: {
    ignorePatterns: ["node_modules/**", ".git/**", "**/*.test.ts"],
  },
};
```

See [Configuration](./docs/configuration.md) for all options.

## Plugins

Extend repo2pdf with plugins:

```typescript
// repo2pdf-plugin-my-plugin/index.ts
import { HookPoint } from "repo2pdf";
import type { IRepo2PDFPlugin, RepoFile, Config } from "repo2pdf";

class MyPlugin implements IRepo2PDFPlugin {
  [HookPoint.TRANSFORM_CONTENT] = (
    content: string,
    file: RepoFile,
    config: Config,
  ): string => {
    // Transform content
    return content;
  };
}

export default new MyPlugin();
```

See [Plugins](./docs/plugins.md) for the full development guide.

### Example Plugins

- **[file-filter](./examples/plugins/file-filter)** - Advanced file filtering (`FILTER_FILE`)
- **[theme-customizer](./examples/plugins/theme-customizer)** - Set theme, highlight mode, and other style options (`PRE_FETCH`)
- **[secret-redactor](./examples/plugins/secret-redactor)** - Redact secrets from file content (`TRANSFORM_CONTENT`)

## Requirements

- **Node.js >= 18.0.0** for the CLI and the file-writing API (`convertRepository`)

That is the only requirement. There is no Chromium, Puppeteer, or native-module
dependency. The renderer is pure JavaScript, so it also runs in serverless, edge,
and browser runtimes — see [Use Anywhere](#use-anywhere-serverless--edge).

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines first.
