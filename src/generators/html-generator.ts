import type { ProcessedFile } from "../types/file.types";
import type { Config } from "../types/config.types";
import type { HTMLGenerationOptions, TOCItem } from "../types/output.types";
import { logger } from "../utils/logger";

/**
 * Generator for HTML output
 */
export class HTMLGenerator {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Generate HTML for all files
   */
  public async generateHTML(
    files: ProcessedFile[],
    repoInfo: { name: string; description?: string; url: string },
  ): Promise<string> {
    try {
      const { style } = this.config;

      const options: HTMLGenerationOptions = {
        includeTableOfContents: style.includeTableOfContents,
        includeLineNumbers: style.lineNumbers,
        theme: style.theme,
        customCSS: style.customCSS,
        title: repoInfo.name,
      };

      // Organize files by directory
      const filesByDirectory = this.organizeFilesByDirectory(files);

      // Generate table of contents
      const tocItems = this.generateTOCItems(filesByDirectory);

      // Generate HTML content
      const htmlContent = this.generateHTMLContent(
        filesByDirectory,
        tocItems,
        options,
        repoInfo,
      );

      return htmlContent;
    } catch (error) {
      logger.error("Error generating HTML:", error);
      throw new Error(`Failed to generate HTML: ${(error as Error).message}`);
    }
  }

  /**
   * Organize files by directory
   */
  private organizeFilesByDirectory(
    files: ProcessedFile[],
  ): Record<string, ProcessedFile[]> {
    const directories: Record<string, ProcessedFile[]> = {};

    for (const file of files) {
      const dirPath = file.path.includes("/")
        ? file.path.substring(0, file.path.lastIndexOf("/"))
        : "";

      if (!directories[dirPath]) {
        directories[dirPath] = [];
      }

      directories[dirPath].push(file);
    }

    // Sort directories and files
    const sortedDirectories: Record<string, ProcessedFile[]> = {};

    Object.keys(directories)
      .sort((a, b) => a.localeCompare(b))
      .forEach((dir) => {
        sortedDirectories[dir] = directories[dir].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });

    return sortedDirectories;
  }

  /**
   * Generate table of contents items
   */
  private generateTOCItems(
    filesByDirectory: Record<string, ProcessedFile[]>,
  ): TOCItem[] {
    const tocItems: TOCItem[] = [];

    // Add root files first
    if (filesByDirectory[""]) {
      filesByDirectory[""].forEach((file) => {
        tocItems.push({
          title: file.name,
          path: file.path,
          level: 0,
        });
      });
    }

    // Add directories and their files
    Object.keys(filesByDirectory)
      .filter((dir) => dir !== "")
      .forEach((dir) => {
        // Add directory as a parent item
        const dirParts = dir.split("/");
        const dirLevel = dirParts.length - 1;

        const dirItem: TOCItem = {
          title: dirParts[dirParts.length - 1],
          path: dir,
          level: dirLevel,
          children: [],
        };

        // Add files as children
        filesByDirectory[dir].forEach((file) => {
          dirItem.children!.push({
            title: file.name,
            path: file.path,
            level: dirLevel + 1,
          });
        });

        tocItems.push(dirItem);
      });

    return tocItems;
  }

  /**
   * Generate HTML content
   */
  private generateHTMLContent(
    filesByDirectory: Record<string, ProcessedFile[]>,
    tocItems: TOCItem[],
    options: HTMLGenerationOptions,
    repoInfo: { name: string; description?: string; url: string },
  ): string {
    const { title, includeTableOfContents, theme, customCSS } = options;

    // Generate CSS
    const css = this.generateCSS(theme, customCSS);

    // Generate table of contents HTML
    const tocHtml = includeTableOfContents
      ? this.generateTOCHtml(tocItems)
      : "";

    // Generate file content HTML
    const contentHtml = this.generateContentHtml(filesByDirectory);

    // Generate full HTML document
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)} - Repository PDF</title>
  <style>
    ${css}
  </style>
