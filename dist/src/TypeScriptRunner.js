"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptRunner = void 0;
const path = require("path");
const fsExtra = require("fs-extra");
const TsNode = require("ts-node");
class TypeScriptRunner {
    constructor(workingDirectory, typeScriptOptions) {
        this.workingDirectory = workingDirectory;
        TsNode.register(typeScriptOptions);
        this.compiler = TsNode.create(typeScriptOptions);
    }
    async run(code) {
        const codeFile = await this.writeCodeFile(code);
        this.compiler.compile(code, codeFile);
    }
    async writeCodeFile(code) {
        const id = process.hrtime.bigint().toString();
        const codeFile = path.join(this.workingDirectory, `block-${id}.ts`);
        await fsExtra.writeFile(codeFile, code);
        return codeFile;
    }
}
exports.TypeScriptRunner = TypeScriptRunner;
//# sourceMappingURL=TypeScriptRunner.js.map