import * as tsconfig from 'tsconfig'
import * as Bluebird from 'bluebird'
import * as fsExtra from 'fs-extra'
import { TSError } from 'ts-node/dist/index'
import { TypeScriptRunner } from './TypeScriptRunner'
import { PackageInfo } from './PackageInfo'
import { CodeBlockExtractor } from './CodeBlockExtractor'
import { LocalImportSubstituter } from './LocalImportSubstituter'
import { CodeWrapper } from './CodeWrapper'

interface CodeBlock {
  readonly file: string
  readonly snippet: string
  readonly sanitisedCode: string
}

export interface SnippetCompilationResult {
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
    if (typeScriptConfig &&
        typeScriptConfig.config &&
        typeScriptConfig.config.compilerOptions) {
      typeScriptConfig.config.compilerOptions.noUnusedLocals = false
    }
    return typeScriptConfig
  }

  compileSnippets (documentationFiles: string[]): Bluebird<SnippetCompilationResult[]> {
    return Bluebird.resolve()
      .then(() => this.cleanWorkingDirectory())
      .then(() => fsExtra.ensureDir(this.workingDirectory))
      .then(() => this.extractAllCodeBlocks(documentationFiles))
      .map((example: CodeBlock, index) => this.testCodeCompilation(example, index))
      .finally(() => this.cleanWorkingDirectory())
  }

  private cleanWorkingDirectory () {
    return fsExtra.remove(this.workingDirectory)
  }

  private extractAllCodeBlocks (documentationFiles: string[]) {
    return Bluebird.resolve()
      .then(() => PackageInfo.read())
      .then((packageDefn) => new LocalImportSubstituter(packageDefn))
      .then((importSubstituter) => {
        return Bluebird.all(documentationFiles)
          .map((file: string) => this.extractFileCodeBlocks(file, importSubstituter))
          .reduce((previous: CodeBlock[], current: CodeBlock[]) => {
            return previous.concat(current)
          }, [])
      })
  }

  private extractFileCodeBlocks (file: string, importSubstituter: LocalImportSubstituter): Bluebird<CodeBlock[]> {
    return Bluebird.resolve()
      .then(() => CodeBlockExtractor.extract(file))
      .map((block: string) => {
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

  private testCodeCompilation (example: CodeBlock, index: number): Promise<SnippetCompilationResult> {
    return this.runner.run(example.sanitisedCode)
      .then(() => {
        return {
          snippet: example.snippet,
          file: example.file,
          index: index + 1
        }
      })
      .catch((error) => {
        return {
          snippet: example.snippet,
          error,
          file: example.file,
          index: index + 1
        }
      })
  }
}
