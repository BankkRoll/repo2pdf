import puppeteer, { type Browser, type Page } from "puppeteer";
import type { Config } from "../types/config.types";
import type {
  PDFGenerationOptions,
  GenerationResult,
  TOCItem,
} from "../types/output.types";
import type { ProcessedFile } from "../types/file.types";
import { logger } from "../utils/logger";
import {
  getTheme,
  getFolderIcon,
  getFileIcon,
  type Theme,
} from "../styles/themes";
import fs from "fs";

/**
 * Generator for PDF output using Puppeteer
 */
export class PDFGenerator {
  private config: Config;
  private browser: Browser | null = null;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Generate PDF from processed files
   */
  public async generatePDF(
    files: ProcessedFile[],
    repoInfo: { name: string; description?: string; url: string },
    outputPath: string,
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // Generate HTML content first
      const htmlContent = this.generateHTML(files, repoInfo);

      // Initialize browser if not already done
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      }

      // Create a new page
      const page = await this.browser.newPage();

      // Set PDF options
      const { output, style } = this.config;
      const pdfOptions: PDFGenerationOptions = {
        includeTableOfContents: style.includeTableOfContents,
        includeLineNumbers: style.lineNumbers,
        includePageNumbers: style.pageNumbers,
        theme: style.theme,
        customCSS: style.customCSS,
        title: repoInfo.name,
        pageSize: output.pageSize || "A4",
        landscape: output.landscape || false,
        margin: {
          top: output.margin?.top || "0px",
          right: output.margin?.right || "0px",
          bottom: output.margin?.bottom || "0px",
          left: output.margin?.left || "0px",
        },
      };

      // Set content and generate PDF
      // Use longer timeout for large repositories
      await page.setContent(htmlContent, {
        waitUntil: "networkidle0",
        timeout: 120000, // 2 minutes for large repos
      });

      // Add page numbers if enabled
      if (pdfOptions.includePageNumbers) {
        await this.addPageNumbers(page);
      }

      // Generate PDF
      await page.pdf({
        path: outputPath,
        format: pdfOptions.pageSize as any,
        landscape: pdfOptions.landscape,
        margin: pdfOptions.margin,
        printBackground: true,
        displayHeaderFooter: pdfOptions.includePageNumbers,
        headerTemplate: " ",
        footerTemplate: pdfOptions.includePageNumbers
          ? '<div style="width: 100%; text-align: center; font-size: 10px; color: #666;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
          : " ",
      });

      // Close the page
      await page.close();

      // Get file size
      const stats = fs.statSync(outputPath);

      return {
        success: true,
        outputPath,
        format: "pdf",
        fileSize: stats.size,
        generationTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error("Error generating PDF:", error);
      throw new Error(`Failed to generate PDF: ${(error as Error).message}`);
    }
  }

  /**
   * Generate HTML content from processed files
   */
  private generateHTML(
    files: ProcessedFile[],
    repoInfo: { name: string; description?: string; url: string },
  ): string {
    const { style } = this.config;

    // Organize files by directory
    const filesByDirectory = this.organizeFilesByDirectory(files);

    // Generate table of contents
    const tocItems = this.generateTOCItems(filesByDirectory);

    // Generate CSS
    const css = this.generateCSS(style.theme, style.customCSS);

    // Generate table of contents HTML
    const tocHtml = style.includeTableOfContents
      ? this.generateTOCHtml(tocItems)
      : "";

    // Generate file content HTML
    const contentHtml = this.generateContentHtml(filesByDirectory);

    // Count total files and lines
    const totalFiles = files.length;
    const totalLines = files.reduce((sum, f) => {
      if (f.type === "code" && f.processedContent) {
        return sum + f.processedContent.split("\n").length;
      }
      return sum;
    }, 0);

    // Generate full HTML document
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(repoInfo.name)} - Repository Documentation</title>
  <style>
    ${css}
  </style>
</head>
<body class="theme-${style.theme}">
  <div class="container">
    <header>
      <h1>${this.escapeHtml(repoInfo.name)}</h1>
      ${repoInfo.description ? `<p class="description">${this.escapeHtml(repoInfo.description)}</p>` : ""}
      <p class="repo-url"><a href="${repoInfo.url}" target="_blank">${repoInfo.url}</a></p>
      <p class="generated-date">Generated on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} | ${totalFiles} files | ${totalLines.toLocaleString()} lines of code</p>
    </header>

    ${tocHtml}

    <main class="content">
      ${contentHtml}
    </main>

    <footer>
      <p>Generated with <a href="https://github.com/BankkRoll/repo2pdf">repo2pdf</a></p>
    </footer>
  </div>
