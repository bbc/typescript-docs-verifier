#! /usr/bin/env node
const ora = require('ora')
const chalk = require('chalk')
const leftPad = require('left-pad')
const TypeScriptDocsVerifier = require('../src/TypeScriptDocsVerifier')

const spinner = ora()
spinner.info('Compiling documentation TypeScript code snippets').start()

const formatCode = (code) => {
  const lines = code.split('\n').map((line, index) => `${leftPad(index + 1, 2)}| ${line}`)
  return '    ' + lines.join('\n    ')
}

const formatError = (error) => '  ' + error.split('\n').join('\n  ')

TypeScriptDocsVerifier.verifyDocs()
  .then((results) => {
    results.forEach((result) => {
      if (result.error) {
        process.exitCode = 1
        spinner.fail(chalk`{red.bold Error compiling example code block ${result.index} in file ${result.file}:}`)
        console.log(formatError(result.error))
        console.log()
        console.log(chalk`{blue.bold  Original code:}`)
        console.log(formatCode(result.rawCode))
      }
    })
  })
  .then(() => {
    if (process.exitCode) {
      spinner.fail(chalk`{red.bold Compilation failed, see above errors}`)
    } else {
      spinner.succeed(chalk`{green.bold All snippets compiled OK}`)
    }
  })
  .catch((error) => {
    process.exitCode = 1
    console.error(error)
  })
