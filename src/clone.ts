#!/usr/bin/env node
import fs from "fs"
const fsPromises = fs.promises
import path from "path"
import { execSync } from "child_process"

import git from "simple-git"
import PDFDocument from "pdfkit"
import { default as hljs } from "highlight.js"
import { htmlToJson } from "./syntax"
import { isBinaryFileSync } from "isbinaryfile"

//@ts-ignore
import type chalkType from "chalk";
//@ts-ignore
import type inquirerType from "inquirer";
//@ts-ignore
import type oraType from "ora";

// TODO IDEAS
// TODO add option to condiotionaly remove comments from code
// TODO add option to condiotionaly remove empty lines from code
// TODO add option to condiotionaly add line numbers to code
// TODO add option to condiotionaly add linting to code
// TODO add option to make one pdf per file

let chalk: typeof chalkType;
let inquirer: typeof inquirerType;
let ora: typeof oraType;

const spinnerPromise = import("ora").then((oraModule) => {
  ora = oraModule.default
  return ora("Setting everything up...").start()
})

Promise.all([
  import("chalk").then((chalkModule) => chalkModule.default),
  import("inquirer").then((inquirerModule) => inquirerModule.default),
  spinnerPromise])
  .then(([chalkModule, inquirerModule, spinner]) => {
    chalk = chalkModule
    inquirer = inquirerModule
    spinner.succeed("Setup complete")
    askForRepoUrl()
  })
  .catch((err) => {
    spinnerPromise.then((spinner) => {
      spinner.fail("An error occurred during setup")
    })
    console.error(err)
  })

