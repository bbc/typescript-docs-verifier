function wrapCodeForCompilation (code, projectName, projectEntryPoint) {
  const projectImportRegex = new RegExp(`('${projectName}'|"${projectName}")`, 'g')
  const codeLines = code.split('\n')
  const importLines = codeLines.filter((line) => line.trim().startsWith('import '))
  const localisedImportLines = importLines.map((line) => line.replace(projectImportRegex, `'${projectEntryPoint}'`))
  const otherLines = codeLines.filter((line) => !line.trim().startsWith('import'))

  const wrappedCode = `${localisedImportLines.join('\n')}
    const fn = () => {${otherLines.join('\n')}
    }`
  return wrappedCode
}

module.exports = wrapCodeForCompilation
