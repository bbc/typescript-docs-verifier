"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBlockExtractor = void 0;
const fsExtra = require("fs-extra");
class CodeBlockExtractor {
    /* istanbul ignore next */
    constructor() { }
    static async extract(markdownFilePath) {
        try {
            const contents = await CodeBlockExtractor.readFile(markdownFilePath);
            return CodeBlockExtractor.extractCodeBlocksFromMarkdown(contents);
        }
        catch (error) {
            throw new Error(`Error extracting code blocks from ${markdownFilePath}: ${error instanceof Error ? error.message : error}`);
        }
    }
    static async readFile(path) {
        return fsExtra.readFile(path, 'utf-8');
    }
    static extractCodeBlocksFromMarkdown(markdown) {
        const codeBlocks = [];
        markdown.replace(this.TYPESCRIPT_CODE_PATTERN, (_, code) => {
            codeBlocks.push(code);
            return code;
        });
        return codeBlocks;
    }
}
exports.CodeBlockExtractor = CodeBlockExtractor;
CodeBlockExtractor.TYPESCRIPT_CODE_PATTERN = /(?:```(?:(?:typescript)|(?:ts))\n)((?:\n|.)*?)(?:(?=```))/gi;
//# sourceMappingURL=CodeBlockExtractor.js.map