"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBlockExtractor = void 0;
const fsExtra = __importStar(require("fs-extra"));
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
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
        return await fsExtra.readFile(path, 'utf-8');
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