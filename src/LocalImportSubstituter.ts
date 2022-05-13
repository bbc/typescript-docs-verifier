import * as path from 'path'
import { PackageDefinition } from './PackageInfo'

export class LocalImportSubstituter {
  private readonly packageName: string
  private readonly packageRoot: string
  private readonly pathToPackageMain: string

  constructor (packageDefinition: PackageDefinition) {
    this.packageName = packageDefinition.name
    this.packageRoot = packageDefinition.packageRoot
    const packageFile = LocalImportSubstituter.resolvePathToPackageFile(packageDefinition)

    this.pathToPackageMain = path.join(packageDefinition.packageRoot, packageFile.replace(/\.(ts|js)$/, ''))
  }

  private static resolveExportsValue (exportsEntry?: string | Record<string, string | undefined>): string | null {
    if (typeof exportsEntry === 'undefined') {
      return null
    }

    if (typeof exportsEntry === 'string') {
      return exportsEntry
    }

    return exportsEntry?.['.'] ?? null
  }

  private static resolvePathToPackageFile (packageDefinition: PackageDefinition): string {
    if (typeof packageDefinition.exports === 'string') {
      return packageDefinition.exports
    }

    const packageMainFile = packageDefinition.exports?.['.'] ??
        LocalImportSubstituter.resolveExportsValue(packageDefinition.exports?.['node-addons']) ??
        LocalImportSubstituter.resolveExportsValue(packageDefinition.exports?.node) ??
        LocalImportSubstituter.resolveExportsValue(packageDefinition.exports?.require) ??
        LocalImportSubstituter.resolveExportsValue(packageDefinition.exports?.default) ??
        packageDefinition.main

    if (typeof packageMainFile !== 'string') {
      throw new Error('Failed to find a valid main or exports entry in package.json file')
    }

    return packageMainFile
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
