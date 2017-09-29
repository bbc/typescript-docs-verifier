"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsconfig = require("tsconfig");
const Bluebird = require("bluebird");
const fsExtra = require("fs-extra");
const TypeScriptRunner_1 = require("./TypeScriptRunner");
const PackageInfo_1 = require("./PackageInfo");
const CodeBlockExtractor_1 = require("./CodeBlockExtractor");
const LocalImportSubstituter_1 = require("./LocalImportSubstituter");
const CodeWrapper_1 = require("./CodeWrapper");
class SnippetCompiler {
    constructor(workingDirectory) {
        this.workingDirectory = workingDirectory;
        const configOptions = tsconfig.loadSync(process.cwd());
        this.runner = new TypeScriptRunner_1.TypeScriptRunner(this.workingDirectory, configOptions.config);
    }
    compileSnippets(documentationFiles) {
        return Bluebird.resolve()
            .then(() => this.cleanWorkingDirectory())
            .then(() => fsExtra.ensureDir(this.workingDirectory))
            .then(() => this.extractAllCodeBlocks(documentationFiles))
            .map((example, index) => this.testCodeCompilation(example, index))
            .finally(() => this.cleanWorkingDirectory());
    }
    cleanWorkingDirectory() {
        return fsExtra.remove(this.workingDirectory);
    }
    extractAllCodeBlocks(documentationFiles) {
        return Bluebird.resolve()
            .then(() => PackageInfo_1.PackageInfo.read())
            .then((packageDefn) => new LocalImportSubstituter_1.LocalImportSubstituter(packageDefn))
            .then((importSubstituter) => {
            return Bluebird.all(documentationFiles)
                .map((file) => this.extractFileCodeBlocks(file, importSubstituter))
                .reduce((previous, current) => {
                return previous.concat(current);
            }, []);
        });
    }
    extractFileCodeBlocks(file, importSubstituter) {
        return CodeBlockExtractor_1.CodeBlockExtractor.extract(file)
            .map((block) => {
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
    testCodeCompilation(example, index) {
        return this.runner.run(example.sanitisedCode)
            .then(() => {
            return {
                snippet: example.snippet,
                file: example.file,
                index: index + 1
            };
        })
            .catch((error) => {
            return {
                snippet: example.snippet,
                error,
                file: example.file,
                index: index + 1
            };
        });
    }
}
exports.SnippetCompiler = SnippetCompiler;
//# sourceMappingURL=SnippetCompiler.js.map