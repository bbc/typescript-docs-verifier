import * as path from "path";
import chalk from "chalk";
import * as tsconfig from "tsconfig";
import * as fsExtra from "fs-extra";
import * as TSNode from "ts-node";
import { PackageDefinition } from "./PackageInfo";
import { CodeBlockExtractor } from "./CodeBlockExtractor";
import { LocalImportSubstituter } from "./LocalImportSubstituter";

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
  readonly error?: TSNode.TSError | Error;
};

export class SnippetCompiler {
  private readonly compiler: TSNode.Service;

  constructor(
    private readonly workingDirectory: string,
    private readonly packageDefinition: PackageDefinition,
    project?: string
  ) {
    const configOptions = SnippetCompiler.loadTypeScriptConfig(
      packageDefinition.packageRoot,
      project
    );
    this.compiler = TSNode.create(configOptions.config as TSNode.CreateOptions);
  }

  private static loadTypeScriptConfig(
    packageRoot: string,
    project?: string
  ): {
    config: unknown;
  } {
    const fullProjectPath = path.join(packageRoot, project ?? "");
    const { base, dir } = path.parse(fullProjectPath);

    const typeScriptConfig = tsconfig.loadSync(dir, base);
    if (typeScriptConfig?.config?.compilerOptions) {
      typeScriptConfig.config.compilerOptions.noUnusedLocals = false;
    }
    return typeScriptConfig;
  }

  private static escapeRegExp(rawString: string): string {
    return rawString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async compileSnippets(
    documentationFiles: string[]
  ): Promise<SnippetCompilationResult[]> {
    try {
      await this.cleanWorkingDirectory();
      await fsExtra.ensureDir(this.workingDirectory);
      const examples = await this.extractAllCodeBlocks(documentationFiles);
      return await Promise.all(
        examples.map(async (example) => await this.testCodeCompilation(example))
      );
    } finally {
      await this.cleanWorkingDirectory();
    }
  }

  private async cleanWorkingDirectory() {
    return await fsExtra.remove(this.workingDirectory);
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

  private async compile(code: string, type: "ts" | "tsx"): Promise<void> {
    const id = process.hrtime.bigint().toString();
    const codeFile = path.join(this.workingDirectory, `block-${id}.${type}`);
    await fsExtra.writeFile(codeFile, code);
    this.compiler.compile(code, codeFile);
  }

  private removeTemporaryFilePaths(
    message: string,
    example: CodeBlock
  ): string {
    const escapedCompiledDocsFolder = SnippetCompiler.escapeRegExp(
      path.basename(this.workingDirectory)
    );
    const compiledDocsFilePrefixPattern = new RegExp(
      `${escapedCompiledDocsFolder}/block-\\d+\\.ts`,
      "g"
    );
    return message.replace(
      compiledDocsFilePrefixPattern,
      chalk`{blue ${example.file}} → {cyan Code Block ${example.index}}`
    );
  }

  private async testCodeCompilation(
    example: CodeBlock
  ): Promise<SnippetCompilationResult> {
    try {
      await this.compile(example.sanitisedCode, example.type);
      return {
        snippet: example.snippet,
        file: example.file,
        index: example.index,
        linesWithErrors: [],
      };
    } catch (rawError) {
      const error =
        rawError instanceof Error ? rawError : new Error(String(rawError));
      error.message = this.removeTemporaryFilePaths(error.message, example);

      Object.entries(error).forEach(([key, value]) => {
        if (typeof value === "string") {
          error[key as keyof typeof error] = this.removeTemporaryFilePaths(
            value,
            example
          );
        }
      });

      const linesWithErrors = new Set<number>();

      if (error instanceof TSNode.TSError) {
        error.diagnostics.forEach((diagnostic) => {
          const { start } = diagnostic;

          if (typeof start === "undefined") {
            return;
          }

          const lineNumber =
            [...example.sanitisedCode.substring(0, start)].filter(
              (char) => char === "\n"
            ).length + 1;
          linesWithErrors.add(lineNumber);
        });
      }

      return {
        snippet: example.snippet,
        error: error,
        linesWithErrors: [...linesWithErrors],
        file: example.file,
        index: example.index,
      };
    }
  }
}
