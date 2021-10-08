import * as os from 'os'
import * as path from 'path'
import * as FsExtra from 'fs-extra'
import { Gen } from 'verify-it'
import * as TypeScriptDocsVerifier from '../index'
import { PackageDefinition } from '../src/PackageInfo'

const workingDirectory = path.join(os.tmpdir(), 'typescript-docs-verifier-test')
const fixturePath = path.join(__dirname, '..', '..', 'test', 'fixtures')

const defaultPackageJson = {
  name: Gen.string(),
  main: `${Gen.string()}.ts`
}
const defaultMainFile = {
  name: 'main-default.ts',
  contents: FsExtra.readFileSync(path.join(fixturePath, 'main-default.ts')).toString()
}

const defaultMarkdownFile = {
  name: 'README.md',
  contents: FsExtra.readFileSync(path.join(fixturePath, 'no-typescript.md'))
}

const defaultTsConfig = {
  compilerOptions: {
    target: 'ES2015',
    module: 'commonjs',
    sourceMap: true,
    allowJs: true,
    outDir: './dist',
    noEmitOnError: true,
    pretty: true,
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    noImplicitThis: true,
    alwaysStrict: true,
    noImplicitReturns: true,
    typeRoots: [path.join(workingDirectory, 'node_modules', '@types')]
  },
  exclude: [ 'node_modules', 'example' ]
}

type File = {
  readonly name: string
  readonly contents: string | Buffer
}

type ProjectFiles = {
  readonly packageJson?: PackageDefinition
  readonly markdownFiles?: File[]
  readonly mainFile?: File
  readonly tsConfig?: string
}

const createProject = async (files: ProjectFiles = {}) => {
  const filesToWrite: File[] = [{
    name: 'package.json',
    contents: JSON.stringify((files.packageJson || defaultPackageJson))
  }, {
    name: (files.mainFile || defaultMainFile).name,
    contents: (files.mainFile || defaultMainFile).contents
  }, {
    name: 'tsconfig.json',
    contents: files.tsConfig || JSON.stringify(defaultTsConfig)
  }]

  const allFiles = filesToWrite.concat(files.markdownFiles || [defaultMarkdownFile])
  await Promise.all(
    allFiles.map((file: File) => FsExtra.writeFile(path.join(workingDirectory, file.name), file.contents))
  )

  const nodeTypesFolder = path.join(__dirname, '..', '..', 'node_modules', '@types', 'node')
  const targetTypesFolder = path.join(workingDirectory, 'node_modules', '@types')
  await FsExtra.ensureDir(targetTypesFolder)
  await FsExtra.copy(nodeTypesFolder, path.join(targetTypesFolder, 'node'))
}

const genSnippet = () => {
  const name = 'a' + Gen.string().replace(/[-]/g, '')
  const value = Gen.string()
  return `const ${name} = "${value}"`
}

const wrapSnippet = (snippet: string, snippetType: string = 'typescript') => {
  return `\`\`\`${snippetType}
${snippet}\`\`\``
}

