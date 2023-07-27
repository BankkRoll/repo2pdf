#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const build_1 = require("./build");
(0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .command('build', 'Build the Next.js application', (yargs) => {
    return yargs.option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging'
    });
}, (argv) => {
    if (argv.verbose) {
        console.log('Verbose mode is on.');
    }
    (0, build_1.build)();
})
    .help()
    .alias('help', 'h')
    .argv;
//# sourceMappingURL=cli.js.map