# `typescript-docs-verifier`

_Verifies that typescript examples in a markdown file actually compile._

## What it is

This library searches markdown files for blocks marked:

````Markdown
```typescript
// Some TypeScript code here
```
````

These code blocks are then tested for compilation, replacing any imports of the current project with an import of the `main` file from `package.json`.

## Script usage

```bash
node_modules/compile-docs.js [--input-files <markdown-files-to-test>]
```

* `--input-files` is optional and defaults to `README.md`.
* Any compilation errors will be reported on the console.
* The exit code is 1 if there are any compilation errors and 0 otherwise.

## Library usage

```javascript
const TypeScriptDocsVerifier = require('typescript-docs-verifier')

const inputFiles = ['README.md', 'examples.md'] // defaults to 'README.md' if not provided
TypeScriptDocsVerifier.compileSnippets(inputFiles)
  .then((results) => {
    results.forEach((result) => {
      if (result.error) {
        console.log(`Error compiling example code block ${result.index} in file ${result.file}`)
        console.log(result.error.message)
        console.log('Original code:')
        console.log(result.rawCode)
      }
    })
  })
  .catch((error) => {
    console.error('Error compiling TypeScript snippets', error)
  })
```

## Development

Run the tests:

```sh
yarn install
yarn test
```
