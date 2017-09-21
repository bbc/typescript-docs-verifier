export class CodeWrapper {
  private constructor () {}

  static wrap (code: string): string {
    const codeLines = code.split('\n')
    const importLines = codeLines.filter((line) => line.trim().startsWith('import '))
    const otherLines = codeLines.filter((line) => !line.trim().startsWith('import'))

    const wrappedCode = `${importLines.join('\n')}
      const fn = () => {${otherLines.join('\n')}
      }`
    return wrappedCode
  }
}
