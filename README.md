# repo2pdf

![npm](https://img.shields.io/npm/v/repo2pdf)
![npm](https://img.shields.io/npm/dt/repo2pdf)
![NPM](https://img.shields.io/npm/l/repo2pdf)
![GitHub Stars](https://img.shields.io/github/stars/BankkRoll/repo2pdf)
![GitHub Forks](https://img.shields.io/github/forks/BankkRoll/repo2pdf)
![GitHub issues](https://img.shields.io/github/issues/BankkRoll/repo2pdf)
![GitHub pull requests](https://img.shields.io/github/issues-pr/BankkRoll/repo2pdf)
![GitHub top language](https://img.shields.io/github/languages/top/BankkRoll/repo2pdf)
![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)

#### NPM: https://www.npmjs.com/package/repo2pdf

#### Website: https://repo2pdf.vercel.app/

repo2pdf is an innovative and versatile tool designed to seamlessly transform GitHub repositories into well-formatted, visually engaging, and easy-to-navigate PDF files. By automating the process of cloning repositories and parsing code files, repo2pdf serves a variety of use-cases including teaching, code reviews, offline referencing, archiving, AI training, and document embedding. The tool's flexibility expands the horizons of interacting with codebases by bridging the gap between the dynamic world of coding and the static, universally accessible format of PDFs, catering to a multitude of user needs and creative applications.

- [repo2pdf](#repo2pdf)
  - [Installation and Usage](#installation-and-usage)
    - [Installing and Using repo2pdf with NPX](#installing-and-using-repo2pdf-with-npx)
    - [Installing and Using repo2pdf by Cloning the Repository](#installing-and-using-repo2pdf-by-cloning-the-repository)
  - [Configuration](#configuration)
    - [Example of file structure](#example-of-file-structure)
  - [Troubleshooting / FAQ](#troubleshooting--faq)
  - [Contributing to repo2pdf](#contributing-to-repo2pdf)
    - [Reporting Bugs](#reporting-bugs)
    - [Suggesting Enhancements](#suggesting-enhancements)
    - [Writing Code](#writing-code)
    - [Meet Our Contributors](#meet-our-contributors)
  - [Project Structure](#project-structure)
  - [License](#license)
  - [Star History](#star-history)

---

## Installation and Usage

repo2pdf can be installed by either [directly using NPX](#installing-and-using-repo2pdf-with-npx) or [cloning the repository from GitHub](#installing-and-using-repo2pdf-by-cloning-the-repository). The steps and prompts vary based on the chosen method.

> NEW! Use the webapp [here](https://repo2pdf.vercel.app/)

---

### Installing and Using repo2pdf with NPX

This method downloads and installs the latest version of repo2pdf from the NPM registry.

1. Install repo2pdf using NPX:

```shell
npx repo2pdf
```

2. The script will start running. Follow the prompt and provide the necessary information.
   - GitHub repository URL
   - Output file name
   - Decision on whether to keep the cloned repository (Y/N)

---

### Installing and Using repo2pdf by Cloning the Repository

This method involves manually cloning the repo2pdf repository and setting it up on your local machine.

1. Clone the repository:

```shell
git clone https://github.com/BankkRoll/repo2pdf
```

2. Navigate to the repo2pdf directory:

```shell
cd repo2pdf
```

3. Install the dependencies:

```shell
npm install
```

4. Build the script:

```shell
npm run build
```

5. Run the script:

```shell
npm start
```

6. The script will start running. Follow the prompt and provide the necessary information:
   - Decision on whether to clone a repository or use a local repository
     - If using a local repository, provide the path
     - If cloning a repository, provide the URL
   - Features checklist for
     - add line numbers in the PDF
     - add page numbers in the PDF
     - add highlighting in the PDF
     - remove comments from the code
     - remove empty lines from the code
     - one file or one PDF per file
   - Name of the output PDF file or output directory
   - Decision on whether to keep the cloned repository after generating the PDF

Please note that you need to have Node > 18 and git(for non-local repos) installed on your system in order to run repo2pdf.

---

## Configuration

repo2pdf automatically ignores certain file types and directories (e.g., `.png`, `.git`).
To customize the files and directories to ignore, you can add a `repo2pdf.ignore` file to the root of your repository.

Please note that if you use a local repository, the `repo2pdf.ignore` file must be in the root of the repository directory. And you might need to add more directories to the ignore list, as the script does not automatically ignores different build files and directories.

### Example of file structure

```json
{
  "ignoredFiles": ["tsconfig.json", "dist", "node_modules"],
  "ignoredExtensions": [".raw"]
}
```

---

## Troubleshooting / FAQ

<details>
  <summary>Q: I'm getting an error "Failed to install [package-name]". What should I do?</summary>
  A: Make sure you have Node.js and npm installed on your system. Try running the following command to install the required package manually:

```shell
npm install [package-name]
```

</details>

<details>
  <summary>Q: How can I customize the styling of the generated PDF?</summary>
  A: You can modify the code in `clone.ts` or `syntax.ts` to change the font, font size, colors, and other styling options for the PDF document.

```typescript
// Example: Changing font size in syntax.ts
doc.fontSize(12);
```

</details>

<details>
  <summary>Q: What types of files are supported for conversion to PDF?</summary>
  A: Currently, repo2pdf supports all text-based files for conversion to PDF. Binary files like images or compiled binaries are ignored.
</details>

<details>
  <summary>Q: How can I modify the ignored files list?</summary>
  A: You can add a `repo2pdf.ignore` file to the root of your repository to customize the list of ignored files. Here's an example of how to structure this file:

```json
{
  "ignoredFiles": ["tsconfig.json"],
  "ignoredExtensions": [".md"]
}
```

</details>

<details>
  <summary>Q: How can I include line numbers in the generated PDF?</summary>
  A: During the execution of the script, you'll be prompted with the question "Include line numbers?". Answering 'Y' will include line numbers in the generated PDF.
</details>

<details>
  <summary>Q: How can I keep the cloned repository after generating the PDF?</summary>
  A: You'll be asked "Keep cloned repository?" during the script execution. Answer 'Y' to keep the cloned repository on your system after the PDF is generated.
</details>

<details>
  <summary>Q: How can I generate a PDF for a local repository?</summary>
  A: When running the script, you'll be asked to either clone a repository or use a local one. Choose the latter and provide the local repository path.
</details>

---

## Contributing to repo2pdf

**Your insights, skills, and valuable time can make a huge difference in the evolution of repo2pdf!** We're always excited to see the community helping in shaping this tool to be even more efficient and feature-rich.

### Reporting Bugs

Encountered a hiccup? We're here to help! Please:

1. Open an issue on GitHub detailing the bug.
2. Describe the problem in depth. Share the steps to reproduce the issue and any error messages you received.
3. If possible, provide information about your operating system and Node.js version.

### Suggesting Enhancements

Have a brilliant idea for a new feature or an improvement to an existing one? We're all ears! Please:

1. Open an issue on GitHub to share your suggestions.
2. Be as detailed as possible, explaining what you want to achieve and why it would be beneficial to the project.

### Writing Code

If you're up for rolling up your sleeves to contribute code to fix a bug or implement a new feature, here's how you can get started:

1. Fork the repository.
2. Create a new branch for your changes.
3. Make your changes in your branch.
4. Submit a pull request from your branch to the main repo2pdf repository.

In your pull request, please provide a clear description of the changes you've made. We appreciate contributions that adhere to our coding conventions and are consistent with the existing codebase - it helps us maintain the quality of the project and makes the review process more efficient.

Here are some feature ideas and improvements that could be implemented in repo2pdf to enhance its functionality and user experience:

- **Table of Contents Generation:** Auto-generate sections based on directories and subsections based on files.
- **Customizable Themes:** Enable customizations for fonts, colors, and layout of the generated PDF.
- **Interactive Progress Bar:** Show a real-time progress bar in the terminal during the conversion process.
- **Support for Private Repositories:** Implement OAuth2 GitHub authentication for private repositories.
- **Enhanced Error Handling:** Provide clear error messages when a repository cannot be cloned.
- **Conversion Options Presets:** Define presets like 'minimalist': no line numbers, no highlighting, 'full-featured': line numbers, syntax highlighting.
- **Support for Additional VCS:** Extend support for other version control systems like GitLab, Bitbucket, and others.
- **Support for Non-Git Repositories:** Add support for other version control systems such as Mercurial or SVN.
- **Client-Side Web Application:** Develop a user-friendly web application for converting repositories and customizing settings.
- **Text Compression:** Use font subsetting and compression techniques to reduce the size of the generated PDF.

Feel free to contribute to the project by implementing any of these ideas or suggesting new ones!

---

### Meet Our Contributors

We're ever grateful for the valuable contributions from our community. Meet the people who're helping shape repo2pdf:

[![Contributors](https://contrib.rocks/image?repo=BankkRoll/repo2pdf)](https://github.com/BankkRoll/repo2pdf/graphs/contributors)

---

## License

repo2pdf is open source software, licensed under the MIT License. See the `LICENSE` file for more information.

## Star History

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=BankkRoll/repo2pdf&type=Date&theme=dark">
  <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=BankkRoll/repo2pdf&type=Date">
</picture>
