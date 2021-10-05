import * as path from 'path'
import { SnippetCompiler, SnippetCompilationResult } from './src/SnippetCompiler'

export { SnippetCompilationResult } from './src/SnippetCompiler'

const DEFAULT_FILES = ['README.md']
const COMPILED_DOCS_FOLDER = 'compiled-docs'

const wrapIfString = (arrayOrString: string[] | string) => {
  if (Array.isArray(arrayOrString)) {
    return arrayOrString
  } else {
    return [arrayOrString]
  }
}

export async function compileSnippets (markdownFileOrFiles: string | string[] = DEFAULT_FILES): Promise<SnippetCompilationResult[]> {
  const workingDirectory = path.join(process.cwd(), COMPILED_DOCS_FOLDER)
  const compiler = new SnippetCompiler(workingDirectory)
  const fileArray = wrapIfString(markdownFileOrFiles)
  return await compiler.compileSnippets(fileArray)
}
