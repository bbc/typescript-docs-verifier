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
exports.compileSnippets = void 0;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const PackageInfo_1 = require("./src/PackageInfo");
const SnippetCompiler_1 = require("./src/SnippetCompiler");
const DEFAULT_FILES = ['README.md'];
const wrapIfString = (arrayOrString) => {
    if (Array.isArray(arrayOrString)) {
        return arrayOrString;
    }
    else {
        return [arrayOrString];
    }
};
async function compileSnippets(markdownFileOrFiles = DEFAULT_FILES) {
    const compiledDocsFolder = path.join(os.tmpdir(), 'compiled-docs');
    const packageDefinition = await PackageInfo_1.PackageInfo.read();
    const compiler = new SnippetCompiler_1.SnippetCompiler(compiledDocsFolder, packageDefinition);
    const fileArray = wrapIfString(markdownFileOrFiles);
    const results = await compiler.compileSnippets(fileArray);
    return results;
}
exports.compileSnippets = compileSnippets;
//# sourceMappingURL=index.js.map