"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptRunner = void 0;
const path = require("path");
const fsExtra = require("fs-extra");
const TsNode = require("ts-node/dist/index");
class TypeScriptRunner {
    constructor(workingDirectory, typeScriptOptions) {
        this.workingDirectory = workingDirectory;
        TsNode.register(typeScriptOptions);
    }
    run(code) {
        return Promise.resolve()
            .then(() => this.writeCodeFile(code))
            .then((codeFile) => {
            require(codeFile);
        });
    }
    writeCodeFile(code) {
        const id = Math.random();
        const codeFile = path.join(this.workingDirectory, `block-${id}.ts`);
        return fsExtra.writeFile(codeFile, code)
            .then(() => codeFile);
    }
}
exports.TypeScriptRunner = TypeScriptRunner;
//# sourceMappingURL=TypeScriptRunner.js.map