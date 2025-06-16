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
   * Extract all code blocks into an array (backward-compatible).
   */
  static async extract(
    markdownFilePath: string
  ): Promise<{ code: string; type: "tsx" | "ts" }[]> {
    const blocks: { code: string; type: "tsx" | "ts" }[] = [];
    for await (const block of this.iterateBlocks(markdownFilePath)) {
      blocks.push(block);
    }
    return blocks;
  }

  /**
   * Async generator that yields code blocks one-by-one with streaming regex parsing.
   */
  static async *iterateBlocks(
    markdownFilePath: string
  ): AsyncGenerator<{ code: string; type: "tsx" | "ts" }> {
    const pattern = this.TYPESCRIPT_CODE_PATTERN;
    // eslint-disable-next-line functional/no-let
    let buffer = "";

    const stream = fs.createReadStream(markdownFilePath, { encoding: "utf-8" });
    for await (const chunk of stream) {
      buffer += chunk;
      // reset regex state
      pattern.lastIndex = 0;
      // eslint-disable-next-line functional/no-let
      let match: RegExpExecArray | null;

      // pull out all complete code blocks
      while ((match = pattern.exec(buffer))) {
        const tsxType = match[1];
        const code = match[2];
        const type = tsxType === "tsx" ? "tsx" : "ts";
        yield { code, type };

        // drop processed segment
        buffer = buffer.slice(match.index + match[0].length);
        pattern.lastIndex = 0;
      }
    }
  }
}
