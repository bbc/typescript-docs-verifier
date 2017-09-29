/// <reference types="bluebird" />
import * as Bluebird from 'bluebird';
export declare class CodeBlockExtractor {
    static readonly TYPESCRIPT_CODE_PATTERN: RegExp;
    private constructor();
    static extract(markdownFilePath: string): Bluebird<string[]>;
    private static readFile(path);
    private static extractCodeBlocksFromMarkdown(markdown);
}