async function askForRepoUrl() {
  const questions: {
    type?: string,
    name: [
      "repoUrl",
      "optionalExcludedNames",
      "optionalExcludedExtensions",
      "addLineNumbers",
      "addLinting",
      "removeComments",
      "removeEmptyLines",
      "onePdfPerFile",
      "outputFileName",
      "outputFolderName",
      "keepRepo"
    ][number],
    message: string,
    validate?: (value: string) => boolean | string,
    filter?: (value: string) => boolean | string | string[],
    choices?: string[],
    default?: string | string[],
    when?: (answers: any) => boolean,
  }[] = [
      {
        name: "repoUrl",
        message: "Please provide a GitHub repository URL:",
        validate: function (value: string) {
          var pass = value.match(
            /^https:\/\/github.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
          )
          if (pass) {
            return true
          }
          return "Please enter a valid GitHub repository URL."
        },
      },
      {
        name: "optionalExcludedNames",
        message:
          "Please provide a list of file names to exclude, separated by commas:",
        filter: function (value: string) {
          return value.split(",").map((v) => v.trim())
        },
      },
      {
        name: "optionalExcludedExtensions",
        message:
          "Please provide a list of file extensions to exclude, separated by commas:",
        filter: function (value: string) {
          return value.split(",").map((v: string) => v.trim())
        },
      },
      {
        name: "addLineNumbers",
        message: "Do you want to add line numbers to the PDF?",
        choices: ["Yes", "No"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
      },
      {
        name: "addLinting",
        message: "Do you want to add linting to the PDF?",
        choices: [/*"Yes",*/ "No"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
      },
      {
        name: "removeComments",
        message: "Do you want to remove comments from the PDF?",
        choices: [/*"Yes",*/ "No"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
      },
      {
        name: "removeEmptyLines",
        message: "Do you want to remove empty lines from the PDF?",
        choices: [/*"Yes",*/ "No"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
      },
      {
        name: "onePdfPerFile",
        message: "Do you want to make one PDF per file?",
        choices: [/*"Yes",*/ "No"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
      },
      {
        name: "outputFileName",
        message: "Please provide an output file name:",
        default: "output.pdf",
        when(answers: { onePdfPerFile: any }) {
          return !answers.onePdfPerFile
        },
      },
      {
        name: "outputFolderName",
        message: "Please provide an output folder name:",
        default: "./output",
        when(answers: { onePdfPerFile: any }) {
          return answers.onePdfPerFile
        },
      },
      {
        type: "list",
        name: "keepRepo",
        message: "Do you want to keep the cloned repository?",
        choices: ["No", "Yes"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
      },
    ]

  console.log(
    chalk.cyanBright(`

██████╗ ███████╗██████╗  ██████╗         ██████╗         ██████╗ ██████╗ ███████╗
██╔══██╗██╔════╝██╔══██╗██╔═══██╗        ╚════██╗        ██╔══██╗██╔══██╗██╔════╝
██████╔╝█████╗  ██████╔╝██║   ██║         █████╔╝        ██████╔╝██║  ██║█████╗
██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║        ██╔═══╝         ██╔═══╝ ██║  ██║██╔══╝
██║  ██║███████╗██║     ╚██████╔╝        ███████╗        ██║     ██████╔╝██║
╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝         ╚══════╝        ╚═╝     ╚═════╝ ╚═╝

Welcome to Repo-to-PDF! Let's get started...
`)
  )

  const answers = await inquirer.prompt(questions)
  console.log(chalk.cyanBright("\nProcessing your request...\n"))
  main(
    answers.repoUrl,
    answers.optionalExcludedNames,
    answers.optionalExcludedExtensions,
    answers.addLineNumbers,
    answers.addLinting,
    answers.removeComments,
    answers.removeEmptyLines,
    answers.onePdfPerFile,
    answers.outputFileName,
    answers.outputFolderName,
    answers.keepRepo
  )
}

async function main(
  repoUrl: string,
  optionalExcludedNames: string[],
  optionalExcludedExtensions: string[],
  addLineNumbers: any,
  addLinting: any,
  removeComments: any,
  removeEmptyLines: any,
  onePdfPerFile: any,
  outputFileName: fs.PathLike,
  outputFolderName: any,
  keepRepo: any
) {
  const gitP = git()
  const tempDir = "./tempRepo"
  const doc = new PDFDocument()
  doc.pipe(fs.createWriteStream(outputFileName))

  let fileCount = 0
  const spinner = ora(chalk.blueBright("Cloning repository...")).start()

  gitP
    .clone(repoUrl, tempDir)
    .then(() => {
      spinner.succeed(chalk.greenBright("Repository cloned successfully"))
      spinner.start(chalk.blueBright("Processing files..."))
      appendFilesToPdf(
        tempDir,
        optionalExcludedNames,
        optionalExcludedExtensions
      ).then(() => {
        doc.end()
        spinner.succeed(
          chalk.greenBright(`PDF created with ${fileCount} files processed.`)
        )
        if (!keepRepo) {
          fs.rmSync(tempDir, { recursive: true, force: true })
          spinner.succeed(
            chalk.greenBright("Temporary repository has been deleted.")
          )
        }
      })
    })
    .catch((err) => {
      spinner.fail(chalk.redBright("An error occurred"))
      console.error(err)
    })

  async function appendFilesToPdf(
    directory: string,
    optionalExcludedNames: string[],
    optionalExcludedExtensions: string[]
  ) {
    console.log(chalk.blueBright(`Processing ${directory}...`));
    const files = await fsPromises.readdir(directory)
    console.log(chalk.blueBright(`Found ${files.length} files in ${directory}`));
    
    for (let file of files) {
      const filePath = path.join(directory, file)
      console.log(chalk.blueBright(`Processing ${filePath}...`));
      const stat = await fsPromises.stat(filePath)

      const excludedNames = [
        ".gitignore",
        ".gitmodules",
        "package-lock.json",
        "yarn.lock",
        ".git",
      ]
      excludedNames.push(...optionalExcludedNames.filter(Boolean))

      const excludedExtensions = [
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
      ]
      excludedExtensions.push(...optionalExcludedExtensions.filter(Boolean))

      // Check if file or directory should be excluded
      if (
        excludedNames.includes(path.basename(filePath)) ||
        excludedExtensions.includes(path.extname(filePath))
      ) {
        continue
      }

      if (stat.isFile()) {
        fileCount++
        spinner.text = chalk.blueBright(
          `Processing files... (${fileCount} processed)`
        )
        let fileName = path.relative(tempDir, filePath)
        if (isBinaryFileSync(filePath)) {
          const data = fs.readFileSync(filePath).toString("base64")
          doc
            .addPage()
            .font("Courier")
            .fontSize(10)
            .text(`${fileName}\n\nBASE64:\n\n${data}`, { lineGap: 4 })
        } else {
          let data = await fsPromises.readFile(filePath, "utf8")
          data = data.replace(/Ð/g, "\n")
          data = data.replace(/\r\n/g, "\n")
          data = data.replace(/\r/g, "\n")

          doc
            .addPage()
            .font("Courier")
            .fontSize(10)
            .text(`${fileName}\n\n`, { lineGap: 4 })

          const extension = path.extname(filePath).replace(".", "")
          const highlightedCode = hljs.highlight(data, { language: extension }).value
          const hlData = htmlToJson(highlightedCode);
          let lineNum = 1;
          const lineNumWidth = (hlData.filter((d) => d.text === "\n")).length.toString().length;
          for (let i = 0; i < hlData.length; i++) {
            const { text, color } = hlData[i];
            if (i == 0 || hlData[i - 1]?.text === "\n")
              doc.text(String(lineNum++).padStart(lineNumWidth, " ") + " ", { continued: true, textIndent: 0 });

            if (color) doc.fillColor(color);
            else doc.fillColor("black");

            if (text !== "\n") doc.text(text, { continued: true });
            else doc.text(text);

          }
        }
      } else if (stat.isDirectory()) {
        console.log(chalk.blueBright(`Processing new directory: ${filePath}...`));
        await appendFilesToPdf(
          filePath,
          optionalExcludedNames,
          optionalExcludedExtensions
        )
      }
    }
  }

  doc.on("finish", () => {
    spinner.succeed(
      chalk.greenBright(`PDF created with ${fileCount} files processed.`)
    )
  })
}
