/**
 * Advanced theme system for repo2pdf
 * Matches Shiki themes and provides complete color palettes
 */

export interface ThemeColors {
  // Base colors
  background: string;
  foreground: string;

  // UI colors
  border: string;
  headerBackground: string;
  codeBackground: string;
  hoverBackground: string;
  selectionBackground: string;

  // Text colors
  heading: string;
  text: string;
  textMuted: string;
  textSubtle: string;

  // Syntax colors (for non-Shiki elements)
  link: string;
  linkHover: string;
  accent: string;
  success: string;
  warning: string;
  error: string;

  // Line numbers
  lineNumber: string;
  lineNumberBorder: string;

  // File tree icons
  folderIcon: string;
  fileIcon: string;
}

export interface Theme {
  name: string;
  type: "dark" | "light";
  shikiTheme: string;
  colors: ThemeColors;
}

// GitHub Dark theme - matches github-dark Shiki theme
export const githubDark: Theme = {
  name: "GitHub Dark",
  type: "dark",
  shikiTheme: "github-dark",
  colors: {
    background: "#0d1117",
    foreground: "#c9d1d9",
    border: "#30363d",
    headerBackground: "#161b22",
    codeBackground: "#161b22",
    hoverBackground: "#21262d",
    selectionBackground: "#264f78",
    heading: "#f0f6fc",
    text: "#c9d1d9",
    textMuted: "#8b949e",
    textSubtle: "#6e7681",
    link: "#58a6ff",
    linkHover: "#79c0ff",
    accent: "#238636",
    success: "#3fb950",
    warning: "#d29922",
    error: "#f85149",
    lineNumber: "#6e7681",
    lineNumberBorder: "#30363d",
    folderIcon: "#58a6ff",
    fileIcon: "#8b949e",
  },
};

// GitHub Light theme
export const githubLight: Theme = {
  name: "GitHub Light",
  type: "light",
  shikiTheme: "github-light",
  colors: {
    background: "#ffffff",
    foreground: "#24292f",
    border: "#d0d7de",
    headerBackground: "#f6f8fa",
    codeBackground: "#f6f8fa",
    hoverBackground: "#f3f4f6",
    selectionBackground: "#ddf4ff",
    heading: "#1f2328",
    text: "#24292f",
    textMuted: "#656d76",
    textSubtle: "#8c959f",
    link: "#0969da",
    linkHover: "#0550ae",
    accent: "#1a7f37",
    success: "#1a7f37",
    warning: "#9a6700",
    error: "#cf222e",
    lineNumber: "#8c959f",
    lineNumberBorder: "#d0d7de",
    folderIcon: "#54aeff",
    fileIcon: "#656d76",
  },
};

// Dracula theme
export const dracula: Theme = {
  name: "Dracula",
  type: "dark",
  shikiTheme: "dracula",
  colors: {
    background: "#282a36",
    foreground: "#f8f8f2",
    border: "#44475a",
    headerBackground: "#21222c",
    codeBackground: "#21222c",
    hoverBackground: "#44475a",
    selectionBackground: "#44475a",
    heading: "#f8f8f2",
    text: "#f8f8f2",
    textMuted: "#6272a4",
    textSubtle: "#6272a4",
    link: "#8be9fd",
    linkHover: "#bd93f9",
    accent: "#50fa7b",
    success: "#50fa7b",
    warning: "#ffb86c",
    error: "#ff5555",
    lineNumber: "#6272a4",
    lineNumberBorder: "#44475a",
    folderIcon: "#bd93f9",
    fileIcon: "#6272a4",
  },
};

