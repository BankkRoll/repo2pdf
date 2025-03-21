import puppeteer, { type Browser, type Page } from "puppeteer";
import type { Config } from "../types/config.types";
import type {
  PDFGenerationOptions,
  GenerationResult,
} from "../types/output.types";
import { logger } from "../utils/logger";
import fs from "fs";
import path from "path";

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
   * Generate PDF from HTML content
   */
  public async generatePDF(
    htmlContent: string,
    outputPath: string,
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // Initialize browser if not already done
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: "new",
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
        title: path.basename(outputPath, ".pdf"),
        pageSize: output.pageSize || "A4",
        landscape: output.landscape || false,
        margin: {
          top: output.margin?.top || "1cm",
          right: output.margin?.right || "1cm",
          bottom: output.margin?.bottom || "1cm",
          left: output.margin?.left || "1cm",
        },
      };

      // Set content and generate PDF
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      // Add page numbers if enabled
      if (pdfOptions.includePageNumbers) {
        await this.addPageNumbers(page);
      }

      // Generate PDF
      const pdfBuffer = await page.pdf({
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
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
