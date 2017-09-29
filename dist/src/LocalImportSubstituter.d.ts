import { PackageDefinition } from './PackageInfo';
export declare class LocalImportSubstituter {
    private packageName;
    private pathToPackageMain;
    constructor(packageDefinition: PackageDefinition);
    substituteLocalPackageImports(code: string): string;
}