// Nord theme
export const nord: Theme = {
  name: "Nord",
  type: "dark",
  shikiTheme: "nord",
  colors: {
    background: "#2e3440",
    foreground: "#d8dee9",
    border: "#3b4252",
    headerBackground: "#3b4252",
    codeBackground: "#3b4252",
    hoverBackground: "#434c5e",
    selectionBackground: "#434c5e",
    heading: "#eceff4",
    text: "#d8dee9",
    textMuted: "#a5aec2",
    textSubtle: "#7b88a1",
    link: "#88c0d0",
    linkHover: "#8fbcbb",
    accent: "#a3be8c",
    success: "#a3be8c",
    warning: "#ebcb8b",
    error: "#bf616a",
    lineNumber: "#616e88",
    lineNumberBorder: "#3b4252",
    folderIcon: "#81a1c1",
    fileIcon: "#7b88a1",
  },
};

// Monokai theme
export const monokai: Theme = {
  name: "Monokai",
  type: "dark",
  shikiTheme: "monokai",
  colors: {
    background: "#272822",
    foreground: "#f8f8f2",
    border: "#3e3d32",
    headerBackground: "#1e1f1c",
    codeBackground: "#1e1f1c",
    hoverBackground: "#3e3d32",
    selectionBackground: "#49483e",
    heading: "#f8f8f2",
    text: "#f8f8f2",
    textMuted: "#75715e",
    textSubtle: "#75715e",
    link: "#66d9ef",
    linkHover: "#ae81ff",
    accent: "#a6e22e",
    success: "#a6e22e",
    warning: "#e6db74",
    error: "#f92672",
    lineNumber: "#90908a",
    lineNumberBorder: "#3e3d32",
    folderIcon: "#66d9ef",
    fileIcon: "#75715e",
  },
};

// One Dark Pro theme
export const oneDarkPro: Theme = {
  name: "One Dark Pro",
  type: "dark",
  shikiTheme: "one-dark-pro",
  colors: {
    background: "#282c34",
    foreground: "#abb2bf",
    border: "#3e4451",
    headerBackground: "#21252b",
    codeBackground: "#21252b",
    hoverBackground: "#2c313a",
    selectionBackground: "#3e4451",
    heading: "#e5e5e5",
    text: "#abb2bf",
    textMuted: "#5c6370",
    textSubtle: "#4b5263",
    link: "#61afef",
    linkHover: "#56b6c2",
    accent: "#98c379",
    success: "#98c379",
    warning: "#e5c07b",
    error: "#e06c75",
    lineNumber: "#4b5263",
    lineNumberBorder: "#3e4451",
    folderIcon: "#61afef",
    fileIcon: "#5c6370",
  },
};

// Tokyo Night theme
export const tokyoNight: Theme = {
  name: "Tokyo Night",
  type: "dark",
  shikiTheme: "tokyo-night",
  colors: {
    background: "#1a1b26",
    foreground: "#a9b1d6",
    border: "#292e42",
    headerBackground: "#16161e",
    codeBackground: "#16161e",
    hoverBackground: "#292e42",
    selectionBackground: "#33467c",
    heading: "#c0caf5",
    text: "#a9b1d6",
    textMuted: "#565f89",
    textSubtle: "#414868",
    link: "#7aa2f7",
    linkHover: "#7dcfff",
    accent: "#9ece6a",
    success: "#9ece6a",
    warning: "#e0af68",
    error: "#f7768e",
    lineNumber: "#3b4261",
    lineNumberBorder: "#292e42",
    folderIcon: "#7aa2f7",
    fileIcon: "#565f89",
  },
};

// Solarized Dark theme
export const solarizedDark: Theme = {
  name: "Solarized Dark",
  type: "dark",
  shikiTheme: "solarized-dark",
  colors: {
    background: "#002b36",
    foreground: "#839496",
    border: "#073642",
    headerBackground: "#073642",
    codeBackground: "#073642",
    hoverBackground: "#094552",
    selectionBackground: "#073642",
    heading: "#93a1a1",
    text: "#839496",
    textMuted: "#657b83",
    textSubtle: "#586e75",
    link: "#268bd2",
    linkHover: "#2aa198",
    accent: "#859900",
    success: "#859900",
    warning: "#b58900",
    error: "#dc322f",
    lineNumber: "#586e75",
    lineNumberBorder: "#073642",
    folderIcon: "#268bd2",
    fileIcon: "#657b83",
  },
};

