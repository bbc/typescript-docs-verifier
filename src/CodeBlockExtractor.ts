import { readFile } from "fs/promises";

const TYPESCRIPT_CODE_PATTERN =
  /(?<!(?:<!--\s*ts-docs-verifier:ignore\s*-->[\r?\n]*))(?:```(?:(?:typescript)|(tsx?))\r?\n)((?:\r?\n|.)*?)(?:(?=```))/gi;

export const CodeBlockExtractor = {
  extract: async (
    markdownFilePath: string
  ): Promise<{ code: string; type: "tsx" | "ts" }[]> => {
    try {
      const contents = await CodeBlockExtractor.readFile(markdownFilePath);
      return CodeBlockExtractor.extractCodeBlocksFromMarkdown(contents);
    } catch (error) {
      throw new Error(
        `Error extracting code blocks from ${markdownFilePath}: ${
          error instanceof Error ? error.message : error
        }`,
        { cause: error }
      );
    }
  },

  readFile: async (path: string): Promise<string> => {
    return await readFile(path, "utf-8");
  },

  extractCodeBlocksFromMarkdown: (
    markdown: string
  ): { code: string; type: "tsx" | "ts" }[] => {
    const codeBlocks: { code: string; type: "tsx" | "ts" }[] = [];
    markdown.replace(TYPESCRIPT_CODE_PATTERN, (_, type, code) => {
      codeBlocks.push({
        code,
        type: type === "tsx" ? "tsx" : "ts",
      });
      return code;
    });
    return codeBlocks;
  },
};
