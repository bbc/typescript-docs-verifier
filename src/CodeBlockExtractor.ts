import * as fs from "fs";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CodeBlockExtractor {
  /**
   * Matches TS/TSX fences not preceded by an ignore directive.
   * Captures:
   *   1: 'tsx' if TSX, undefined if 'typescript' or 'ts'
   *   2: the code inside the fence
   */
  static readonly TYPESCRIPT_CODE_PATTERN =
    /(?<!(?:<!--\s*ts-docs-verifier:ignore\s*-->[\r?\n]*))```(?:(?:typescript)|(tsx?))\r?\n([\s\S]*?)(?=```)/gi;

  private constructor() {}

  /**
   * Stream the file and extract code blocks without buffering the entire file.
   * Returns an array of { code, type } in the order encountered.
   */
  static async extract(
    markdownFilePath: string
  ): Promise<{ code: string; type: "tsx" | "ts" }[]> {
    const codeBlocks: { code: string; type: "tsx" | "ts" }[] = [];
    const pattern = this.TYPESCRIPT_CODE_PATTERN;
      // eslint-disable-next-line functional/no-let
    let buffer = "";

    const stream = fs.createReadStream(markdownFilePath, {
      encoding: "utf-8",
    });

    for await (const chunk of stream) {
      buffer += chunk;
      // eslint-disable-next-line functional/no-let
      let match: RegExpExecArray | null;
      // Reset lastIndex in case regex is reused
      pattern.lastIndex = 0;

      // Pull out all code blocks available in buffer
      while ((match = pattern.exec(buffer))) {
        const tsxType = match[1];
        const code = match[2];
        const type = tsxType === "tsx" ? "tsx" : "ts";
        codeBlocks.push({ code, type });

        // Remove processed content from buffer
        buffer = buffer.slice(match.index + match[0].length);
        pattern.lastIndex = 0;
      }
    }

    return codeBlocks;
  }
}
