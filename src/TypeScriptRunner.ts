import * as path from 'path'
import * as fsExtra from 'fs-extra'
import * as TsNode from 'ts-node/dist/index'

export class TypeScriptRunner {
  constructor (private readonly workingDirectory: string, private readonly compilerOptions: TsNode.Options) {
    TsNode.register({ compilerOptions: this.compilerOptions })
  }

  run (code: string): Promise<void> {
    return Promise.resolve()
      .then(() => this.writeCodeFile(code))
      .then((codeFile) => {
        require(codeFile)
      })
  }

  private writeCodeFile (code: string) {
    const id = Math.random()
    const codeFile = path.join(this.workingDirectory, `block-${id}.ts`)
    return fsExtra.writeFile(codeFile, code)
      .then(() => codeFile)
  }
}
