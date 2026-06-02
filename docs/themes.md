# Themes

repo2pdf includes a comprehensive theme system with 10 built-in themes. Each theme provides a complete color palette for the generated PDF.

The default theme is **`github-light`**.

## Built-in Themes

### Light Themes

| Theme             | Description                    |
| ----------------- | ------------------------------ |
| `github-light`    | GitHub's light theme (default) |
| `solarized-light` | Solarized light variant        |

### Dark Themes

| Theme            | Description                  |
| ---------------- | ---------------------------- |
| `github-dark`    | GitHub's dark theme          |
| `dracula`        | Popular Dracula color scheme |
| `nord`           | Arctic, bluish color palette |
| `monokai`        | Classic Monokai colors       |
| `one-dark-pro`   | Atom's One Dark theme        |
| `tokyo-night`    | Tokyo Night color scheme     |
| `solarized-dark` | Solarized dark variant       |
| `vitesse-dark`   | Vitesse minimal dark theme   |

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

## Highlighting and Fonts

A theme controls the document's color palette. Two related `style` options
control how code is colored and which fonts are used.

### Highlight Mode

`config.style.highlight` selects how syntax highlighting is resolved:

| Mode    | Behavior                                                                                   |
| ------- | ------------------------------------------------------------------------------------------ |
| `auto`  | Default. Uses [Shiki](https://shiki.style/) when it can load (Node), otherwise plain text. |
| `shiki` | Forces Shiki. Fails if Shiki is unavailable.                                               |
| `none`  | Never highlights. Universal and dependency-free — safe for edge and browser runtimes.      |

Shiki is an **optional** dependency and is never required to produce a PDF. When
it cannot load (for example on edge or in the browser), code is rendered as
readable plain text using the theme colors.

```typescript
await convertRepository({
  // ...
  style: {
    theme: "tokyo-night",
    highlight: "auto", // "auto" | "shiki" | "none"
  },
});
```

### Custom Fonts

The renderer ships with bundled, OFL-licensed fonts — **Inter** for UI text and
**JetBrains Mono** for code. You can override any role via `config.style.fonts`.
Each role takes raw font bytes (`.ttf`/`.otf` as a `Uint8Array`); any role left
undefined uses the bundled default. Passing bytes is also how you supply fonts on
runtimes without `fs` (edge, browser).

```typescript
import { readFile } from "node:fs/promises";

await convertRepository({
  // ...
  style: {
    theme: "github-light",
    fonts: {
      sans: await readFile("./fonts/MySans-Regular.ttf"),
      sansSemibold: await readFile("./fonts/MySans-SemiBold.ttf"),
      sansBold: await readFile("./fonts/MySans-Bold.ttf"),
      mono: await readFile("./fonts/MyMono-Regular.ttf"),
      monoBold: await readFile("./fonts/MyMono-Bold.ttf"),
      monoItalic: await readFile("./fonts/MyMono-Italic.ttf"),
    },
  },
});
```

## Theme Structure

Each theme defines colors for every element in the generated PDF:

```typescript
interface Theme {
  name: string; // Display name
  type: "dark" | "light"; // Theme type
  shikiTheme: string; // Base Shiki theme used when highlighting is active

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

> repo2pdf renders the PDF directly with pdf-lib — there is no HTML or CSS in the
> output. Visual customization is done through the theme's `colors` palette and
> the `config.style` options (theme, highlight mode, fonts, line/page numbers),
> not via CSS.

## Theme Colors Reference

### GitHub Dark

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

When highlighting is active, repo2pdf uses [Shiki](https://shiki.style/) (the same engine as VS Code). Shiki is **optional** — it is used automatically in Node when `style.highlight` is `auto` (the default) or `shiki`, and code falls back to plain text where Shiki cannot load (for example on edge or in the browser) or when `highlight` is `none`. See [Highlight Mode](#highlight-mode) above.

Each theme maps to a Shiki theme for code coloring:

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

### Accessibility

When choosing themes, consider:

- **Contrast ratio**: Ensure text is readable
- **Color blindness**: Avoid relying solely on red/green distinction
- **Print compatibility**: Test how the theme looks when printed

## See Also

- [CLI Reference](./cli.md) - Using themes from command line
- [Configuration](./configuration.md) - Configuration file options
- [Plugins](./plugins.md) - Customizing `config.style` from a plugin (see the theme-customizer example)