describe('TypeScriptDocsVerifier', () => {
  describe('compileSnippets', () => {
    beforeEach(async () => {
      await FsExtra.ensureDir(path.join(workingDirectory))
      process.chdir(workingDirectory)
    })

    afterEach(async () => {
      await FsExtra.remove(workingDirectory)
    })

    verify.it('returns an empty array if no code snippets are present', async () => {
      await createProject()
      return TypeScriptDocsVerifier.compileSnippets().should.eventually.eql([])
    })

    verify.it('returns an empty array if no typescript code snippets are present', Gen.array(Gen.string, 4), async (strings) => {
      const noTypeScriptMarkdown = `
# A \`README.md\` file

${strings[0]}

${wrapSnippet(strings[1], 'javascript')}

${strings[2]}

${wrapSnippet(strings[3], 'bash')}
`

      await createProject({ markdownFiles: [{ name: 'README.md', contents: noTypeScriptMarkdown }] })
      return TypeScriptDocsVerifier.compileSnippets()
        .should.eventually.eql([])
    })

    verify.it('returns an error if a documentation file does not exist', Gen.string, async (filename) => {
      await createProject()
      return TypeScriptDocsVerifier.compileSnippets(['README.md', filename])
        .should.be.rejectedWith(filename)
    })

    verify.it(
      'returns a single element result array when a valid typescript block marked "typescript" is supplied',
      genSnippet, Gen.string, async (snippet, fileName) => {
        const typeScriptMarkdown = wrapSnippet(snippet)
        await createProject({ markdownFiles: [{ name: fileName, contents: typeScriptMarkdown }] })
        return TypeScriptDocsVerifier.compileSnippets(fileName)
          .should.eventually.eql([{
            file: fileName,
            index: 1,
            snippet
          }])
      }
    )

    verify.it(
      'returns a single element result array when a valid typescript block marked "ts" is supplied',
      genSnippet, Gen.string, async (snippet, fileName) => {
        const typeScriptMarkdown = wrapSnippet(snippet, 'ts')
        await createProject({ markdownFiles: [{ name: fileName, contents: typeScriptMarkdown }] })
        return TypeScriptDocsVerifier.compileSnippets(fileName)
          .should.eventually.eql([{
            file: fileName,
            index: 1,
            snippet
          }])
      }
    )

    verify.it(
      'does not return result if a valid typescript block marked "ts" is supplied if it is preceded by <!--- docs-verifier-ignore --> ',
      genSnippet, Gen.string, async (snippet, fileName) => {
        const ignoreString = `<!--- docs-verifier-ignore -->`
        const typeScriptMarkdown = `${ignoreString}${wrapSnippet(snippet, 'ts')}`
        await createProject({ markdownFiles: [{ name: fileName, contents: typeScriptMarkdown }] })
        return TypeScriptDocsVerifier.compileSnippets(fileName)
          .should.eventually.eql([])
      }
    )

    verify.it(
      'compiles snippets from multiple files',
      Gen.distinct(genSnippet, 3), Gen.distinct(Gen.string, 3), async (snippets, fileNames) => {
        const markdownFiles = snippets.map((snippet, index) => {
          return {
            name: fileNames[index],
            contents: wrapSnippet(snippet)
          }
        })

        const expected = snippets.map((snippet, index) => {
          return {
            file: fileNames[index],
            index: index + 1,
            snippet
          }
        })

        await createProject({ markdownFiles: markdownFiles })
        return TypeScriptDocsVerifier.compileSnippets(fileNames)
          .should.eventually.eql(expected)
      }
    )

    verify.it('reads from README.md if no file paths are supplied', genSnippet, async (snippet) => {
      const typeScriptMarkdown = wrapSnippet(snippet)

      await createProject({ markdownFiles: [{ name: 'README.md', contents: typeScriptMarkdown }] })
      return TypeScriptDocsVerifier.compileSnippets()
        .should.eventually.eql([{
          file: 'README.md',
          index: 1,
          snippet
        }])
    })

    verify.it('returns an empty array if an empty array is provided', genSnippet, async (snippet) => {
      const typeScriptMarkdown = wrapSnippet(snippet)

      await createProject({ markdownFiles: [{ name: 'README.md', contents: typeScriptMarkdown }] })
      return TypeScriptDocsVerifier.compileSnippets([])
        .should.eventually.eql([])
    })

    verify.it(
      'returns multiple results when multiple TypeScript snippets are supplied',
      Gen.array(genSnippet, Gen.integerBetween(2, 6)()), async (snippets) => {
        const markdownBlocks = snippets.map((snippet) => wrapSnippet(snippet))
        const markdown = markdownBlocks.join('\n')
        const expected = snippets.map((snippet, index) => {
          return {
            file: 'README.md',
            index: index + 1,
            snippet
          }
        })

        await createProject({ markdownFiles: [{ name: 'README.md', contents: markdown }] })
        return () => TypeScriptDocsVerifier.compileSnippets()
          .should.eventually.eql(expected)
      }
    )

    verify.it(
      'compiles snippets with import statements',
      genSnippet, async (snippet) => {
        snippet = `import * as path from 'path'
          path.join('.', 'some-path')
          ${snippet}`
        const typeScriptMarkdown = wrapSnippet(snippet)
        await createProject({ markdownFiles: [{ name: 'README.md', contents: typeScriptMarkdown }] })
        return TypeScriptDocsVerifier.compileSnippets()
          .should.eventually.eql([{
            file: 'README.md',
            index: 1,
            snippet
          }])
      }
    )

    verify.it(
      'reports compilation failures',
      genSnippet, Gen.string, async (validSnippet, invalidSnippet) => {
        const validTypeScriptMarkdown = wrapSnippet(validSnippet)
        const invalidTypeScriptMarkdown = wrapSnippet(invalidSnippet)
        const markdown = [validTypeScriptMarkdown, invalidTypeScriptMarkdown].join('\n')
        await createProject({ markdownFiles: [{ name: 'README.md', contents: markdown }] })
        return TypeScriptDocsVerifier.compileSnippets()
        .should.eventually.satisfy((results: any[]) => {
          results.should.have.length(2)
          results[0].should.not.have.property('error')
          const errorResult = results[1]
          errorResult.should.have.property('file', 'README.md')
          errorResult.should.have.property('index', 2)
          errorResult.should.have.property('snippet', invalidSnippet)
          errorResult.should.have.property('error')
          return true
        })
      }
    )

    verify.it(
      'localises imports of the current package if the package main is a ts file', async () => {
        const snippet = `
          import { MyClass } from '${defaultPackageJson.name}'
          const instance = new MyClass()
          instance.doStuff()`
        const mainFile = {
          name: `${defaultPackageJson.main}`,
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`
        }
        const typeScriptMarkdown = wrapSnippet(snippet)
        await createProject({ markdownFiles: [{ name: 'README.md', contents: typeScriptMarkdown }], mainFile })
        return TypeScriptDocsVerifier.compileSnippets()
          .should.eventually.eql([{
            file: 'README.md',
            index: 1,
            snippet
          }])
      }
    )

    verify.it(
      'localises imports of the current package if the package main is a js file', Gen.string, Gen.string, async (name, main) => {
        const packageJson: PackageDefinition = {
          name,
          main: `${main}.js`
        }
        const snippet = `
          import { MyClass } from '${packageJson.name}'
          const instance: any = MyClass()
          instance.doStuff()`
        const mainFile = {
          name: `${packageJson.main}`,
          contents: `
            module.exports.MyClass = function MyClass () {
              this.doStuff = () => {
                return
              }
            }`
        }
        const typeScriptMarkdown = wrapSnippet(snippet)
        const projectFiles = {
          markdownFiles: [{ name: 'README.md', contents: typeScriptMarkdown }],
          mainFile,
          packageJson
        }
        await createProject(projectFiles)
        return TypeScriptDocsVerifier.compileSnippets()
          .should.eventually.eql([{
            file: 'README.md',
            index: 1,
            snippet
          }])
      }
    )
  })
})
