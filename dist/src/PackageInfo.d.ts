export declare type PackageDefinition = {
    readonly name: string;
    readonly main: string;
    readonly packageRoot: string;
};
export declare class PackageInfo {
    private constructor();
    static read(): Promise<PackageDefinition>;
}
