"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeWrapper = void 0;
class CodeWrapper {
    /* istanbul ignore next */
    constructor() { }
    static wrap(code) {
        const codeLines = code.split('\n');
        const importLines = codeLines.filter((line) => line.trim().startsWith('import '));
        const otherLines = codeLines.filter((line) => !line.trim().startsWith('import'));
        const functionName = `fn${Math.random().toString().replace(/\./, '')}`;
        const mainCode = importLines.length === 0 ? otherLines.join('\n') : '\n' + otherLines.join('\n');
        const wrappedCode = `${importLines.join('\n')}; const ${functionName} = () => {${mainCode}
    }`;
        return wrappedCode;
    }
}
exports.CodeWrapper = CodeWrapper;
//# sourceMappingURL=CodeWrapper.js.map