const path = require('path')
const FSJetpack = require('fs-jetpack')
const Bluebird = require('bluebird')
const tsconfig = require('tsconfig')
const extractCodeBlocks = require('./extractCodeBlocks')
const extractPackageInfo = require('./extractPackageInfo')
const wrapCodeForCompilation = require('./wrapCodeForCompilation')
const TypeScriptCompiler = require('./TypeScriptCompiler')

const WORKING_DIRECTORY = path.join(process.cwd(), 'compiled-docs')

const verifyDocs = (documentationFiles) => {
  documentationFiles = documentationFiles || ['README.md']
  documentationFiles = Array.isArray(documentationFiles) ? documentationFiles : [documentationFiles]

  const configOptions = tsconfig.loadSync(process.cwd())
  const compiler = new TypeScriptCompiler(WORKING_DIRECTORY, configOptions.config.compilerOptions)

  const file = documentationFiles[0]
  return Bluebird.resolve()
    .then(cleanWorkingDirectory)
    .then(() => FSJetpack.dirAsync(WORKING_DIRECTORY))
    .then(() => extractPackageInfo())
    .then((packageInfo) => {
      const main = packageInfo.main
      const name = packageInfo.name

      return extractCodeBlocks(file)
        .map((block) => {
          return {
            rawCode: block,
            sanitisedCode: wrapCodeForCompilation(block, name, path.join(process.cwd(), main))
          }
        })
    })
    .map((example, index) => {
      return compiler.compile(example.sanitisedCode)
        .then(() => {
          return {
            rawCode: example.rawCode,
            file,
            index: index + 1
          }
        })
        .catch((error) => {
          return {
            rawCode: example.rawCode,
            error: error.message,
            file,
            index: index + 1
          }
        })
    })
    .finally(cleanWorkingDirectory)
}

const cleanWorkingDirectory = () => FSJetpack.removeAsync(WORKING_DIRECTORY)

module.exports = {
  verifyDocs
}
