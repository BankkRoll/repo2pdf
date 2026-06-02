/**
 * Theme Customizer Plugin for repo2pdf
 *
 * @description
 * Demonstrates the `PRE_FETCH` hook to customize the look of the generated PDF
 * before rendering begins. It loads a small JSON config and applies it to
 * `config.style` — theme, syntax-highlight mode, line/page numbers, and the
 * table of contents.
 *
 * Unlike the pre-v3 version (which injected CSS into HTML), the v3 renderer
 * draws the PDF directly, so styling is controlled through `config.style`
 * rather than CSS. This plugin shows the supported way to theme output.
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
import type { Config, IRepo2PDFPlugin } from "repo2pdf";

/**
 * Theme configuration accepted by this plugin. All fields are optional and map
 * directly onto `config.style`.
 */
export interface ThemeConfig {
  /** Syntax theme name (e.g. "github-light", "dracula", "tokyo-night"). */
  theme?: string;
  /** Highlight mode: "auto" | "shiki" | "none". */
  highlight?: "auto" | "shiki" | "none";
  /** Show line numbers in code blocks. */
  lineNumbers?: boolean;
  /** Show page numbers in the footer. */
  pageNumbers?: boolean;
  /** Include the table of contents. */
  includeTableOfContents?: boolean;
}

/** Default theme: clean light output with full features. */
const DEFAULT_THEME: ThemeConfig = {
  theme: "github-light",
  highlight: "auto",
  lineNumbers: true,
  pageNumbers: true,
  includeTableOfContents: true,
};

/**
 * Plugin that applies a theme configuration via the PRE_FETCH hook.
 */
class ThemeCustomizerPlugin implements IRepo2PDFPlugin {
  private theme: ThemeConfig;
  private loadedThemePath: string | null = null;

  constructor() {
    this.theme = { ...DEFAULT_THEME, ...this.loadThemeConfig() };
  }

  /**
   * Load theme config from REPO2PDF_THEME_PATH or repo2pdf-theme.json.
   */
  private loadThemeConfig(): Partial<ThemeConfig> {
    const candidate =
      process.env.REPO2PDF_THEME_PATH ||
      path.join(process.cwd(), "repo2pdf-theme.json");

    if (!fs.existsSync(candidate)) {
      return {};
    }
    try {
      const parsed = JSON.parse(
        fs.readFileSync(candidate, "utf8"),
      ) as Partial<ThemeConfig>;
      if (parsed && typeof parsed === "object") {
        this.loadedThemePath = candidate;
        return parsed;
      }
    } catch {
      // Invalid theme file — fall back to defaults.
    }
    return {};
  }

  /**
   * Apply the theme to the configuration before fetching begins.
   */
  [HookPoint.PRE_FETCH] = (config: Config): Config => {
    return {
      ...config,
      style: {
        ...config.style,
        theme: this.theme.theme ?? config.style.theme,
        highlight: this.theme.highlight ?? config.style.highlight,
        lineNumbers: this.theme.lineNumbers ?? config.style.lineNumbers,
        pageNumbers: this.theme.pageNumbers ?? config.style.pageNumbers,
        includeTableOfContents:
          this.theme.includeTableOfContents ??
          config.style.includeTableOfContents,
      },
    };
  };

  /** The resolved theme config (useful for tests/inspection). */
  public getTheme(): Readonly<ThemeConfig> {
    return { ...this.theme };
  }

  /** Path of the loaded theme file, or null if defaults were used. */
  public getThemePath(): string | null {
    return this.loadedThemePath;
  }
}

export default new ThemeCustomizerPlugin();
