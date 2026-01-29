# Themes

repo2pdf includes a comprehensive theme system with 10+ built-in themes. Each theme provides complete color customization for the generated PDF.

## Built-in Themes

### Dark Themes

| Theme            | Description                   |
| ---------------- | ----------------------------- |
| `github-dark`    | GitHub's dark theme (default) |
| `dracula`        | Popular Dracula color scheme  |
| `nord`           | Arctic, bluish color palette  |
| `monokai`        | Classic Monokai colors        |
| `one-dark-pro`   | Atom's One Dark theme         |
| `tokyo-night`    | Tokyo Night color scheme      |
| `solarized-dark` | Solarized dark variant        |
| `vitesse-dark`   | Vitesse minimal dark theme    |

### Light Themes

| Theme             | Description             |
| ----------------- | ----------------------- |
| `github-light`    | GitHub's light theme    |
| `solarized-light` | Solarized light variant |

### Theme Aliases

For convenience, these aliases are available:

| Alias    | Maps To        |
| -------- | -------------- |
| `dark`   | `github-dark`  |
| `light`  | `github-light` |
| `github` | `github-dark`  |

## Using Themes

### CLI

```bash
# Use a specific theme
repo2pdf convert user/repo --theme dracula

# Light theme
repo2pdf convert user/repo --theme github-light
```

### Programmatic

```typescript
import { convertRepository } from "repo2pdf";

await convertRepository({
  repository: { url: "https://github.com/user/repo" },
  output: {
    format: "pdf",
    outputPath: "./output.pdf",
    singleFile: true,
  },
  style: {
    theme: "tokyo-night",
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
  },
});
```

### Configuration File

```javascript
// repo2pdf.config.js
module.exports = {
  style: {
    theme: "nord",
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
  },
};
```

## Theme Structure

Each theme defines colors for every element in the generated PDF:

```typescript
interface Theme {
  name: string; // Display name
  type: "dark" | "light"; // Theme type
  shikiTheme: string; // Base Shiki theme for syntax highlighting

  colors: {
    // Backgrounds
    background: string; // Page background
    headerBackground: string; // File header background
    codeBackground: string; // Code block background
    hoverBackground: string; // Hover state background
    selectionBackground: string; // Selection highlight

    // Text colors
    foreground: string; // Primary text
    heading: string; // Headings
    text: string; // Body text
    textMuted: string; // Secondary text
    textSubtle: string; // Tertiary text

    // Interactive
    link: string; // Links
    linkHover: string; // Link hover state

    // Borders
    border: string; // Standard borders

    // Status colors
    accent: string; // Accent/primary color
    success: string; // Success indicators
    warning: string; // Warning indicators
    error: string; // Error indicators

    // Code specific
    lineNumber: string; // Line number text
    lineNumberBorder: string; // Line number gutter border

    // Icons
    folderIcon: string; // Folder icon color
    fileIcon: string; // File icon color
  };
}
```

## Custom Themes

### Creating a Custom Theme

```typescript
import type { Theme } from "repo2pdf/styles/themes";

const myTheme: Theme = {
  name: "My Custom Theme",
  type: "dark",
  shikiTheme: "github-dark", // Base syntax highlighting

  colors: {
    // Cyberpunk-inspired colors
    background: "#0a0a0f",
    foreground: "#e0e0e0",
    border: "#2a2a3a",
    headerBackground: "#12121a",
    codeBackground: "#12121a",
    hoverBackground: "#1a1a2a",
    selectionBackground: "#ff00ff33",
    heading: "#ffffff",
    text: "#e0e0e0",
    textMuted: "#8080a0",
    textSubtle: "#606080",
    link: "#00ffff",
    linkHover: "#ff00ff",
    accent: "#ff00ff",
    success: "#00ff88",
    warning: "#ffff00",
    error: "#ff0044",
    lineNumber: "#606080",
    lineNumberBorder: "#2a2a3a",
    folderIcon: "#00ffff",
    fileIcon: "#8080a0",
  },
};
```

