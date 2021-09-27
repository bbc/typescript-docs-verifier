"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalImportSubstituter = void 0;
const path = require("path");
class LocalImportSubstituter {
    constructor(packageDefinition) {
        this.packageName = packageDefinition.name;
        const mainImport = packageDefinition.main.replace(/\.(ts|js)$/, '');
        this.pathToPackageMain = path.join(process.cwd(), mainImport);
    }
    substituteLocalPackageImports(code) {
        const projectImportRegex = new RegExp(`('${this.packageName}'|"${this.packageName}")`, 'g');
        const codeLines = code.split('\n');
        const localisedLines = codeLines.map((line) => {
            if (line.trim().startsWith('import ')) {
                return line.replace(projectImportRegex, `'${this.pathToPackageMain}'`);
            }
            else {
                return line;
            }
        });
        return localisedLines.join('\n');
    }
}
exports.LocalImportSubstituter = LocalImportSubstituter;
//# sourceMappingURL=LocalImportSubstituter.js.map