import * as path from 'path'
import { PackageDefinition } from './PackageInfo'

export class LocalImportSubstituter {
  private packageName: string
  private pathToPackageMain: string

  constructor (packageDefinition: PackageDefinition) {
    this.packageName = packageDefinition.name
    const mainImport = packageDefinition.main.replace(/\.(ts|js)$/, '')
    this.pathToPackageMain = path.join(process.cwd(), mainImport)
  }

  substituteLocalPackageImports (code: string) {
    const projectImportRegex = new RegExp(`('${this.packageName}'|"${this.packageName}")`, 'g')
    const codeLines = code.split('\n')
    const localisedLines = codeLines.map((line) => {
      if (line.trim().startsWith('import ')) {
        return line.replace(projectImportRegex, `'${this.pathToPackageMain}'`)
      } else {
        return line
      }
    })
    return localisedLines.join('\n')
  }
}
