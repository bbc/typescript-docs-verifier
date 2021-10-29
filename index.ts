import * as os from 'os'
import * as path from 'path'
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
  const compiler = new SnippetCompiler(compiledDocsFolder)
  const fileArray = wrapIfString(markdownFileOrFiles)
  const results = await compiler.compileSnippets(fileArray)
  return results
}
