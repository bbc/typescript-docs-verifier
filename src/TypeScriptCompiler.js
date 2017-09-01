const path = require('path')
const fsJetpack = require('fs-jetpack')
const tsNode = require('ts-node')

function TypeScriptCompiler (workingDirectory, compilerOptions) {
  tsNode.register({ compilerOptions })

  this.compile = (code) => {
    const id = Math.random()
    const targetFile = path.join(workingDirectory, `block-${id}.ts`)
    return fsJetpack.writeAsync(targetFile, code)
      .then(() => {
        require(targetFile)
      })
  }
}

module.exports = TypeScriptCompiler
