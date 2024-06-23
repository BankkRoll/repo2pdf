import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const universalExcludedNames = [
  ".gitignore",
  ".gitmodules",
  "package-lock.json",
  "yarn.lock",
  ".git",
  "repo2pdf.ignore",
  ".vscode",
  ".idea",
  ".vs",
  "node_modules",
];

const universalExcludedExtensions = [
  ".png",
  ".yml",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".bmp",
  ".webp",
  ".ico",
  ".mp4",
  ".mov",
  ".avi",
  ".wmv",
  ".pdf",
];

function shouldExclude(fileName: string): boolean {
  const extension = fileName.split(".").pop() || "";
  return (
    universalExcludedNames.includes(fileName) ||
    universalExcludedExtensions.includes(`.${extension}`)
  );
}

function estimateTextWidth(text: string, fontSize: number): number {
  const averageWidthPerChar = fontSize * 0.6;
  return text.length * averageWidthPerChar;
}

function splitTextIntoLines(
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  const words = text.split(" ");
  let lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const wordWidth = estimateTextWidth(word, fontSize);
    const lineWidth = estimateTextWidth(currentLine, fontSize);

    if (lineWidth + wordWidth < maxWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

const fontMapping: { [key: string]: string } = {
  [StandardFonts.Courier]: StandardFonts.CourierBold,
  [StandardFonts.Helvetica]: StandardFonts.HelveticaBold,
};

export async function convertToPDF(
  repoFiles: { name: string; content: string }[],
  addLineNumbers: boolean,
  addPageNumbers: boolean,
  addTOC: boolean,
  boldTitles: boolean,
  customHeader: string,
  customFooter: string,
  includeDateInHeader: boolean,
  includeDateInFooter: boolean,
  fontType: string,
  fontSize: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(
    StandardFonts[fontType as keyof typeof StandardFonts]
  );
  const boldFont = await pdfDoc.embedFont(fontMapping[fontType] || fontType);
  let pageNumber = 1;
  let globalLineNumber = 1;
  const tocEntries: { title: string; page: number }[] = [];
  const currentDate = new Date().toLocaleDateString();

  if (addTOC) {
    const tocPage = pdfDoc.addPage();
    const { width, height } = tocPage.getSize();
    tocPage.drawText("Table of Contents", {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
  }

  for (const { name, content } of repoFiles) {
    if (shouldExclude(name)) {
      continue;
    }

    const safeContent = content.replace(/[^\x00-\x7F]/g, "");
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 50;
    const lineHeight = fontSize * 1.2;
    let yPosition = height - margin - fontSize;

    // Add to TOC
    if (addTOC) {
      tocEntries.push({ title: name, page: pageNumber });
    }

    if (customHeader) {
      page.drawText(customHeader, {
        x: margin,
        y: height - margin,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    if (includeDateInHeader) {
      page.drawText(currentDate, {
        x: width - margin - estimateTextWidth(currentDate, fontSize),
        y: height - margin,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    page.drawText(name, {
      x: margin,
      y: yPosition,
      size: boldTitles ? fontSize + 6 : fontSize,
      font: boldTitles ? boldFont : font,
      color: rgb(0, 0, 0),
    });

    yPosition -= lineHeight * 2;

    const lines = safeContent.split("\n");
    for (const line of lines) {
      const splitLines = splitTextIntoLines(line, width - 2 * margin, fontSize);
      for (const splitLine of splitLines) {
        if (yPosition <= margin) {
          if (addPageNumbers) {
            page.drawText(`Page ${pageNumber}`, {
              x: width / 2 - margin,
              y: margin / 2,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
            pageNumber++;
          }
          page = pdfDoc.addPage();
          yPosition = height - margin - fontSize;
        }
        const textToDraw = addLineNumbers
          ? `${globalLineNumber}: ${splitLine}`
          : splitLine;
        page.drawText(textToDraw, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;
        if (addLineNumbers) globalLineNumber++;
      }
    }

    if (customFooter) {
      page.drawText(customFooter, {
        x: margin,
        y: margin / 2,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    if (includeDateInFooter) {
      page.drawText(currentDate, {
        x: width - margin - estimateTextWidth(currentDate, fontSize),
        y: margin / 2,
        size: fontSize,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    if (addPageNumbers) {
      page.drawText(`Page ${pageNumber}`, {
        x: width / 2 - margin,
        y: margin / 2,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      pageNumber++;
    }
  }

  if (addTOC) {
    const tocPage = pdfDoc.getPages()[0];
    const tocFontSize = 12;
    const tocLineHeight = tocFontSize * 1.2;
    let tocYPosition = tocPage.getHeight() - 100;
    tocEntries.forEach((entry, index) => {
      tocPage.drawText(`${index + 1}. ${entry.title} ........ ${entry.page}`, {
        x: 50,
        y: tocYPosition,
        size: tocFontSize,
        font,
        color: rgb(0, 0, 0),
      });
      tocYPosition -= tocLineHeight;
    });
  }

  return await pdfDoc.save();
}
