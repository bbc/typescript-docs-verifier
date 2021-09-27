export interface PackageDefinition {
    readonly name: string;
    readonly main: string;
}
export declare class PackageInfo {
    private constructor();
    static read(): Promise<PackageDefinition>;
}
