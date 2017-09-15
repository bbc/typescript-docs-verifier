import * as path from 'path'
import * as tsconfig from 'tsconfig'
import * as Bluebird from 'bluebird'
import * as fsExtra from 'fs-extra'
import { TSError } from 'ts-node/dist/index'
import { TypeScriptRunner } from './TypeScriptRunner'
import { PackageInfo, PackageDefinition } from './PackageInfo'
import { CodeBlockExtractor } from './CodeBlockExtractor'
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
  readonly error?: TSError
}

export class SnippetCompiler {
  private static readonly WORKING_DIRECTORY = path.join(process.cwd(), 'compiled-docs')

  private constructor () {}

  static compileSnippets (documentationFiles: string[] | string = ['README.md']): Bluebird<SnippetCompilationResult[]> {
    const files = SnippetCompiler.wrapIfString(documentationFiles)
    const configOptions = tsconfig.loadSync(process.cwd())
    const runner = new TypeScriptRunner(SnippetCompiler.WORKING_DIRECTORY, configOptions.config.compilerOptions)

    return Bluebird.resolve()
      .then(SnippetCompiler.cleanWorkingDirectory)
      .then(() => fsExtra.ensureDir(SnippetCompiler.WORKING_DIRECTORY))
      .then(() => SnippetCompiler.extractAllCodeBlocks(files))
      .map<CodeBlock, SnippetCompilationResult>((example, index) => SnippetCompiler.testCodeCompilation(example, index, runner))
      .finally(SnippetCompiler.cleanWorkingDirectory)
  }

  private static wrapIfString (arrayOrString: string[] | string) {
    if (Array.isArray(arrayOrString)) {
      return arrayOrString
    } else {
      return [arrayOrString]
    }
  }

  private static cleanWorkingDirectory () {
    return fsExtra.remove(SnippetCompiler.WORKING_DIRECTORY)
  }

  private static extractAllCodeBlocks = (documentationFiles: string[]) => {
    return Bluebird.resolve()
      .then(() => PackageInfo.read())
      .then((packageDefn) => {
        return Bluebird.all(documentationFiles)
          .map((file: string) => SnippetCompiler.extractFileCodeBlocks(file, packageDefn))
          .reduce((previous: CodeBlock[], current: CodeBlock[]) => {
            return previous.concat(current)
          }, [])
      })
  }

  private static extractFileCodeBlocks = (file: string, packageDefn: PackageDefinition): Bluebird<CodeBlock[]> => {
    return CodeBlockExtractor.extract(file)
      .map((block: string) => {
        return {
          file,
          snippet: block,
          sanitisedCode: CodeWrapper.wrap(block, packageDefn)
        }
      })
  }

  private static testCodeCompilation (example: CodeBlock, index: number, runner: TypeScriptRunner): Promise<SnippetCompilationResult> {
    return runner.run(example.sanitisedCode)
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
