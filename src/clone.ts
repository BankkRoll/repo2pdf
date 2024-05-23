#!/usr/bin/env node
import fs from "fs";
const fsPromises = fs.promises;
import path from "path";

import git from "simple-git";
import PDFDocument from "pdfkit";
import hljs from "highlight.js";
import { isBinaryFileSync } from "isbinaryfile";
import strip from "strip-comments";
import prettier from "prettier";

import { htmlToJson } from "./syntax";
import loadIgnoreConfig, { IgnoreConfig } from "./loadIgnoreConfig";
import {
  universalExcludedExtensions,
  universalExcludedNames,
} from "./universalExcludes";
import { configQuestions } from "./configHandler";

//@ts-ignore
import type chalkType from "chalk";
//@ts-ignore
import type inquirerType from "inquirer";
//@ts-ignore
import type oraType from "ora";

function getPrettierParser(extension: string): string | null {
  const parserOptions: { [key: string]: string } = {
    js: "babel",
    jsx: "babel",
    ts: "typescript",
    tsx: "typescript",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    json: "json",
    md: "markdown",
    yaml: "yaml",
    graphql: "graphql",
    vue: "vue",
    angular: "angular",
    xml: "xml",
    java: "java",
    kotlin: "kotlin",
    swift: "swift",
    php: "php",
    ruby: "ruby",
    python: "python",
    perl: "perl",
    shell: "sh",
    dockerfile: "dockerfile",
    ini: "ini",
  };
  return parserOptions[extension] || null;
}

let chalk: typeof chalkType;
let inquirer: typeof inquirerType;
let ora: typeof oraType;

const spinnerPromise = import("ora").then((oraModule) => {
  ora = oraModule.default;
  return ora("Setting everything up...").start();
});

Promise.all([
  import("chalk").then((chalkModule) => chalkModule.default),
  import("inquirer").then((inquirerModule) => inquirerModule.default),
  spinnerPromise,
])
  .then(([chalkModule, inquirerModule, spinner]) => {
    chalk = chalkModule;
    inquirer = inquirerModule;
    spinner.succeed("Setup complete");
    configQuestions(main, chalk, inquirer);
  })
  .catch((err) => {
    spinnerPromise.then((spinner) => {
      spinner.fail("An error occurred during setup");
    });
    console.error(err);
  });

