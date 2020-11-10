"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageInfo = void 0;
const path = require("path");
const fsExtra = require("fs-extra");
class PackageInfo {
    /* istanbul ignore next */
    constructor() { }
    static read() {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        return fsExtra.readFile(packageJsonPath)
            .then((contents) => JSON.parse(contents.toString()));
    }
}
exports.PackageInfo = PackageInfo;
//# sourceMappingURL=PackageInfo.js.map