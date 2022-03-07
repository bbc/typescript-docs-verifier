/* eslint-disable @typescript-eslint/quotes */
import { expect } from 'chai'
import { LocalImportSubstituter } from '../src/LocalImportSubstituter'

const scenarios = [{
  importLine: `import something from 'awesome'`,
  expected: `import something from '/path/to/package/index'`,
  name: 'single quotes'
}, {
  importLine: `import something from 'awesome';`,
  expected: `import something from '/path/to/package/index'`,
  name: 'a trailing semicolon'
}, {
  importLine: `import something from "awesome"`,
  expected: `import something from "/path/to/package/index"`,
  name: 'double quotes'
}, {
  importLine: `import something from "awesome"      `,
  expected: `import something from "/path/to/package/index"`,
  name: 'trailing whitespace'
}, {
  importLine: `import something from '@my-scope/awesome'`,
  expected: `import something from '/path/to/package/index'`,
  name: 'a scoped package name',
  packageName: '@my-scope/awesome'
}, {
  importLine: `import something from 'awesome/some/inner/path'`,
  expected: `import something from '/path/to/package/some/inner/path'`,
  name: 'imports of paths within a package'
}, {
  importLine: `import something from '@my-scope/awesome/some/inner/path'`,
  expected: `import something from '/path/to/package/some/inner/path'`,
  name: 'imports of paths within a scoped package',
  packageName: '@my-scope/awesome'
}, {
  importLine: `import lib from 'lib/lib/lib'`,
  expected: `import lib from '/path/to/package/lib/lib'`,
  name: 'overlapping library and path names',
  packageName: 'lib'
}, {
  importLine: `import lib from '@lib/lib/lib/lib'`,
  expected: `import lib from '/path/to/package/lib/lib'`,
  name: 'overlapping library, path and scope names',
  packageName: '@lib/lib'
}]

describe('LocalImportSubstituter', () => {
  it('does not change imports for different packages', () => {
    const substituter = new LocalImportSubstituter({
      name: 'my-package',
      main: 'index.ts',
      packageRoot: '/path/to/package'
    })

    const code = `import * as other from "package"

console.log('Should not be mutated')`
    const result = substituter.substituteLocalPackageImports(code)

    expect(result).to.eql(code)
  })

  scenarios.forEach(({ importLine, expected, name, packageName = 'awesome' }) => {
    it(`localises imports with ${name}`, () => {
      const substituter = new LocalImportSubstituter({
        name: packageName,
        main: 'index.ts',
        packageRoot: '/path/to/package'
      })

      const code = `
${importLine}

console.log('Something happened')
      `

      const localised = substituter.substituteLocalPackageImports(code)

      expect(localised).satisfies((actual: string) => {
        return actual.trim().startsWith(expected)
      }, `${localised} should start with ${expected}`)
    })
  })
})