async function main(
  repoPath: string,
  useLocalRepo: boolean,
  addLineNumbers: boolean,
  addHighlighting: boolean,
  addPageNumbers: boolean,
  removeComments: boolean,
  removeEmptyLines: boolean,
  onePdfPerFile: boolean,
  outputFileName: fs.PathLike,
  outputFolderName: string,
  keepRepo: boolean,
) {
  const gitP = git();
  let tempDir = "./tempRepo";

  let doc: typeof PDFDocument | null = null;
  if (!onePdfPerFile) {
    doc = new PDFDocument({
      bufferPages: true,
      autoFirstPage: false,
    });
    doc.pipe(fs.createWriteStream(outputFileName));
    doc.addPage();
  }

  let fileCount = 0;
  let ignoreConfig: IgnoreConfig | null = null;
  const spinner = ora(chalk.blueBright("Setting everything up...")).start();
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  try {
    if (useLocalRepo) {
      tempDir = repoPath;
    } else {
      spinner.start(chalk.blueBright("Cloning repository..."));
      await gitP.clone(repoPath, tempDir);
      spinner.succeed(chalk.greenBright("Repository cloned successfully"));
    }

    spinner.start(chalk.blueBright("Processing files..."));
    ignoreConfig = await loadIgnoreConfig(tempDir);
    await appendFilesToPdf(tempDir, removeComments);

    if (!onePdfPerFile) {
      if (doc) {
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          if (addPageNumbers) {
            const oldBottomMargin = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;
            doc.text(
              `Page: ${i + 1} of ${pages.count}`,
              0,
              doc.page.height - oldBottomMargin / 2,
              {
                align: "center",
              },
            );
            doc.page.margins.bottom = oldBottomMargin;
          }
        }
        doc.end();
      }
    }

    spinner.succeed(
      chalk.greenBright(
        `${
          onePdfPerFile ? "PDFs" : "PDF"
        } created with ${fileCount} files processed.`,
      ),
    );

    if (!keepRepo && !useLocalRepo) {
      await delay(3000);
      fs.rmSync(tempDir, { recursive: true, force: true });
      spinner.succeed(
        chalk.greenBright("Temporary repository has been deleted."),
      );
    }
  } catch (err) {
    spinner.fail(chalk.redBright("An error occurred"));
    console.error(err);
  }

  async function appendFilesToPdf(directory: string, removeComments = false) {
    const files = await fsPromises.readdir(directory);

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stat = await fsPromises.stat(filePath);

      const excludedNames = universalExcludedNames;
      const excludedExtensions = universalExcludedExtensions;

      if (ignoreConfig?.ignoredFiles)
        excludedNames.push(...ignoreConfig.ignoredFiles);
      if (ignoreConfig?.ignoredExtensions)
        excludedExtensions.push(...ignoreConfig.ignoredExtensions);

      // Check if file or directory should be excluded
      if (
        excludedNames.includes(path.basename(filePath)) ||
        excludedExtensions.includes(path.extname(filePath))
      ) {
        continue;
      }

      if (stat.isFile()) {
        fileCount++;
        spinner.text = chalk.blueBright(
          `Processing files... (${fileCount} processed)`,
        );
        const fileName = path.relative(tempDir, filePath);

        if (onePdfPerFile) {
          doc = new PDFDocument({
            bufferPages: true,
            autoFirstPage: false,
          });

          const pdfFileName = path
            .join(outputFolderName, fileName.replace(path.sep, "_"))
            .concat(".pdf");

          await fsPromises.mkdir(path.dirname(pdfFileName), {
            recursive: true,
          });
          doc.pipe(fs.createWriteStream(pdfFileName));
          doc.addPage();
        }

        if (doc) {
          if (isBinaryFileSync(filePath)) {
            const data = fs.readFileSync(filePath).toString("base64");
            if (fileCount > 1) doc.addPage();
            doc
              .font("Courier")
              .fontSize(10)
              .text(`${fileName}\n\nBASE64:\n\n${data}`, { lineGap: 4 });
          } else {
            let data = await fsPromises.readFile(filePath, "utf8");
            // Determine parser and format with Prettier if supported
            const extension = path.extname(filePath).slice(1);
            const parser = getPrettierParser(extension);

            if (parser) {
              try {
                data = await prettier.format(data, { parser });
              } catch (error: unknown) {
                const errorMessage = (error as Error).message.split("\n")[0];
                console.warn(
                  `Plain text fallback at ${filePath}: ${errorMessage}`,
                );
              }
            }

            data = data.replace(/\t/g, "    ");
            data = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

            if (removeComments) {
              data = strip(data);
            }

            if (removeEmptyLines) {
              data = data.replace(/^\s*[\r\n]/gm, "");
            }

            let highlightedCode;
            try {
              if (addHighlighting && hljs.getLanguage(extension)) {
                highlightedCode = hljs.highlight(data, {
                  language: extension,
                }).value;
              } else {
                highlightedCode = hljs.highlight(data, {
                  language: "plaintext",
                }).value;
              }
            } catch (error) {
              highlightedCode = hljs.highlight(data, {
                language: "plaintext",
              }).value;
            }

            const hlData = htmlToJson(highlightedCode, removeEmptyLines);
            let lineNum = 1;
            const lineNumWidth = hlData
              .filter((d) => d.text === "\n")
              .length.toString().length;
            for (let i = 0; i < hlData.length; i++) {
              const { text, color } = hlData[i];
              if (i === 0 || hlData[i - 1]?.text === "\n")
                if (addLineNumbers) {
                  doc.text(
                    String(lineNum++).padStart(lineNumWidth, " ") + " ",
                    {
                      continued: true,
                      textIndent: 0,
                    },
                  );
                }
              doc.fillColor(color || "black");

              if (text !== "\n") doc.text(text, { continued: true });
              else doc.text(text);
            }
          }
        }

        if (onePdfPerFile) {
          doc?.end();
        }
      } else if (stat.isDirectory()) {
        await appendFilesToPdf(filePath, removeComments);
      }
    }
  }

  if (!onePdfPerFile) {
    doc?.on("finish", () => {
      spinner.succeed(
        chalk.greenBright(`PDF created with ${fileCount} files processed.`),
      );
    });
  }
}
