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
  contents: FsExtra.readFileSync(path.join(fixturePath, 'package-default.json'))
}

type ProjectFiles = {
  readonly packageJson?: PackageDefinition
  readonly markdownFiles?: { readonly name: string, readonly contents: string | Buffer }[]
  readonly mainFile?: { readonly name: string, readonly contents: string }
}

const defaultProjectFiles = {
  packageJson: defaultPackageJson,
  markdownFiles: [defaultMarkdownFile],
  mainFile: defaultMainFile
}

const createProject = (files: ProjectFiles = defaultProjectFiles) => {
  const mainFile = files.mainFile || defaultMainFile
  return Promise.resolve()
    .then(() => FsExtra.writeFile(path.join(workingDirectory, 'package.json'), JSON.stringify((files.packageJson || defaultPackageJson))))
    .then(() => FsExtra.writeFile(path.join(workingDirectory, mainFile.name), mainFile.contents))
    .then(() => {
      return (files.markdownFiles || []).forEach((file) => {
        return FsExtra.writeFile(path.join(workingDirectory, file.name), file.contents)
      })
    })
}

const genSnippet = () => {
  const name = 'a' + Gen.string().replace(/[-]/g, '')
  const value = Gen.string()
  return `const ${name} = "${value}"`
}

const wrapSnippet = (snippet: string) => {
  return `\`\`\`typescript
${snippet}\`\`\``
}

describe('TypeScriptDocsVerifier', () => {
  describe('compileSnippets', () => {
    beforeEach(() => {
      return FsExtra.ensureDir(workingDirectory)
        .then(() => process.chdir(workingDirectory))
    })

    afterEach(() => FsExtra.remove(workingDirectory))

    verify.it('returns an empty array if no code snippets are present', () => {
      return createProject()
        .then(() => TypeScriptDocsVerifier.compileSnippets())
        .should.eventually.eql([])
    })

    verify.it('returns an empty array if no typescript code snippets are present', Gen.array(Gen.string, 4), (strings) => {
      const noTypeScriptMarkdown = `
# A \`README.md\` file

${strings[0]}

\`\`\`javascript
${strings[1]}
\`\`\`

${strings[2]}

\`\`\`bash
${strings[3]}
\`\`\``

      return createProject({ markdownFiles: [{ name: 'README.md', contents: noTypeScriptMarkdown }] })
        .then(() => TypeScriptDocsVerifier.compileSnippets())
        .should.eventually.eql([])
    })

    verify.it('returns an error if a documentation file does not exist', Gen.string, (filename) => {
      return createProject()
        .then(() => TypeScriptDocsVerifier.compileSnippets(['README.md', filename]))
        .should.be.rejectedWith(filename)
    })

    verify.it(
      'returns a single element result array when a valid typescript block is supplied',
      genSnippet, Gen.string, (snippet, fileName) => {
        const typeScriptMarkdown = wrapSnippet(snippet)

        return createProject({ markdownFiles: [{ name: fileName, contents: typeScriptMarkdown }] })
          .then(() => TypeScriptDocsVerifier.compileSnippets(fileName))
          .should.eventually.eql([{
            file: fileName,
            index: 1,
            snippet
          }])
      }
    )

    verify.it(
      'compiles snippets from multiple files',
      Gen.distinct(genSnippet, 3), Gen.distinct(Gen.string, 3), (snippets, fileNames) => {
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

        return createProject({ markdownFiles: markdownFiles })
          .then(() => TypeScriptDocsVerifier.compileSnippets(fileNames))
          .should.eventually.eql(expected)
      }
    )

    verify.it('reads from README.md if no file paths are supplied', genSnippet, (snippet) => {
      const typeScriptMarkdown = wrapSnippet(snippet)

      return createProject({ markdownFiles: [{ name: 'README.md', contents: typeScriptMarkdown }] })
        .then(() => TypeScriptDocsVerifier.compileSnippets())
        .should.eventually.eql([{
          file: 'README.md',
          index: 1,
          snippet
        }])
    })

    verify.it('returns an empty array if an empty array is provided', genSnippet, (snippet) => {
      const typeScriptMarkdown = wrapSnippet(snippet)

      return createProject({ markdownFiles: [{ name: 'README.md', contents: typeScriptMarkdown }] })
        .then(() => TypeScriptDocsVerifier.compileSnippets([]))
        .should.eventually.eql([])
    })

    verify.it(
      'returns multiple results when multiple TypeScript snippets are supplied',
      Gen.array(genSnippet, Gen.integerBetween(2, 6)()), (snippets) => {
        const markdownBlocks = snippets.map(wrapSnippet)
        const markdown = markdownBlocks.join('\n')
        const expected = snippets.map((snippet, index) => {
          return {
            file: 'README.md',
            index: index + 1,
            snippet
          }
        })

        return createProject({ markdownFiles: [{ name: 'README.md', contents: markdown }] })
          .then(() => TypeScriptDocsVerifier.compileSnippets())
          .should.eventually.eql(expected)
      }
    )

    verify.it(
      'compiles snippets with import statements',
      genSnippet, (snippet) => {
        snippet = `import * as path from 'path'
          path.join('.', 'some-path')
          ${snippet}`
        const typeScriptMarkdown = wrapSnippet(snippet)
        return createProject({ markdownFiles: [{ name: 'README.md', contents: typeScriptMarkdown }] })
          .then(() => TypeScriptDocsVerifier.compileSnippets())
          .should.eventually.eql([{
            file: 'README.md',
            index: 1,
            snippet
          }])
      }
    )

    verify.it(
      'reports compilation failures',
      genSnippet, Gen.string, (validSnippet, invalidSnippet) => {
        const validTypeScriptMarkdown = wrapSnippet(validSnippet)
        const invalidTypeScriptMarkdown = wrapSnippet(invalidSnippet)
        const markdown = [validTypeScriptMarkdown, invalidTypeScriptMarkdown].join('\n')
        return createProject({ markdownFiles: [{ name: 'README.md', contents: markdown }] })
        .then(() => TypeScriptDocsVerifier.compileSnippets())
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
      'localises imports of the current package if the package main is a ts file', () => {
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
        return createProject({ markdownFiles: [{ name: 'README.md', contents: typeScriptMarkdown }], mainFile })
          .then(() => TypeScriptDocsVerifier.compileSnippets())
          .should.eventually.eql([{
            file: 'README.md',
            index: 1,
            snippet
          }])
      }
    )
  })
})
