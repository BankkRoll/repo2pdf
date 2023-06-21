#!/usr/bin/env node
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
const fs_1 = __importDefault(require("fs"));
const fsPromises = fs_1.default.promises;
const path_1 = __importDefault(require("path"));
const simple_git_1 = __importDefault(require("simple-git"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const highlight_js_1 = __importDefault(require("highlight.js"));
const syntax_1 = require("./syntax");
const isbinaryfile_1 = require("isbinaryfile");
// TODO IDEAS
// TODO add option to condiotionaly remove comments from code
// TODO add option to condiotionaly remove empty lines from code
// TODO add option to condiotionaly add line numbers to code
// TODO add option to condiotionaly add linting to code
// TODO add option to make one pdf per file
let chalk;
let inquirer;
let ora;
const spinnerPromise = import("ora").then((oraModule) => {
    ora = oraModule.default;
    return ora("Setting everything up...").start();
});
Promise.all([
    import("chalk").then((chalkModule) => chalkModule.default),
    import("inquirer").then((inquirerModule) => inquirerModule.default),
    spinnerPromise
])
    .then(([chalkModule, inquirerModule, spinner]) => {
    chalk = chalkModule;
    inquirer = inquirerModule;
    spinner.succeed("Setup complete");
    askForRepoUrl();
})
    .catch((err) => {
    spinnerPromise.then((spinner) => {
        spinner.fail("An error occurred during setup");
    });
    console.error(err);
});
function askForRepoUrl() {
    return __awaiter(this, void 0, void 0, function* () {
        const questions = [
            {
                name: "repoUrl",
                message: "Please provide a GitHub repository URL:",
                validate: function (value) {
                    var pass = value.match(/^https:\/\/github.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
                    if (pass) {
                        return true;
                    }
                    return "Please enter a valid GitHub repository URL.";
                },
            },
            {
                name: "optionalExcludedNames",
                message: "Please provide a list of file names to exclude, separated by commas:",
                filter: function (value) {
                    return value.split(",").map((v) => v.trim());
                },
            },
            {
                name: "optionalExcludedExtensions",
                message: "Please provide a list of file extensions to exclude, separated by commas:",
                filter: function (value) {
                    return value.split(",").map((v) => v.trim());
                },
            },
            {
                name: "addLineNumbers",
                message: "Do you want to add line numbers to the PDF?",
                choices: ["Yes", "No"],
                filter: function (val) {
                    return val.toLowerCase() === "yes";
                },
            },
            {
                name: "addLinting",
                message: "Do you want to add linting to the PDF?",
                choices: [/*"Yes",*/ "No"],
                filter: function (val) {
                    return val.toLowerCase() === "yes";
                },
            },
            {
                name: "removeComments",
                message: "Do you want to remove comments from the PDF?",
                choices: [/*"Yes",*/ "No"],
                filter: function (val) {
                    return val.toLowerCase() === "yes";
                },
            },
            {
                name: "removeEmptyLines",
                message: "Do you want to remove empty lines from the PDF?",
                choices: [/*"Yes",*/ "No"],
                filter: function (val) {
                    return val.toLowerCase() === "yes";
                },
            },
            {
                name: "onePdfPerFile",
                message: "Do you want to make one PDF per file?",
                choices: [/*"Yes",*/ "No"],
                filter: function (val) {
                    return val.toLowerCase() === "yes";
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
                choices: ["Yes", "No"],
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
        main(answers.repoUrl, answers.optionalExcludedNames, answers.optionalExcludedExtensions, answers.addLineNumbers, answers.addLinting, answers.removeComments, answers.removeEmptyLines, answers.onePdfPerFile, answers.outputFileName, answers.outputFolderName, answers.keepRepo);
    });
}
function main(repoUrl, optionalExcludedNames, optionalExcludedExtensions, addLineNumbers, addLinting, removeComments, removeEmptyLines, onePdfPerFile, outputFileName, outputFolderName, keepRepo) {
    return __awaiter(this, void 0, void 0, function* () {
        const gitP = (0, simple_git_1.default)();
        const tempDir = "./tempRepo";
        const doc = new pdfkit_1.default();
        doc.pipe(fs_1.default.createWriteStream(outputFileName));
        let fileCount = 0;
        const spinner = ora(chalk.blueBright("Cloning repository...")).start();
        gitP
            .clone(repoUrl, tempDir)
            .then(() => {
            spinner.succeed(chalk.greenBright("Repository cloned successfully"));
            spinner.start(chalk.blueBright("Processing files..."));
            appendFilesToPdf(tempDir, optionalExcludedNames, optionalExcludedExtensions).then(() => {
                doc.end();
                spinner.succeed(chalk.greenBright(`PDF created with ${fileCount} files processed.`));
                if (!keepRepo) {
                    fs_1.default.rmSync(tempDir, { recursive: true, force: true });
                    spinner.succeed(chalk.greenBright("Temporary repository has been deleted."));
                }
            });
        })
            .catch((err) => {
            spinner.fail(chalk.redBright("An error occurred"));
            console.error(err);
        });
        function appendFilesToPdf(directory, optionalExcludedNames, optionalExcludedExtensions) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                const files = yield fsPromises.readdir(directory);
                for (let file of files) {
                    const filePath = path_1.default.join(directory, file);
                    const stat = yield fsPromises.stat(filePath);
                    const excludedNames = [
                        ".gitignore",
                        ".gitmodules",
                        "package-lock.json",
                        "yarn.lock",
                        ".git",
                    ];
                    excludedNames.push(...optionalExcludedNames);
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
                    ];
                    excludedExtensions.push(...optionalExcludedExtensions);
                    // Check if file or directory should be excluded
                    if (excludedNames.includes(path_1.default.basename(filePath)) ||
                        excludedExtensions.includes(path_1.default.extname(filePath))) {
                        continue;
                    }
                    if (stat.isFile()) {
                        fileCount++;
                        spinner.text = chalk.blueBright(`Processing files... (${fileCount} processed)`);
                        let fileName = path_1.default.relative(tempDir, filePath);
                        if ((0, isbinaryfile_1.isBinaryFileSync)(filePath)) {
                            const data = fs_1.default.readFileSync(filePath).toString("base64");
                            doc
                                .addPage()
                                .font("Courier")
                                .fontSize(10)
                                .text(`${fileName}\n\nBASE64:\n\n${data}`, { lineGap: 4 });
                        }
                        else {
                            let data = yield fsPromises.readFile(filePath, "utf8");
                            data = data.replace(/Ð/g, "\n");
                            data = data.replace(/\r\n/g, "\n");
                            data = data.replace(/\r/g, "\n");
                            doc
                                .addPage()
                                .font("Courier")
                                .fontSize(10)
                                .text(`${fileName}\n\n`, { lineGap: 4 });
                            const highlightedCode = highlight_js_1.default.highlight(data, { language: "ps1" }).value;
                            const hlData = (0, syntax_1.htmlToJson)(highlightedCode);
                            let lineNum = 1;
                            for (let i = 0; i < hlData.length; i++) {
                                const { text, color } = hlData[i];
                                if (i == 0 || ((_a = hlData[i - 1]) === null || _a === void 0 ? void 0 : _a.text) === "\n")
                                    doc.text(String(lineNum++).padStart(3, " "), { continued: true });
                                if (text !== "\n")
                                    doc.text(text, { continued: true });
                                else
                                    doc.text(text);
                                if (color)
                                    doc.fillColor(color);
                                else
                                    doc.fillColor("black");
                            }
                        }
                    }
                    else if (stat.isDirectory()) {
                        yield appendFilesToPdf(filePath, optionalExcludedNames, optionalExcludedExtensions);
                    }
                }
            });
        }
        doc.on("finish", () => {
            spinner.succeed(chalk.greenBright(`PDF created with ${fileCount} files processed.`));
        });
    });
}
