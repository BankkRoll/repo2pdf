import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { marked } from "marked";

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

async function formatContent(
  content: string,
  fileName: string,
): Promise<string> {
  const extension = fileName.split(".").pop() || "txt";
  if (extension === "md" || extension === "markdown") {
    return marked(content);
  } else {
    return content;
  }
}

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
  fontSize: number,
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

export async function convertToPDF(
  repoFiles: { name: string; content: string }[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const { name, content } of repoFiles) {
    if (shouldExclude(name)) {
      continue;
    }

    const formattedContent = await formatContent(content, name);
    const safeContent = formattedContent.replace(/[^\x00-\x7F]/g, "");
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.2;
    let yPosition = height - margin - fontSize;

    page.drawText(name, {
      x: margin,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    yPosition -= lineHeight;

    const lines = safeContent.split("\n");
    for (const line of lines) {
      const splitLines = splitTextIntoLines(line, width - 2 * margin, fontSize);
      for (const splitLine of splitLines) {
        if (yPosition <= margin) {
          page = pdfDoc.addPage();
          yPosition = height - margin - fontSize;
        }
        page.drawText(splitLine, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;
      }
    }
  }

  return await pdfDoc.save();
}
