#! /usr/bin/env node
const ora = require('ora')
const chalk = require('chalk')
const leftPad = require('left-pad')
const TypeScriptDocsVerifier = require('../src/TypeScriptDocsVerifier')
const yargs = require('yargs')

const ERROR_LINE_EXTRACTION_PATTERN = /\.ts\s+\((\d+),\d+\):/

yargs.option('input-files', {
  description: 'The list of input files to be processed',
  array: true,
  default: ['README.md']
})

const argv = yargs.argv
const inputFiles = argv['input-files']

const spinner = ora()
spinner.info(`Compiling documentation TypeScript code snippets from ${inputFiles.join(', ')}`).start()

const formatCode = (code, errorLines) => {
  const lines = code.split('\n')
    .map((line, index) => {
      const lineNumber = index + 1
      if (errorLines.indexOf(lineNumber) !== -1) {
        return chalk`{bold.red ${leftPad(lineNumber, 2)}| ${line}}`
      } else {
        return `${leftPad(lineNumber, 2)}| ${line}`
      }
    })
  return '    ' + lines.join('\n    ')
}

const findErrorLines = (error) => {
  const messages = error.diagnostics.map((diagnostic) => diagnostic.message)
  return messages.map((message) => {
    const match = ERROR_LINE_EXTRACTION_PATTERN.exec(message)
    if (match && match[1]) {
      return match[1]
    }
  }).filter((lineNumber) => lineNumber)
    .map((lineNumber) => parseInt(lineNumber))
}

const formatError = (error) => '  ' + error.message.split('\n').join('\n  ')

TypeScriptDocsVerifier.verifyDocs(inputFiles)
  .then((results) => {
    spinner.info(`Found ${results.length} TypeScript snippets`).start()
    results.forEach((result) => {
      if (result.error) {
        const errorLines = findErrorLines(result.error)
        process.exitCode = 1
        spinner.fail(chalk`{red.bold Error compiling example code block ${result.index} in file ${result.file}:}`)
        console.log(formatError(result.error))
        console.log()
        console.log(chalk`{blue.bold  Original code:}`)
        console.log(formatCode(result.rawCode, errorLines))
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
