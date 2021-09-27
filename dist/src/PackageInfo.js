"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageInfo = void 0;
const path = require("path");
const fsExtra = require("fs-extra");
class PackageInfo {
    /* istanbul ignore next */
    constructor() { }
    static async read() {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const contents = await fsExtra.readFile(packageJsonPath, 'utf-8');
        return JSON.parse(contents);
    }
}
exports.PackageInfo = PackageInfo;
//# sourceMappingURL=PackageInfo.js.map