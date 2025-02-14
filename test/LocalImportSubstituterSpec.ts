import { expect } from "chai";
import { LocalImportSubstituter } from "../src/LocalImportSubstituter";

const defaultPackageInfo = {
  name: "my-package",
  main: "index.ts",
  packageRoot: "/path/to/package",
};

const scenarios = [
  {
    importLine: `import something from 'awesome'`,
    expected: `import something from '/path/to/package/index'`,
    name: "single quotes",
  },
  {
    importLine: `import something from 'awesome';`,
    expected: `import something from '/path/to/package/index'`,
    name: "a trailing semicolon",
  },
  {
    importLine: `import something from "awesome"`,
    expected: `import something from "/path/to/package/index"`,
    name: "double quotes",
  },
  {
    importLine: `import something from "awesome"      `,
    expected: `import something from "/path/to/package/index"`,
    name: "trailing whitespace",
  },
  {
    importLine: `import something from 'awesome'`,
    expected: `import something from '/path/to/package/main'`,
    packageInfo: {
      exports: "main.ts",
    },
    name: "where exports is a string",
  },
  {
    importLine: `import something from 'awesome'`,
    expected: `import something from '/path/to/package/main'`,
    packageInfo: {
      exports: {
        ".": "main.ts",
      },
    },
    name: 'where exports is { ".": "{some-file}" }',
  },
  {
    importLine: `import something from 'awesome'`,
    expected: `import something from '/path/to/package/main'`,
    packageInfo: {
      exports: {
        "node-addons": "main.ts",
      },
    },
    name: 'where exports is { "node-addons": "{some-file}" }',
  },
  {
    importLine: `import something from 'awesome'`,
    expected: `import something from '/path/to/package/main'`,
    packageInfo: {
      exports: {
        node: "main.ts",
      },
    },
    name: 'where exports is { "node": "{some-file}" }',
  },
  {
    importLine: `import something from 'awesome'`,
    expected: `import something from '/path/to/package/main'`,
    packageInfo: {
      exports: {
        require: "main.ts",
      },
    },
    name: 'where exports is { "require": "{some-file}" }',
  },
  {
    importLine: `import something from 'awesome'`,
    expected: `import something from '/path/to/package/main'`,
    packageInfo: {
      exports: {
        default: "main.ts",
      },
    },
    name: 'where exports is { "default": "{some-file}" }',
  },
  {
    importLine: `import something from 'awesome'`,
    expected: `import something from '/path/to/package/main'`,
    packageInfo: {
      exports: {
        ".": {
          import: "main.ts",
        },
      },
    },
    name: 'where exports is { ".": { "import": "{some-file}" } }',
  },
  {
    importLine: `import something from 'awesome'`,
    expected: `import something from '/path/to/package/main'`,
    packageInfo: {
      exports: {
        ".": {
          require: "main.ts",
        },
      },
    },
    name: 'where exports is { ".": { "require": "{some-file}" } }',
  },
  {
    importLine: `import something from 'awesome'`,
    expected: `import something from '/path/to/package/main'`,
    packageInfo: {
      exports: {
        ".": {
          default: "main.ts",
        },
      },
    },
    name: 'where exports is { ".": { "default": "{some-file}" } }" }',
  },
  {
    importLine: `import something from 'awesome/some/path'`,
    expected: `import something from '/path/to/package/internal/path'`,
    packageInfo: {
      exports: {
        ".": "main.ts",
        "./some/path": "./internal/path.ts",
      },
    },
    name: 'imports a subpath where exports is { "./path": "./some/path.ts" }" }',
  },
  {
    importLine: `import something from 'awesome/some/path'`,
    expected: `import something from '/path/to/package/internal/path'`,
    packageInfo: {
      exports: {
        ".": "main.ts",
        "./some/path": {
          default: "./internal/path.ts",
        },
      },
    },
    name: 'imports a subpath where exports is { "./path": { default: "./some/path.ts" } } }',
  },
  {
    importLine: `import something from 'awesome/lib/some/thing'`,
    expected: `import something from '/path/to/package/internal/some/thing'`,
    packageInfo: {
      exports: {
        ".": "main.ts",
        "./lib/*/thing": "./internal/*/thing.ts",
      },
    },
    name: 'imports a subpath where exports is { "./lib/*/thing": "./internal/*/thing.ts" } }',
  },
  {
    importLine: `import something from 'awesome/lib/some/thing'`,
    expected: `import something from '/path/to/package/internal/some/thing'`,
    packageInfo: {
      exports: {
        ".": "main.ts",
        "./lib/*/thing": {
          import: "./internal/*/thing.ts",
        },
      },
    },
    name: 'imports a subpath where exports is { "./lib/*/thing": { import: "./internal/*/thing.ts" } } }',
  },
  {
    importLine: `import something from '@my-scope/awesome'`,
    expected: `import something from '/path/to/package/index'`,
    name: "a scoped package name",
    packageName: "@my-scope/awesome",
  },
  {
    importLine: `import something from 'awesome/some/inner/path'`,
    expected: `import something from '/path/to/package/some/inner/path'`,
    name: "imports of paths within a package",
  },
  {
    importLine: `import something from '@my-scope/awesome/some/inner/path'`,
    expected: `import something from '/path/to/package/some/inner/path'`,
    name: "imports of paths within a scoped package",
    packageName: "@my-scope/awesome",
  },
  {
    importLine: `import lib from 'lib/lib/lib'`,
    expected: `import lib from '/path/to/package/lib/lib'`,
    name: "overlapping library and path names",
    packageName: "lib",
  },
  {
    importLine: `import lib from '@lib/lib/lib/lib'`,
    expected: `import lib from '/path/to/package/lib/lib'`,
    name: "overlapping library, path and scope names",
    packageName: "@lib/lib",
  },
];

