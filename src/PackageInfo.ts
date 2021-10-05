import * as path from 'path'
import * as fsExtra from 'fs-extra'

export type PackageDefinition = {
  readonly name: string
  readonly main: string
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PackageInfo {
  /* istanbul ignore next */
  private constructor () {}

  static async read (): Promise<PackageDefinition> {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const contents = await fsExtra.readFile(packageJsonPath, 'utf-8')
    return JSON.parse(contents)
  }
}
