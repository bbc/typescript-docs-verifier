import * as path from 'path'
import * as fsExtra from 'fs-extra'
import * as TsNode from 'ts-node'

export class TypeScriptRunner {
  private readonly compiler: TsNode.Service

  constructor (private readonly workingDirectory: string, typeScriptOptions: any) {
    TsNode.register(typeScriptOptions)
    this.compiler = TsNode.create(typeScriptOptions)
  }

  async run (code: string): Promise<void> {
    const codeFile = await this.writeCodeFile(code)
    this.compiler.compile(code, codeFile)
  }

  private async writeCodeFile (code: string) {
    const id = process.hrtime.bigint().toString()
    const codeFile = path.join(this.workingDirectory, `block-${id}.ts`)
    await fsExtra.writeFile(codeFile, code)
    return codeFile
  }
}
