"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fsExtra = require("fs-extra");
class CodeBlockExtractor {
    /* istanbul ignore next */
    constructor() { }
    static extract(markdownFilePath) {
        return Promise.resolve()
            .then(() => CodeBlockExtractor.readFile(markdownFilePath))
            .then((contents) => CodeBlockExtractor.extractCodeBlocksFromMarkdown(contents))
            .catch((error) => {
            throw new Error(`Error extracting code blocks from ${markdownFilePath}: ${error.message}`);
        });
    }
    static readFile(path) {
        return fsExtra.readFile(path)
            .then((buffer) => buffer.toString());
    }
    static extractCodeBlocksFromMarkdown(markdown) {
        const codeBlocks = [];
        markdown.replace(this.TYPESCRIPT_CODE_PATTERN, (fullMatch, code) => {
            codeBlocks.push(code);
            return code;
        });
        return codeBlocks;
    }
}
CodeBlockExtractor.TYPESCRIPT_CODE_PATTERN = /(?:```typescript\n)((?:\n|.)*?)(?:(?=```))/gi;
exports.CodeBlockExtractor = CodeBlockExtractor;
//# sourceMappingURL=CodeBlockExtractor.js.map