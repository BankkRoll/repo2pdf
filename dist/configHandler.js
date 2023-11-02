"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configQuestions = void 0;
const fs_1 = __importDefault(require("fs"));
let chalk;
let inquirer;
function configQuestions(main, chalk, inquirer) {
    return __awaiter(this, void 0, void 0, function* () {
        const questions = [
            {
                type: "list",
                name: "localRepo",
                message: "Do you want to use a local repository?",
                choices: ["No", "Yes"],
                filter: function (val) {
                    return val.toLowerCase() === "yes";
                },
            },
            {
                name: "localRepoPath",
                message: "Please provide the full path to the local repository:",
                when(answers) {
                    return answers.localRepo;
                },
                validate: function (value) {
                    if (fs_1.default.existsSync(value)) {
                        return true;
                    }
                    else {
                        return "Please enter a valid directory path.";
                    }
                },
            },
            {
                name: "repoUrl",
                message: "Please provide a GitHub repository URL:",
                when(answers) {
                    return !answers.localRepo;
                },
                validate: function (value) {
                    var pass = value.match(/^https:\/\/github.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
                    if (pass) {
                        return true;
                    }
                    return "Please enter a valid GitHub repository URL.";
                },
            },
            {
                type: "list",
                name: "addLineNumbers",
                message: "Do you want to add line numbers to the PDF?",
                choices: ["Yes", "No"],
                filter: function (val) {
                    return val.toLowerCase() === "yes";
                },
            },
            {
                type: "list",
                name: "addHighlighting",
                message: "Do you want to add highlighting to the PDF?",
                choices: ["Yes", "No"],
                filter: function (val) {
                    return val.toLowerCase() === "yes";
                },
            },
            {
                type: "list",
                name: "removeComments",
                message: "Do you want to remove comments from the PDF? (Does not remove comments behind code on the same line)",
                choices: ["Yes", "No"],
                filter: function (val) {
                    return val.toLowerCase() === "yes";
                },
            },
            {
                type: "list",
                name: "removeEmptyLines",
                message: "Do you want to remove empty lines from the PDF?",
                choices: ["Yes", "No"],
                filter: function (val) {
                    return val.toLowerCase() === "yes";
                },
            },
            {
                type: "list",
                name: "onePdfPerFile",
                message: "Do you want to make one PDF per file?",
                choices: ["No", "Yes"],
                filter: function (val) {
                    return val.toLowerCase() === "yes";
                },
            },
            {
                type: "list",
                name: "addPageNumbers",
                message: "Do you want to add page numbers to the PDF?",
                choices: ["Yes", "No"],
                filter: function (val) {
                    return val.toLowerCase() === "yes";
                },
                when(answers) {
                    return !answers.onePdfPerFile;
                },
            },
            {
                name: "outputFileName",
                message: "Please provide an output file name:",
                default: "output.pdf",
                when(answers) {
                    return !answers.onePdfPerFile;
                },
            },
            {
                name: "outputFolderName",
                message: "Please provide an output folder name:",
                default: "./output",
                when(answers) {
                    return answers.onePdfPerFile;
                },
            },
            {
                type: "list",
                name: "keepRepo",
                message: "Do you want to keep the cloned repository?",
                choices: ["No", "Yes"],
                when(answers) {
                    return !answers.localRepo;
                },
                filter: function (val) {
                    return val.toLowerCase() === "yes";
                },
            },
        ];
        console.log(chalk.cyanBright(`

  ██████╗ ███████╗██████╗  ██████╗         ██████╗         ██████╗ ██████╗ ███████╗
  ██╔══██╗██╔════╝██╔══██╗██╔═══██╗        ╚════██╗        ██╔══██╗██╔══██╗██╔════╝
  ██████╔╝█████╗  ██████╔╝██║   ██║         █████╔╝        ██████╔╝██║  ██║█████╗
  ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║        ██╔═══╝         ██╔═══╝ ██║  ██║██╔══╝
  ██║  ██║███████╗██║     ╚██████╔╝        ███████╗        ██║     ██████╔╝██║
  ╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝         ╚══════╝        ╚═╝     ╚═════╝ ╚═╝

  Welcome to Repo-to-PDF! Let's get started...
  `));
        const answers = yield inquirer.prompt(questions);
        console.log(chalk.cyanBright("\nProcessing your request...\n"));
        main(answers.localRepo ? answers.localRepoPath : answers.repoUrl, answers.localRepo, answers.addLineNumbers, answers.addHighlighting, answers.addPageNumbers, answers.removeComments, answers.removeEmptyLines, answers.onePdfPerFile, answers.outputFileName, answers.outputFolderName, answers.keepRepo);
    });
}
exports.configQuestions = configQuestions;
//# sourceMappingURL=configHandler.js.map