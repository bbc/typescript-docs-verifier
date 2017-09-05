const path = require('path')
const fsJetpack = require('fs-jetpack')
const tsNode = require('ts-node')

function TypeScriptRunner (workingDirectory, compilerOptions) {
  tsNode.register({ compilerOptions })

  this.run = (code) => {
    const id = Math.random()
    const targetFile = path.join(workingDirectory, `block-${id}.ts`)
    return fsJetpack.writeAsync(targetFile, code)
      .then(() => {
        require(targetFile)
      })
  }
}

module.exports = TypeScriptRunner
