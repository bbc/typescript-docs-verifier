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
exports.LocalImportSubstituter = void 0;
const path = __importStar(require("path"));
class LocalImportSubstituter {
    constructor(packageDefinition) {
        this.packageName = packageDefinition.name;
        this.packageRoot = packageDefinition.packageRoot;
        const mainImport = packageDefinition.main.replace(/\.(ts|js)$/, '');
        this.pathToPackageMain = path.join(packageDefinition.packageRoot, mainImport);
    }
    substituteLocalPackageImports(code) {
        const escapedPackageName = this.packageName.replace(/\\/g, '\\/');
        const projectImportRegex = new RegExp(`('|")(?:${escapedPackageName})(/[^'"]+)?('|"|)`);
        const codeLines = code.split('\n');
        const localisedLines = codeLines.map((line) => {
            if (!line.trim().startsWith('import ')) {
                return line;
            }
            const match = projectImportRegex.exec(line);
            if (!match) {
                return line;
            }
            const { 1: openQuote, 2: subPath, 3: closeQuote, index } = match;
            const prefix = line.substring(0, index);
            if (subPath) {
                return `${prefix}${openQuote}${this.packageRoot}${subPath}${closeQuote}`;
            }
            return `${prefix}${openQuote}${this.pathToPackageMain}${closeQuote}`;
        });
        return localisedLines.join('\n');
    }
}
exports.LocalImportSubstituter = LocalImportSubstituter;
//# sourceMappingURL=LocalImportSubstituter.js.map