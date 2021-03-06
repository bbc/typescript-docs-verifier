import * as Bluebird from 'bluebird';
import { TSError } from 'ts-node/dist/index';
export interface SnippetCompilationResult {
    readonly file: string;
    readonly index: number;
    readonly snippet: string;
    readonly error?: TSError | Error;
}
export declare class SnippetCompiler {
    private readonly workingDirectory;
    private readonly runner;
    constructor(workingDirectory: string);
    private static loadTypeScriptConfig;
    compileSnippets(documentationFiles: string[]): Bluebird<SnippetCompilationResult[]>;
    private cleanWorkingDirectory;
    private extractAllCodeBlocks;
    private extractFileCodeBlocks;
    private sanitiseCodeBlock;
    private testCodeCompilation;
}
