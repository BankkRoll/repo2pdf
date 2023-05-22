const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const git = require('simple-git');
const PDFDocument = require('pdfkit');
const { exit } = require('process');

const gitP = git();
const repoUrl = process.argv[2];
if (!repoUrl) {
    console.error("Please provide a repository URL as an argument.");
    exit(1);
}

const tempDir = './tempRepo';
const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('output.pdf'));

gitP.clone(repoUrl, tempDir).then(() => {
    console.log('Repository cloned');
    appendFilesToPdf(tempDir).then(() => {
        doc.end();
        console.log('PDF completed');
        fs.rmdirSync(tempDir, { recursive: true });
        console.log(`${tempDir} is deleted!`);
    });
}).catch(err => console.error(err));

async function appendFilesToPdf(directory) {
    const files = await fsPromises.readdir(directory);
    for (let file of files) {
        const filePath = path.join(directory, file);
        const stat = await fsPromises.stat(filePath);
        
        const excludedNames = ['.gitignore', 'package-lock.json', 'package.json', '.git'];
        const excludedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.bmp', '.webp', '.ico', '.mp4', '.mov', '.avi', '.wmv'];

        // Check if file or directory should be excluded
        if (excludedNames.includes(path.basename(filePath)) || excludedExtensions.includes(path.extname(filePath))) {
            continue;
        }

        if (stat.isFile()) {
            const data = await fsPromises.readFile(filePath, 'utf8');
            doc.addPage().font('Courier').fontSize(10).text(`${filePath}\n\n${data}`, { lineGap: 5 });
        } else if (stat.isDirectory()) {
            await appendFilesToPdf(filePath);
        }
    }
}


doc.on('finish', () => {
  console.log('PDF completed');
});
