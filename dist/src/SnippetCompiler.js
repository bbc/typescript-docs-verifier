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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnippetCompiler = void 0;
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const tsconfig = __importStar(require("tsconfig"));
const fsExtra = __importStar(require("fs-extra"));
const TSNode = __importStar(require("ts-node"));
const strip_ansi_1 = __importDefault(require("strip-ansi"));
const CodeBlockExtractor_1 = require("./CodeBlockExtractor");
const LocalImportSubstituter_1 = require("./LocalImportSubstituter");
const COMPILED_DOCS_FILE_PREFIX_PATTERN = /(.*)\/compiled-docs\/block-\d+\.ts/g;
class SnippetCompiler {
    constructor(workingDirectory, packageDefinition) {
        this.workingDirectory = workingDirectory;
        this.packageDefinition = packageDefinition;
        const configOptions = SnippetCompiler.loadTypeScriptConfig(packageDefinition.packageRoot);
        this.compiler = TSNode.create(configOptions.config);
    }
    static loadTypeScriptConfig(packageRoot) {
        var _a;
        const typeScriptConfig = tsconfig.loadSync(packageRoot);
        if ((_a = typeScriptConfig === null || typeScriptConfig === void 0 ? void 0 : typeScriptConfig.config) === null || _a === void 0 ? void 0 : _a.compilerOptions) {
            typeScriptConfig.config.compilerOptions.noUnusedLocals = false;
        }
        return typeScriptConfig;
    }
    async compileSnippets(documentationFiles) {
        try {
            await this.cleanWorkingDirectory();
            await fsExtra.ensureDir(this.workingDirectory);
            await fsExtra.symlink(path.join(this.packageDefinition.packageRoot, 'node_modules'), path.join(this.workingDirectory, 'node_modules'));
            const examples = await this.extractAllCodeBlocks(documentationFiles);
            return await Promise.all(examples.map(async (example) => await this.testCodeCompilation(example)));
        }
        finally {
            await this.cleanWorkingDirectory();
        }
    }
    async cleanWorkingDirectory() {
        return await fsExtra.remove(this.workingDirectory);
    }
    async extractAllCodeBlocks(documentationFiles) {
        const importSubstituter = new LocalImportSubstituter_1.LocalImportSubstituter(this.packageDefinition);
        const codeBlocks = await Promise.all(documentationFiles.map(async (file) => await this.extractFileCodeBlocks(file, importSubstituter)));
        return codeBlocks.flat();
    }
    async extractFileCodeBlocks(file, importSubstituter) {
        const blocks = await CodeBlockExtractor_1.CodeBlockExtractor.extract(file);
        return blocks.map((block, index) => {
            return {
                file,
                snippet: block,
                index: index + 1,
                sanitisedCode: this.sanitiseCodeBlock(importSubstituter, block)
            };
        });
    }
    sanitiseCodeBlock(importSubstituter, block) {
        const localisedBlock = importSubstituter.substituteLocalPackageImports(block);
        return localisedBlock;
    }
    async compile(code) {
        const id = process.hrtime.bigint().toString();
        const codeFile = path.join(this.workingDirectory, `block-${id}.ts`);
        await fsExtra.writeFile(codeFile, code);
        this.compiler.compile(code, codeFile);
    }
    removeTemporaryFilePaths(message, example) {
        return message.replace(COMPILED_DOCS_FILE_PREFIX_PATTERN, (0, chalk_1.default) `{blue ${example.file}} → {cyan Code Block ${example.index}}`);
    }
    async testCodeCompilation(example) {
        try {
            await this.compile(example.sanitisedCode);
            return {
                snippet: example.snippet,
                file: example.file,
                index: example.index,
                linesWithErrors: []
            };
        }
        catch (rawError) {
            const error = rawError instanceof Error ? rawError : new Error(String(rawError));
            error.message = this.removeTemporaryFilePaths(error.message, example);
            Object.entries(error).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    error[key] = this.removeTemporaryFilePaths(value, example);
                }
            });
            const linesWithErrors = new Set();
            if (error instanceof TSNode.TSError) {
                const messages = error.diagnosticText.split('\n');
                messages.forEach((message) => {
                    var _a;
                    const [, ttyLineNumber, nonTtyLineNumber] = (_a = (0, strip_ansi_1.default)(message)
                        .match(/Code Block \d+(?::(\d+):\d+)|(?:\((\d+),\d+\))/)) !== null && _a !== void 0 ? _a : [];
                    const lineNumber = parseInt(ttyLineNumber || nonTtyLineNumber, 10);
                    if (!isNaN(lineNumber)) {
                        linesWithErrors.add(lineNumber);
                    }
                });
            }
            return {
                snippet: example.snippet,
                error: error,
                linesWithErrors: [...linesWithErrors],
                file: example.file,
                index: example.index
            };
        }
    }
}
exports.SnippetCompiler = SnippetCompiler;
//# sourceMappingURL=SnippetCompiler.js.map