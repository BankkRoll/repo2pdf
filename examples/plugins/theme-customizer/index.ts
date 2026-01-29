/**
 * Theme Customizer Plugin for repo2pdf
 *
 * @description
 * This example plugin demonstrates how to use the `POST_GENERATE` hook
 * to inject custom CSS styles into the generated HTML output. It supports
 * loading theme configurations from external JSON files.
 *
 * @example
 * To use this plugin:
 * 1. Copy this directory to your project's `plugins/` folder
 * 2. Optionally create a `repo2pdf-theme.json` file in your project root
 * 3. Or set the `REPO2PDF_THEME_PATH` environment variable
 * 4. The plugin will be automatically loaded by repo2pdf
 *
 * @packageDocumentation
 */

import fs from "fs";
import path from "path";
import { HookPoint } from "repo2pdf";
import type { IRepo2PDFPlugin, GenerationOutput, Config } from "repo2pdf";

/**
 * Theme configuration options.
 * All properties are optional and will fall back to defaults if not specified.
 */
export interface ThemeConfig {
  /** Primary font family for body text */
  fontFamily?: string;
  /** Base font size (e.g., "14px", "1rem") */
  fontSize?: string;
  /** Line height multiplier or value */
  lineHeight?: string;
  /** Page/body background color */
  backgroundColor?: string;
  /** Primary text color */
  textColor?: string;
  /** Hyperlink color */
  linkColor?: string;
  /** Link color on hover */
  linkHoverColor?: string;
  /** Background color for code blocks */
  codeBackgroundColor?: string;
  /** Text color for code */
  codeColor?: string;
  /** Font family for code blocks */
  codeFontFamily?: string;
  /** Heading text color (h1-h6) */
  headingColor?: string;
  /** Border color for tables, hr, etc. */
  borderColor?: string;
  /** Border radius for code blocks and containers */
  borderRadius?: string;
  /** Padding for code blocks */
  codePadding?: string;
}

/**
 * Default theme configuration.
 * Based on GitHub's light theme for familiar, readable styling.
 */
const DEFAULT_THEME: Required<ThemeConfig> = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  fontSize: "14px",
  lineHeight: "1.6",
  backgroundColor: "#ffffff",
  textColor: "#24292f",
  linkColor: "#0969da",
  linkHoverColor: "#0550ae",
  codeBackgroundColor: "#f6f8fa",
  codeColor: "#24292f",
  codeFontFamily:
    '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  headingColor: "#1f2328",
  borderColor: "#d0d7de",
  borderRadius: "6px",
  codePadding: "16px",
};

/**
 * Theme Customizer Plugin implementation.
 *
 * @description
 * This plugin hooks into the `POST_GENERATE` stage to inject custom
 * CSS styles into the HTML output before PDF conversion.
 *
 * @remarks
 * Theme configuration is loaded from (in priority order):
 * 1. `REPO2PDF_THEME_PATH` environment variable
 * 2. `repo2pdf-theme.json` in the current working directory
 * 3. Built-in default theme
 *
 * Theme files should be valid JSON matching the `ThemeConfig` interface.
 *
 * @example
 * ```json
 * // repo2pdf-theme.json
 * {
 *   "backgroundColor": "#1e1e1e",
 *   "textColor": "#d4d4d4",
 *   "codeBackgroundColor": "#2d2d2d",
 *   "linkColor": "#4fc1ff"
 * }
 * ```
 */
class ThemeCustomizerPlugin implements IRepo2PDFPlugin {
  /** Merged theme configuration */
  private theme: Required<ThemeConfig>;

  /** Path to the loaded theme file (for logging) */
  private loadedThemePath: string | null = null;

  /**
   * Initialize the plugin and load theme configuration.
   */
  constructor() {
    this.theme = { ...DEFAULT_THEME };
    this.loadCustomTheme();
  }

