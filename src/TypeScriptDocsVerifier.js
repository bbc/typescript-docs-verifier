const path = require('path')
const FSJetpack = require('fs-jetpack')
const Bluebird = require('bluebird')
const tsconfig = require('tsconfig')
const extractCodeBlocks = require('./extractCodeBlocks')
const extractPackageInfo = require('./extractPackageInfo')
const wrapCodeForCompilation = require('./wrapCodeForCompilation')
const TypeScriptCompiler = require('./TypeScriptCompiler')

const WORKING_DIRECTORY = path.join(process.cwd(), 'compiled-docs')

const cleanWorkingDirectory = () => FSJetpack.removeAsync(WORKING_DIRECTORY)

const extractFileCodeBlocks = (file, name, main) => {
  return extractCodeBlocks(file)
    .map((block) => {
      return {
        file,
        rawCode: block,
        sanitisedCode: wrapCodeForCompilation(block, name, path.join(process.cwd(), main))
      }
    })
}

const extractAllCodeBlocks = (documentationFiles, name, main) => {
  return Bluebird.resolve()
    .then(() => extractPackageInfo())
    .then((packageInfo) => {
      return Bluebird.all(documentationFiles)
        .map((file) => extractFileCodeBlocks(file, packageInfo.name, packageInfo.main))
        .reduce((previous, current) => {
          return previous.concat(current)
        }, [])
    })
}

const testCodeCompilation = (example, index, compiler) => {
  return compiler.compile(example.sanitisedCode)
    .then(() => {
      return {
        rawCode: example.rawCode,
        file: example.file,
        index: index + 1
      }
    })
    .catch((error) => {
      return {
        rawCode: example.rawCode,
        error,
        file: example.file,
        index: index + 1
      }
    })
}

const verifyDocs = (documentationFiles) => {
  documentationFiles = documentationFiles || ['README.md']
  documentationFiles = Array.isArray(documentationFiles) ? documentationFiles : [documentationFiles]

  const configOptions = tsconfig.loadSync(process.cwd())
  const compiler = new TypeScriptCompiler(WORKING_DIRECTORY, configOptions.config.compilerOptions)

  return Bluebird.resolve()
    .then(cleanWorkingDirectory)
    .then(() => FSJetpack.dirAsync(WORKING_DIRECTORY))
    .then(() => extractAllCodeBlocks(documentationFiles))
    .map((example, index) => testCodeCompilation(example, index, compiler))
    .finally(cleanWorkingDirectory)
}

module.exports = {
  verifyDocs
}
