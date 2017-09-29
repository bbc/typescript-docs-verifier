/// <reference types="bluebird" />
import * as Bluebird from 'bluebird';
import { TSError } from 'ts-node/dist/index';
export interface SnippetCompilationResult {
    readonly file: string;
    readonly index: number;
    readonly snippet: string;
    readonly error?: TSError;
}
export declare class SnippetCompiler {
    private readonly workingDirectory;
    private readonly runner;
    constructor(workingDirectory: string);
    compileSnippets(documentationFiles: string[]): Bluebird<SnippetCompilationResult[]>;
    private cleanWorkingDirectory();
    private extractAllCodeBlocks(documentationFiles);
    private extractFileCodeBlocks(file, importSubstituter);
    private sanitiseCodeBlock(importSubstituter, block);
    private testCodeCompilation(example, index);
}
