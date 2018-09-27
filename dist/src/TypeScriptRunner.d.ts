export declare class TypeScriptRunner {
    private readonly workingDirectory;
    constructor(workingDirectory: string, typeScriptOptions: any);
    run(code: string): Promise<void>;
    private writeCodeFile;
}
