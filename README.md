# Repo-to-PDF

Repo-to-PDF is a tool that allows you to convert a GitHub repository into a PDF file. It clones the repository, processes the files, and then creates a PDF.

## Example PDF

[FreeCodeCamp](https://github.com/freeCodeCamp/freeCodeCamp) repository was converted into a PDF from 42,998 files to 186,453 pages in under 2 minutes. This conversion is purely for example and stress testing purposes. All content belongs to the original authors at FreeCodeCamp. You can view the PDF [here](https://freecodecamppdf.bankkroll.repl.co).
![Screenshot 2023-05-24 212226](https://github.com/BankkRoll/Repo-to-PDF/assets/106103625/9ceb176f-37f6-40d9-ab95-080942d2d7c0)


## Installation

To use Repo-to-PDF, you have two options: cloning the repository from GitHub or installing it directly using NPX. Choose the method that suits you best.

### Cloning the Repository

1. Clone the repository:
```shell
git clone https://github.com/BankkRoll/Repo-to-PDF
```

2. Navigate to the Repo-to-PDF directory:
```shell
cd Repo-to-PDF
```

3. Install the dependencies:
```shell
npm install
```

4. Build the script
```shell
npm run build
```

5. Run the script:
```shell
npm start
```

### Installing with NPX
This will download and install the latest version of Repo-to-PDF from the NPM registry.

1. Install Repo-to-PDF using NPX:
```shell
npx repo2pdf
```

2. Run Repo-to-PDF:
```shell
repo2pdf
```

## Usage

Once you have installed Repo-to-PDF, you can use it to generate PDF files from GitHub repositories.

1. The script will install and start running. You will just follow the prompt:

You will be prompted to provide the following information:
- The URL of the GitHub repository
- Whether or not you want line numbers in the pdf
- Whether or not you want highlighting in the pdf
- Whether or not you want to remove comments from the code
- Whether or not you want to remove empty lines from the code
- Whether or not you want one big file or one PDF pr. file in your repo
  - When picking one big file you get 2 extra options:
    - Whether or not you want to add page numbers
    - Whether or not you want to add a table of contents
- The name of the output PDF file or output directory
- Whether or not you wish to keep the cloned repository after generating the PDF

The script will then clone the repository, process the files, and generate a PDF document based on the provided information.

Please note that you need to have Node.js installed on your system in order to run Repo-to-PDF.



## Configuration

Repo-to-PDF automatically ignores certain file types and directories (e.g., `.png`, `.git`). 
To customize the files and directories to ignore, you can add a `repo2pdf.ignore` file to the root of your repository.

### Example of file structure

```json
{
    "ignoredFiles": ["tsconfig.json"],
    "ignoredExtensions": [".md"]
}
```


## Troubleshooting / FAQ

**Q: I'm getting an error "Failed to install [package-name]". What should I do?**
A: Make sure you have Node.js and npm installed on your system. Try running the following command to install the required package manually:
```shell
npm install [package-name]
```

**Q: How can I customize the styling of the generated PDF?**
A: You can modify the code in `clone.ts` or `syntax.ts` to change the font, font size, colors, and other styling options for the PDF document.


## Contributing

We welcome contributions! Here's how you can help:

- **Report bugs:** If you find a bug, please create an issue on GitHub describing the problem.
- **Suggest enhancements:** If you think of a way to improve Repo-to-PDF, we'd love to hear about it! Create an issue on GitHub to share your ideas.
- **Write code:** If you'd like to contribute code to fix a bug or implement a new feature, please fork the repository, make your changes, and submit a pull request.

## License

Repo-to-PDF is open source software, licensed under the MIT License. See the `LICENSE` file for more information.
