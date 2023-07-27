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
exports.initialize = exports.pressAnyKeyToContinue = exports.clearConsole = exports.stopSpinner = exports.createSpinner = exports.log = exports.createError = exports.CustomError = void 0;
let chalk;
let ora;
const readline_1 = __importDefault(require("readline"));
function initialize() {
    return __awaiter(this, void 0, void 0, function* () {
        const importPromises = [
            Promise.resolve().then(() => __importStar(require('chalk'))).then((chalkModule) => chalk = chalkModule.default),
            Promise.resolve().then(() => __importStar(require('ora'))).then((oraModule) => ora = oraModule.default),
        ];
        try {
            yield Promise.all(importPromises);
        }
        catch (error) {
            console.error('Failed to import modules:', error);
        }
    });
}
exports.initialize = initialize;
class CustomError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.message = message;
    }
}
exports.CustomError = CustomError;
function createError(code, message) {
    return new CustomError(code, message);
}
exports.createError = createError;
function log(message, type = 'info', spinner) {
    const timestamp = new Date().toISOString();
    switch (type) {
        case 'info':
            console.log(chalk.blue(`[${timestamp} INFO]: ${message}`));
            break;
        case 'error':
            console.error(chalk.red(`[${timestamp} ERROR]: ${message}`));
            break;
        case 'warning':
            console.warn(chalk.yellow(`[${timestamp} WARNING]: ${message}`));
            break;
        case 'success':
            console.log(chalk.green(`[${timestamp} SUCCESS]: ${message}`));
            break;
        case 'spinner':
            if (spinner) {
                spinner.text = message;
            }
            break;
    }
}
exports.log = log;
function createSpinner(text) {
    return ora({ text, color: 'blue' }).start();
}
exports.createSpinner = createSpinner;
function stopSpinner(spinner, text, type) {
    if (type === 'success') {
        spinner.succeed(chalk.green(text));
    }
    else if (type === 'fail') {
        spinner.fail(chalk.red(text));
    }
    else {
        spinner.info(chalk.blue(text));
    }
}
exports.stopSpinner = stopSpinner;
function clearConsole() {
    process.stdout.write('\x1Bc');
}
exports.clearConsole = clearConsole;
function pressAnyKeyToContinue(prompt = 'Press any key to continue...') {
    return new Promise(resolve => {
        const rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(prompt, () => {
            rl.close();
            resolve();
        });
    });
}
exports.pressAnyKeyToContinue = pressAnyKeyToContinue;
//# sourceMappingURL=utils.js.map