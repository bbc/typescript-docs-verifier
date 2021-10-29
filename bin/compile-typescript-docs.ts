#! /usr/bin/env node

import * as ora from 'ora'
import * as chalk from 'chalk'
import * as yargs from 'yargs'
import * as TypeScriptDocsVerifier from '../index'

const cliOptions = yargs.option('input-files', {
  description: 'The list of input files to be processed',
  array: true,
  default: ['README.md']
})

const inputFiles = cliOptions.parseSync()['input-files']

const spinner = ora()
spinner.info(`Compiling documentation TypeScript code snippets from ${inputFiles.join(', ')}`).start()

const formatCode = (code: string, errorLines: number[]) => {
  const lines = code.split('\n')
    .map((line, index) => {
      const lineNumber = index + 1
      if (errorLines.includes(lineNumber)) {
        return (chalk as any)`{bold.red ${String(lineNumber).padStart(2)}| ${line}}`
      } else {
        return `${String(lineNumber).padStart(2)}| ${line}`
      }
    })
  return '    ' + lines.join('\n    ')
}

const formatError = (error: Error) => '  ' + error.message
  .split('\n')
  .join('\n      ')

const doCompilation = async () => {
  const results = await TypeScriptDocsVerifier.compileSnippets(inputFiles)
  spinner.info(`Found ${results.length} TypeScript snippets`).start()
  results.forEach((result) => {
    if (result.error) {
      process.exitCode = 1
      spinner.fail((chalk as any)`{red.bold Error compiling example code block ${result.index} in file ${result.file}:}`)
      console.log(formatError(result.error))
      console.log()
      console.log((chalk as any)`{blue.bold  Original code:}`)
      console.log(formatCode(result.snippet, result.linesWithErrors))
    }
  })
  if (process.exitCode) {
    spinner.fail((chalk as any)`{red.bold Compilation failed, see above errors}`)
  } else {
    spinner.succeed((chalk as any)`{green.bold All snippets compiled OK}`)
  }
}

doCompilation()
  .catch((error) => {
    process.exitCode = 1
    console.error(error)
    try {
      spinner.fail()
    } catch (error) {
      console.error(error)
    }
  })
