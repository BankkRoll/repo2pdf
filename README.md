# Repo-to-PDF

Repo-to-PDF is a tool that allows you to convert a GitHub repository into a PDF file. It clones the repository, processes the files, and then creates a PDF.



## Example PDF

<table>
  <tr>
    <td valign="top" width="40%">
      <p align="center">
        We have transformed the <a href="https://github.com/freeCodeCamp/freeCodeCamp">FreeCodeCamp</a> repository from 42,998 files into a 186,453-page PDF in under 2 minutes. This conversion is purely for example and stress testing purposes. All content belongs to the original authors at FreeCodeCamp.
      </p>
      <p align="center">
        <a href="https://github.com/freeCodeCamp/freeCodeCamp">
          <img alt="GitHub logo" src="https://img.shields.io/badge/-freeCodeCamp-181717?style=for-the-badge&logo=github" />
        </a>
      </p>
      <p align="center">
        <a href="https://freecodecamppdf.bankkroll.repl.co">
          <img alt="View PDF" src="https://img.shields.io/badge/-View%20PDF-blue?style=for-the-badge" />
        </a>
      </p>
    </td>
    <td width="60%">
      <p align="center">
        <img src="https://github.com/BankkRoll/Repo-to-PDF/assets/106103625/9ceb176f-37f6-40d9-ab95-080942d2d7c0" width="100%">
      </p>
    </td>
  </tr>
</table>



## Installation

To use Repo-to-PDF, you have two options: cloning the repository from GitHub or installing it directly using NPX. Choose the method that suits you best.


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


## Usage

Once you have installed Repo-to-PDF, you can use it to generate PDF files from GitHub repositories.

1. The script will install and start running. You will just follow the prompt:

You will be prompted to provide the following information:'
- Whether or not you want to clone a repository or use a local repository
  - The path to the local repository (if you chose to use a local repository)
  - The URL of the repository you want to clone (if you chose to clone a repository)
- Whether or not you want line numbers in the pdf
- Whether or not you want highlighting in the pdf
- Whether or not you want to remove comments from the code
- Whether or not you want to remove empty lines from the code
- Whether or not you want one big file or one PDF pr. file in your repo
  - When picking one big file you get 2 extra options:
    - Whether or not you want to add page numbers
    - Whether or not you want to add a table of contents (Coming in the future)
- The name of the output PDF file or output directory
- Whether or not you wish to keep the cloned repository after generating the PDF

The script will then clone the repository, process the files, and generate a PDF document based on the provided information.

Please note that you need to have Node.js installed on your system in order to run Repo-to-PDF.



## Configuration

Repo-to-PDF automatically ignores certain file types and directories (e.g., `.png`, `.git`). 
To customize the files and directories to ignore, you can add a `repo2pdf.ignore` file to the root of your repository.

Please note that if you use a local repository, the `repo2pdf.ignore` file must be in the root of the repository directory. And you might need to add more directories to the ignore list, as the script not automatically ignores different build files and directories.

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


## Contributing to Repo-to-PDF

**Your insights, skills, and valuable time can make a huge difference in the evolution of Repo-to-PDF!** We're always excited to see the community helping in shaping this tool to be even more efficient and feature-rich.

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
4. Submit a pull request from your branch to the main Repo-to-PDF repository.

In your pull request, please provide a clear description of the changes you've made. We appreciate contributions that adhere to our coding conventions and are consistent with the existing codebase - it helps us maintain the quality of the project and makes the review process more efficient.

Here are some feature ideas and improvements that could be implemented in Repo-to-PDF to enhance its functionality and user experience:

