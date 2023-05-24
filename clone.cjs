#!/usr/bin/env node
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const { execSync } = require('child_process');


const git = require('simple-git');
const PDFDocument = require('pdfkit');
const isBinaryFile = require('isbinaryfile').isBinaryFileSync;

let chalk;
let inquirer;
let ora;

const spinnerPromise = import('ora').then((oraModule) => {
    ora = oraModule.default;
    return ora('Setting everything up...').start(); 
});

Promise.all([import('chalk'), import('inquirer'), spinnerPromise]).then(([chalkModule, inquirerModule, spinner]) => {
    chalk = chalkModule.default;
    inquirer = inquirerModule.default;
    spinner.succeed('Setup complete');
    askForRepoUrl();
}).catch((err) => {
    spinnerPromise.then((spinner) => {
        spinner.fail('An error occurred during setup');
    });
    console.error(err);
});


async function askForRepoUrl() {
    const questions = [
        {
            name: 'repoUrl',
            message: 'Please provide a GitHub repository URL:',
            validate: function(value) {
                var pass = value.match(
                    /^https:\/\/github.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
                );
                if (pass) {
                    return true;
                }
                return 'Please enter a valid GitHub repository URL.';
            }
        },
        {
            name: 'outputFileName',
            message: 'Please provide an output file name:',
            default: 'output.pdf'
        },
        {
            type: 'list',
            name: 'keepRepo',
            message: 'Do you want to keep the cloned repository?',
            choices: ['Yes', 'No'],
            filter: function(val) {
                return val.toLowerCase() === 'yes';
            }
        }
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

    const answers = await inquirer.prompt(questions);
    console.log(chalk.cyanBright('\nProcessing your request...\n'));
    main(answers.repoUrl, answers.outputFileName, answers.keepRepo);
}

async function main(repoUrl, outputFileName, keepRepo) {
    const gitP = git();
    const tempDir = './tempRepo';
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(outputFileName));

    let fileCount = 0;
    const spinner = ora(chalk.blueBright('Cloning repository...')).start();

    gitP.clone(repoUrl, tempDir).then(() => {
        spinner.succeed(chalk.greenBright('Repository cloned successfully'));
        spinner.start(chalk.blueBright('Processing files...'));
        appendFilesToPdf(tempDir).then(() => {
            doc.end();
            spinner.succeed(chalk.greenBright(`PDF created with ${fileCount} files processed.`));
            if (!keepRepo) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                spinner.succeed(chalk.greenBright('Temporary repository has been deleted.'));
            }
        });
    }).catch(err => {
        spinner.fail(chalk.redBright('An error occurred'));
        console.error(err);
    });

    async function appendFilesToPdf(directory) {
        const files = await fsPromises.readdir(directory);
        for (let file of files) {
            const filePath = path.join(directory, file);
            const stat = await fsPromises.stat(filePath);

            const excludedNames = ['.gitignore', 'package-lock.json', 'yarn.lock', '.git'];
            const excludedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.bmp', '.webp', '.ico', '.mp4', '.mov', '.avi', '.wmv'];

            // Check if file or directory should be excluded
            if (excludedNames.includes(path.basename(filePath)) || excludedExtensions.includes(path.extname(filePath))) {
                continue;
            }

            if (stat.isFile()) {
                fileCount++;
                spinner.text = chalk.blueBright(`Processing files... (${fileCount} processed)`);
                let fileName = filePath.replace(tempDir+'/', '');
                if (isBinaryFile(filePath)) {
                    const data = fs.readFileSync(filePath).toString('base64');
                    doc.addPage().font('Courier').fontSize(10).text(`${fileName}\n\nBASE64:\n\n${data}`, { lineGap: 5 });
                } else {
                    let data = await fsPromises.readFile(filePath, 'utf8');
                    data = data.replace(/Ð/g, '\n');
                    data = data.replace(/\r\n/g, '\n');
                    data = data.replace(/\r/g, '\n');
                    doc.addPage().font('Courier').fontSize(10).text(`${fileName}\n\n${data}`, { lineGap: 5 });
                }
            } else if (stat.isDirectory()) {
                await appendFilesToPdf(filePath);
            }
        }
    }

    doc.on('finish', () => {
        spinner.succeed(chalk.greenBright(`PDF created with ${fileCount} files processed.`));
    });
}
