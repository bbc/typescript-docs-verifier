import * as fsExtra from 'fs-extra'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CodeBlockExtractor {
  static readonly TYPESCRIPT_CODE_PATTERN = /(?<!(?:<!--\s*ts-docs-verifier:ignore\s*-->[\r\n]*))(?:```(?:(?:typescript)|(?:ts))\n)((?:\n|.)*?)(?:(?=```))/gi

  /* istanbul ignore next */
  private constructor () {}

  static async extract (markdownFilePath: string): Promise<string[]> {
    try {
      const contents = await CodeBlockExtractor.readFile(markdownFilePath)
      return CodeBlockExtractor.extractCodeBlocksFromMarkdown(contents)
    } catch (error) {
      throw new Error(`Error extracting code blocks from ${markdownFilePath}: ${error instanceof Error ? error.message : error}`)
    }
  }

  private static async readFile (path: string): Promise<string> {
    return await fsExtra.readFile(path, 'utf-8')
  }

  private static extractCodeBlocksFromMarkdown (markdown: string): string[] {
    const codeBlocks: string[] = []
    markdown.replace(this.TYPESCRIPT_CODE_PATTERN, (_, code) => {
      codeBlocks.push(code)
      return code
    })
    return codeBlocks
  }
}
