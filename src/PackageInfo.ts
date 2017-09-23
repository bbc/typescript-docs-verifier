import * as path from 'path'
import * as fsExtra from 'fs-extra'

export interface PackageDefinition {
  readonly name: string
  readonly main: string
}

export class PackageInfo {
  /* istanbul ignore next */
  private constructor () {}

  static read (): Promise<PackageDefinition> {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    return fsExtra.readFile(packageJsonPath)
      .then((contents) => JSON.parse(contents.toString()))
  }
}
