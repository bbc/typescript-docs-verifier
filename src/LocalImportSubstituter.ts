import * as path from 'path'
import { PackageDefinition } from './PackageInfo'

export class LocalImportSubstituter {
  private readonly packageName: string
  private readonly pathToPackageMain: string

  constructor (packageDefinition: PackageDefinition) {
    this.packageName = packageDefinition.name
    const mainImport = packageDefinition.main.replace(/\.(ts|js)$/, '')
    this.pathToPackageMain = path.join(process.cwd(), mainImport)
  }

  substituteLocalPackageImports (code: string) {
    const projectImportRegex = new RegExp(`('${this.escapedPackageName()}'|"${this.escapedPackageName()}")`, 'g')
    const projectPathImportRegex = new RegExp(`('${this.escapedPackageName()}/)(.+)'|"(${this.escapedPackageName()}/)(.+)"`, 'g')
    const codeLines = code.split('\n')
    const localisedLines = codeLines.map((line) => {
      if (line.trim().startsWith('import ')) {
        if (projectImportRegex.test(line)) {
          return line.replace(projectImportRegex, `'${this.pathToPackageMain}'`)
        } else {
          return line.replace(projectPathImportRegex, (_match, _p1, singleQuotePath, _p3, doubleQuotePath) => {
            return `'${path.join(this.pathToPackageMain, '..', singleQuotePath ?? doubleQuotePath)}'`
          })
        }
      } else {
        return line
      }
    })
    return localisedLines.join('\n')
  }

  escapedPackageName () {
    return this.packageName.replace(/[\\/@]/g, '\\$&')
  }
}
