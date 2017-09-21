import * as os from 'os'
import * as path from 'path'
import * as FsExtra from 'fs-extra'
import { Gen } from 'verify-it'
import * as TypeScriptDocsVerifier from '../index'

const workingDirectory = path.join(os.tmpdir(), 'typescript-docs-verifier-test')
const fixturePath = path.join(__dirname, '..', '..', 'test', 'fixtures')

const defaultPackageJson = FsExtra.readFileSync(path.join(fixturePath, 'package-default.json'))
const defaultMainFile = FsExtra.readFileSync(path.join(fixturePath, 'main-default.ts'))
const defaultMarkdownFile = {
  name: 'README.md',
  contents: FsExtra.readFileSync(path.join(fixturePath, 'package-default.json'))
}

type ProjectFiles = {
  readonly packageJson?: string | Buffer
  readonly markdownFiles?: { readonly name: string, readonly contents: string | Buffer }[]
  readonly mainFile?: string | Buffer
}

const defaultProjectFiles = {
  packageJson: defaultPackageJson,
  markdownFiles: [defaultMarkdownFile],
  mainFile: defaultMainFile
}

const createProject = (files: ProjectFiles = defaultProjectFiles) => {
  return Promise.resolve()
    .then(() => FsExtra.writeFile(path.join(workingDirectory, 'package.json'), (files.packageJson || defaultPackageJson)))
    .then(() => FsExtra.writeFile(path.join(workingDirectory, 'main.ts'), (files.mainFile || defaultMainFile)))
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

    verify.it('returns a single element result array when a valid typescript block is supplied', genSnippet, (snippet) => {
      const typeScriptMarkdown = wrapSnippet(snippet)

      return createProject({ markdownFiles: [{ name: 'README.md', contents: typeScriptMarkdown }] })
        .then(() => TypeScriptDocsVerifier.compileSnippets())
        .should.eventually.eql([{
          file: 'README.md',
          index: 1,
          snippet
        }])
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
  })
})
