#! /usr/bin/env node

const tsNode = require('ts-node')
const jetpack = require('fs-jetpack')
const path = require('path')
const commentJson = require('comment-json')
const ora = require('ora')
const chalk = require('chalk')

const extractCodeBlocks = require('../src/extractCodeBlocks')

const DOCS_FOLDER = './compiled-docs'

const projectOptions = commentJson.parse(jetpack.read('tsconfig.json'))

tsNode.register({
  compilerOptions: projectOptions.compilerOptions
})

const spinner = ora()
spinner.info('Compiling documentation TypeScript code snippets').start()

cleanTargetDirectory()

const codeBlocks = extractCode()
spinner.info(`Found ${codeBlocks.length} code snippets`).start()

const errors = []
codeBlocks.forEach((block) => compileBlock(block, (error) => {
  spinner.fail(chalk`{red.bold Error compiling example code block ${block.name}:}`)
  console.log(formatErrorLines(error.message, '  '))
  console.log()
  console.log(chalk`{blue.bold  Original code:}`)
  console.log('    ' + block.rawCode.split('\n').join('\n    '))
  errors.push(error)
}))

if (errors.length > 0) {
  spinner.fail(chalk`{red.bold Compilation failed, see above errors}`)
  process.exitCode = 1
} else {
  spinner.succeed(chalk`{green.bold All snippets compiled OK}`)
}

cleanTargetDirectory()

function formatErrorLines (string, indent) {
  return indent + string.split('\n').join('\n' + indent)
}

function cleanTargetDirectory () {
  if (jetpack.exists(DOCS_FOLDER)) {
    jetpack.remove(DOCS_FOLDER)
  }
  jetpack.dir(DOCS_FOLDER)
}

function extractCode () {
  return extractCodeBlocks('./README.md')
  .then((rawCodeBlocks) => {
    const codeBlocks = []
    return rawCodeBlocks.map((code, index) => {
      const codeToCompile = wrapExampleCodeInClosure(code)
      return {
        rawCode: code,
        codeToCompile,
        name: codeBlocks.length + 2
      }
    })
  })
}

function wrapExampleCodeInClosure (code) {
  const localisedCode = code.replace(/('simple-aws'|"simple-aws")/g, '\'../index\'')
  const codeLines = localisedCode.split('\n')
  const importLines = codeLines.filter((line) => line.trim().startsWith('import '))
  const otherLines = codeLines.filter((line) => !line.trim().startsWith('import'))

  return `
    ${importLines.join('\n')}
    const fn = () => {
      ${otherLines.join('\n')}
    }
  `
}

function compileBlock (block, onError) {
  jetpack.write(path.join(DOCS_FOLDER, `block-${block.name}.ts`), block.codeToCompile)

  try {
    require(path.join(__dirname, '..', DOCS_FOLDER, `block-${block.name}.ts`))
  } catch (error) {
    onError(error)
  }
}
