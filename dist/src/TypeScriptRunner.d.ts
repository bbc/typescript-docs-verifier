export declare class TypeScriptRunner {
    private readonly workingDirectory;
    private readonly compiler;
    constructor(workingDirectory: string, typeScriptOptions: any);
    run(code: string): Promise<void>;
    private writeCodeFile;
}
