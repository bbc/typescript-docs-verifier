import * as TSNode from 'ts-node';
import { PackageDefinition } from './PackageInfo';
export declare type SnippetCompilationResult = {
    readonly file: string;
    readonly index: number;
    readonly snippet: string;
    readonly linesWithErrors: number[];
    readonly error?: TSNode.TSError | Error;
};
export declare class SnippetCompiler {
    private readonly workingDirectory;
    private readonly packageDefinition;
    private readonly compiler;
    constructor(workingDirectory: string, packageDefinition: PackageDefinition);
    private static loadTypeScriptConfig;
    compileSnippets(documentationFiles: string[]): Promise<SnippetCompilationResult[]>;
    private cleanWorkingDirectory;
    private extractAllCodeBlocks;
    private extractFileCodeBlocks;
    private sanitiseCodeBlock;
    private compile;
    private removeTemporaryFilePaths;
    private testCodeCompilation;
}
