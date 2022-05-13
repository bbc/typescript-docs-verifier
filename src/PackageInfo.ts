import * as path from 'path'
import * as fsExtra from 'fs-extra'

export type PackageDefinition = {
  readonly name: string
  readonly main?: string
  readonly packageRoot: string
  readonly exports?: string | Record<string, string | Record<string, string | undefined> | undefined>
}

const searchParentsForPackage = async (currentPath: string): Promise<string> => {
  try {
    await fsExtra.readFile(path.join(currentPath, 'package.json'))
    return currentPath
  } catch {
    const parentPath = path.dirname(currentPath)

    if (parentPath === currentPath) {
      throw new Error('Failed to find package.json — are you running this inside a NodeJS project?')
    }
    return await searchParentsForPackage(parentPath)
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PackageInfo {
  /* istanbul ignore next */
  private constructor () {}

  static async read (): Promise<PackageDefinition> {
    const packageRoot = await searchParentsForPackage(process.cwd())
    const packageJsonPath = path.join(packageRoot, 'package.json')
    const contents = await fsExtra.readFile(packageJsonPath, 'utf-8')
    const packageInfo = JSON.parse(contents)

    return {
      name: packageInfo.name,
      main: packageInfo.main,
      exports: packageInfo.exports,
      packageRoot
    }
  }
}
