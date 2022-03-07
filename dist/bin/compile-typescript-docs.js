#! /usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const yargs = __importStar(require("yargs"));
const TypeScriptDocsVerifier = __importStar(require("../index"));
const cliOptions = yargs.option('input-files', {
    description: 'The list of input files to be processed',
    array: true,
    default: ['README.md']
});
const inputFiles = cliOptions.parseSync()['input-files'];
const spinner = (0, ora_1.default)();
spinner.info(`Compiling documentation TypeScript code snippets from ${inputFiles.join(', ')}`).start();
const formatCode = (code, errorLines) => {
    const lines = code.split('\n')
        .map((line, index) => {
        const lineNumber = index + 1;
        if (errorLines.includes(lineNumber)) {
            return chalk_1.default `{bold.red ${String(lineNumber).padStart(2)}| ${line}}`;
        }
        else {
            return `${String(lineNumber).padStart(2)}| ${line}`;
        }
    });
    return '    ' + lines.join('\n    ');
};
const formatError = (error) => '  ' + error.message
    .split('\n')
    .join('\n      ');
const doCompilation = async () => {
    const results = await TypeScriptDocsVerifier.compileSnippets(inputFiles);
    spinner.info(`Found ${results.length} TypeScript snippets`).start();
    results.forEach((result) => {
        if (result.error) {
            process.exitCode = 1;
            spinner.fail(chalk_1.default `{red.bold Error compiling example code block ${result.index} in file ${result.file}:}`);
            console.log(formatError(result.error));
            console.log();
            console.log(chalk_1.default `{blue.bold  Original code:}`);
            console.log(formatCode(result.snippet, result.linesWithErrors));
        }
    });
    if (process.exitCode) {
        spinner.fail(chalk_1.default `{red.bold Compilation failed, see above errors}`);
    }
    else {
        spinner.succeed(chalk_1.default `{green.bold All snippets compiled OK}`);
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