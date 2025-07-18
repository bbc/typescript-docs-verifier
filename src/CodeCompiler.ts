import ts from "typescript";
import path from "path";

const createServiceHost = (
  options: ts.CompilerOptions,
  workingDirectory: string,
  fileMap: Map<string, string>
): ts.LanguageServiceHost => ({
  getScriptFileNames: () => {
    return [...fileMap.keys()];
  },
  getScriptVersion: () => "1",
  getProjectVersion: () => "1",
  getScriptSnapshot: (fileName) => {
    const contents =
      fileMap.get(fileName) ?? ts.sys.readFile(fileName, "utf-8");

    return typeof contents === "undefined"
      ? contents
      : ts.ScriptSnapshot.fromString(contents);
  },
  readFile: (fileName) => {
    return fileMap.get(fileName) ?? ts.sys.readFile(fileName);
  },
  fileExists: (fileName) => {
    return fileMap.has(fileName) || ts.sys.fileExists(fileName);
  },
  getCurrentDirectory: () => workingDirectory,
  getDirectories: ts.sys.getDirectories,
  directoryExists: ts.sys.directoryExists,
  getCompilationSettings: () => options,
  getDefaultLibFileName: () => ts.getDefaultLibFilePath(options),
});

export const compile = async ({
  compilerOptions,
  workingDirectory,
  code,
  type,
}: {
  compilerOptions: ts.CompilerOptions;
  workingDirectory: string;
  code: string;
  type: "ts" | "tsx";
}): Promise<{
  hasError: boolean;
  diagnostics: ReadonlyArray<ts.Diagnostic>;
}> => {
  const id = process.hrtime.bigint().toString();
  const filename = path.join(
    compilerOptions.rootDir || "",
    `block-${id}.${type}`
  );

  const fileMap = new Map<string, string>([[filename, code]]);

  const registry = ts.createDocumentRegistry(
    ts.sys.useCaseSensitiveFileNames,
    workingDirectory
  );

  const serviceHost = createServiceHost(
    {
      ...compilerOptions,
      noEmit: false,
      declaration: false,
      sourceMap: false,
      noEmitOnError: true,
      incremental: false,
      composite: false,
      declarationMap: false,
      noUnusedLocals: false,
    },
    workingDirectory,
    fileMap
  );

  const service = ts.createLanguageService(serviceHost, registry);

  try {
    const output = service.getEmitOutput(filename, false, false);

    if (output.emitSkipped) {
      const diagnostics = [
        ...service.getCompilerOptionsDiagnostics(),
        ...service.getSemanticDiagnostics(filename),
        ...service.getSyntacticDiagnostics(filename),
      ];

      return {
        diagnostics,
        hasError: true,
      };
    }

    return {
      diagnostics: [],
      hasError: false,
    };
  } finally {
    service.dispose();
  }
};
