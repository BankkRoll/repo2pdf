#!/usr/bin/env node
const fs = require("fs")
const fsPromises = fs.promises
const path = require("path")
const { execSync } = require("child_process")

const git = require("simple-git")
const PDFDocument = require("pdfkit")
const { default: hljs } = require("highlight.js")
const { htmlToJson } = require("./syntax")
const isBinaryFile = require("isbinaryfile").isBinaryFileSync

// TODO IDEAS
// TODO add option to condiotionaly remove comments from code
// TODO add option to condiotionaly remove empty lines from code
// TODO add option to condiotionaly add line numbers to code
// TODO add option to condiotionaly add linting to code
// TODO add option to make one pdf per file

let chalk
let inquirer
let ora

const spinnerPromise = import("ora").then((oraModule) => {
  ora = oraModule.default
  return ora("Setting everything up...").start()
})

Promise.all([import("chalk"), import("inquirer"), spinnerPromise])
  .then(([chalkModule, inquirerModule, spinner]) => {
    chalk = chalkModule.default
    inquirer = inquirerModule.default
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
  const questions = [
    {
      name: "repoUrl",
      message: "Please provide a GitHub repository URL:",
      validate: function (value) {
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
      filter: function (value) {
        return value.split(",").map((v) => v.trim())
      },
    },
    {
      name: "optionalExcludedExtensions",
      message:
        "Please provide a list of file extensions to exclude, separated by commas:",
      filter: function (value) {
        return value.split(",").map((v) => v.trim())
      },
    },
    {
      name: "addLineNumbers",
      message: "Do you want to add line numbers to the PDF?",
      choices: ["Yes", "No"],
      filter: function (val) {
        return val.toLowerCase() === "yes"
      },
    },
    {
      name: "addLinting",
      message: "Do you want to add linting to the PDF?",
      choices: [/*"Yes",*/ "No"],
      filter: function (val) {
        return val.toLowerCase() === "yes"
      },
    },
    {
      name: "removeComments",
      message: "Do you want to remove comments from the PDF?",
      choices: [/*"Yes",*/ "No"],
      filter: function (val) {
        return val.toLowerCase() === "yes"
      },
    },
    {
      name: "removeEmptyLines",
      message: "Do you want to remove empty lines from the PDF?",
      choices: [/*"Yes",*/ "No"],
      filter: function (val) {
        return val.toLowerCase() === "yes"
      },
    },
    {
      name: "onePdfPerFile",
      message: "Do you want to make one PDF per file?",
      choices: [/*"Yes",*/ "No"],
      filter: function (val) {
        return val.toLowerCase() === "yes"
      },
    },
    {
      name: "outputFileName",
      message: "Please provide an output file name:",
      default: "output.pdf",
      when(answers) {
        return !answers.onePdfPerFile
      },
    },
    {
      name: "outputFolderName",
      message: "Please provide an output folder name:",
      default: "./output",
      when(answers) {
        return answers.onePdfPerFile
      },
    },
    {
      type: "list",
      name: "keepRepo",
      message: "Do you want to keep the cloned repository?",
      choices: ["Yes", "No"],
      filter: function (val) {
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
  repoUrl,
  optionalExcludedNames,
  optionalExcludedExtensions,
  addLineNumbers,
  addLinting,
  removeComments,
  removeEmptyLines,
  onePdfPerFile,
  outputFileName,
  outputFolderName,
  keepRepo
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
    directory,
    optionalExcludedNames,
    optionalExcludedExtensions
  ) {
    const files = await fsPromises.readdir(directory)
    for (let file of files) {
      const filePath = path.join(directory, file)
      const stat = await fsPromises.stat(filePath)

      const excludedNames = [
        ".gitignore",
        ".gitmodules",
        "package-lock.json",
        "yarn.lock",
        ".git",
      ]
      excludedNames.push(...optionalExcludedNames)

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
      ]
      excludedExtensions.push(...optionalExcludedExtensions)

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
        if (isBinaryFile(filePath)) {
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

          const highlightedCode = hljs.highlight(data, { language: "ps1" }).value
          const hlData = htmlToJson(highlightedCode);
          let lineNum = 1;
          for (let i = 0; i < hlData.length; i++) {
            const { text, color } = hlData[i];
            if (i == 0 || hlData[i - 1]?.text === "\n")
              doc.text(String(lineNum++).padStart(3, " "), { continued: true });
            
            if (text !== "\n") doc.text(text, { continued: true });
            else doc.text(text);

            if (color) doc.fillColor(color);
            else doc.fillColor("black");
          }
        }
      } else if (stat.isDirectory()) {
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
