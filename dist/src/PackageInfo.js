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
exports.PackageInfo = void 0;
const path = __importStar(require("path"));
const fsExtra = __importStar(require("fs-extra"));
const searchParentsForPackage = async (currentPath) => {
    try {
        await fsExtra.readFile(path.join(currentPath, 'package.json'));
        return currentPath;
    }
    catch {
        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath) {
            throw new Error('Failed to find package.json — are you running this inside a NodeJS project?');
        }
        return await searchParentsForPackage(parentPath);
    }
};
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class PackageInfo {
    /* istanbul ignore next */
    constructor() { }
    static async read() {
        const packageRoot = await searchParentsForPackage(process.cwd());
        const packageJsonPath = path.join(packageRoot, 'package.json');
        const contents = await fsExtra.readFile(packageJsonPath, 'utf-8');
        const packageInfo = JSON.parse(contents);
        return {
            name: packageInfo.name,
            main: packageInfo.main,
            packageRoot
        };
    }
}
exports.PackageInfo = PackageInfo;
//# sourceMappingURL=PackageInfo.js.map