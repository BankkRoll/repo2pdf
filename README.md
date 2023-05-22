# Repo-to-PDF

Repo-to-PDF is a Node.js script that clones a GitHub repository, reads all the text and code files within the repository, and then generates a PDF document with the contents of each file.

## Description

This tool is useful when you want to generate a physical or portable document of a repository's contents for offline reading, documentation, or archival purposes.

The tool omits certain types of files including image files, video files, and certain meta-files from the Git system itself to focus on the main textual content. This includes all typical code files and markdown files.

## Usage

Follow the steps below to use Repo-to-PDF:

1. Clone this repository to your local machine. You can do this with the following command in your terminal:
    ```
    git clone https://github.com/BankkRoll/Repo-to-PDF.git
    ```

2. Navigate to the newly cloned directory:
    ```
    cd Repo-to-PDF
    ```

3. Install the required dependencies by running:
    ```
    npm install
    ```

4. After installation, you can run the script with:
    ```
    node index.js https://github.com/<username>/<repository>
    ```
    Replace `https://github.com/<username>/<repository>` with the GitHub URL of the repository you wish to clone and convert to PDF.

5. The script will generate a PDF named `output.pdf` in the root directory of the project.

Please note that this tool requires Node.js and npm to run. You can download Node.js and npm [here](https://nodejs.org/).

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
