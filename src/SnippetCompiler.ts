import * as tsconfig from 'tsconfig'
import * as fsExtra from 'fs-extra'
import { TSError } from 'ts-node'
import { TypeScriptRunner } from './TypeScriptRunner'
import { PackageInfo } from './PackageInfo'
import { CodeBlockExtractor } from './CodeBlockExtractor'
import { LocalImportSubstituter } from './LocalImportSubstituter'
import { CodeWrapper } from './CodeWrapper'

type CodeBlock = {
  readonly file: string
  readonly snippet: string
  readonly sanitisedCode: string
}

export type SnippetCompilationResult = {
  readonly file: string
  readonly index: number
  readonly snippet: string
  readonly error?: TSError | Error
}

export class SnippetCompiler {
  private readonly runner: TypeScriptRunner

  constructor (private readonly workingDirectory: string) {
    const configOptions = SnippetCompiler.loadTypeScriptConfig()
    this.runner = new TypeScriptRunner(this.workingDirectory, configOptions.config)
  }

  private static loadTypeScriptConfig (): any {
    const typeScriptConfig = tsconfig.loadSync(process.cwd())
    if (typeScriptConfig?.config?.compilerOptions) {
      typeScriptConfig.config.compilerOptions.noUnusedLocals = false
    }
    return typeScriptConfig
  }

  async compileSnippets (documentationFiles: string[]): Promise<SnippetCompilationResult[]> {
    try {
      await this.cleanWorkingDirectory()
      await fsExtra.ensureDir(this.workingDirectory)
      const examples = await this.extractAllCodeBlocks(documentationFiles)
      return await Promise.all(
        examples.map(async (example, index) => await this.testCodeCompilation(example, index))
      )
    } finally {
      await this.cleanWorkingDirectory()
    }
  }

  private async cleanWorkingDirectory () {
    return await fsExtra.remove(this.workingDirectory)
  }

  private async extractAllCodeBlocks (documentationFiles: string[]) {
    const packageDefn = await PackageInfo.read()
    const importSubstituter = new LocalImportSubstituter(packageDefn)

    const codeBlocks = await Promise.all(documentationFiles.map(async (file) => await this.extractFileCodeBlocks(file, importSubstituter)))
    return codeBlocks.flat()
  }

  private async extractFileCodeBlocks (file: string, importSubstituter: LocalImportSubstituter): Promise<CodeBlock[]> {
    const blocks = await CodeBlockExtractor.extract(file)
    return blocks.map((block: string) => {
      return {
        file,
        snippet: block,
        sanitisedCode: this.sanitiseCodeBlock(importSubstituter, block)
      }
    })
  }

  private sanitiseCodeBlock (importSubstituter: LocalImportSubstituter, block: string): string {
    const localisedBlock = importSubstituter.substituteLocalPackageImports(block)
    return CodeWrapper.wrap(localisedBlock)
  }

  private async testCodeCompilation (example: CodeBlock, index: number): Promise<SnippetCompilationResult> {
    try {
      await this.runner.run(example.sanitisedCode)
      return {
        snippet: example.snippet,
        file: example.file,
        index: index + 1
      }
    } catch (error) {
      const wrappedError = error instanceof Error ? error : new Error(String(error))

      return {
        snippet: example.snippet,
        error: wrappedError,
        file: example.file,
        index: index + 1
      }
    }
  }
}
