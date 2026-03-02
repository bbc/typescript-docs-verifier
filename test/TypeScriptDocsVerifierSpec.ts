import { it, describe, beforeEach, afterEach, TestContext } from "node:test";
import * as os from "node:os";
import * as path from "node:path";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import { Gen, init } from "verify-it";
import * as TypeScriptDocsVerifier from "../index";
import { PackageDefinition } from "../src/PackageInfo";

const verify = init({ it, describe });

const workingDirectory = path.join(
  os.tmpdir(),
  "typescript-docs-verifier-test"
);
const fixturePath = path.join(__dirname, "fixtures");

const defaultPackageJson = {
  name: Gen.string(),
  main: `${Gen.string()}.js`,
};
const defaultMainFile = {
  name: defaultPackageJson.main,
  contents: fsSync.readFileSync(
    path.join(fixturePath, "main-default.ts"),
    "utf8"
  ),
};

const defaultMarkdownFile = {
  name: "README.md",
  contents: fsSync.readFileSync(
    path.join(fixturePath, "no-typescript.md"),
    "utf8"
  ),
};

const defaultTsConfig = {
  compilerOptions: {
    target: "ES2015",
    module: "commonjs",
    sourceMap: true,
    allowJs: true,
    outDir: "./dist",
    noEmitOnError: true,
    pretty: true,
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    noImplicitThis: true,
    alwaysStrict: true,
    noImplicitReturns: true,
    typeRoots: [path.join(workingDirectory, "node_modules", "@types")],
  },
  exclude: ["node_modules", "example"],
};

type File = {
  readonly name: string;
  readonly contents: string | Buffer;
};

type ProjectFiles = {
  readonly packageJson?: Partial<PackageDefinition>;
  readonly markdownFiles?: File[];
  readonly mainFile?: File;
  readonly otherFiles?: File[];
  readonly tsConfig?: string;
};

const createProject = async (files: ProjectFiles = {}) => {
  const filesToWrite: File[] = [
    {
      name: "package.json",
      contents: JSON.stringify(files.packageJson ?? defaultPackageJson),
    },
    {
      name: (files.mainFile ?? defaultMainFile).name,
      contents: (files.mainFile ?? defaultMainFile).contents,
    },
    {
      name: "tsconfig.json",
      contents: files.tsConfig ?? JSON.stringify(defaultTsConfig),
    },
    ...(files.otherFiles ?? []),
    ...(files.markdownFiles ?? [defaultMarkdownFile]),
  ];

  await Promise.all(
    filesToWrite.map(async (file: File) => {
      const filePath = path.join(workingDirectory, file.name);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.contents);
    })
  );

  const nodeModulesFolder = path.join(__dirname, "..", "node_modules");
  try {
    await fs.symlink(
      nodeModulesFolder,
      path.join(workingDirectory, "node_modules")
    );
  } catch (e: unknown) {
    if ((e as { code?: string }).code !== "EEXIST") throw e;
  }
};

const genSnippet = () => {
  const name = "a" + Gen.string().replace(/[-]/g, "");
  const value = Gen.string();
  return `const ${name} = "${value}"`;
};

const wrapSnippet = (snippet: string, snippetType = "typescript") => {
  return `\`\`\`${snippetType}
${snippet}\`\`\``;
};

