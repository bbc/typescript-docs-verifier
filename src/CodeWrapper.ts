export class CodeWrapper {
  /* istanbul ignore next */
  private constructor () {}

  static wrap (code: string): string {
    const codeLines = code.split('\n')
    const importLines = codeLines.filter((line) => line.trim().startsWith('import '))
    const otherLines = codeLines.filter((line) => !line.trim().startsWith('import'))
    const functionName = `fn${Math.random().toString().replace(/\./, '')}`

    const wrappedCode = `${importLines.join('\n')}
      const ${functionName} = () => {${otherLines.join('\n')}
      }`
    return wrappedCode
  }
}