  /**
   * Load custom theme from file if available.
   *
   * @description
   * Attempts to load theme configuration from:
   * 1. Path specified in REPO2PDF_THEME_PATH env var
   * 2. repo2pdf-theme.json in current directory
   *
   * Invalid JSON or missing files are handled gracefully.
   */
  private loadCustomTheme(): void {
    const themePaths = [
      process.env.REPO2PDF_THEME_PATH,
      path.join(process.cwd(), "repo2pdf-theme.json"),
    ].filter((p): p is string => !!p);

    for (const themePath of themePaths) {
      if (fs.existsSync(themePath)) {
        try {
          const themeData = fs.readFileSync(themePath, "utf8");
          const customTheme = JSON.parse(themeData) as Partial<ThemeConfig>;

          // Validate that parsed data is an object
          if (typeof customTheme !== "object" || customTheme === null) {
            console.warn(`[theme-customizer] Invalid theme file: ${themePath}`);
            continue;
          }

          // Merge with defaults (custom values override defaults)
          this.theme = { ...DEFAULT_THEME, ...customTheme };
          this.loadedThemePath = themePath;

          console.log(`[theme-customizer] Loaded theme from: ${themePath}`);
          return;
        } catch (error) {
          console.warn(
            `[theme-customizer] Error loading theme from ${themePath}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    }

    // No custom theme found - using defaults
    console.log("[theme-customizer] Using default theme");
  }

  /**
   * Modify the HTML output to apply custom theme styles.
   *
   * @description
   * This hook is called after HTML generation but before PDF conversion.
   * It injects a `<style>` block with CSS variables and rules based on
   * the theme configuration.
   *
   * @param output - The generation output containing HTML content
   * @param _config - Configuration (unused in this plugin)
   * @returns Modified output with injected styles
   */
  [HookPoint.POST_GENERATE] = (
    output: GenerationOutput,
    _config: Config,
  ): GenerationOutput => {
    // Only process HTML content
    if (!output.content || output.format !== "html") {
      return output;
    }

    // Generate and inject custom CSS
    const customCSS = this.generateCSS();
    const styledContent = this.injectStyles(output.content, customCSS);

    return {
      ...output,
      content: styledContent,
      metadata: {
        ...output.metadata,
        themeApplied: true,
        themePath: this.loadedThemePath,
      },
    };
  };

  /**
   * Generate CSS rules from theme configuration.
   *
   * @returns CSS string with all theme rules
   */
  private generateCSS(): string {
    const t = this.theme;

    return `
      /* repo2pdf Theme Customizer */
      :root {
        --r2p-font-family: ${t.fontFamily};
        --r2p-font-size: ${t.fontSize};
        --r2p-line-height: ${t.lineHeight};
        --r2p-bg-color: ${t.backgroundColor};
        --r2p-text-color: ${t.textColor};
        --r2p-link-color: ${t.linkColor};
        --r2p-link-hover-color: ${t.linkHoverColor};
        --r2p-code-bg: ${t.codeBackgroundColor};
        --r2p-code-color: ${t.codeColor};
        --r2p-code-font: ${t.codeFontFamily};
        --r2p-heading-color: ${t.headingColor};
        --r2p-border-color: ${t.borderColor};
        --r2p-border-radius: ${t.borderRadius};
        --r2p-code-padding: ${t.codePadding};
      }

      body {
        font-family: var(--r2p-font-family);
        font-size: var(--r2p-font-size);
        line-height: var(--r2p-line-height);
        background-color: var(--r2p-bg-color);
        color: var(--r2p-text-color);
        margin: 0;
        padding: 20px;
      }

      a {
        color: var(--r2p-link-color);
        text-decoration: none;
      }

      a:hover {
        color: var(--r2p-link-hover-color);
        text-decoration: underline;
      }

      pre, code {
        font-family: var(--r2p-code-font);
        background-color: var(--r2p-code-bg);
        color: var(--r2p-code-color);
        border-radius: var(--r2p-border-radius);
      }

      code {
        padding: 0.2em 0.4em;
        font-size: 85%;
      }

      pre {
        padding: var(--r2p-code-padding);
        overflow-x: auto;
        border: 1px solid var(--r2p-border-color);
      }

      pre code {
        padding: 0;
        background: transparent;
        font-size: inherit;
      }

      h1, h2, h3, h4, h5, h6 {
        color: var(--r2p-heading-color);
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        font-weight: 600;
      }

      h1 { font-size: 2em; border-bottom: 1px solid var(--r2p-border-color); padding-bottom: 0.3em; }
      h2 { font-size: 1.5em; border-bottom: 1px solid var(--r2p-border-color); padding-bottom: 0.3em; }
      h3 { font-size: 1.25em; }
      h4 { font-size: 1em; }
      h5 { font-size: 0.875em; }
      h6 { font-size: 0.85em; color: var(--r2p-text-color); opacity: 0.8; }

      hr {
        border: none;
        border-top: 1px solid var(--r2p-border-color);
        margin: 1.5em 0;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }

      th, td {
        border: 1px solid var(--r2p-border-color);
        padding: 8px 12px;
        text-align: left;
      }

      th {
        background-color: var(--r2p-code-bg);
        font-weight: 600;
      }

      blockquote {
        margin: 1em 0;
        padding: 0.5em 1em;
        border-left: 4px solid var(--r2p-border-color);
        background-color: var(--r2p-code-bg);
        color: var(--r2p-text-color);
        opacity: 0.9;
      }

      /* File header styling */
      .file-header {
        background-color: var(--r2p-code-bg);
        border: 1px solid var(--r2p-border-color);
        border-bottom: none;
        padding: 8px 16px;
        font-family: var(--r2p-code-font);
        font-size: 0.9em;
        border-radius: var(--r2p-border-radius) var(--r2p-border-radius) 0 0;
      }

      .file-header + pre {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
        margin-top: 0;
      }
    `;
  }

  /**
   * Inject CSS styles into HTML content.
   *
   * @param html - Original HTML content
   * @param css - CSS to inject
   * @returns HTML with injected styles
   */
  private injectStyles(html: string, css: string): string {
    // Try to inject before </head>
    if (html.includes("</head>")) {
      return html.replace("</head>", `<style>${css}</style></head>`);
    }

    // Fallback: inject at the beginning
    return `<style>${css}</style>${html}`;
  }

  /**
   * Get the current theme configuration.
   * Useful for debugging or extension.
   *
   * @returns Current theme configuration
   */
  public getTheme(): Readonly<Required<ThemeConfig>> {
    return this.theme;
  }
}

/**
 * Plugin instance export.
 *
 * @remarks
 * The plugin is instantiated once and exported as the default export.
 * Theme configuration is loaded at instantiation time.
 */
export default new ThemeCustomizerPlugin();
