import { PackageInfo } from "./src/PackageInfo";
import {
  SnippetCompiler,
  SnippetCompilationResult,
} from "./src/SnippetCompiler";

export { SnippetCompilationResult, CompilationError } from "./src/SnippetCompiler";

const DEFAULT_FILES = ["README.md"];

const parseArguments = (args: CompileSnippetsArguments) => {
  if (typeof args === "string") {
    return {
      markdownFiles: [args],
    };
  }
  if (Array.isArray(args)) {
    return {
      markdownFiles: args,
    };
  }
  return {
    project: args.project,
    markdownFiles: args.markdownFiles ?? DEFAULT_FILES,
  };
};

export type CompileSnippetsArguments =
  | string
  | string[]
  | {
      markdownFiles?: string[];
      project?: string;
    };

export async function compileSnippets(
  args: CompileSnippetsArguments = DEFAULT_FILES
): Promise<SnippetCompilationResult[]> {
  const { project, markdownFiles } = parseArguments(args);

  const packageDefinition = await PackageInfo.read();
  const compiler = new SnippetCompiler(
    packageDefinition.packageRoot,
    packageDefinition,
    project
  );
  const results = await compiler.compileSnippets(markdownFiles);
  return results;
}
