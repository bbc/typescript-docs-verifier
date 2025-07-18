import * as path from "path";
import {
  ConditionalExports,
  PackageDefinition,
  PackageExports,
  SubpathExports,
} from "./PackageInfo";

class ExportResolver {
  private readonly packageName: string;
  private readonly packageMain?: string;
  private readonly packageExports?: PackageExports;

  constructor(
    packageName: string,
    packageMain?: string,
    packageExports?: PackageExports
  ) {
    if (!packageMain && !packageExports) {
      throw new Error(
        "Failed to find a valid main or exports entry in package.json file"
      );
    }

    this.packageName = packageName;
    this.packageMain = packageMain;
    this.packageExports = packageExports;
  }

  private findMatchingExport(path = "."): string {
    if (!this.packageExports) {
      throw new Error("No exports defined in package.json");
    }

    if (typeof this.packageExports === "string" && path === ".") {
      return this.packageExports;
    }

    const conditionalExports = this.packageExports as ConditionalExports;

    const conditionalExportEntry =
      conditionalExports["node-addons"] ??
      conditionalExports.node ??
      conditionalExports.import ??
      conditionalExports.require ??
      conditionalExports.default;

    if (conditionalExportEntry && path === ".") {
      return conditionalExportEntry;
    }

    const subpathExports = this.packageExports as SubpathExports;

    const lookupPath = path === "." ? path : `.${path}`;

    const [matchingExportPath, matchingSubpath] =
      Object.entries(subpathExports).find(([exportedPath]) => {
        if (lookupPath === exportedPath) {
          return true;
        }
        const [prefix, suffix] = exportedPath.split("*");
        return (
          exportedPath.includes("*") &&
          lookupPath.startsWith(prefix) &&
          lookupPath.endsWith(suffix || "")
        );
      }) ?? [];

    if (!matchingExportPath || !matchingSubpath) {
      throw new Error(
        `Unable to resolve export for path "${this.packageName}${
          path === "." ? "" : path
        }"`
      );
    }

    const [exportPrefix, exportSuffix = ""] = matchingExportPath.split("*");
    const internalPath = lookupPath.substring(
      exportPrefix.length,
      lookupPath.length - exportSuffix.length
    );

    const subpathEntry =
      typeof matchingSubpath === "string"
        ? matchingSubpath
        : (matchingSubpath["node-addons"] ??
          matchingSubpath.node ??
          matchingSubpath.import ??
          matchingSubpath.require ??
          matchingSubpath.default);

    if (subpathEntry) {
      const [internalPrefix, internalSuffix = ""] = subpathEntry.split("*");
      return `${internalPrefix}${internalPath}${internalSuffix}`;
    }

    throw new Error(
      `Unable to resolve export for path "${this.packageName}${
        path === "." ? "" : path
      }"`
    );
  }

  resolveExportPath(path?: string): string {
    if (!this.packageExports) {
      if (!this.packageMain) {
        throw new Error("Failed to find main or exports entry in package.json");
      }

      return path ?? this.packageMain;
    }

    const matchingExport = this.findMatchingExport(path);
    return matchingExport;
  }
}

export class LocalImportSubstituter {
  private readonly packageName: string;
  private readonly packageRoot: string;
  private readonly exportResolver: ExportResolver;

  constructor(packageDefinition: PackageDefinition) {
    this.packageName = packageDefinition.name;
    this.packageRoot = packageDefinition.packageRoot;

    this.exportResolver = new ExportResolver(
      packageDefinition.name,
      packageDefinition.main,
      packageDefinition.exports
    );
  }

  substituteLocalPackageImports(code: string) {
    const escapedPackageName = this.packageName.replace(/\\/g, "\\/");
    const projectImportRegex = new RegExp(
      `(from\\s+)?('|")(?:${escapedPackageName})(/[^'"]+)?('|"|)`
    );
    const codeLines = code.split("\n");

    const localisedLines = codeLines.map((line) => {
      const match = projectImportRegex.exec(line);
      if (!match) {
        return line;
      }

      const { 1: from, 2: openQuote, 3: subPath, 4: closeQuote, index } = match;

      const prefix = line.substring(0, index);

      const resolvedExportPath = this.exportResolver.resolveExportPath(subPath);

      const fullExportPath = path
        .join(this.packageRoot, resolvedExportPath)
        .replace(/\\/g, "\\\\");
      return `${prefix}${from || ""}${openQuote}${fullExportPath}${closeQuote}`;
    });
    return localisedLines.join("\n");
  }
}
