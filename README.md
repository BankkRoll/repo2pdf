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

- **Multiple Sources** - GitHub, GitLab, Bitbucket, or local directories
- **Syntax Highlighting** - 300+ languages powered by Shiki (VS Code's engine)
- **10+ Themes** - GitHub Dark, Dracula, Nord, Tokyo Night, and more
- **Table of Contents** - GitHub-style file tree with folder/file icons
- **Full-Bleed PDF** - Edge-to-edge backgrounds, no white borders
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
  -b, --branch <branch>    Repository branch
  -t, --token <token>      Auth token for private repos
  --theme <theme>          Syntax highlighting theme (default: github-dark)
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
    theme: "github-dark",
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

See [Programmatic API](./docs/programmatic.md) for full documentation.

## Themes

| Dark                    | Light             |
| ----------------------- | ----------------- |
| `github-dark` (default) | `github-light`    |
| `dracula`               | `solarized-light` |
| `nord`                  |                   |
| `monokai`               |                   |
| `one-dark-pro`          |                   |
| `tokyo-night`           |                   |
| `solarized-dark`        |                   |
| `vitesse-dark`          |                   |

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

- **[syntax-highlighter](./examples/plugins/syntax-highlighter)** - Custom syntax highlighting
- **[theme-customizer](./examples/plugins/theme-customizer)** - CSS theme injection
- **[file-filter](./examples/plugins/file-filter)** - Advanced file filtering

## Requirements

- Node.js >= 18.0.0
- Git (for cloning repositories)

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines first.
