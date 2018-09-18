export declare class CodeBlockExtractor {
    static readonly TYPESCRIPT_CODE_PATTERN: RegExp;
    private constructor();
    static extract(markdownFilePath: string): Promise<string[]>;
    private static readFile;
    private static extractCodeBlocksFromMarkdown;
}