</head>
<body class="theme-${theme}">
  <div class="container">
    <header>
      <h1>${this.escapeHtml(title)}</h1>
      ${repoInfo.description ? `<p class="description">${this.escapeHtml(repoInfo.description)}</p>` : ""}
      <p class="repo-url"><a href="${repoInfo.url}" target="_blank">${repoInfo.url}</a></p>
      <p class="generated-date">Generated on ${new Date().toLocaleString()}</p>
    </header>
    
    ${tocHtml}
    
    <main class="content">
      ${contentHtml}
    </main>
    
    <footer>
      <p>Generated with repo2pdf</p>
    </footer>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate CSS styles
   */
  private generateCSS(theme: string, customCSS?: string): string {
    return `
      :root {
        --bg-color: ${theme === "dark" ? "#1e1e1e" : "#ffffff"};
        --text-color: ${theme === "dark" ? "#e0e0e0" : "#333333"};
        --link-color: ${theme === "dark" ? "#4da6ff" : "#0066cc"};
        --border-color: ${theme === "dark" ? "#444444" : "#dddddd"};
        --code-bg: ${theme === "dark" ? "#2d2d2d" : "#f5f5f5"};
        --heading-color: ${theme === "dark" ? "#ffffff" : "#000000"};
        --toc-bg: ${theme === "dark" ? "#252525" : "#f8f8f8"};
      }
      
      * {
        box-sizing: border-box;
      }
      
      body {
        font-family: ${this.config.style.fontFamily};
        font-size: ${this.config.style.fontSize};
        line-height: 1.6;
        color: var(--text-color);
        background-color: var(--bg-color);
        margin: 0;
        padding: 0;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      
      header {
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--border-color);
      }
      
      h1, h2, h3, h4, h5, h6 {
        color: var(--heading-color);
        margin-top: 1.5em;
        margin-bottom: 0.5em;
      }
      
      h1 {
        font-size: 2.5em;
        margin-top: 0;
      }
      
      h2 {
        font-size: 1.8em;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 5px;
      }
      
      h3 {
        font-size: 1.5em;
      }
      
      a {
        color: var(--link-color);
        text-decoration: none;
      }
      
      a:hover {
        text-decoration: underline;
      }
      
      .description {
        font-size: 1.2em;
        margin-bottom: 10px;
      }
      
      .repo-url {
        font-family: monospace;
        margin-bottom: 5px;
      }
      
      .generated-date {
        color: ${theme === "dark" ? "#888888" : "#666666"};
        font-size: 0.9em;
      }
      
      .toc {
        background-color: var(--toc-bg);
        padding: 20px;
        margin-bottom: 30px;
        border-radius: 5px;
      }
      
      .toc h2 {
        margin-top: 0;
      }
      
      .toc ul {
        list-style-type: none;
        padding-left: 0;
      }
      
      .toc li {
        margin-bottom: 5px;
      }
      
      .toc li.directory {
        font-weight: bold;
      }
      
      .toc li.file {
        padding-left: 20px;
      }
      
      .toc a {
        display: inline-block;
        padding: 3px 0;
      }
      
      .file-container {
        margin-bottom: 40px;
        border: 1px solid var(--border-color);
        border-radius: 5px;
        overflow: hidden;
      }
      
      .file-header {
        background-color: var(--code-bg);
        padding: 10px 15px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .file-path {
        font-family: monospace;
        font-weight: bold;
      }
      
      .file-meta {
        font-size: 0.9em;
        color: ${theme === "dark" ? "#888888" : "#666666"};
      }
      
      .file-content {
        padding: 0;
        margin: 0;
        overflow-x: auto;
      }
      
      .file-content pre {
        margin: 0;
        padding: 15px;
      }
      
      .file-content code {
        font-family: 'Fira Code', 'Consolas', 'Monaco', 'Andale Mono', monospace;
        font-size: 0.9em;
      }
      
      .image-container {
        padding: 20px;
        text-align: center;
      }
      
      .image-container img {
        max-width: 100%;
        max-height: 500px;
      }
      
      .binary-info {
        padding: 20px;
        text-align: center;
        font-style: italic;
      }
      
      .line-number {
        display: inline-block;
        width: 2em;
        padding-right: 1em;
        text-align: right;
        color: ${theme === "dark" ? "#888888" : "#999999"};
        user-select: none;
      }
      
      footer {
        margin-top: 50px;
        padding-top: 20px;
        border-top: 1px solid var(--border-color);
        text-align: center;
        color: ${theme === "dark" ? "#888888" : "#666666"};
        font-size: 0.9em;
      }
      
      @media print {
        .toc {
          page-break-after: always;
        }
        
        .file-container {
          page-break-inside: avoid;
        }
        
        a {
          text-decoration: none;
          color: inherit;
        }
      }
      
      ${customCSS || ""}
    `;
  }

  /**
   * Generate table of contents HTML
   */
  private generateTOCHtml(tocItems: TOCItem[]): string {
    if (tocItems.length === 0) {
      return "";
    }

    let html = `
      <div class="toc" id="table-of-contents">
        <h2>Table of Contents</h2>
        <ul>
    `;

    tocItems.forEach((item) => {
      if (item.children && item.children.length > 0) {
        // Directory with files
        html += `
          <li class="directory" style="padding-left: ${item.level * 20}px;">
            <span>${this.escapeHtml(item.title)}/</span>
            <ul>
        `;

        item.children.forEach((child) => {
          html += `
            <li class="file" style="padding-left: ${child.level * 20}px;">
              <a href="#${this.createAnchorId(child.path)}">${this.escapeHtml(child.title)}</a>
            </li>
          `;
        });

        html += `
            </ul>
          </li>
        `;
      } else {
        // Single file
        html += `
          <li class="file" style="padding-left: ${item.level * 20}px;">
            <a href="#${this.createAnchorId(item.path)}">${this.escapeHtml(item.title)}</a>
          </li>
        `;
      }
    });

    html += `
        </ul>
      </div>
    `;

    return html;
  }

  /**
   * Generate content HTML for all files
   */
  private generateContentHtml(
    filesByDirectory: Record<string, ProcessedFile[]>,
  ): string {
    let html = "";

    // Process root files first
    if (filesByDirectory[""]) {
      filesByDirectory[""].forEach((file) => {
        html += this.generateFileHtml(file);
      });
    }

    // Process directories
    Object.keys(filesByDirectory)
      .filter((dir) => dir !== "")
      .sort((a, b) => a.localeCompare(b))
      .forEach((dir) => {
        // Add directory heading
        html += `<h2 id="${this.createAnchorId(dir)}">${this.escapeHtml(dir)}/</h2>`;

        // Add files in this directory
        filesByDirectory[dir]
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach((file) => {
            html += this.generateFileHtml(file);
          });
      });

    return html;
  }

  /**
   * Generate HTML for a single file
   */
  private generateFileHtml(file: ProcessedFile): string {
    const fileId = this.createAnchorId(file.path);

    let html = `
      <div class="file-container" id="${fileId}">
        <div class="file-header">
          <div class="file-path">${this.escapeHtml(file.path)}</div>
          <div class="file-meta">${this.formatFileSize(file.size)}</div>
        </div>
    `;

    // Generate content based on file type
    if (file.type === "code" && file.highlightedHtml) {
      html += `
        <div class="file-content">
          ${file.highlightedHtml}
        </div>
      `;
    } else if (file.type === "image" && file.base64Content) {
      html += `
        <div class="image-container">
          <img src="${file.base64Content}" alt="${this.escapeHtml(file.name)}" />
        </div>
      `;
    } else if (file.type === "binary" || file.type === "unknown") {
      html += `
        <div class="binary-info">
          ${this.escapeHtml(file.processedContent)}
        </div>
      `;
    } else {
      html += `
        <div class="file-content">
          <pre><code>${this.escapeHtml(file.processedContent)}</code></pre>
        </div>
      `;
    }

    html += `
      </div>
    `;

    return html;
  }

  /**
   * Create an anchor ID from a file path
   */
  private createAnchorId(filePath: string): string {
    return `file-${filePath.replace(/[^a-zA-Z0-9]/g, "-")}`;
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
