"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBlockExtractor = void 0;
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
        markdown.replace(this.TYPESCRIPT_CODE_PATTERN, (_, code) => {
            codeBlocks.push(code);
            return code;
        });
        return codeBlocks;
    }
}
exports.CodeBlockExtractor = CodeBlockExtractor;
CodeBlockExtractor.TYPESCRIPT_CODE_PATTERN = /(?:```typescript\n)((?:\n|.)*?)(?:(?=```))/gi;
//# sourceMappingURL=CodeBlockExtractor.js.map