### Using Custom CSS

For simpler customizations, use the `customCSS` option:

```typescript
await convertRepository({
  // ...
  style: {
    theme: "github-dark",
    customCSS: `
      /* Make code blocks have rounded corners */
      .file-container {
        border-radius: 12px;
        overflow: hidden;
      }

      /* Custom header styling */
      .file-header {
        font-weight: bold;
        letter-spacing: 0.5px;
      }

      /* Larger font for code */
      .code-content {
        font-size: 14px;
      }
    `,
  },
});
```

### Configuration File with Custom CSS

```javascript
// repo2pdf.config.js
module.exports = {
  style: {
    theme: "dracula",
    lineNumbers: true,
    customCSS: `
      /* Add a subtle gradient to the background */
      body {
        background: linear-gradient(135deg, #282a36 0%, #1e1f29 100%);
      }

      /* Softer shadows on file containers */
      .file-container {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      }
    `,
  },
};
```

## Theme Colors Reference

### GitHub Dark (Default)

```
Background:     #0d1117
Code Background: #161b22
Header:         #161b22
Text:           #e6edf3
Text Muted:     #8b949e
Link:           #58a6ff
Border:         #30363d
Line Numbers:   #6e7681
Folder Icon:    #54aeff
File Icon:      #8b949e
```

### Dracula

```
Background:     #282a36
Code Background: #1e1f29
Header:         #21222c
Text:           #f8f8f2
Text Muted:     #6272a4
Link:           #8be9fd
Border:         #44475a
Accent:         #bd93f9
```

### Nord

```
Background:     #2e3440
Code Background: #242933
Header:         #3b4252
Text:           #eceff4
Text Muted:     #8fbcbb
Link:           #88c0d0
Border:         #4c566a
Accent:         #5e81ac
```

### Tokyo Night

```
Background:     #1a1b26
Code Background: #16161e
Header:         #1f2335
Text:           #c0caf5
Text Muted:     #565f89
Link:           #7aa2f7
Border:         #3b4261
Accent:         #bb9af7
```

## Syntax Highlighting

repo2pdf uses [Shiki](https://shiki.matsu.io/) (the same engine as VS Code) for syntax highlighting. Each theme maps to a Shiki theme for code coloring:

| repo2pdf Theme    | Shiki Theme       |
| ----------------- | ----------------- |
| `github-dark`     | `github-dark`     |
| `github-light`    | `github-light`    |
| `dracula`         | `dracula`         |
| `nord`            | `nord`            |
| `monokai`         | `monokai`         |
| `one-dark-pro`    | `one-dark-pro`    |
| `tokyo-night`     | `tokyo-night`     |
| `solarized-dark`  | `solarized-dark`  |
| `solarized-light` | `solarized-light` |
| `vitesse-dark`    | `vitesse-dark`    |

### Supported Languages

Shiki supports 300+ languages including:

- JavaScript, TypeScript, JSX, TSX
- Python, Ruby, Go, Rust, Java, C, C++, C#
- HTML, CSS, SCSS, LESS
- JSON, YAML, XML, TOML
- Markdown, MDX
- SQL, GraphQL
- Bash, PowerShell, Fish
- And many more...

## Tips

### Choosing a Theme

- **For code review**: Use `github-dark` or `github-light` for familiar styling
- **For presentations**: Use `dracula` or `tokyo-night` for visual impact
- **For printing**: Use `github-light` or `solarized-light` to save ink
- **For long documents**: Use `nord` for reduced eye strain

### Performance

Dark themes generally render faster because they have fewer bright colors to composite in the PDF.

### Accessibility

When choosing themes, consider:

- **Contrast ratio**: Ensure text is readable
- **Color blindness**: Avoid relying solely on red/green distinction
- **Print compatibility**: Test how the theme looks when printed

## See Also

- [CLI Reference](./cli.md) - Using themes from command line
- [Configuration](./configuration.md) - Configuration file options
- [Plugins](./plugins.md) - Creating theme plugins
