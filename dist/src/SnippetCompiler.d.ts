import { TSError } from 'ts-node';
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
    compileSnippets(documentationFiles: string[]): Promise<SnippetCompilationResult[]>;
    private cleanWorkingDirectory;
    private extractAllCodeBlocks;
    private extractFileCodeBlocks;
    private sanitiseCodeBlock;
    private testCodeCompilation;
}
