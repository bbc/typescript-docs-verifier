export class CodeWrapper {
  /* istanbul ignore next */
  private constructor () {}

  static wrap (code: string): string {
    const codeLines = code.split('\n')
    const importLines = codeLines.filter((line) => line.trim().startsWith('import '))
    const otherLines = codeLines.filter((line) => !line.trim().startsWith('import'))
    const functionName = `fn${Math.random().toString().replace(/\./, '')}`
    const mainCode = importLines.length === 0 ? otherLines.join('\n') : '\n' + otherLines.join('\n')

    const wrappedCode = `${importLines.join('\n')}; const ${functionName} = () => {${mainCode}
    }`
    return wrappedCode
  }
}
