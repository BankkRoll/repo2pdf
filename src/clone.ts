#!/usr/bin/env node
import fs from 'fs';
const fsPromises = fs.promises;
import path from 'path';

import git from 'simple-git';
import PDFDocument from 'pdfkit';
import { default as hljs } from 'highlight.js';
import { isBinaryFileSync } from 'isbinaryfile';
import strip from 'strip-comments';

import { htmlToJson } from './syntax';
import loadIgnoreConfig, { IgnoreConfig } from './loadIgnoreConfig';
import {
  universalExcludedExtensions,
  universalExcludedNames,
} from './universalExcludes';

import { configQuestions } from './configHandler';

//@ts-ignore
import type chalkType from 'chalk';
//@ts-ignore
import type inquirerType from 'inquirer';
//@ts-ignore
import type oraType from 'ora';

let chalk: typeof chalkType;
let inquirer: typeof inquirerType;
let ora: typeof oraType;

const spinnerPromise = import('ora').then((oraModule) => {
  ora = oraModule.default;
  return ora('Setting everything up...').start();
});

Promise.all([
  import('chalk').then((chalkModule) => chalkModule.default),
  import('inquirer').then((inquirerModule) => inquirerModule.default),
  spinnerPromise,
])
  .then(([chalkModule, inquirerModule, spinner]) => {
    chalk = chalkModule;
    inquirer = inquirerModule;
    spinner.succeed('Setup complete');
    configQuestions(main, chalk, inquirer);
  })
  .catch((err) => {
    spinnerPromise.then((spinner) => {
      spinner.fail('An error occurred during setup');
    });
    console.error(err);
  });

async function main(
  repoPath: string,
  useLocalRepo: boolean,
  addLineNumbers: any,
  addHighlighting: any,
  addPageNumbers: any,
  removeComments: any,
  removeEmptyLines: boolean,
  onePdfPerFile: any,
  outputFileName: fs.PathLike,
  outputFolderName: any,
  keepRepo: any,
) {
  const gitP = git();
  let tempDir = './tempRepo';

  let doc: typeof PDFDocument | null = null;
  if (!onePdfPerFile) {
    doc = new PDFDocument({
      bufferPages: true,
      autoFirstPage: false,
    });
    doc.pipe(fs.createWriteStream(outputFileName));
  }

  let fileCount = 0;

  let ignoreConfig: IgnoreConfig | null = null;

  const spinner = ora(chalk.blueBright('Setting everything up...')).start();

  try {
    if (useLocalRepo) {
      tempDir = repoPath;
    } else {
      spinner.start(chalk.blueBright('Cloning repository...'));

      await gitP.clone(repoPath, tempDir);
      spinner.succeed(chalk.greenBright('Repository cloned successfully'));
    }

    spinner.start(chalk.blueBright('Processing files...'));

    ignoreConfig = await loadIgnoreConfig(tempDir);

    await appendFilesToPdf(tempDir, removeComments);

    if (!onePdfPerFile) {
      if (doc) {
        let pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);

          if (addPageNumbers) {
            let oldBottomMargin = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;
            doc.text(
              `Page: ${i + 1} of ${pages.count}`,
              0,
              doc.page.height - oldBottomMargin / 2,
              { align: 'center' },
            );
            doc.page.margins.bottom = oldBottomMargin;
          }
        }
        doc?.end();
      }
    }

    spinner.succeed(
      chalk.greenBright(
        `${
          onePdfPerFile ? 'PDFs' : 'PDF'
        } created with ${fileCount} files processed.`,
      ),
    );

    if (!keepRepo && !useLocalRepo) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      spinner.succeed(
        chalk.greenBright('Temporary repository has been deleted.'),
      );
    }
  } catch (err) {
    spinner.fail(chalk.redBright('An error occurred'));
    console.error(err);
  }

  async function appendFilesToPdf(directory: string, removeComments = false) {
    const files = await fsPromises.readdir(directory);

    for (let file of files) {
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
        let fileName = path.relative(tempDir, filePath);

        if (onePdfPerFile) {
          doc = new PDFDocument({
            bufferPages: true,
            autoFirstPage: false,
          });

          const pdfFileName = path
            .join(outputFolderName, fileName.replace(path.sep, '_'))
            .concat('.pdf');

          await fsPromises.mkdir(path.dirname(pdfFileName), {
            recursive: true,
          });
          doc.pipe(fs.createWriteStream(pdfFileName));
        }

        if (doc) {
          if (isBinaryFileSync(filePath)) {
            const data = fs.readFileSync(filePath).toString('base64');
            if (fileCount > 1) doc.addPage();
            doc
              .font('Courier')
              .fontSize(10)
              .text(`${fileName}\n\nBASE64:\n\n${data}`, { lineGap: 4 });
          } else {
            let data = await fsPromises.readFile(filePath, 'utf8');
            data = data.replace(/Ð/g, '\n');
            data = data.replace(/\r\n/g, '\n');
            data = data.replace(/\r/g, '\n');
            data = data.replace(/uþs/g, '');

            doc.addPage();
            doc
              .font('Courier')
              .fontSize(10)
              .text(`${fileName}\n\n`, { lineGap: 4 });

            if (removeComments) {
              data = strip(data);
            }

            // Remove empty whitespace lines
            if (removeEmptyLines) {
              data = data.replace(/^\s*[\r\n]/gm, '');
            }

            const extension = path.extname(filePath).replace('.', '');
            let highlightedCode;
            try {
              // Check if language is supported before attempting to highlight
              if (addHighlighting && hljs.getLanguage(extension)) {
                highlightedCode = hljs.highlight(data, {
                  language: extension,
                }).value;
              } else {
                // Use plaintext highlighting if language is not supported
                highlightedCode = hljs.highlight(data, {
                  language: 'plaintext',
                }).value;
              }
            } catch (error) {
              // Use plaintext highlighting if an error occurs
              highlightedCode = hljs.highlight(data, {
                language: 'plaintext',
              }).value;
            }
            const hlData = htmlToJson(highlightedCode);
            let lineNum = 1;
            const lineNumWidth = hlData
              .filter((d) => d.text === '\n')
              .length.toString().length;
            for (let i = 0; i < hlData.length; i++) {
              const { text, color } = hlData[i];
              if (i == 0 || hlData[i - 1]?.text === '\n')
                if (addLineNumbers) {
                  doc.text(
                    String(lineNum++).padStart(lineNumWidth, ' ') + ' ',
                    {
                      continued: true,
                      textIndent: 0,
                    },
                  );
                }
              if (color) doc.fillColor(color);
              else doc.fillColor('black');

              if (text !== '\n') doc.text(text, { continued: true });
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
    doc?.on('finish', () => {
      spinner.succeed(
        chalk.greenBright(`PDF created with ${fileCount} files processed.`),
      );
    });
  }
}
