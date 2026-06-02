import puppeteer, {
  type Browser,
  type Page,
  type PaperFormat,
} from "puppeteer";
import type { Config } from "../types/config.types";
import type {
  PDFGenerationOptions,
  GenerationResult,
  TOCItem,
} from "../types/output.types";
import type { ProcessedFile } from "../types/file.types";
import { logger } from "../utils/logger";
import { getTheme, getFolderIcon, getFileIcon } from "../styles/themes";
import { escapeHtml } from "../utils/string-utils";
import { formatFileSize, organizeFilesByDirectory } from "../utils/file-utils";
import { HookPoint } from "../plugins/plugin-manager";
import { noopPluginRunner, type PluginRunner } from "../plugins/plugin-runner";
import fs from "fs";

/**
 * Generator for PDF output using Puppeteer
 */
export class PDFGenerator {
  private config: Config;
  private browser: Browser | null = null;
  private plugins: PluginRunner;

  constructor(config: Config, plugins: PluginRunner = noopPluginRunner) {
    this.config = config;
    this.plugins = plugins;
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
      let htmlContent = this.generateHTML(files, repoInfo);

      // POST_GENERATE: let plugins transform the HTML before it is rendered to
      // PDF (e.g. inject custom CSS / watermarks). The hook receives a
      // GenerationOutput whose `content` is the HTML; a returned `content`
      // replaces it.
      if (this.plugins.hasHookHandlers(HookPoint.POST_GENERATE)) {
        const result = (await this.plugins.executeHook(
          HookPoint.POST_GENERATE,
          { format: "pdf", content: htmlContent, outputPath },
          this.config,
        )) as { content?: string } | undefined;
        if (result && typeof result.content === "string") {
          htmlContent = result.content;
        }
      }

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
        format: pdfOptions.pageSize as PaperFormat,
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

    // Organize files by directory (shared, sorted grouping)
    const filesByDirectory = organizeFilesByDirectory(files);

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
  <title>${escapeHtml(repoInfo.name)} - Repository Documentation</title>
  <style>
    ${css}
  </style>
</head>
<body class="theme-${style.theme}">
  <div class="container">
    <header class="cover">
      <div class="cover-mark">${this.escapeInitials(repoInfo.name)}</div>
      <div class="cover-body">
        <h1>${escapeHtml(repoInfo.name)}</h1>
        ${repoInfo.description ? `<p class="description">${escapeHtml(repoInfo.description)}</p>` : ""}
        ${repoInfo.url ? `<p class="repo-url"><a href="${escapeHtml(repoInfo.url)}">${escapeHtml(repoInfo.url)}</a></p>` : ""}
      </div>
      <div class="cover-stats">
        <span class="stat"><span class="stat-num">${totalFiles.toLocaleString()}</span><span class="stat-label">files</span></span>
        <span class="stat-divider"></span>
        <span class="stat"><span class="stat-num">${totalLines.toLocaleString()}</span><span class="stat-label">lines</span></span>
        <span class="stat-divider"></span>
        <span class="stat"><span class="stat-num">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span><span class="stat-label">generated</span></span>
      </div>
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
   * Build a short uppercase initials badge from a repository name.
   */
  private escapeInitials(name: string): string {
    const cleaned = name.replace(/[^a-zA-Z0-9]+/g, " ").trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? parts[0][0] + parts[1][0]
        : cleaned.slice(0, 2) || "R2";
    return escapeHtml(initials.toUpperCase());
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

    const isLight = theme.type === "light";
    // A subtle page tint distinct from the code-card background, so cards read
    // as elevated panels on the page.
    const pageBg = isLight ? "#ffffff" : c.background;
    const codeLineHeight = "22px";

    return `
      /* Theme: ${theme.name} (${theme.type}) */

      * { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      html, body { width: 100%; margin: 0; padding: 0; }

      body {
        font-family: ${fontFamily};
        font-size: ${fontSize};
        line-height: 1.65;
        color: ${c.text};
        background-color: ${pageBg};
        -webkit-font-smoothing: antialiased;
      }

      .container {
        width: 100%;
        margin: 0 auto;
        padding: 40px 52px 36px;
        background-color: ${pageBg};
      }

      h1, h2, h3 { color: ${c.heading}; font-weight: 650; margin: 0; }

      a { color: ${c.link}; text-decoration: none; }
      a:hover { color: ${c.linkHover}; text-decoration: underline; }

      /* ---- Cover (compact, left-aligned banner) ---- */
      .cover {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 0 0 20px;
        margin-bottom: 28px;
        border-bottom: 1px solid ${c.border};
      }

      .cover-mark {
        width: 46px;
        height: 46px;
        flex-shrink: 0;
        border-radius: 11px;
        background: ${c.link};
        color: ${pageBg};
        font-family: ${monoFont};
        font-weight: 700;
        font-size: 17px;
        line-height: 46px;
        text-align: center;
        letter-spacing: 0.5px;
      }

      .cover-body { flex: 1; min-width: 0; }

      .cover h1 {
        font-size: 22px;
        letter-spacing: -0.3px;
        margin-bottom: 3px;
      }

      .cover .description {
        font-size: 13px;
        color: ${c.textMuted};
        margin: 0 0 4px;
      }

      .cover .repo-url {
        font-family: ${monoFont};
        font-size: 12px;
        word-break: break-all;
      }

      .cover-stats {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: 16px;
        font-family: ${monoFont};
      }
      .cover-stats .stat { display: inline-flex; flex-direction: column; align-items: flex-end; }
      .cover-stats .stat-num { font-size: 14px; font-weight: 700; color: ${c.heading}; }
      .cover-stats .stat-label {
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: ${c.textMuted};
      }
      .cover-stats .stat-divider { width: 1px; height: 22px; background: ${c.border}; }

      /* ---- Table of Contents (compact) ---- */
      .toc {
        margin-bottom: 34px;
        padding: 16px 20px;
        border: 1px solid ${c.border};
        border-radius: 10px;
        background: ${c.headerBackground};
      }

      .toc h2 {
        margin: 0 0 10px;
        font-size: 10px;
        font-weight: 700;
        color: ${c.textMuted};
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .toc-list { list-style: none; font-size: 12.5px; }
      .toc-columns { columns: 3; column-gap: 28px; }
      .toc-list li { margin: 0; padding: 0; break-inside: avoid; }

      .toc-list .toc-directory { margin-top: 8px; }
      .toc-list .toc-directory:first-child { margin-top: 0; }

      .toc-list .toc-directory > span {
        display: flex;
        align-items: center;
        padding: 1.5px 0;
        color: ${c.heading};
        font-weight: 650;
        font-family: ${monoFont};
        font-size: 12px;
      }

      .toc-list .toc-directory > span::before {
        content: '';
        display: inline-block;
        width: 13px; height: 13px;
        margin-right: 7px;
        background-image: ${getFolderIcon(c.folderIcon)};
        background-size: contain;
        background-repeat: no-repeat;
        flex-shrink: 0;
      }

      .toc-list .toc-directory ul { list-style: none; padding-left: 20px; }

      .toc-list .toc-file a {
        display: flex;
        align-items: center;
        padding: 1.5px 4px;
        color: ${c.text};
        font-family: ${monoFont};
        font-size: 11.5px;
        border-radius: 5px;
      }

      .toc-list .toc-file a::before {
        content: '';
        display: inline-block;
        width: 12px; height: 12px;
        margin-right: 7px;
        background-image: ${getFileIcon(c.fileIcon)};
        background-size: contain;
        background-repeat: no-repeat;
        flex-shrink: 0;
        opacity: 0.8;
      }

      /* ---- Directory section heading ---- */
      .section-heading {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 40px 0 18px;
        padding-bottom: 10px;
        border-bottom: 2px solid ${c.border};
        font-family: ${monoFont};
        font-size: 15px;
        font-weight: 700;
        color: ${c.heading};
      }
      .section-heading::before {
        content: '';
        width: 17px; height: 17px;
        background-image: ${getFolderIcon(c.folderIcon)};
        background-size: contain;
        background-repeat: no-repeat;
        flex-shrink: 0;
      }
      .section-heading:first-child { margin-top: 0; }

      /* ---- File cards ---- */
      .file-container {
        margin-bottom: 28px;
        border: 1px solid ${c.border};
        border-radius: 12px;
        overflow: hidden;
        background: ${c.codeBackground};
        box-shadow: 0 1px 2px rgba(0,0,0,${isLight ? "0.04" : "0.25"});
      }

      .file-header {
        background-color: ${c.headerBackground};
        padding: 12px 18px;
        border-bottom: 1px solid ${c.border};
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .file-path {
        display: flex;
        align-items: center;
        font-family: ${monoFont};
        font-size: 13px;
        font-weight: 650;
        color: ${c.heading};
      }
      .file-path::before {
        content: '';
        display: inline-block;
        width: 14px; height: 14px;
        margin-right: 9px;
        background-image: ${getFileIcon(c.fileIcon)};
        background-size: contain;
        background-repeat: no-repeat;
        flex-shrink: 0;
        opacity: 0.85;
      }

      .file-header-right { display: flex; align-items: center; gap: 10px; }

      .lang-badge {
        font-family: ${monoFont};
        font-size: 10.5px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        padding: 2px 8px;
        border-radius: 999px;
        color: ${c.link};
        background: ${isLight ? c.selectionBackground : c.hoverBackground};
      }

      .file-meta { font-family: ${monoFont}; font-size: 12px; color: ${c.textMuted}; }

      .file-content { background-color: ${c.codeBackground}; margin: 0; padding: 0; }

      .file-content pre { margin: 0; padding: 18px 20px; overflow-x: auto; }
      .file-content code { font-family: ${monoFont}; font-size: 12.5px; line-height: ${codeLineHeight}; tab-size: 2; }

      .file-content pre.shiki {
        background-color: ${c.codeBackground} !important;
        padding: 18px 20px;
        margin: 0 !important;
        overflow-x: auto;
      }
      .file-content .shiki code {
        display: block;
        font-family: ${monoFont};
        font-size: 12.5px;
        line-height: ${codeLineHeight};
        white-space: pre;
        color: ${c.foreground};
      }
      .file-content .shiki .line { display: block; min-height: ${codeLineHeight}; }

      /* Line numbers — table layout for clean PDF copy/paste */
      .code-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .code-table td { vertical-align: top; padding: 0; margin: 0; }

      .line-numbers-col {
        width: 52px; min-width: 52px; max-width: 52px;
        padding: 18px 0 18px 8px !important;
        text-align: right;
        border-right: 1px solid ${c.lineNumberBorder};
        background-color: ${c.headerBackground};
        user-select: none;
        -webkit-user-select: none;
      }
      .line-numbers-col .line-num {
        display: block;
        height: ${codeLineHeight};
        line-height: ${codeLineHeight};
        font-family: ${monoFont};
        font-size: 11.5px;
        color: ${c.lineNumber};
        padding-right: 14px;
      }

      .code-col { padding: 0 !important; overflow-x: auto; }
      .code-col .shiki { margin: 0 !important; padding: 18px 20px !important; }
      .code-col .shiki code { display: block; }
      .code-col .shiki .line { display: block; min-height: ${codeLineHeight}; line-height: ${codeLineHeight}; }

      /* Images */
      .image-container { padding: 28px; text-align: center; background-color: ${c.codeBackground}; }
      .image-container img { max-width: 100%; max-height: 600px; border-radius: 6px; }

      /* Binary placeholder */
      .binary-info { padding: 28px; text-align: center; color: ${c.textMuted}; background-color: ${c.codeBackground}; }
      .binary-info p:first-child { font-weight: 600; color: ${c.text}; margin-bottom: 4px; }

      /* Footer */
      footer {
        margin-top: 56px;
        padding-top: 22px;
        border-top: 1px solid ${c.border};
        text-align: center;
        color: ${c.textMuted};
        font-size: 12.5px;
      }
      footer a { color: ${c.link}; }

      /* Print / PDF */
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: ${pageBg} !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .container { padding: 48px 44px !important; background-color: ${pageBg} !important; }
        .cover { page-break-after: auto; }
        .file-container { page-break-inside: avoid; break-inside: avoid; }
        .file-header { page-break-after: avoid; break-after: avoid; }
        .section-heading { page-break-after: avoid; break-after: avoid; }
      }

      @page { margin: 0; size: auto; }

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
        <ul class="toc-list toc-columns">
    `;

    tocItems.forEach((item) => {
      if (item.children && item.children.length > 0) {
        // Directory with files
        html += `
          <li class="toc-directory">
            <span>${escapeHtml(item.title)}</span>
            <ul>
        `;

        item.children.forEach((child) => {
          html += `
              <li class="toc-file">
                <a href="#${this.createAnchorId(child.path)}">${escapeHtml(child.title)}</a>
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
            <a href="#${this.createAnchorId(item.path)}">${escapeHtml(item.title)}</a>
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
        // Add directory section heading
        html += `<h2 class="section-heading" id="${this.createAnchorId(dir)}">${escapeHtml(dir)}/</h2>`;

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

    const langBadge =
      file.type === "code" && file.language
        ? `<span class="lang-badge">${escapeHtml(file.language)}</span>`
        : "";

    let html = `
      <article class="file-container" id="${fileId}">
        <header class="file-header">
          <div class="file-path">${escapeHtml(file.path)}</div>
          <div class="file-header-right">
            ${langBadge}
            <span class="file-meta">${formatFileSize(file.size)}${lineCount > 0 ? ` &middot; ${lineCount} lines` : ""}</span>
          </div>
        </header>
    `;

    // Generate content based on file type
    if (file.type === "code" && file.highlightedHtml) {
      if (this.config.style.lineNumbers && lineCount > 0) {
        // Use table-based layout for line numbers (better for PDF copying)
        const lineNumbersHtml = Array.from(
          { length: lineCount },
          (_, i) => `<span class="line-num">${i + 1}</span>`,
        ).join("");

        html += `
          <div class="file-content" data-file-id="${fileId}">
            <table class="code-table">
              <tr>
                <td class="line-numbers-col">${lineNumbersHtml}</td>
                <td class="code-col">${file.highlightedHtml}</td>
              </tr>
            </table>
          </div>
        `;
      } else {
        html += `
          <div class="file-content" data-file-id="${fileId}">
            ${file.highlightedHtml}
          </div>
        `;
      }
    } else if (
      file.type === "image" &&
      file.base64Content &&
      this.isSafeImageDataUri(file.base64Content)
    ) {
      html += `
        <div class="image-container">
          <img src="${escapeHtml(file.base64Content)}" alt="${escapeHtml(file.name)}" loading="lazy" />
        </div>
      `;
    } else if (file.type === "binary" || file.type === "unknown") {
      html += `
        <div class="binary-info">
          <p>[Binary file]</p>
          <p>${escapeHtml(file.processedContent)}</p>
        </div>
      `;
    } else {
      html += `
        <div class="file-content ${lineNumbersClass}">
          <pre><code>${escapeHtml(file.processedContent)}</code></pre>
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
   * Validate that a string is a safe base64-encoded image data URI.
   *
   * @remarks
   * Guards against injection through a crafted `base64Content` (e.g. a
   * `javascript:` URI or an SVG with embedded script). We only accept
   * `data:image/<type>;base64,<base64>` produced by the image processor.
   */
  private isSafeImageDataUri(value: string): boolean {
    return /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/i.test(value);
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
