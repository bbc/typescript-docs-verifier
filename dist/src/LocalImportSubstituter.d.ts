import { PackageDefinition } from './PackageInfo';
export declare class LocalImportSubstituter {
    private readonly packageName;
    private readonly pathToPackageMain;
    constructor(packageDefinition: PackageDefinition);
    substituteLocalPackageImports(code: string): string;
}
