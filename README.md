# `typescript-docs-verifier`

_Verifies that typescript examples in a markdown file actually compile._

## What it is

This library searches markdown files for blocks marked:

````Markdown
```typescript
// Some TypeScript code here
```
````

These code blocks are extracted and any imports from the current project are replaced with an import of the `main` file from `package.json`. Each code snippet is compiled (but not run) and any compilation errors are reported.

## Script usage

```bash
node_modules/compile-typescript-docs.js [--input-files <markdown-files-to-test>]
```

* `--input-files` is optional and defaults to `README.md`.
* Any compilation errors will be reported on the console.
* The exit code is 1 if there are any compilation errors and 0 otherwise.

## Library usage

### TypeScript

```typescript
import { compileSnippets, SnippetCompilationResult } from 'typescript-docs-verifier'
import * as http from 'http'

const inputFiles = ['README', 'examples.md'] // defaults for 'README.md' if not provided
compileSnippets(inputFiles)
  .then((results: SnippetCompilationResult[]) => {
    results.forEach((result: SnippetCompilationResult) => {
      if (result.error) {
        console.log(`Error compiling example code block ${result.index} in file ${result.file}`)
        console.log(result.error.message)
        console.log('Original code:')
        console.log(result.snippet)
      }
    })
  })
```

### JavaScript

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
        console.log(result.snippet)
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
