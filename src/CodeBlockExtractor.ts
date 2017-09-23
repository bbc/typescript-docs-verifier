import * as Bluebird from 'bluebird'
import * as fsExtra from 'fs-extra'

export class CodeBlockExtractor {
  static readonly TYPESCRIPT_CODE_PATTERN = /(?:```typescript\n)((?:\n|.)*?)(?:(?=```))/gi

  /* istanbul ignore next */
  private constructor () {}

  static extract (markdownFilePath: string): Bluebird<string[]> {
    return Bluebird.resolve()
      .then(() => CodeBlockExtractor.readFile(markdownFilePath))
      .then((contents) => CodeBlockExtractor.extractCodeBlocksFromMarkdown(contents))
      .catch((error) => {
        throw new Error(`Error extracting code blocks from ${markdownFilePath}: ${error.message}`)
      })
  }

  private static readFile (path: string): Promise<string> {
    return fsExtra.readFile(path)
      .then((buffer) => buffer.toString())
  }

  private static extractCodeBlocksFromMarkdown (markdown: string): string[] {
    const codeBlocks: string[] = []
    markdown.replace(this.TYPESCRIPT_CODE_PATTERN, (fullMatch, code) => {
      codeBlocks.push(code)
      return code
    })
    return codeBlocks
  }
}