</body>
</html>
    `;
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
   * Generate CSS styles using the advanced theme system
   */
  private generateCSS(themeName: string, customCSS?: string): string {
    const theme = getTheme(themeName);
    const c = theme.colors;
    const fontFamily =
      this.config.style.fontFamily ||
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
    const monoFont =
      "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace";
    const fontSize = this.config.style.fontSize || "14px";

    return `
      /* Theme: ${theme.name} (${theme.type}) */

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      html {
        scroll-behavior: smooth;
      }

      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: ${fontFamily};
        font-size: ${fontSize};
        line-height: 1.6;
        color: ${c.text};
        background-color: ${c.background};
      }

      .container {
        width: 100%;
        min-height: 100%;
        margin: 0;
        padding: 32px;
        background-color: ${c.background};
      }

      /* Header */
      header {
        margin-bottom: 48px;
        padding-bottom: 24px;
        border-bottom: 1px solid ${c.border};
        text-align: center;
      }

      h1, h2, h3, h4, h5, h6 {
        color: ${c.heading};
        font-weight: 600;
        margin: 0;
      }

      h1 {
        font-size: 2em;
        margin-bottom: 16px;
      }

      h2 {
        font-size: 1.5em;
        margin-top: 32px;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid ${c.border};
      }

      h3 {
        font-size: 1.25em;
      }

      a {
        color: ${c.link};
        text-decoration: none;
      }

      a:hover {
        color: ${c.linkHover};
        text-decoration: underline;
      }

      .description {
        font-size: 1.1em;
        color: ${c.textMuted};
        margin-bottom: 16px;
      }

      .repo-url {
        font-family: ${monoFont};
        font-size: 0.875em;
        margin-bottom: 8px;
      }

      .generated-date {
        color: ${c.textMuted};
        font-size: 0.875em;
      }

      /* Table of Contents - GitHub file tree style */
      .toc {
        margin-bottom: 48px;
        padding-bottom: 32px;
        border-bottom: 1px solid ${c.border};
      }

      .toc h2 {
        margin-top: 0;
        margin-bottom: 16px;
        font-size: 12px;
        font-weight: 600;
        color: ${c.textMuted};
        border-bottom: none;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .toc-list {
        list-style: none;
        font-family: ${monoFont};
        font-size: 13px;
      }

      .toc-list li {
        margin: 0;
        padding: 0;
      }

      .toc-list .toc-directory {
        margin-top: 4px;
      }

      .toc-list .toc-directory:first-child {
        margin-top: 0;
      }

      .toc-list .toc-directory > span {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        color: ${c.heading};
        font-weight: 600;
      }

      .toc-list .toc-directory > span::before {
        content: '';
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 8px;
        background-image: ${getFolderIcon(c.folderIcon)};
        background-size: contain;
        background-repeat: no-repeat;
        flex-shrink: 0;
      }

      .toc-list .toc-directory ul {
        list-style: none;
        padding-left: 24px;
      }

      .toc-list .toc-file a {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        color: ${c.text};
        text-decoration: none;
        border-radius: 6px;
      }

      .toc-list .toc-file a:hover {
        background-color: ${c.hoverBackground};
        color: ${c.heading};
      }

      .toc-list .toc-file a::before {
        content: '';
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 8px;
        background-image: ${getFileIcon(c.fileIcon)};
        background-size: contain;
        background-repeat: no-repeat;
        flex-shrink: 0;
      }

      /* File containers */
      .file-container {
        margin-bottom: 24px;
        border: 1px solid ${c.border};
        border-radius: 8px;
        overflow: hidden;
      }

      .file-header {
        background-color: ${c.headerBackground};
        padding: 10px 16px;
        border-bottom: 1px solid ${c.border};
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 0;
      }

      .file-path {
        font-family: ${monoFont};
        font-size: 13px;
        font-weight: 600;
        color: ${c.heading};
      }

      .file-header-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .file-meta {
        font-family: ${monoFont};
        font-size: 12px;
        color: ${c.textMuted};
      }

      /* Code content */
      .file-content {
        background-color: ${c.codeBackground};
        margin: 0;
        padding: 0;
      }

      .file-content pre {
        margin: 0;
        padding: 16px;
        overflow-x: auto;
      }

      .file-content code {
        font-family: ${monoFont};
        font-size: 13px;
        line-height: 1.5;
        tab-size: 2;
      }

      /* Shiki code block styling */
      .file-content pre.shiki {
        background-color: ${c.codeBackground} !important;
        padding: 16px;
        margin: 0 !important;
        overflow-x: auto;
      }

      .file-content .shiki code {
        display: block;
        counter-reset: line;
        font-family: ${monoFont};
        font-size: 13px;
        line-height: 21px;
        white-space: pre;
        color: ${c.foreground};
      }

      .file-content .shiki .line {
        display: block;
        height: 21px;
      }

      /* Line numbers */
      .line-numbers .shiki .line::before {
        counter-increment: line;
        content: counter(line);
        display: inline-block;
        width: 3em;
        margin-right: 16px;
        padding-right: 12px;
        text-align: right;
        color: ${c.lineNumber};
        user-select: none;
        border-right: 1px solid ${c.lineNumberBorder};
      }

      /* Images */
      .image-container {
        padding: 24px;
        text-align: center;
        background-color: ${c.codeBackground};
      }

      .image-container img {
        max-width: 100%;
        max-height: 600px;
        border-radius: 4px;
      }

      /* Binary files */
      .binary-info {
        padding: 24px;
        text-align: center;
        font-style: italic;
        color: ${c.textMuted};
        background-color: ${c.codeBackground};
      }

      /* Footer */
      footer {
        margin-top: 60px;
        padding-top: 24px;
        border-top: 1px solid ${c.border};
        text-align: center;
        color: ${c.textMuted};
        font-size: 0.875em;
      }

      footer a {
        color: ${c.link};
      }

      /* Print styles for PDF */
      @media print {
        html, body {
          width: 100%;
          height: 100%;
          margin: 0 !important;
          padding: 0 !important;
          background-color: ${c.background} !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .container {
          padding: 32px !important;
          background-color: ${c.background} !important;
        }

        .toc {
          page-break-after: always;
        }

        .file-container {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .file-header {
          page-break-after: avoid;
          break-after: avoid;
        }
      }

      /* Ensure background covers entire page */
      @page {
        margin: 0;
        size: auto;
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
      <nav class="toc" id="table-of-contents">
        <h2>Table of Contents</h2>
        <ul class="toc-list">
    `;

    tocItems.forEach((item) => {
      if (item.children && item.children.length > 0) {
        // Directory with files
        html += `
          <li class="toc-directory">
            <span>${this.escapeHtml(item.title)}</span>
            <ul>
        `;

        item.children.forEach((child) => {
          html += `
              <li class="toc-file">
                <a href="#${this.createAnchorId(child.path)}">${this.escapeHtml(child.title)}</a>
              </li>
          `;
        });

        html += `
            </ul>
          </li>
        `;
      } else {
        // Single file (root level)
        html += `
          <li class="toc-file">
            <a href="#${this.createAnchorId(item.path)}">${this.escapeHtml(item.title)}</a>
          </li>
        `;
      }
    });

    html += `
        </ul>
      </nav>
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
    const lineNumbersClass = this.config.style.lineNumbers
      ? "line-numbers"
      : "";
    const lineCount =
      file.type === "code" && file.processedContent
        ? file.processedContent.split("\n").length
        : 0;

    let html = `
      <article class="file-container" id="${fileId}">
        <header class="file-header">
          <div class="file-path">${this.escapeHtml(file.path)}</div>
          <div class="file-header-right">
            <span class="file-meta">${this.formatFileSize(file.size)}${lineCount > 0 ? ` | ${lineCount} lines` : ""}</span>
          </div>
        </header>
    `;

    // Generate content based on file type
    if (file.type === "code" && file.highlightedHtml) {
      html += `
        <div class="file-content ${lineNumbersClass}" data-file-id="${fileId}">
          ${file.highlightedHtml}
        </div>
      `;
    } else if (file.type === "image" && file.base64Content) {
      html += `
        <div class="image-container">
          <img src="${file.base64Content}" alt="${this.escapeHtml(file.name)}" loading="lazy" />
        </div>
      `;
    } else if (file.type === "binary" || file.type === "unknown") {
      html += `
        <div class="binary-info">
          <p>[Binary file]</p>
          <p>${this.escapeHtml(file.processedContent)}</p>
        </div>
      `;
    } else {
      html += `
        <div class="file-content ${lineNumbersClass}">
          <pre><code>${this.escapeHtml(file.processedContent)}</code></pre>
        </div>
      `;
    }

    html += `
      </article>
    `;

    return html;
  }

  /**
   * Add page numbers to the PDF
   */
  private async addPageNumbers(page: Page): Promise<void> {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.textContent = `
        @media print {
          .page-number {
            position: fixed;
            bottom: 10px;
            right: 10px;
            font-size: 10px;
            color: #666;
          }
        }
      `;
      document.head.appendChild(style);
    });
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

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
