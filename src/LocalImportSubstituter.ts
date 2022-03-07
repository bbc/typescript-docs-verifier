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
    const projectImportRegex = new RegExp(`('|")(?:${escapedPackageName})(/[^'"]+)?('|"|)`)
    const codeLines = code.split('\n')

    const localisedLines = codeLines.map((line) => {
      if (!line.trim().startsWith('import ')) {
        return line
      }

      const match = projectImportRegex.exec(line)
      if (!match) {
        return line
      }

      const { 1: openQuote, 2: subPath, 3: closeQuote, index } = match

      const prefix = line.substring(0, index)

      if (subPath) {
        return `${prefix}${openQuote}${this.packageRoot}${subPath}${closeQuote}`
      }

      return `${prefix}${openQuote}${this.pathToPackageMain}${closeQuote}`
    })
    return localisedLines.join('\n')
  }
}
