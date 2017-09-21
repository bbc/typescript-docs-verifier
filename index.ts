import * as Bluebird from 'bluebird'
import { SnippetCompiler, SnippetCompilationResult } from './src/SnippetCompiler'

export function compileSnippets (documentationFiles?: string | string[]) {
  return SnippetCompiler.compileSnippets(documentationFiles)
}
