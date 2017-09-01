const fsJetpack = require('fs-jetpack')

const extractPackageInfo = () => {
  return fsJetpack.readAsync('package.json')
    .then((contents) => JSON.parse(contents))
}

module.exports = extractPackageInfo