describe("TypeScriptDocsVerifier", () => {
  describe("compileSnippets", () => {
    beforeEach(async () => {
      await fs.rm(workingDirectory, { recursive: true, force: true });
      await fs.mkdir(path.join(workingDirectory), { recursive: true });
      process.chdir(workingDirectory);
    });

    afterEach(async () => {
      await fs.rm(workingDirectory, { recursive: true, force: true });
    });

    verify.it(
      "returns an empty array if no code snippets are present",
      async (t) => {
        await createProject();
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, []);
      }
    );

    verify.it(
      "returns an empty array if no typescript code snippets are present",
      Gen.array(Gen.string, 4),
      async (strings, t) => {
        const noTypeScriptMarkdown = `
# A \`README.md\` file

${strings[0]}

${wrapSnippet(strings[1], "javascript")}

${strings[2]}

${wrapSnippet(strings[3], "bash")}
`;

        await createProject({
          markdownFiles: [
            { name: "README.md", contents: noTypeScriptMarkdown },
          ],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, []);
      }
    );

    verify.it(
      "returns an error if a documentation file does not exist",
      Gen.string,
      async (filename, t) => {
        await createProject();
        await t.assert.rejects(
          TypeScriptDocsVerifier.compileSnippets(["README.md", filename]),
          new RegExp(filename)
        );
      }
    );

    verify.it(
      'returns a single element result array when a valid typescript block marked "typescript" is supplied',
      genSnippet,
      Gen.string,
      async (snippet, fileName, t) => {
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: fileName, contents: typeScriptMarkdown }],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets(fileName);
        t.assert.deepEqual(result, [
          {
            file: fileName,
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      'returns a single element result array when a valid typescript block marked "ts" is supplied',
      genSnippet,
      Gen.string,
      async (snippet, fileName, t) => {
        const typeScriptMarkdown = wrapSnippet(snippet, "ts");
        await createProject({
          markdownFiles: [{ name: fileName, contents: typeScriptMarkdown }],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets(fileName);
        t.assert.deepEqual(result, [
          {
            file: fileName,
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      'returns a single element result array when a valid typescript block marked "tsx" is supplied',
      Gen.string,
      async (fileName, t) => {
        const typeScriptMarkdown = `import React from 'react';
export const bob = () => (<div></div>);
`;
        await createProject({
          markdownFiles: [
            {
              name: fileName,
              contents: wrapSnippet(typeScriptMarkdown, "tsx"),
            },
          ],
          tsConfig: JSON.stringify({
            ...defaultTsConfig,
            compilerOptions: {
              ...defaultTsConfig.compilerOptions,
              esModuleInterop: true,
              jsx: "react",
            },
          }),
        });
        const result = await TypeScriptDocsVerifier.compileSnippets(fileName);
        t.assert.deepEqual(result, [
          {
            file: fileName,
            index: 1,
            snippet: typeScriptMarkdown,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "ignores code blocks preceded by <!-- ts-docs-verifier:ignore --> ",
      genSnippet,
      Gen.string,
      async (snippet, fileName, t) => {
        const ignoreString = "<!-- ts-docs-verifier:ignore -->";
        const typeScriptMarkdown = `${ignoreString}${wrapSnippet(
          snippet,
          "ts"
        )}`;
        await createProject({
          markdownFiles: [{ name: fileName, contents: typeScriptMarkdown }],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets(fileName);
        t.assert.deepEqual(result, []);
      }
    );

    verify.it(
      "compiles snippets from multiple files",
      Gen.distinct(genSnippet, 6),
      Gen.distinct(Gen.string, 3),
      async (snippets, fileNames, t) => {
        const markdownFiles = fileNames.map((fileName, index) => {
          return {
            name: fileName,
            contents:
              wrapSnippet(snippets[2 * index]) +
              wrapSnippet(snippets[2 * index + 1]),
          };
        });

        const expected = fileNames.flatMap((fileName, index) => {
          return [
            {
              file: fileName,
              index: 1,
              snippet: snippets[2 * index],
              linesWithErrors: [],
            },
            {
              file: fileName,
              index: 2,
              snippet: snippets[2 * index + 1],
              linesWithErrors: [],
            },
          ];
        });

        await createProject({ markdownFiles: markdownFiles });
        const result = await TypeScriptDocsVerifier.compileSnippets(fileNames);
        t.assert.deepEqual(result, expected);
      }
    );

    verify.it(
      "reads from README.md if no file paths are supplied",
      genSnippet,
      async (snippet, t) => {
        const typeScriptMarkdown = wrapSnippet(snippet);

        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "returns an empty array if an empty array is provided",
      genSnippet,
      async (snippet, t) => {
        const typeScriptMarkdown = wrapSnippet(snippet);

        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets([]);
        t.assert.deepEqual(result, []);
      }
    );

    verify.it(
      "returns multiple results when multiple TypeScript snippets are supplied",
      Gen.array(genSnippet, Gen.integerBetween(2, 6)()),
      async (snippets, t) => {
        const markdownBlocks = snippets.map((snippet) => wrapSnippet(snippet));
        const markdown = markdownBlocks.join("\n");
        const expected = snippets.map((snippet, index) => {
          return {
            file: "README.md",
            index: index + 1,
            snippet,
            linesWithErrors: [],
          };
        });

        await createProject({
          markdownFiles: [{ name: "README.md", contents: markdown }],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, expected);
      }
    );

    verify.it(
      "compiles snippets with import statements",
      genSnippet,
      async (snippet, t) => {
        snippet = `import * as path from 'path'
          path.join('.', 'some-path')
          ${snippet}`;
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "compiles snippets when rootDir is a compiler option",
      genSnippet,
      Gen.word,
      async (snippet, rootDir, t) => {
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          tsConfig: JSON.stringify({
            ...defaultTsConfig,
            compilerOptions: {
              ...defaultTsConfig,
              rootDir,
            },
          }),
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it("compiles snippets independently", async (t) => {
      const snippet1 = `interface Foo { bar: 123 }`;
      const snippet2 = `interface Foo { bar: () => void }`;
      const typeScriptMarkdown = wrapSnippet(snippet1) + wrapSnippet(snippet2);
      await createProject({
        markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
      });
      const result = await TypeScriptDocsVerifier.compileSnippets();
      t.assert.deepEqual(result, [
        {
          file: "README.md",
          index: 1,
          snippet: snippet1,
          linesWithErrors: [],
        },
        {
          file: "README.md",
          index: 2,
          snippet: snippet2,
          linesWithErrors: [],
        },
      ]);
    });

    verify.it(
      "compiles snippets containing modules",
      genSnippet,
      async (snippet, t) => {
        snippet = `declare module "url" {
  export interface Url {
    someAdditionalProperty: boolean
  }
}
${snippet}`;
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "compiles snippets that use the current project dependencies",
      genSnippet,
      async (snippet, t) => {
        snippet = `
// These are some of the TypeScript dependencies of this project
import { Gen } from 'verify-it'

Gen.string()
          ${snippet}`;
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "reports compilation failures",
      genSnippet,
      Gen.string,
      async (validSnippet, invalidSnippet, t: TestContext) => {
        const validTypeScriptMarkdown = wrapSnippet(validSnippet);
        const invalidTypeScriptMarkdown = wrapSnippet(invalidSnippet);
        const markdown = [
          validTypeScriptMarkdown,
          invalidTypeScriptMarkdown,
        ].join("\n");
        await createProject({
          markdownFiles: [{ name: "README.md", contents: markdown }],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();

        t.assert.deepEqual(result.length, 2);
        t.assert.ok(!("error" in result[0]));

        const errorResult = result[1];

        t.assert.partialDeepStrictEqual(errorResult, {
          file: "README.md",
          index: 2,
          snippet: invalidSnippet,
          linesWithErrors: [1],
        });
        t.assert.ok("error" in errorResult);
        t.assert.match(errorResult.error?.message ?? "", /README\.md/);
        t.assert.match(errorResult.error?.message ?? "", /Code Block 2/);
        t.assert.doesNotMatch(errorResult.error?.message ?? "", /block-/);

        Object.values(errorResult.error || {}).forEach((value: unknown) => {
          if (typeof value === "string") {
            t.assert.doesNotMatch(value, /block-/);
          }
        });
      }
    );

    verify.it(
      "reports compilation failures when ts-node is configured to transpile only in tsconfig.json",
      genSnippet,
      async (validSnippet, t: TestContext) => {
        const invalidSnippet = `import('fs').thisFunctionDoesNotExist();`;
        const validTypeScriptMarkdown = wrapSnippet(validSnippet);
        const invalidTypeScriptMarkdown = wrapSnippet(invalidSnippet);
        const markdown = [
          validTypeScriptMarkdown,
          invalidTypeScriptMarkdown,
        ].join("\n");
        await createProject({
          markdownFiles: [{ name: "README.md", contents: markdown }],
          tsConfig: JSON.stringify({
            ...defaultTsConfig,
            "ts-node": {
              transpileOnly: true,
            },
          }),
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result.length, 2);
        t.assert.ok(!("error" in result[0]));

        const errorResult = result[1];
        t.assert.partialDeepStrictEqual(errorResult, {
          file: "README.md",
          index: 2,
          snippet: invalidSnippet,
          linesWithErrors: [1],
        });
        t.assert.ok("error" in errorResult);

        t.assert.match(errorResult.error?.message ?? "", /README\.md/);
        t.assert.match(errorResult.error?.message ?? "", /Code Block 2/);
        t.assert.doesNotMatch(errorResult.error?.message ?? "", /block-/);

        Object.values(errorResult.error || {}).forEach((value: unknown) => {
          if (typeof value === "string") {
            t.assert.doesNotMatch(value, /block-/);
          }
        });
      }
    );

    verify.it(
      "reports compilation failures on the correct line",
      async (t: TestContext) => {
        const mainFile = {
          name: `${defaultPackageJson.main}`,
          contents: "export class MyClass {}",
        };

        const invalidSnippet = `import { MyClass } from '${defaultPackageJson.name}';

const thisIsOK = true;
firstLineOK = false;
console.log('This line is also OK');
`;
        const invalidTypeScriptMarkdown = wrapSnippet(invalidSnippet);
        await createProject({
          markdownFiles: [
            { name: "README.md", contents: invalidTypeScriptMarkdown },
          ],
          mainFile,
        });

        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result.length, 1);

        const errorResult = result[0];
        t.assert.partialDeepStrictEqual(errorResult, {
          file: "README.md",
          index: 1,
          snippet: invalidSnippet,
          linesWithErrors: [4],
        });
        t.assert.ok("error" in errorResult);

        t.assert.match(errorResult.error?.message ?? "", /README\.md/);
        t.assert.match(errorResult.error?.message ?? "", /Code Block 1/);
        t.assert.doesNotMatch(errorResult.error?.message ?? "", /block-/);

        Object.values(errorResult.error || {}).forEach((value: unknown) => {
          if (typeof value === "string") {
            t.assert.doesNotMatch(value, /block-/);
          }
        });
      }
    );

    verify.it(
      "localises imports of the current package if the package main is a js file",
      async (t: TestContext) => {
        const snippet = `
          import { MyClass } from '${defaultPackageJson.name}'
          const instance = new MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: `${defaultPackageJson.main}`,
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`,
        };
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "localises imports of the current package if the package main is a jsx file",
      async (t: TestContext) => {
        const snippet = `
          import React from 'react';
          import { MyComponent } from '${defaultPackageJson.name}';
          const App = () => (
            <MyComponent value={1} />
          );`;
        const mainFile = {
          name: `main.tsx`,
          contents: `
            import React from 'react';
            export const MyComponent = ({ value: number }) => (
              <span>{value.toLocaleString()}</span>
            );`,
        };
        const typeScriptMarkdown = wrapSnippet(snippet, "tsx");
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          packageJson: {
            ...defaultPackageJson,
            main: "main.jsx",
          },
          tsConfig: JSON.stringify({
            ...defaultTsConfig,
            compilerOptions: {
              ...defaultTsConfig.compilerOptions,
              esModuleInterop: true,
              jsx: "react",
            },
          }),
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "localises imports of the current package using exports.require if it exists",
      async (t: TestContext) => {
        const snippet = `
          import { MyClass } from '${defaultPackageJson.name}'
          const instance = new MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: `${defaultPackageJson.main}`,
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`,
        };
        const packageJson = {
          ...defaultPackageJson,
          exports: {
            require: defaultPackageJson.main,
          },
          main: "some/other/file.js",
        };

        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          packageJson,
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      'localises imports of the current package using exports["."].require if it exists',
      async (t: TestContext) => {
        const snippet = `
          import { MyClass } from '${defaultPackageJson.name}'
          const instance = new MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: `${defaultPackageJson.main}`,
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`,
        };
        const packageJson = {
          ...defaultPackageJson,
          exports: {
            ".": {
              require: defaultPackageJson.main,
            },
          },
          main: "some/other/file.js",
        };

        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          packageJson,
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      'localises imports of named files within the current package using exports["./something/*"] if it exists',
      async (t: TestContext) => {
        const sourceFolder = Gen.word();
        const snippet = `
          import { MyClass } from '${defaultPackageJson.name}/something/other'
          const instance = new MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: defaultMainFile.name,
          contents: `
            export class MainClass {
              doStuff (): void {
                return
              }
            }`,
        };
        const otherFile = {
          name: path.join(sourceFolder, "src", "other.ts"),
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`,
        };

        const packageJson = {
          ...defaultPackageJson,
          exports: {
            "./something/*": `./${sourceFolder}/src/*`,
          },
          main: "some/other/file.js",
        };
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          otherFiles: [otherFile],
          packageJson,
        });

        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      'localises imports of wildcard files within the current package using exports = "./prefix/*/path" if it exists',
      async (t: TestContext) => {
        const sourceFolder = Gen.word();
        const snippet = `
          import { MyClass } from '${defaultPackageJson.name}/some/export'
          const instance = new MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: defaultMainFile.name,
          contents: `
            export class MainClass {
              doStuff (): void {
                return
              }
            }`,
        };
        const otherTranspiledFile = path.join(sourceFolder, "other.js");

        const otherFile = {
          name: path.join(sourceFolder, "other.ts"),
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`,
        };

        const packageJson = {
          ...defaultPackageJson,
          exports: {
            "./some/export": {
              require: otherTranspiledFile,
            },
          },
          main: "some/other/file.js",
        };
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          otherFiles: [otherFile],
          packageJson,
        });

        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "localises imports of files within the current package",
      async (t: TestContext) => {
        const sourceFolder = Gen.word();
        const snippet = `
          import { MyClass } from '${defaultPackageJson.name}/${sourceFolder}/other'
          const instance = new MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: defaultMainFile.name,
          contents: `
            export class MainClass {
              doStuff (): void {
                return
              }
            }`,
        };
        const otherFile = {
          name: path.join(sourceFolder, "other.ts"),
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`,
        };
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          otherFiles: [otherFile],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "localises only the package name in imports of files within the current package",
      async (t: TestContext) => {
        const snippet = `
          import lib from 'lib/lib/other'
          const instance = new lib.MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: "lib.ts",
          contents: `
            export class MainClass {
              doStuff (): void {
                return
              }
            }
            `,
        };
        const otherFile = {
          name: path.join("lib", "other.ts"),
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }
            export default lib = { MyClass }
            `,
        };
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          packageJson: {
            name: "lib",
            main: "lib.js",
          },
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          otherFiles: [otherFile],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "localises imports of the current package if the package name is scoped",
      async (t: TestContext) => {
        const snippet = `
          import { MyClass } from '@bbc/${defaultPackageJson.name}'
          const instance = new MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: `${defaultPackageJson.main}`,
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`,
        };

        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          packageJson: {
            main: defaultPackageJson.main,
            name: `@bbc/${defaultPackageJson.name}`,
          },
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "localises imports of files within the current package when the package is scoped",
      async (t: TestContext) => {
        const sourceFolder = Gen.word();
        const snippet = `
          import { MyClass } from '@bbc/${defaultPackageJson.name}/${sourceFolder}/other'
          const instance = new MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: defaultMainFile.name,
          contents: `
            export class MainClass {
              doStuff (): void {
                return
              }
            }`,
        };
        const otherFile = {
          name: path.join(sourceFolder, "other.ts"),
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`,
        };
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          packageJson: {
            main: defaultPackageJson.main,
            name: `@bbc/${defaultPackageJson.name}`,
          },
          otherFiles: [otherFile],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "localises imports of the current package if the package main is a js file",
      Gen.string,
      Gen.string,
      async (name, main, t) => {
        const packageJson: Partial<PackageDefinition> = {
          name,
          main: `${main}.js`,
        };
        const snippet = `
          import { MyClass } from '${packageJson.name}'
          const instance: any = MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: `${packageJson.main}`,
          contents: `
            module.exports.MyClass = function MyClass () {
              this.doStuff = () => {
                return
              }
            }`,
        };
        const typeScriptMarkdown = wrapSnippet(snippet);
        const projectFiles = {
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          packageJson,
        };
        await createProject(projectFiles);
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "localises imports of the current package split across multiple lines",
      Gen.string,
      Gen.string,
      async (name, main, t) => {
        const packageJson: Partial<PackageDefinition> = {
          name,
          main: `${main}.js`,
        };
        const snippet = `
          import {
            MyClass
          } from '${packageJson.name}'
          const instance: any = MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: `${packageJson.main}`,
          contents: `
            module.exports.MyClass = function MyClass () {
              this.doStuff = () => {
                return
              }
            }`,
        };
        const typeScriptMarkdown = wrapSnippet(snippet);
        const projectFiles = {
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          packageJson,
        };
        await createProject(projectFiles);
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "localises imports of the current package when from is in a different line",
      Gen.string,
      Gen.string,
      async (name, main, t) => {
        const packageJson: Partial<PackageDefinition> = {
          name,
          main: `${main}.js`,
        };
        const snippet = `
          import {
            MyClass
          } from
          '${packageJson.name}'
          const instance: any = MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: `${packageJson.main}`,
          contents: `
            module.exports.MyClass = function MyClass () {
              this.doStuff = () => {
                return
              }
            }`,
        };
        const typeScriptMarkdown = wrapSnippet(snippet);
        const projectFiles = {
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          packageJson,
        };
        await createProject(projectFiles);
        const result = await TypeScriptDocsVerifier.compileSnippets();
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "can be run from a subdirectory within the project",
      Gen.array(Gen.word, 5),
      async (pathElements, t) => {
        const snippet = `
          import { MyClass } from '${defaultPackageJson.name}'
          const instance = new MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: `${defaultPackageJson.main}`,
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`,
        };

        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "DOCS.md", contents: typeScriptMarkdown }],
          mainFile,
        });

        const newCurrentDirectory = path.join(
          workingDirectory,
          ...pathElements
        );
        await fs.mkdir(newCurrentDirectory, { recursive: true });
        process.chdir(path.join(...pathElements));

        const pathToMarkdownFile = path.join(
          path.relative(newCurrentDirectory, workingDirectory),
          "DOCS.md"
        );

        const result = await TypeScriptDocsVerifier.compileSnippets([
          pathToMarkdownFile,
        ]);
        t.assert.deepEqual(result, [
          {
            file: pathToMarkdownFile,
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it("handles a non-JSON content in tsconfig.json file", async (t) => {
      const snippet = `
          import { MyClass } from '${defaultPackageJson.name}'
          await Promise.resolve();
          const instance = new MyClass()
          instance.doStuff()`;
      const mainFile = {
        name: `${defaultPackageJson.main}`,
        contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`,
      };

      const typeScriptMarkdown = wrapSnippet(snippet);
      await createProject({
        markdownFiles: [{ name: "DOCS.md", contents: typeScriptMarkdown }],
        mainFile,
      });

      const tsconfigFilename = `tsconfig.json`;
      const tsconfigText = `{
        "compilerOptions": {
          "target": "es2019", // comments are permitted!
          "module": "esnext",
        },
      }`;

      await fs.writeFile(
        path.join(workingDirectory, tsconfigFilename),
        tsconfigText
      );

      const result = await TypeScriptDocsVerifier.compileSnippets({
        markdownFiles: ["DOCS.md"],
        project: tsconfigFilename,
      });
      t.assert.deepEqual(result, [
        {
          file: "DOCS.md",
          index: 1,
          snippet,
          linesWithErrors: [],
        },
      ]);
    });

    verify.it("returns an error if the tsconfig file is invalid", async (t) => {
      await createProject();

      const tsconfigFilename = `tsconfig.json`;
      const tsconfigText = `{
        "compilerOptions": {
          "target": "es2019",
          "module": "esnext",
        },
      `;

      await fs.writeFile(
        path.join(workingDirectory, tsconfigFilename),
        tsconfigText
      );

      await t.assert.rejects(
        TypeScriptDocsVerifier.compileSnippets({
          markdownFiles: ["DOCS.md"],
          project: tsconfigFilename,
        }),
        /Error reading tsconfig from/
      );
    });

    verify.it(
      "uses the default settings if an empty object is supplied",
      genSnippet,
      async (snippet, t) => {
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
        });
        const result = await TypeScriptDocsVerifier.compileSnippets({});
        t.assert.deepEqual(result, [
          {
            file: "README.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "overrides the tsconfig.json path when the --project flag is used",
      async (t) => {
        const snippet = `
          import { MyClass } from '${defaultPackageJson.name}'
          await Promise.resolve();
          const instance = new MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: `${defaultPackageJson.main}`,
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`,
        };

        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "DOCS.md", contents: typeScriptMarkdown }],
          mainFile,
        });

        const tsconfigFilename = `${Gen.word()}-tsconfig.json`;
        const tsconfigJson = {
          compilerOptions: {
            target: "es2019",
            module: "esnext",
          },
        };

        await fs.writeFile(
          path.join(workingDirectory, tsconfigFilename),
          JSON.stringify(tsconfigJson)
        );

        const result = await TypeScriptDocsVerifier.compileSnippets({
          markdownFiles: ["DOCS.md"],
          project: tsconfigFilename,
        });
        t.assert.deepEqual(result, [
          {
            file: "DOCS.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "supports a file path (not just a file name) with the --project flag",
      async (t) => {
        const snippet = `
          import { MyClass } from '${defaultPackageJson.name}'
          await Promise.resolve();
          const instance = new MyClass()
          instance.doStuff()`;
        const mainFile = {
          name: `${defaultPackageJson.main}`,
          contents: `
            export class MyClass {
              doStuff (): void {
                return
              }
            }`,
        };

        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "DOCS.md", contents: typeScriptMarkdown }],
          mainFile,
        });

        const tsconfigDirectory = Gen.word();
        const tsconfigFile = `${Gen.word()}-tsconfig.json`;
        const tsconfigJson = {
          compilerOptions: {
            target: "es2019",
            module: "esnext",
          },
        };

        await fs.mkdir(path.join(workingDirectory, tsconfigDirectory), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(workingDirectory, tsconfigDirectory, tsconfigFile),
          JSON.stringify(tsconfigJson)
        );

        const result = await TypeScriptDocsVerifier.compileSnippets({
          project: path.join(tsconfigDirectory, tsconfigFile),
          markdownFiles: ["DOCS.md"],
        });
        t.assert.deepEqual(result, [
          {
            file: "DOCS.md",
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );
  });
});
