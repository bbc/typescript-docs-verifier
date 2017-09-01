const fsJetpack = require('fs-jetpack')
const Bluebird = require('bluebird')

const TYPESCRIPT_CODE_PATTERN = /(?:```typescript\n)((?:\n|.)*?)(?:(?=```))/g

const extractCodeBlocks = (markdownFilePath) => {
  return Bluebird.resolve()
    .then(() => fsJetpack.readAsync(markdownFilePath))
    .then((contents) => contents.toString())
    .then((contents) => {
      const codeBlocks = []
      contents.replace(TYPESCRIPT_CODE_PATTERN, (fullMatch, code) => {
        codeBlocks.push(code)
      })
      return codeBlocks
    })
    .catch((error) => {
      throw new Error(`Error extracting code blocks from ${markdownFilePath}: ${error.message}`)
    })
}

module.exports = extractCodeBlocks
