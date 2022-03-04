import * as path from 'path'
import { PackageDefinition } from './PackageInfo'

export class LocalImportSubstituter {
  private readonly packageName: string
  private readonly pathToPackageMain: string

  constructor (packageDefinition: PackageDefinition) {
    this.packageName = packageDefinition.name
    const mainImport = packageDefinition.main.replace(/\.(ts|js)$/, '')
    this.pathToPackageMain = path.join(packageDefinition.packageRoot, mainImport)
  }

  substituteLocalPackageImports (code: string) {
    const escapedPackageName = this.packageName.replace(/\\/g, '\\/')
    const projectImportRegex = new RegExp(`(?:'|")(${escapedPackageName})(/[^'"]+)?(?:'|"|)`, 'g')
    const codeLines = code.split('\n')
    const localisedLines = codeLines.map((line) => {
      if (line.trim().startsWith('import ') && line.match(projectImportRegex)) {
        const { 2: subPath } = line.match(projectImportRegex) ?? []
        return line.replace(this.packageName, `${this.pathToPackageMain}${subPath ?? ''}`)
      } else {
        return line
      }
    })
    return localisedLines.join('\n')
  }
}
