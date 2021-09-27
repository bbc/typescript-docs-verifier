"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnippetCompiler = void 0;
const tsconfig = require("tsconfig");
const fsExtra = require("fs-extra");
const TypeScriptRunner_1 = require("./TypeScriptRunner");
const PackageInfo_1 = require("./PackageInfo");
const CodeBlockExtractor_1 = require("./CodeBlockExtractor");
const LocalImportSubstituter_1 = require("./LocalImportSubstituter");
const CodeWrapper_1 = require("./CodeWrapper");
class SnippetCompiler {
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
        const configOptions = SnippetCompiler.loadTypeScriptConfig();
        this.runner = new TypeScriptRunner_1.TypeScriptRunner(this.workingDirectory, configOptions.config);
    }
    static loadTypeScriptConfig() {
        const typeScriptConfig = tsconfig.loadSync(process.cwd());
        if (typeScriptConfig &&
            typeScriptConfig.config &&
            typeScriptConfig.config.compilerOptions) {
            typeScriptConfig.config.compilerOptions.noUnusedLocals = false;
        }
        return typeScriptConfig;
    }
    async compileSnippets(documentationFiles) {
        try {
            await this.cleanWorkingDirectory();
            await fsExtra.ensureDir(this.workingDirectory);
            const examples = await this.extractAllCodeBlocks(documentationFiles);
            return await Promise.all(examples.map(async (example, index) => this.testCodeCompilation(example, index)));
        }
        finally {
            await this.cleanWorkingDirectory();
        }
    }
    cleanWorkingDirectory() {
        return fsExtra.remove(this.workingDirectory);
    }
    async extractAllCodeBlocks(documentationFiles) {
        const packageDefn = await PackageInfo_1.PackageInfo.read();
        const importSubstituter = new LocalImportSubstituter_1.LocalImportSubstituter(packageDefn);
        const codeBlocks = await Promise.all(documentationFiles.map((file) => this.extractFileCodeBlocks(file, importSubstituter)));
        return codeBlocks.flat();
    }
    async extractFileCodeBlocks(file, importSubstituter) {
        const blocks = await CodeBlockExtractor_1.CodeBlockExtractor.extract(file);
        return blocks.map((block) => {
            return {
                file,
                snippet: block,
                sanitisedCode: this.sanitiseCodeBlock(importSubstituter, block)
            };
        });
    }
    sanitiseCodeBlock(importSubstituter, block) {
        const localisedBlock = importSubstituter.substituteLocalPackageImports(block);
        return CodeWrapper_1.CodeWrapper.wrap(localisedBlock);
    }
    async testCodeCompilation(example, index) {
        try {
            await this.runner.run(example.sanitisedCode);
            return {
                snippet: example.snippet,
                file: example.file,
                index: index + 1
            };
        }
        catch (error) {
            const wrappedError = error instanceof Error ? error : new Error(String(error));
            return {
                snippet: example.snippet,
                error: wrappedError,
                file: example.file,
                index: index + 1
            };
        }
    }
}
exports.SnippetCompiler = SnippetCompiler;
//# sourceMappingURL=SnippetCompiler.js.map