import * as path from 'path'
import { PackageDefinition } from './PackageInfo'

export class CodeWrapper {
  static wrap (code: string, packageDefinition: PackageDefinition): string {
    const projectImportRegex = new RegExp(`('${packageDefinition.name}'|"${packageDefinition.name}")`, 'g')
    const codeLines = code.split('\n')
    const importLines = codeLines.filter((line) => line.trim().startsWith('import '))
    const packageEntryPoint = path.join(process.cwd(), packageDefinition.main)
    const localisedImportLines = importLines.map((line) => line.replace(projectImportRegex, `'${packageEntryPoint}'`))
    const otherLines = codeLines.filter((line) => !line.trim().startsWith('import'))

    const wrappedCode = `${localisedImportLines.join('\n')}
      const fn = () => {${otherLines.join('\n')}
      }`
    return wrappedCode
  }
}
