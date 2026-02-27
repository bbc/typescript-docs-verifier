import fs from "fs";
import ts from "typescript";
import { PackageDefinition } from "./PackageInfo";
import { CodeBlockExtractor } from "./CodeBlockExtractor";
import { LocalImportSubstituter } from "./LocalImportSubstituter";
import { compile } from "./CodeCompiler";

type CodeBlock = {
  readonly file: string;
  readonly index: number;
  readonly snippet: string;
  readonly sanitisedCode: string;
  readonly type: "ts" | "tsx";
};

export type SnippetCompilationResult = {
  readonly file: string;
  readonly index: number;
  readonly snippet: string;
  readonly linesWithErrors: number[];
  readonly error?: CompilationError | Error;
};

export class CompilationError extends Error {
  diagnosticCodes: number[];
  name: string;
  diagnosticText: string;
  diagnostics: ts.Diagnostic[];

  constructor(diagnosticText: string, diagnostics?: ts.Diagnostic[]) {
    super(diagnosticText);
    this.name = this.constructor.name;
    this.diagnosticText = diagnosticText;
    this.diagnosticCodes = diagnostics?.map(({ code }) => code) ?? [];
    this.diagnostics = diagnostics ?? [];
  }
}

export class SnippetCompiler {
  private readonly compilerOptions: ts.CompilerOptions;

  constructor(
    private readonly workingDirectory: string,
    private readonly packageDefinition: PackageDefinition,
    project?: string
  ) {
    const configOptions = SnippetCompiler.loadTypeScriptConfig(
      packageDefinition.packageRoot,
      project
    );
    this.compilerOptions = configOptions.options;
  }

  private static loadTypeScriptConfig(
    packageRoot: string,
    project?: string
  ): ts.ParsedCommandLine {
    const configFile = ts.findConfigFile(
      packageRoot,
      (...args) => ts.sys.fileExists(...args),
      project
    );

    if (!configFile) {
      throw new Error(
        `Unable to find TypeScript configuration file in ${packageRoot}`
      );
    }

    const fileContents = fs.readFileSync(configFile, "utf-8");
    const result = ts.parseConfigFileTextToJson(configFile, fileContents);

    if (result.error) {
      throw new Error(
        `Error reading tsconfig from ${configFile}: ${ts.flattenDiagnosticMessageText(result.error.messageText, ts.sys.newLine)}`
      );
    }

    const parsedConfig = ts.parseJsonConfigFileContent(
      result.config,
      {
        fileExists: (...args) => ts.sys.fileExists(...args),
        readDirectory: (...args) => ts.sys.readDirectory(...args),
        readFile: (...args) => ts.sys.readFile(...args),
        useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
      },
      packageRoot
    );

    return parsedConfig;
  }
  async compileSnippets(
    documentationFiles: string[]
  ): Promise<SnippetCompilationResult[]> {
    const results: SnippetCompilationResult[] = [];
    const examples = await this.extractAllCodeBlocks(documentationFiles);

    for (const example of examples) {
      const result = this.testCodeCompilation(example);
      results.push(result);

      // Yield to event loop
      await new Promise((resolve) => setImmediate(resolve));
    }
    return results;
  }

  private async extractAllCodeBlocks(documentationFiles: string[]) {
    const importSubstituter = new LocalImportSubstituter(
      this.packageDefinition
    );

    const codeBlocks = await Promise.all(
      documentationFiles.map(
        async (file) =>
          await this.extractFileCodeBlocks(file, importSubstituter)
      )
    );
    return codeBlocks.flat();
  }

  private async extractFileCodeBlocks(
    file: string,
    importSubstituter: LocalImportSubstituter
  ): Promise<CodeBlock[]> {
    const blocks = await CodeBlockExtractor.extract(file);
    return blocks.map(({ code, type }, index) => {
      return {
        file,
        type,
        snippet: code,
        index: index + 1,
        sanitisedCode: this.sanitiseCodeBlock(importSubstituter, code),
      };
    });
  }

  private sanitiseCodeBlock(
    importSubstituter: LocalImportSubstituter,
    block: string
  ): string {
    const localisedBlock =
      importSubstituter.substituteLocalPackageImports(block);
    return localisedBlock;
  }

  private testCodeCompilation(example: CodeBlock): SnippetCompilationResult {
    try {
      const { hasError, diagnostics } = compile({
        compilerOptions: this.compilerOptions,
        workingDirectory: this.workingDirectory,
        code: example.sanitisedCode,
        type: example.type,
      });

      if (!hasError) {
        return {
          snippet: example.snippet,
          file: example.file,
          index: example.index,
          linesWithErrors: [],
        };
      }

      const linesWithErrors = new Set<number>();

      const enrichedDiagnostics = diagnostics.map((diagnostic) => {
        if (typeof diagnostic.start !== "undefined") {
          const startLine =
            [...example.sanitisedCode.substring(0, diagnostic.start)].filter(
              (char) => char === ts.sys.newLine
            ).length + 1;
          linesWithErrors.add(startLine);
        }

        return {
          ...diagnostic,
          file: diagnostic.file
            ? {
                ...diagnostic.file,
                fileName: `${example.file} → Code Block ${example.index}`,
              }
            : undefined,
        };
      });

      const formatter = process.stdout.isTTY
        ? ts.formatDiagnosticsWithColorAndContext
        : ts.formatDiagnostics;

      const diagnosticText = formatter(enrichedDiagnostics, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => this.workingDirectory,
        getNewLine: () => ts.sys.newLine,
      });

      const error = new CompilationError(
        `⨯ Unable to compile TypeScript:\n${diagnosticText}`,
        enrichedDiagnostics
      );

      return {
        snippet: example.snippet,
        file: example.file,
        error: error,
        index: example.index,
        linesWithErrors: [...linesWithErrors],
      };
    } catch (rawError) {
      const error =
        rawError instanceof Error ? rawError : new Error(String(rawError));

      return {
        snippet: example.snippet,
        error: error,
        linesWithErrors: [],
        file: example.file,
        index: example.index,
      };
    }
  }
}
