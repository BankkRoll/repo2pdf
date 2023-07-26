import fs from 'fs';

//@ts-ignore
import type chalkType from 'chalk';
//@ts-ignore
import type inquirerType from 'inquirer';

let chalk: typeof chalkType;
let inquirer: typeof inquirerType;

type QuestionType = {
  type?: string;
  name: [
    'localRepo',
    'localRepoPath',
    'repoUrl',
    'addLineNumbers',
    'addHighlighting',
    'addPageNumbers',
    'removeComments',
    'removeEmptyLines',
    'onePdfPerFile',
    'outputFileName',
    'outputFolderName',
    'keepRepo'
  ][number];
  message: string;
  validate?: (value: string) => boolean | string;
  filter?: (value: string) => boolean | string | string[];
  choices?: string[];
  default?: string | string[];
  when?: (answers: any) => boolean;
};

export async function configQuestions(
    main: Function,
    chalk: typeof chalkType,
    inquirer: typeof inquirerType
  ) {
    const questions: QuestionType[] = [
      {
        type: "list",
        name: "localRepo",
        message: "Do you want to use a local repository?",
        choices: ["No", "Yes"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
      },
      {
        name: "localRepoPath",
        message: "Please provide the full path to the local repository:",
        when(answers: { localRepo: any }) {
          return answers.localRepo
        },
        validate: function (value: string) {
          if (fs.existsSync(value)) {
            return true
          } else {
            return "Please enter a valid directory path."
          }
        },
      },
      {
        name: "repoUrl",
        message: "Please provide a GitHub repository URL:",
        when(answers: { localRepo: any }) {
          return !answers.localRepo
        },
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
        type: "list",
        name: "addLineNumbers",
        message: "Do you want to add line numbers to the PDF?",
        choices: ["Yes", "No"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
      },
      {
        type: "list",
        name: "addHighlighting",
        message: "Do you want to add highlighting to the PDF?",
        choices: ["Yes", "No"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
      },
      {
        type: "list",
        name: "removeComments",
        message:
          "Do you want to remove comments from the PDF? (Does not remove comments behind code on the same line)",
        choices: ["Yes", "No"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
      },
      {
        type: "list",
        name: "removeEmptyLines",
        message: "Do you want to remove empty lines from the PDF?",
        choices: ["Yes", "No"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
      },
      {
        type: "list",
        name: "onePdfPerFile",
        message: "Do you want to make one PDF per file?",
        choices: ["No", "Yes"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
      },
      {
        type: "list",
        name: "addPageNumbers",
        message: "Do you want to add page numbers to the PDF?",
        choices: ["Yes", "No"],
        filter: function (val: string) {
          return val.toLowerCase() === "yes"
        },
        when(answers: { onePdfPerFile: any }) {
          return !answers.onePdfPerFile
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
        when(answers: { localRepo: any }) {
          return !answers.localRepo
        },
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
      answers.localRepo ? answers.localRepoPath : answers.repoUrl,
      answers.localRepo,
      answers.addLineNumbers,
      answers.addHighlighting,
      answers.addPageNumbers,
      answers.removeComments,
      answers.removeEmptyLines,
      answers.onePdfPerFile,
      answers.outputFileName,
      answers.outputFolderName,
      answers.keepRepo
    )
  }
