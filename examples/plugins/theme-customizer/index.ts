import { HookPoint } from "../../../src/plugins/plugin-manager";
import { IRepo2PDFPlugin } from "../../../src/plugins/plugin.interface";
import fs from "fs";
import path from "path";

/**
 * Theme Customizer Plugin for repo2pdf
 *
 * This plugin allows customizing the theme of the generated output.
 */
class ThemeCustomizerPlugin implements IRepo2PDFPlugin {
  private theme: any = {
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    lineHeight: "1.5",
    backgroundColor: "#ffffff",
    textColor: "#333333",
    linkColor: "#0366d6",
    codeBackgroundColor: "#f6f8fa",
    codeColor: "#24292e",
    headingColor: "#24292e",
    borderColor: "#e1e4e8",
  };

  constructor() {
    // Load custom theme if available
    this.loadCustomTheme();
  }

  /**
   * Load custom theme from file if available
   */
  private loadCustomTheme(): void {
    const themePath =
      process.env.REPO2PDF_THEME_PATH ||
      path.join(process.cwd(), "repo2pdf-theme.json");

    if (fs.existsSync(themePath)) {
      try {
        const themeData = fs.readFileSync(themePath, "utf8");
        const customTheme = JSON.parse(themeData);
        this.theme = { ...this.theme, ...customTheme };
        console.log("Loaded custom theme from", themePath);
      } catch (error) {
        console.error("Error loading custom theme:", error);
      }
    }
  }

  /**
   * Modify the HTML output to apply custom theme
   */
  [HookPoint.POST_GENERATE] = (output: any, config: any): any => {
    if (output.format !== "html" || !output.content) {
      return output;
    }

    // Apply theme to HTML content
    let htmlContent = output.content;

    // Add custom CSS
    const customCSS = this.generateCustomCSS();
    htmlContent = htmlContent.replace(
      "</head>",
      `<style>${customCSS}</style></head>`,
    );

    return {
      ...output,
      content: htmlContent,
    };
  };

  /**
   * Generate custom CSS based on theme settings
   */
  private generateCustomCSS(): string {
    return `
      body {
        font-family: ${this.theme.fontFamily};
        font-size: ${this.theme.fontSize};
        line-height: ${this.theme.lineHeight};
        background-color: ${this.theme.backgroundColor};
        color: ${this.theme.textColor};
      }
      
      a {
        color: ${this.theme.linkColor};
      }
      
      pre, code {
        background-color: ${this.theme.codeBackgroundColor};
        color: ${this.theme.codeColor};
      }
      
      h1, h2, h3, h4, h5, h6 {
        color: ${this.theme.headingColor};
      }
      
      hr, table, th, td {
        border-color: ${this.theme.borderColor};
      }
    `;
  }
}

export default new ThemeCustomizerPlugin();
