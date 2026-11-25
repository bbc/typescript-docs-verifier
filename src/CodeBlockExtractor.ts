import { readFile } from "fs/promises";

const IGNORE_COMMENT_PATTERN = /<!--\s*ts-docs-verifier:ignore\s*-->\s*$/;
const OPENING_FENCE_PATTERN = /```(typescript|tsx|ts)[ \t]*$/i;
const FENCE_ONLY_PATTERN = /^`{3,}$/;

type CodeBlock = { code: string; type: "tsx" | "ts" };

const blockTypeOf = (infoString: string): CodeBlock["type"] =>
  infoString.toLowerCase() === "tsx" ? "tsx" : "ts";

const stripLineEnding = (line: string): string => line.replace(/\r?\n$/, "");

const openingFenceOf = (
  line: string
): { type: CodeBlock["type"]; index: number } | null => {
  const match = OPENING_FENCE_PATTERN.exec(stripLineEnding(line));
  if (!match) {
    return null;
  }
  return {
    type: blockTypeOf(match[1]),
    index: match.index,
  };
};

// How a line closes the current block, if it does: a line that is only a
// fence closes with no code, and a fence closes after the code preceding
// it on the line when the fence is the last thing on the line or is
// immediately followed by the opening fence of the next block. Backticks
// anywhere else in a line (e.g. inside a string literal) are ordinary code.
const closingFenceOf = (
  line: string
): { code: string; nextType: CodeBlock["type"] | null } | null => {
  const contents = stripLineEnding(line);
  if (FENCE_ONLY_PATTERN.test(contents.trim())) {
    return { code: "", nextType: null };
  }
  for (
    let index = contents.indexOf("```");
    index !== -1;
    index = contents.indexOf("```", index + 1)
  ) {
    const rest = contents.slice(index + 3);
    if (rest.trim() === "") {
      return { code: contents.slice(0, index), nextType: null };
    }
    const nextOpening = OPENING_FENCE_PATTERN.exec(rest);
    if (nextOpening && nextOpening.index === 0) {
      return {
        code: contents.slice(0, index),
        nextType: blockTypeOf(nextOpening[1]),
      };
    }
  }
  return null;
};

export const CodeBlockExtractor = {
  extract: async (markdownFilePath: string): Promise<CodeBlock[]> => {
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

  extractCodeBlocksFromMarkdown: (markdown: string): CodeBlock[] => {
    const codeBlocks: CodeBlock[] = [];
    let ignoreNextBlock = false;
    let openBlock: { type: CodeBlock["type"]; ignored: boolean } | null = null;
    let codeLines: string[] = [];

    for (const line of markdown.split(/(?<=\n)/)) {
      if (openBlock) {
        const closing = closingFenceOf(line);
        if (closing === null) {
          codeLines.push(line);
        } else {
          if (closing.code !== "") {
            codeLines.push(closing.code);
          }
          if (!openBlock.ignored) {
            codeBlocks.push({
              code: codeLines.join(""),
              type: openBlock.type,
            });
          }
          openBlock =
            closing.nextType === null
              ? null
              : { type: closing.nextType, ignored: false };
          codeLines = [];
        }
        continue;
      }

      const opening = openingFenceOf(line);
      if (opening) {
        const beforeFence = stripLineEnding(line).slice(0, opening.index);
        openBlock = {
          type: opening.type,
          ignored: ignoreNextBlock || IGNORE_COMMENT_PATTERN.test(beforeFence),
        };
        ignoreNextBlock = false;
        codeLines = [];
      } else if (stripLineEnding(line).trim() === "") {
        // Blank lines do not cancel a preceding ignore comment.
        continue;
      } else {
        ignoreNextBlock = IGNORE_COMMENT_PATTERN.test(stripLineEnding(line));
      }
    }

    return codeBlocks;
  },
};
