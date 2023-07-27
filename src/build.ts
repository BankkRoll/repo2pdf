import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as path from 'path';
import { exec } from 'child_process';
import { html as beautifyHTML } from 'js-beautify';
import inquirer from 'inquirer';
import { log, createSpinner, stopSpinner, createError } from './utils';

async function executeCommand(command: string) {
    const spinner = createSpinner(`Running command: ${command}`);
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                log(`Error during command execution '${command}': ${error}`, 'error', spinner); 
                reject(createError('CMD_EXEC_ERROR', `Error during command execution '${command}': ${error}`));
            } else if (stderr) {
                log(`stderr during command execution '${command}': ${stderr}`, 'error', spinner); 
                reject(createError('CMD_EXEC_STDERR', `stderr during command execution '${command}': ${stderr}`));
            } else {
                stopSpinner(spinner, `Finished running command: ${command}`, 'success');
                resolve(stdout);
            }
        });
    });
}

/**
 * Runs the 'next build' and 'next export' commands.
 */
async function runNextBuildAndExport() {
    try {
        log('Running `next build`...', 'info');
        await executeCommand('next build');
        log('Running `next export`...', 'info');
        await executeCommand('next export -o ../nextension');
    } catch (error) {
        log('Error during Next.js build/export:', 'error');
        throw error;
    }
}

/**
 * Renames the _next directory to next.
 */
async function renameNextDirectory() {
    const oldPath = path.resolve('nextension', '_next');
    const newPath = path.resolve('nextension', 'next');

    try {
        await fs.rename(oldPath, newPath);
        log(`Successfully renamed directory from ${oldPath} to ${newPath}`, 'success');
    } catch (error) {
        log(`Error renaming directory from ${oldPath} to ${newPath}:`, 'error');
        throw error;
    }
}

/**
 * Formats HTML code with js-beautify.
 * @param html {string}
 * @return {Promise<string>}
 */
async function formatHTML(html: string): Promise<string> {
    return beautifyHTML(html, {
        indent_size: 2, // Number of spaces for indentation
        wrap_line_length: 120, // Maximum characters per line, adjust as needed
        end_with_newline: true, // Add a newline character at the end of the file
        indent_inner_html: true, // Indent the content of elements
        preserve_newlines: true, // Preserve existing line breaks
        wrap_attributes_indent_size: 2, // Indentation for attributes on a new line
        extra_liners: [], // Tags that should have an extra newline after them (none in this case)
        content_unformatted: ['pre', 'code'], // Tags with content that should be preserved (e.g., <pre> and <code>)
        unformatted: [], // Tags that should not be reformatted (none in this case)
        indent_handlebars: true, // Indent Handlebars expressions
        indent_scripts: 'keep', // Indent content inside <script> tags ('keep' preserves existing indentation)
        max_preserve_newlines: 1, // Maximum number of preserved newlines
        indent_with_tabs: false, // Indent with spaces, not tabs
    });
}


/**
 * Updates HTML files in the nextension directory.
 * Replaces /_next/ with /next/ and formats the HTML.
 */
async function updateHtmlFiles() {
    const htmlFiles = glob.sync('nextension/**/*.html');

    try {
        for (const file of htmlFiles) {
            let content = await fs.readFile(file, 'utf8');
            content = content.replace(/\/_next\//g, '/next/');
            content = await formatHTML(content);
            await fs.writeFile(file, content, 'utf8');
        }
        log('Successfully updated HTML files', 'success');
    } catch (error) {
        log('Error updating HTML files:', 'error');
        throw error;
    }
}

/**
 * Copy the assets directory to the output directory.
 */
async function copyAssets() {
    const srcPath = path.resolve('assets');
    const destPath = path.resolve('nextension', 'assets');

    try {
        await fs.copy(srcPath, destPath);
        log('Successfully copied assets', 'success');
    } catch (error) {
        log(`Error copying assets from ${srcPath} to ${destPath}:`, 'error');
        throw error;
    }
}

/**
 * Checks for the presence of manifest.json in the assets directory.
 * If not present, prompts the user to generate a template.
 */
async function checkManifest() {
    const manifestPath = path.resolve('nextension', 'assets', 'manifest.json');

    try {
        const manifestExists = await fs.pathExists(manifestPath);

        if (!manifestExists) {
            const { generate } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'generate',
                    message: 'manifest.json not found. Would you like to generate a template?',
                    default: false
                }
            ]);

            if (generate) {
                await generateManifest();
            }
        }
    } catch (error) {
        log('Successfully checked manifest.json', 'success');
        throw error;
    }
}

async function generateManifest() {
    const assetsDir = path.resolve('public');
    const defaultPopupExists = await fs.pathExists(path.join(assetsDir, 'popup.html'));
    const contentScriptExists = await fs.pathExists(path.join(assetsDir, 'content.js'));
    const backgroundScriptExists = await fs.pathExists(path.join(assetsDir, 'background.js'));
    const iconsExist = await fs.pathExists(path.join(assetsDir, 'icons'));

    const questions = [
        {
            type: 'input',
            name: 'name',
            message: 'Extension name:',
            default: 'My Extension',
        },
        {
            type: 'input',
            name: 'version',
            message: 'Extension version:',
            default: '1.0',
        },
        {
            type: 'input',
            name: 'description',
            message: 'Description:',
            default: 'My awesome Chrome extension',
        },
        {
            type: 'input',
            name: 'author',
            message: 'Author:',
        },
        {
            type: 'input',
            name: 'homepage_url',
            message: 'Homepage URL:',
        },
    ];

    const answers = await inquirer.prompt(questions);

    const manifestContent = {
        manifest_version: 3,
        ...answers,
        action: defaultPopupExists ? { default_popup: 'popup.html' } : undefined,
        background: backgroundScriptExists ? { service_worker: 'background.js' } : undefined,
        content_scripts: contentScriptExists ? [{ js: ['content.js'], matches: ['<all_urls>'], all_frames: true }] : undefined,
        icons: iconsExist ? {
            '16': 'icons/icon16.png',
            '48': 'icons/icon48.png',
            '128': 'icons/icon128.png',
        } : undefined,
        // other fields with default values or empty objects/arrays as required
    };

    const manifestPath = path.resolve('nextension', 'assets', 'manifest.json');

    await fs.writeJson(manifestPath, manifestContent, { spaces: 2 });
    log('Successfully generated manifest.json', 'success');
}

/**
 * Main function.
 * Runs the build and export commands, renames the directory, updates HTML files, copies assets, and checks for manifest.json.
 */
export async function build() {
    try {
        await runNextBuildAndExport();
        await renameNextDirectory();
        await updateHtmlFiles();
        await copyAssets();
        await checkManifest();
        log('Build completed successfully', 'success');
    } catch (error) {
        log('An error occurred during the build process:', 'error');
        process.exit(1);
    }
}

/**
 * Handles any unhandled promise rejections.
 */
process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
    process.exit(1);
});
