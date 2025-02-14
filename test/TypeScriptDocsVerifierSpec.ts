import * as os from "os";
import * as path from "path";
import * as FsExtra from "fs-extra";
import { Gen } from "verify-it";
import * as TypeScriptDocsVerifier from "../index";
import { PackageDefinition } from "../src/PackageInfo";

const workingDirectory = path.join(
  os.tmpdir(),
  "typescript-docs-verifier-test"
);
const fixturePath = path.join(__dirname, "fixtures");

const defaultPackageJson = {
  name: Gen.string(),
  main: `${Gen.string()}.ts`,
};
const defaultMainFile = {
  name: defaultPackageJson.main,
  contents: FsExtra.readFileSync(
    path.join(fixturePath, "main-default.ts")
  ).toString(),
};

const defaultMarkdownFile = {
  name: "README.md",
  contents: FsExtra.readFileSync(path.join(fixturePath, "no-typescript.md")),
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
      await FsExtra.ensureFile(filePath);
      await FsExtra.writeFile(filePath, file.contents);
    })
  );

  const nodeModulesFolder = path.join(__dirname, "..", "node_modules");
  await FsExtra.symlink(
    nodeModulesFolder,
    path.join(workingDirectory, "node_modules")
  );
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
      await FsExtra.remove(workingDirectory);
      await FsExtra.ensureDir(path.join(workingDirectory));
      process.chdir(workingDirectory);
    });

    afterEach(async () => {
      await FsExtra.remove(workingDirectory);
    });

    verify.it(
      "returns an empty array if no code snippets are present",
      async () => {
        await createProject();
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          []
        );
      }
    );

    verify.it(
      "returns an empty array if no typescript code snippets are present",
      Gen.array(Gen.string, 4),
      async (strings) => {
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
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          []
        );
      }
    );

    verify.it(
      "returns an error if a documentation file does not exist",
      Gen.string,
      async (filename) => {
        await createProject();
        return await TypeScriptDocsVerifier.compileSnippets([
          "README.md",
          filename,
        ]).should.be.rejectedWith(filename);
      }
    );

    verify.it(
      'returns a single element result array when a valid typescript block marked "typescript" is supplied',
      genSnippet,
      Gen.string,
      async (snippet, fileName) => {
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: fileName, contents: typeScriptMarkdown }],
        });
        return await TypeScriptDocsVerifier.compileSnippets(
          fileName
        ).should.eventually.eql([
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
      async (snippet, fileName) => {
        const typeScriptMarkdown = wrapSnippet(snippet, "ts");
        await createProject({
          markdownFiles: [{ name: fileName, contents: typeScriptMarkdown }],
        });
        return await TypeScriptDocsVerifier.compileSnippets(
          fileName
        ).should.eventually.eql([
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
      async (fileName) => {
        const typeScriptMarkdown = `import React from 'react';
export const bob = () => (<div></div>);
`;
        ("tsx");
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
        return await TypeScriptDocsVerifier.compileSnippets(
          fileName
        ).should.eventually.eql([
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
      async (snippet, fileName) => {
        const ignoreString = "<!-- ts-docs-verifier:ignore -->";
        const typeScriptMarkdown = `${ignoreString}${wrapSnippet(
          snippet,
          "ts"
        )}`;
        await createProject({
          markdownFiles: [{ name: fileName, contents: typeScriptMarkdown }],
        });
        return await TypeScriptDocsVerifier.compileSnippets(
          fileName
        ).should.eventually.eql([]);
      }
    );

    verify.it(
      "compiles snippets from multiple files",
      Gen.distinct(genSnippet, 6),
      Gen.distinct(Gen.string, 3),
      async (snippets, fileNames) => {
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
        return await TypeScriptDocsVerifier.compileSnippets(
          fileNames
        ).should.eventually.eql(expected);
      }
    );

    verify.it(
      "reads from README.md if no file paths are supplied",
      genSnippet,
      async (snippet) => {
        const typeScriptMarkdown = wrapSnippet(snippet);

        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
        });
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      "returns an empty array if an empty array is provided",
      genSnippet,
      async (snippet) => {
        const typeScriptMarkdown = wrapSnippet(snippet);

        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
        });
        return await TypeScriptDocsVerifier.compileSnippets(
          []
        ).should.eventually.eql([]);
      }
    );

    verify.it(
      "returns multiple results when multiple TypeScript snippets are supplied",
      Gen.array(genSnippet, Gen.integerBetween(2, 6)()),
      async (snippets) => {
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
        return () =>
          TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
            expected
          );
      }
    );

    verify.it(
      "compiles snippets with import statements",
      genSnippet,
      async (snippet) => {
        snippet = `import * as path from 'path'
          path.join('.', 'some-path')
          ${snippet}`;
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
        });
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      "compiles snippets containing modules",
      genSnippet,
      async (snippet) => {
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
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      "compiles snippets that use the current project dependencies",
      genSnippet,
      async (snippet) => {
        snippet = `
// These are some of the TypeScript dependencies of this project
import {} from 'mocha'
import { Gen } from 'verify-it'
import * as chai from 'chai'

Gen.string()
          ${snippet}`;
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
        });
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      "reports compilation failures",
      genSnippet,
      Gen.string,
      async (validSnippet, invalidSnippet) => {
        const validTypeScriptMarkdown = wrapSnippet(validSnippet);
        const invalidTypeScriptMarkdown = wrapSnippet(invalidSnippet);
        const markdown = [
          validTypeScriptMarkdown,
          invalidTypeScriptMarkdown,
        ].join("\n");
        await createProject({
          markdownFiles: [{ name: "README.md", contents: markdown }],
        });
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.satisfy(
          (results: TypeScriptDocsVerifier.SnippetCompilationResult[]) => {
            results.should.have.length(2);
            results[0].should.not.have.property("error");
            const errorResult = results[1];
            errorResult.should.have.property("file", "README.md");
            errorResult.should.have.property("index", 2);
            errorResult.should.have.property("snippet", invalidSnippet);
            errorResult.should.have.property("error");
            errorResult.linesWithErrors.should.deep.equal([1]);
            errorResult?.error?.message.should.include("README.md");
            errorResult?.error?.message.should.include("Code Block 2");
            errorResult?.error?.message.should.not.include("block-");

            Object.values(errorResult.error || {}).forEach((value: unknown) => {
              (value as string).should.not.include("block-");
            });

            return true;
          }
        );
      }
    );

    verify.it(
      "reports compilation failures when ts-node is configured to transpile only in tsconfig.json",
      genSnippet,
      async (validSnippet) => {
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
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.satisfy(
          (results: TypeScriptDocsVerifier.SnippetCompilationResult[]) => {
            results.should.have.length(2);
            results[0].should.not.have.property("error");
            const errorResult = results[1];
            errorResult.should.have.property("file", "README.md");
            errorResult.should.have.property("index", 2);
            errorResult.should.have.property("snippet", invalidSnippet);
            errorResult.should.have.property("error");
            errorResult.linesWithErrors.should.deep.equal([1]);
            errorResult?.error?.message.should.include("README.md");
            errorResult?.error?.message.should.include("Code Block 2");
            errorResult?.error?.message.should.not.include("block-");

            Object.values(errorResult.error || {}).forEach((value: unknown) => {
              (value as string).should.not.include("block-");
            });

            return true;
          }
        );
      }
    );

    verify.it("reports compilation failures on the correct line", async () => {
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

      return await TypeScriptDocsVerifier.compileSnippets().should.eventually.satisfy(
        (results: TypeScriptDocsVerifier.SnippetCompilationResult[]) => {
          results.should.have.length(1);
          const errorResult = results[0];
          errorResult.should.have.property("file", "README.md");
          errorResult.should.have.property("index", 1);
          errorResult.should.have.property("snippet", invalidSnippet);
          errorResult.should.have.property("error");
          errorResult.linesWithErrors.should.deep.equal([4]);
          errorResult?.error?.message.should.include("README.md");
          errorResult?.error?.message.should.include("Code Block 1");
          errorResult?.error?.message.should.not.include("block-");

          Object.values(errorResult?.error || {}).forEach((value) => {
            (value as string).should.not.include("block-");
          });

          return true;
        }
      );
    });

    verify.it(
      "localises imports of the current package if the package main is a ts file",
      async () => {
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
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      "localises imports of the current package if the package main is a tsx file",
      async () => {
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
            main: "main.tsx",
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
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      "localises imports of the current package using exports.require if it exists",
      async () => {
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
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      'localises imports of the current package using exports["."].require if it exists',
      async () => {
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
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      'localises imports of named files within the current package using exports["./something/*"] if it exists',
      async () => {
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

        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      'localises imports of wildcard files within the current package using exports = "./prefix/*/path" if it exists',
      async () => {
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
              require: otherFile.name,
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

        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      "localises imports of files within the current package",
      async () => {
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
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      "localises only the package name in imports of files within the current package",
      async () => {
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
            main: "lib.ts",
          },
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
          mainFile,
          otherFiles: [otherFile],
        });
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      "localises imports of the current package if the package name is scoped",
      async () => {
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
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      "localises imports of files within the current package when the package is scoped",
      async () => {
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
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      "localises imports of the current package if the package main is a js file",
      Gen.string,
      Gen.string,
      async (name, main) => {
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
        return await TypeScriptDocsVerifier.compileSnippets().should.eventually.eql(
          [
            {
              file: "README.md",
              index: 1,
              snippet,
              linesWithErrors: [],
            },
          ]
        );
      }
    );

    verify.it(
      "can be run from a subdirectory within the project",
      Gen.array(Gen.word, 5),
      async (pathElements) => {
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
        await FsExtra.ensureDir(newCurrentDirectory);
        process.chdir(path.join(...pathElements));

        const pathToMarkdownFile = path.join(
          path.relative(newCurrentDirectory, workingDirectory),
          "DOCS.md"
        );

        return await TypeScriptDocsVerifier.compileSnippets([
          pathToMarkdownFile,
        ]).should.eventually.eql([
          {
            file: pathToMarkdownFile,
            index: 1,
            snippet,
            linesWithErrors: [],
          },
        ]);
      }
    );

    verify.it(
      "uses the default settings if an empty object is supplied",
      genSnippet,
      Gen.string,
      async (snippet) => {
        const typeScriptMarkdown = wrapSnippet(snippet);
        await createProject({
          markdownFiles: [{ name: "README.md", contents: typeScriptMarkdown }],
        });
        return await TypeScriptDocsVerifier.compileSnippets(
          {}
        ).should.eventually.eql([
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
      async () => {
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

        await FsExtra.writeJSON(
          path.join(workingDirectory, tsconfigFilename),
          tsconfigJson
        );

        return await TypeScriptDocsVerifier.compileSnippets({
          markdownFiles: ["DOCS.md"],
          project: tsconfigFilename,
        }).should.eventually.eql([
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
      async () => {
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

        await FsExtra.ensureDir(path.join(workingDirectory, tsconfigDirectory));
        await FsExtra.writeJSON(
          path.join(workingDirectory, tsconfigDirectory, tsconfigFile),
          tsconfigJson
        );

        return await TypeScriptDocsVerifier.compileSnippets({
          project: path.join(tsconfigDirectory, tsconfigFile),
          markdownFiles: ["DOCS.md"],
        }).should.eventually.eql([
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
