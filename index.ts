import * as os from 'os'
import * as path from 'path'
import { PackageInfo } from './src/PackageInfo'
import { SnippetCompiler, SnippetCompilationResult } from './src/SnippetCompiler'

export { SnippetCompilationResult } from './src/SnippetCompiler'

const DEFAULT_FILES = ['README.md']

const wrapIfString = (arrayOrString: string[] | string) => {
  if (Array.isArray(arrayOrString)) {
    return arrayOrString
  } else {
    return [arrayOrString]
  }
}

export async function compileSnippets (markdownFileOrFiles: string | string[] = DEFAULT_FILES): Promise<SnippetCompilationResult[]> {
  const compiledDocsFolder = path.join(os.tmpdir(), 'compiled-docs')
  const packageDefinition = await PackageInfo.read()
  const compiler = new SnippetCompiler(compiledDocsFolder, packageDefinition)
  const fileArray = wrapIfString(markdownFileOrFiles)
  const results = await compiler.compileSnippets(fileArray)
  return results
}