// Solarized Light theme
export const solarizedLight: Theme = {
  name: "Solarized Light",
  type: "light",
  shikiTheme: "solarized-light",
  colors: {
    background: "#fdf6e3",
    foreground: "#657b83",
    border: "#eee8d5",
    headerBackground: "#eee8d5",
    codeBackground: "#eee8d5",
    hoverBackground: "#ddd6c4",
    selectionBackground: "#eee8d5",
    heading: "#586e75",
    text: "#657b83",
    textMuted: "#93a1a1",
    textSubtle: "#93a1a1",
    link: "#268bd2",
    linkHover: "#2aa198",
    accent: "#859900",
    success: "#859900",
    warning: "#b58900",
    error: "#dc322f",
    lineNumber: "#93a1a1",
    lineNumberBorder: "#eee8d5",
    folderIcon: "#268bd2",
    fileIcon: "#93a1a1",
  },
};

// Vitesse Dark theme
export const vitesseDark: Theme = {
  name: "Vitesse Dark",
  type: "dark",
  shikiTheme: "vitesse-dark",
  colors: {
    background: "#121212",
    foreground: "#dbd7caee",
    border: "#2e2e2e",
    headerBackground: "#1a1a1a",
    codeBackground: "#1a1a1a",
    hoverBackground: "#2a2a2a",
    selectionBackground: "#3a3a3a",
    heading: "#dbd7caee",
    text: "#dbd7caee",
    textMuted: "#6e6e6e",
    textSubtle: "#4e4e4e",
    link: "#4d9375",
    linkHover: "#5da984",
    accent: "#4d9375",
    success: "#4d9375",
    warning: "#e6cc77",
    error: "#cb7676",
    lineNumber: "#4e4e4e",
    lineNumberBorder: "#2e2e2e",
    folderIcon: "#4d9375",
    fileIcon: "#6e6e6e",
  },
};

// All available themes
export const themes: Record<string, Theme> = {
  "github-dark": githubDark,
  "github-light": githubLight,
  dracula: dracula,
  nord: nord,
  monokai: monokai,
  "one-dark-pro": oneDarkPro,
  "tokyo-night": tokyoNight,
  "solarized-dark": solarizedDark,
  "solarized-light": solarizedLight,
  "vitesse-dark": vitesseDark,
  // Aliases
  dark: githubDark,
  light: githubLight,
  github: githubDark,
};

/**
 * Get theme by name, with fallback to github-dark
 */
export function getTheme(name: string): Theme {
  return themes[name.toLowerCase()] || githubDark;
}

/**
 * Generate CSS variables from theme
 */
export function generateThemeCSS(theme: Theme): string {
  const c = theme.colors;

  return `
    :root {
      --bg: ${c.background};
      --fg: ${c.foreground};
      --border: ${c.border};
      --header-bg: ${c.headerBackground};
      --code-bg: ${c.codeBackground};
      --hover-bg: ${c.hoverBackground};
      --selection-bg: ${c.selectionBackground};
      --heading: ${c.heading};
      --text: ${c.text};
      --text-muted: ${c.textMuted};
      --text-subtle: ${c.textSubtle};
      --link: ${c.link};
      --link-hover: ${c.linkHover};
      --accent: ${c.accent};
      --success: ${c.success};
      --warning: ${c.warning};
      --error: ${c.error};
      --line-number: ${c.lineNumber};
      --line-number-border: ${c.lineNumberBorder};
      --folder-icon: ${c.folderIcon};
      --file-icon: ${c.fileIcon};
    }
  `;
}

/**
 * Get SVG icon with theme color
 */
export function getFolderIcon(color: string): string {
  const encoded = encodeURIComponent(color);
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='${encoded}'%3E%3Cpath d='M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z'/%3E%3C/svg%3E")`;
}

export function getFileIcon(color: string): string {
  const encoded = encodeURIComponent(color);
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='${encoded}'%3E%3Cpath d='M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z'/%3E%3C/svg%3E")`;
}