- **Table of Contents Generation:** Auto-generate sections based on directories and subsections based on files.
- **Customizable Themes:** Enable customizations for fonts, colors, and layout of the generated PDF.
- **Selective File Inclusion:** Add the feature to include specific files or directories from the repository.
- **Parallel Processing:** Leverage multi-threading or worker threads for faster conversion of large repositories.
- **Interactive Progress Bar:** Show a real-time progress bar in the terminal during the conversion process.
- **Syntax Theme Customization:** Support popular syntax highlighting themes like Monokai, Dracula, etc.
- **Support for Private Repositories:** Implement OAuth2 GitHub authentication for private repositories.
- **Enhanced Error Handling:** Provide clear error messages when a repository cannot be cloned.
- **Conversion Options Presets:** Define presets like 'minimalist': no line numbers, no highlighting, 'full-featured': line numbers, syntax highlighting.
- **Support for Additional VCS:** Extend support for other version control systems like GitLab, Bitbucket, and others.
- **Support for Non-Git Repositories:** Add support for other version control systems such as Mercurial or SVN.
- **Client-Side Web Application:** Develop a user-friendly web application for converting repositories and customizing settings.
- **Text Compression:** Use font subsetting and compression techniques to reduce the size of the generated PDF.

Feel free to contribute to the project by implementing any of these ideas or suggesting new ones!

### Meet Our Contributors

We're ever grateful for the valuable contributions from our community. Meet the people who're helping shape Repo-to-PDF:

[![Contributors](https://contrib.rocks/image?repo=BankkRoll/repo2pdf)](https://github.com/BankkRoll/repo2pdf/graphs/contributors)


## Project Structure

<div align="center">

| Type | File/Folder | Description |
| ---- | ----------- | ----------- |
| 📂 | [src/](https://github.com/BankkRoll/repo2pdf/tree/main/src) | The home of all source files. This is where the magic happens, transforming repositories into beautiful PDFs. |
| 📂/📄 | [src/clone.ts](https://github.com/BankkRoll/repo2pdf/blob/main/src/clone.ts) | This script is the workhorse of the project, taking care of cloning the repository and kick-starting the conversion to PDF. |
| 📂/📄 | [src/configHandler.ts](https://github.com/BankkRoll/repo2pdf/blob/main/src/configHandler.ts) | Like a conductor leading an orchestra, this script manages all configuration-related tasks and coordinates the interactions with the user. |
| 📂/📄 | [src/loadIgnoreConfig.ts](https://github.com/BankkRoll/repo2pdf/blob/main/src/loadIgnoreConfig.ts) | Think of this script as the gatekeeper. It loads the ignore configuration file and ensures that unneeded files and directories are left out of the conversion process. |
| 📂/📄 | [src/syntax.ts](https://github.com/BankkRoll/repo2pdf/blob/main/src/syntax.ts) | The artist of the project. This script adds a splash of color to the PDF by implementing syntax highlighting and mapping highlight.js classes to specific colors. |
| 📂/📄 | [src/universalExcludes.ts](https://github.com/BankkRoll/repo2pdf/blob/main/src/universalExcludes.ts) | This script is the bouncer, maintaining a list of file and directory names and extensions that are always excluded from the conversion process. |
| 📄 | [LICENSE.md](https://github.com/BankkRoll/repo2pdf/blob/main/LICENSE.md) | The rules of the road. This file outlines how others can use and share Repo-to-PDF, ensuring everyone plays fair. |
| 📄 | [package-lock.json](https://github.com/BankkRoll/repo2pdf/blob/main/package-lock.json) | A snapshot of the exact versions of npm dependencies our project uses. It ensures that the environment is consistent every time you install. |
| 📄 | [package.json](https://github.com/BankkRoll/repo2pdf/blob/main/package.json) | The ID of our project. It defines the project metadata, scripts, and dependencies and is essential for npm to understand how to handle the project. |
| 📄 | [README.md](https://github.com/BankkRoll/repo2pdf/blob/main/README.md) | The project's handbook. It provides a comprehensive overview and detailed instructions on how to use Repo-to-PDF. |
| 📄 | [repo2pdf.ignore](https://github.com/BankkRoll/repo2pdf/blob/main/repo2pdf.ignore) | The project's personal assistant. This file lists files and directories that should be excluded during the conversion, helping to tailor the output to your needs. |
| 📄 | [tsconfig.json](https://github.com/BankkRoll/repo2pdf/blob/main/tsconfig.json) | The project's blueprint. This file holds the configuration for the TypeScript compiler, directing how the source code is transformed into the final JavaScript code. |

</div>


## License

Repo-to-PDF is open source software, licensed under the MIT License. See the `LICENSE` file for more information.
