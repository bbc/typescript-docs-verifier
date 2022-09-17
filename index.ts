import * as path from "path";
import { PackageInfo } from "./src/PackageInfo";
import {
  SnippetCompiler,
  SnippetCompilationResult,
} from "./src/SnippetCompiler";

export { SnippetCompilationResult } from "./src/SnippetCompiler";

const DEFAULT_FILES = ["README.md"];

const wrapIfString = (arrayOrString: string[] | string) => {
  if (Array.isArray(arrayOrString)) {
    return arrayOrString;
  } else {
    return [arrayOrString];
  }
};

export async function compileSnippets(
  markdownFileOrFiles: string | string[] = DEFAULT_FILES,
  project?: string
): Promise<SnippetCompilationResult[]> {
  const packageDefinition = await PackageInfo.read();
  const compiledDocsFolder = path.join(
    packageDefinition.packageRoot,
    ".tmp-compiled-docs"
  );
  const compiler = new SnippetCompiler(
    compiledDocsFolder,
    packageDefinition,
    project
  );
  const fileArray = wrapIfString(markdownFileOrFiles);
  const results = await compiler.compileSnippets(fileArray);
  return results;
}
