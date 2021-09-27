"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileSnippets = void 0;
const path = require("path");
const SnippetCompiler_1 = require("./src/SnippetCompiler");
const DEFAULT_FILES = ['README.md'];
const COMPILED_DOCS_FOLDER = 'compiled-docs';
const wrapIfString = (arrayOrString) => {
    if (Array.isArray(arrayOrString)) {
        return arrayOrString;
    }
    else {
        return [arrayOrString];
    }
};
async function compileSnippets(markdownFileOrFiles = DEFAULT_FILES) {
    const workingDirectory = path.join(process.cwd(), COMPILED_DOCS_FOLDER);
    const compiler = new SnippetCompiler_1.SnippetCompiler(workingDirectory);
    const fileArray = wrapIfString(markdownFileOrFiles);
    return compiler.compileSnippets(fileArray);
}
exports.compileSnippets = compileSnippets;
//# sourceMappingURL=index.js.map