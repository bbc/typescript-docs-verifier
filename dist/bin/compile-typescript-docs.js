#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ora = require("ora");
const chalk = require("chalk");
const yargs = require("yargs");
const leftPad = require("left-pad");
const TypeScriptDocsVerifier = require("../index");
const ERROR_LINE_EXTRACTION_PATTERN = /\.ts\s*\((\d+),\d+\):/;
const COMPILED_DOCS_FILE_PREFIX_PATTERN = /compiled\-docs\/block\-\d+\.\d+\.ts/g;
yargs.option('input-files', {
    description: 'The list of input files to be processed',
    array: true,
    default: ['README.md']
});
const argv = yargs.argv;
const inputFiles = argv['input-files'];
const spinner = ora();
spinner.info(`Compiling documentation TypeScript code snippets from ${inputFiles.join(', ')}`).start();
const formatCode = (code, errorLines) => {
    const lines = code.split('\n')
        .map((line, index) => {
        const lineNumber = index + 1;
        if (errorLines.indexOf(lineNumber) !== -1) {
            return chalk `{bold.red ${leftPad(lineNumber, 2)}| ${line}}`;
        }
        else {
            return `${leftPad(lineNumber, 2)}| ${line}`;
        }
    });
    return '    ' + lines.join('\n    ');
};
const findErrorLines = (error) => {
    if (!('diagnosticText' in error)) {
        return [];
    }
    const messages = error.diagnosticText.split('\n');
    return messages.map((message) => {
        const match = ERROR_LINE_EXTRACTION_PATTERN.exec(message);
        if (match && match[1]) {
            return match[1];
        }
        else {
            return NaN;
        }
    }).filter((lineNumber) => lineNumber)
        .map((lineNumber) => parseInt(lineNumber.toString(), 10));
};
const formatError = (error) => '  ' + error.message.replace(COMPILED_DOCS_FILE_PREFIX_PATTERN, '')
    .split('\n')
    .join('\n      ');
const doCompilation = async () => {
    const results = await TypeScriptDocsVerifier.compileSnippets(inputFiles);
    spinner.info(`Found ${results.length} TypeScript snippets`).start();
    results.forEach((result) => {
        if (result.error) {
            const errorLines = findErrorLines(result.error);
            process.exitCode = 1;
            spinner.fail(chalk `{red.bold Error compiling example code block ${result.index} in file ${result.file}:}`);
            console.log(formatError(result.error));
            console.log();
            console.log(chalk `{blue.bold  Original code:}`);
            console.log(formatCode(result.snippet, errorLines));
        }
    });
    if (process.exitCode) {
        spinner.fail(chalk `{red.bold Compilation failed, see above errors}`);
    }
    else {
        spinner.succeed(chalk `{green.bold All snippets compiled OK}`);
    }
};
doCompilation()
    .catch((error) => {
    process.exitCode = 1;
    console.error(error);
    try {
        spinner.fail();
    }
    catch (error) {
        console.error(error);
    }
});
//# sourceMappingURL=compile-typescript-docs.js.map