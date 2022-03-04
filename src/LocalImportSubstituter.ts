import * as path from 'path'
import { PackageDefinition } from './PackageInfo'

export class LocalImportSubstituter {
  private readonly packageName: string
  private readonly packageRoot: string
  private readonly pathToPackageMain: string

  constructor (packageDefinition: PackageDefinition) {
    this.packageName = packageDefinition.name
    this.packageRoot = packageDefinition.packageRoot
    const mainImport = packageDefinition.main.replace(/\.(ts|js)$/, '')
    this.pathToPackageMain = path.join(packageDefinition.packageRoot, mainImport)
  }

  substituteLocalPackageImports (code: string) {
    const escapedPackageName = this.packageName.replace(/\\/g, '\\/')
    const projectImportRegex = new RegExp(`(?:'|")(${escapedPackageName})(/[^'"]+)?(?:'|"|)`, 'g')
    const codeLines = code.split('\n')
    const localisedLines = codeLines.map((line) => {
      if (line.trim().startsWith('import ') && line.match(projectImportRegex)) {
        const { 2: subPath } = projectImportRegex.exec(line) ?? []

        if (subPath) {
          return line.replace(this.packageName, this.packageRoot)
        }
        return line.replace(this.packageName, `${this.pathToPackageMain}`)
      } else {
        return line
      }
    })
    return localisedLines.join('\n')
  }
}
