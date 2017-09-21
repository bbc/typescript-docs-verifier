export class CodeWrapper {
  private static defaultImport = "import 'path'"

  private constructor () {}

  static wrap (code: string): string {
    const codeLines = code.split('\n')
    const importLines = CodeWrapper.findImportLines(codeLines)
    const otherLines = codeLines.filter((line) => !line.trim().startsWith('import'))

    const wrappedCode = `${importLines.join('\n')}
      const fn = () => {${otherLines.join('\n')}
      }`
    return wrappedCode
  }

  private static findImportLines (codeLines: string[]): string[] {
    const importLines = codeLines.filter((line) => line.trim().startsWith('import '))
    return importLines.length === 0 ? [CodeWrapper.defaultImport] : importLines
  }
}
