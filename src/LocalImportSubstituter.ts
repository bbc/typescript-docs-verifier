import * as path from 'path'
import { ConditionalExports, PackageDefinition, PackageExports, SubpathExports } from './PackageInfo'

class ExportResolver {
  private readonly packageMain?: string
  private readonly packageExports?: PackageExports

  constructor (packageMain?: string, packageExports?: PackageExports) {
    this.packageMain = packageMain
    this.packageExports = packageExports
  }

  private findHighestPriorityExports (): SubpathExports {
    const conditionalExports = this.packageExports as ConditionalExports

    const conditionalExportEntry = conditionalExports['node-addons'] ??
      conditionalExports.node ??
      conditionalExports.require ??
      conditionalExports.default

    if (conditionalExportEntry) {
      return conditionalExportEntry
    }

    return this.packageExports as SubpathExports
  }

  stripSuffix (filePath: string): string {
    return filePath.replace(/\.(ts|js)$/, '')
  }

  resolveExportPath (path?: string): string {
    if (!this.packageExports) {
      const packageMain = this.packageMain

      if (!packageMain) {
        throw new Error('Failed to find main or exports entry in package.json')
      }

      return path ?? this.stripSuffix(packageMain)
    }

    const subpathExports = this.findHighestPriorityExports()

    if (!path) {
      if (typeof subpathExports === 'string') {
        return this.stripSuffix(subpathExports)
      }

      const rootExport = subpathExports['.']

      if (!rootExport) {
        throw new Error('No "." value found in package.json exports entry')
      }
      return this.stripSuffix(rootExport)
    }

    // TODO: match subpathExports against provided subpath
    throw new Error(`No package.json exports entry found matching subpath ${path}`)
  }
}

export class LocalImportSubstituter {
  private readonly packageName: string
  private readonly packageRoot: string
  private readonly exportResolver: ExportResolver
  // private readonly pathToPackageMain: string

  constructor (packageDefinition: PackageDefinition) {
    this.packageName = packageDefinition.name
    this.packageRoot = packageDefinition.packageRoot
    // const packageFile =
    //   LocalImportSubstituter.resolvePathToPackageFile(packageDefinition)

    this.exportResolver = new ExportResolver(packageDefinition.main, packageDefinition.exports)

    // this.pathToPackageMain = path.join(
    //   packageDefinition.packageRoot,
    //   packageFile.replace(/\.(ts|js)$/, '')
    // )
  }

  // private static resolveExportsValue (
  //   exportsEntry?: string | Record<string, string | undefined>
  // ): string | null {
  //   if (typeof exportsEntry === 'undefined') {
  //     return null
  //   }

  //   if (typeof exportsEntry === 'string') {
  //     return exportsEntry
  //   }

  //   return exportsEntry?.['.'] ?? null
  // }

  // private static resolvePathToPackageFile (packageDefinition: PackageDefinition): string {
  //   if (typeof packageDefinition.exports === 'string') {
  //     return packageDefinition.exports
  //   }

  //   const subpathExports = packageDefinition.exports as SubpathExports
  //   const conditionalExports = packageDefinition.exports as ConditionalExports

  //   const packageMainFile = subpathExports?.['.' as SubpathPattern] ??
  //       LocalImportSubstituter.resolveExportsValue(conditionalExports?.['node-addons']) ??
  //       LocalImportSubstituter.resolveExportsValue(conditionalExports?.node) ??
  //       LocalImportSubstituter.resolveExportsValue(conditionalExports?.require) ??
  //       LocalImportSubstituter.resolveExportsValue(conditionalExports?.default) ??
  //       packageDefinition.main

  //   if (typeof packageMainFile !== 'string') {
  //     throw new Error(
  //       'Failed to find a valid main or exports entry in package.json file'
  //     )
  //   }

  //   return packageMainFile
  // }

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

      const resolvedExportPath = this.exportResolver.resolveExportPath(subPath)

      const fullExportPath = path.join(this.packageRoot, resolvedExportPath)
      return `${prefix}${openQuote}${fullExportPath}${closeQuote}`

      //   if (subPath) {
      //     const matchedSubPath = this.exportResolver.resolveExportPath(subPath)

      //     if (!matchedSubPath) {
      //       throw new Error(`Unable to find matching subpath export in package JSON exports property for path ${matchedSubPath}`)
      //     }
      //     return `${prefix}${openQuote}${this.packageRoot}${matchedSubPath}${closeQuote}`
      //   }

      //   return `${prefix}${openQuote}${this.pathToPackageMain}${closeQuote}`
    })
    return localisedLines.join('\n')
  }
}
