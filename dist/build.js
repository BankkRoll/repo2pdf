"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.build = void 0;
const fs = __importStar(require("fs-extra"));
const glob = __importStar(require("glob"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const js_beautify_1 = require("js-beautify");
const inquirer_1 = __importDefault(require("inquirer"));
const utils_1 = require("./utils");
function executeCommand(command) {
    return __awaiter(this, void 0, void 0, function* () {
        const spinner = (0, utils_1.createSpinner)(`Running command: ${command}`);
        return new Promise((resolve, reject) => {
            (0, child_process_1.exec)(command, (error, stdout, stderr) => {
                if (error) {
                    (0, utils_1.log)(`Error during command execution '${command}': ${error}`, 'error', spinner);
                    reject((0, utils_1.createError)('CMD_EXEC_ERROR', `Error during command execution '${command}': ${error}`));
                }
                else if (stderr) {
                    (0, utils_1.log)(`stderr during command execution '${command}': ${stderr}`, 'error', spinner);
                    reject((0, utils_1.createError)('CMD_EXEC_STDERR', `stderr during command execution '${command}': ${stderr}`));
                }
                else {
                    (0, utils_1.stopSpinner)(spinner, `Finished running command: ${command}`, 'success');
                    resolve(stdout);
                }
            });
        });
    });
}
function runNextBuildAndExport() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            (0, utils_1.log)('Running `next build`...', 'info');
            yield executeCommand('next build');
            (0, utils_1.log)('Running `next export`...', 'info');
            yield executeCommand('next export -o ../nextension');
        }
        catch (error) {
            (0, utils_1.log)('Error during Next.js build/export:', 'error');
            throw error;
        }
    });
}
function renameNextDirectory() {
    return __awaiter(this, void 0, void 0, function* () {
        const oldPath = path.resolve('nextension', '_next');
        const newPath = path.resolve('nextension', 'next');
        try {
            yield fs.rename(oldPath, newPath);
            (0, utils_1.log)(`Successfully renamed directory from ${oldPath} to ${newPath}`, 'success');
        }
        catch (error) {
            (0, utils_1.log)(`Error renaming directory from ${oldPath} to ${newPath}:`, 'error');
            throw error;
        }
    });
}
function formatHTML(html) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, js_beautify_1.html)(html, {
            indent_size: 2,
            wrap_line_length: 120,
            end_with_newline: true,
            indent_inner_html: true,
            preserve_newlines: true,
            wrap_attributes_indent_size: 2,
            extra_liners: [],
            content_unformatted: ['pre', 'code'],
            unformatted: [],
            indent_handlebars: true,
            indent_scripts: 'keep',
            max_preserve_newlines: 1,
            indent_with_tabs: false,
        });
    });
}
function updateHtmlFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        const htmlFiles = glob.sync('nextension/**/*.html');
        try {
            for (const file of htmlFiles) {
                let content = yield fs.readFile(file, 'utf8');
                content = content.replace(/\/_next\//g, '/next/');
                content = yield formatHTML(content);
                yield fs.writeFile(file, content, 'utf8');
            }
            (0, utils_1.log)('Successfully updated HTML files', 'success');
        }
        catch (error) {
            (0, utils_1.log)('Error updating HTML files:', 'error');
            throw error;
        }
    });
}
function copyAssets() {
    return __awaiter(this, void 0, void 0, function* () {
        const srcPath = path.resolve('assets');
        const destPath = path.resolve('nextension', 'assets');
        try {
            yield fs.copy(srcPath, destPath);
            (0, utils_1.log)('Successfully copied assets', 'success');
        }
        catch (error) {
            (0, utils_1.log)(`Error copying assets from ${srcPath} to ${destPath}:`, 'error');
            throw error;
        }
    });
}
function checkManifest() {
    return __awaiter(this, void 0, void 0, function* () {
        const manifestPath = path.resolve('nextension', 'assets', 'manifest.json');
        try {
            const manifestExists = yield fs.pathExists(manifestPath);
            if (!manifestExists) {
                const { generate } = yield inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'generate',
                        message: 'manifest.json not found. Would you like to generate a template?',
                        default: false
                    }
                ]);
                if (generate) {
                    yield generateManifest();
                }
            }
        }
        catch (error) {
            (0, utils_1.log)('Successfully checked manifest.json', 'success');
            throw error;
        }
    });
}
function generateManifest() {
    return __awaiter(this, void 0, void 0, function* () {
        const assetsDir = path.resolve('public');
        const defaultPopupExists = yield fs.pathExists(path.join(assetsDir, 'popup.html'));
        const contentScriptExists = yield fs.pathExists(path.join(assetsDir, 'content.js'));
        const backgroundScriptExists = yield fs.pathExists(path.join(assetsDir, 'background.js'));
        const iconsExist = yield fs.pathExists(path.join(assetsDir, 'icons'));
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
        const answers = yield inquirer_1.default.prompt(questions);
        const manifestContent = Object.assign(Object.assign({ manifest_version: 3 }, answers), { action: defaultPopupExists ? { default_popup: 'popup.html' } : undefined, background: backgroundScriptExists ? { service_worker: 'background.js' } : undefined, content_scripts: contentScriptExists ? [{ js: ['content.js'], matches: ['<all_urls>'], all_frames: true }] : undefined, icons: iconsExist ? {
                '16': 'icons/icon16.png',
                '48': 'icons/icon48.png',
                '128': 'icons/icon128.png',
            } : undefined });
        const manifestPath = path.resolve('nextension', 'assets', 'manifest.json');
        yield fs.writeJson(manifestPath, manifestContent, { spaces: 2 });
        (0, utils_1.log)('Successfully generated manifest.json', 'success');
    });
}
function build() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield runNextBuildAndExport();
            yield renameNextDirectory();
            yield updateHtmlFiles();
            yield copyAssets();
            yield checkManifest();
            (0, utils_1.log)('Build completed successfully', 'success');
        }
        catch (error) {
            (0, utils_1.log)('An error occurred during the build process:', 'error');
            process.exit(1);
        }
    });
}
exports.build = build;
process.on('unhandledRejection', (reason, promise) => {
    (0, utils_1.log)(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
    process.exit(1);
});
//# sourceMappingURL=build.js.map