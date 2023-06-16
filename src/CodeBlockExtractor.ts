import * as fsExtra from "fs-extra";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CodeBlockExtractor {
  static readonly TYPESCRIPT_CODE_PATTERN =
    /(?<!(?:<!--\s*ts-docs-verifier:ignore\s*-->[\r?\n]*))(?:```(?:(?:typescript)|(tsx?))\r?\n)((?:\r?\n|.)*?)(?:(?=```))/gi;

  /* istanbul ignore next */
  private constructor() {
    //
  }

  static async extract(
    markdownFilePath: string
  ): Promise<{ code: string; type: "tsx" | "ts" }[]> {
    try {
      const contents = await CodeBlockExtractor.readFile(markdownFilePath);
      return CodeBlockExtractor.extractCodeBlocksFromMarkdown(contents);
    } catch (error) {
      throw new Error(
        `Error extracting code blocks from ${markdownFilePath}: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  private static async readFile(path: string): Promise<string> {
    return await fsExtra.readFile(path, "utf-8");
  }

  private static extractCodeBlocksFromMarkdown(
    markdown: string
  ): { code: string; type: "tsx" | "ts" }[] {
    const codeBlocks: { code: string; type: "tsx" | "ts" }[] = [];
    markdown.replace(this.TYPESCRIPT_CODE_PATTERN, (_, type, code) => {
      codeBlocks.push({
        code,
        type: type === "tsx" ? "tsx" : "ts",
      });
      return code;
    });
    return codeBlocks;
  }
}