describe("LocalImportSubstituter", () => {
  it("does not change imports for different packages", () => {
    const substituter = new LocalImportSubstituter(defaultPackageInfo);

    const code = `import * as other from "package"

console.log('Should not be mutated')`;
    const result = substituter.substituteLocalPackageImports(code);

    expect(result).to.eql(code);
  });

  it("throws an error if main and exports are both not defined", () => {
    expect(
      () =>
        new LocalImportSubstituter({
          name: "my-package",
          packageRoot: "/path/to/package",
        })
    ).to.throw(
      "Failed to find a valid main or exports entry in package.json file"
    );
  });

  it("throws an error if exports does not contain a valid entry under default", () => {
    const substituter = new LocalImportSubstituter({
      name: "my-package",
      packageRoot: "/path/to/package",
      exports: {
        "./some/specific/path": {
          default: "./main.ts",
        },
      },
    });
    expect(() =>
      substituter.substituteLocalPackageImports('import {} from "my-package"')
    ).to.throw('Unable to resolve export for path "my-package"');
  });

  it("throws an error if exports contains only an undefined value under default", () => {
    const substituter = new LocalImportSubstituter({
      name: "my-package",
      packageRoot: "/path/to/package",
      exports: {
        ".": {
          default: undefined,
        },
      },
    });
    expect(() =>
      substituter.substituteLocalPackageImports('import {} from "my-package"')
    ).to.throw('Unable to resolve export for path "my-package"');
  });

  scenarios.forEach(
    ({
      importLine,
      expected,
      name,
      packageName = "awesome",
      packageInfo = {},
    }) => {
      it(`localises imports with ${name}`, () => {
        const substituter = new LocalImportSubstituter({
          ...defaultPackageInfo,
          ...packageInfo,
          name: packageName,
        });

        const code = `
${importLine}

console.log('Something happened')
      `;

        const localised = substituter.substituteLocalPackageImports(code);

        expect(localised).satisfies((actual: string) => {
          return actual.trim().startsWith(expected);
        }, `${localised} should start with ${expected}`);
      });
    }
  );
});
