//@ts-ignore
let chalk: any;
//@ts-ignore
let ora: any;
//@ts-ignore
import readline from 'readline';

async function initialize() {
    const importPromises = [
        import('chalk').then((chalkModule) => chalk = chalkModule.default),
        import('ora').then((oraModule) => ora = oraModule.default),
    ];

    try {
        await Promise.all(importPromises);
    } catch (error) {
        console.error('Failed to import modules:', error);
    }
}

class CustomError extends Error {
    constructor(public code: string, public message: string) {
        super(message);
    }
}

function createError(code: string, message: string): CustomError {
    return new CustomError(code, message);
}

type Spinner = ReturnType<typeof ora>;

function log(message: string, type: 'info' | 'error' | 'warning' | 'spinner' | 'success' = 'info', spinner?: Spinner) {
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

function createSpinner(text: string): Spinner {
    return ora({ text, color: 'blue' }).start();
}

function stopSpinner(spinner: Spinner, text: string, type: 'success' | 'fail' | 'info') {
    if (type === 'success') {
        spinner.succeed(chalk.green(text));
    } else if (type === 'fail') {
        spinner.fail(chalk.red(text));
    } else {
        spinner.info(chalk.blue(text));
    }
}

function clearConsole() {
    process.stdout.write('\x1Bc');
}

function pressAnyKeyToContinue(prompt = 'Press any key to continue...'): Promise<void> {
    return new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(prompt, () => {
            rl.close();
            resolve();
        });
    });
}

export { CustomError, createError, log, createSpinner, stopSpinner, clearConsole, pressAnyKeyToContinue, initialize };
