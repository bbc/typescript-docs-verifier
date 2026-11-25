import { describe, it, type TestContext } from "node:test";
import { CodeBlockExtractor } from "../src/CodeBlockExtractor";

const extract = CodeBlockExtractor.extractCodeBlocksFromMarkdown;

describe("CodeBlockExtractor", () => {
  describe("extractCodeBlocksFromMarkdown", () => {
    it("extracts a typescript block", (t: TestContext) => {
      const markdown = "```typescript\nconst x: number = 1;\n```\n";
      t.assert.deepEqual(extract(markdown), [
        { code: "const x: number = 1;\n", type: "ts" },
      ]);
    });

    it("extracts multiple blocks in order", (t: TestContext) => {
      const markdown =
        "```ts\nconst a = 1;\n```\n\nsome prose\n\n```tsx\nconst b = <div />;\n```\n";
      t.assert.deepEqual(extract(markdown), [
        { code: "const a = 1;\n", type: "ts" },
        { code: "const b = <div />;\n", type: "tsx" },
      ]);
    });

    it("does not extract non-typescript blocks", (t: TestContext) => {
      const markdown = "```javascript\nconst a = 1;\n```\n\n```bash\nls\n```\n";
      t.assert.deepEqual(extract(markdown), []);
    });

    it("extracts an empty block", (t: TestContext) => {
      t.assert.deepEqual(extract("```ts\n```\n"), [{ code: "", type: "ts" }]);
    });

    it("drops a block with no closing fence", (t: TestContext) => {
      t.assert.deepEqual(extract("```ts\nconst a = 1;\n"), []);
    });

    it("extracts a block whose closing fence is on the same line as the code", (t: TestContext) => {
      t.assert.deepEqual(extract("```ts\nconst a = 1;```"), [
        { code: "const a = 1;", type: "ts" },
      ]);
    });

    it("extracts an indented block keeping the indentation of the code", (t: TestContext) => {
      const markdown = "  ```ts\n  const a = 1;\n  ```\n";
      t.assert.deepEqual(extract(markdown), [
        { code: "  const a = 1;\n", type: "ts" },
      ]);
    });

    describe("ignore comments", () => {
      it("ignores a block when the comment is directly before the fence", (t: TestContext) => {
        const markdown =
          "<!-- ts-docs-verifier:ignore -->```ts\nconst a = 1;\n```\n";
        t.assert.deepEqual(extract(markdown), []);
      });

      it("ignores a block when the comment is on the line before the fence", (t: TestContext) => {
        const markdown =
          "<!-- ts-docs-verifier:ignore -->\n```ts\nconst a = 1;\n```\n";
        t.assert.deepEqual(extract(markdown), []);
      });

      it("ignores a block when blank lines separate the comment and the fence", (t: TestContext) => {
        const markdown =
          "<!-- ts-docs-verifier:ignore -->\n\n\n```ts\nconst a = 1;\n```\n";
        t.assert.deepEqual(extract(markdown), []);
      });

      it("ignores a block when the comment and fence are indented in a list item", (t: TestContext) => {
        const markdown =
          "1. Step\n\n   <!-- ts-docs-verifier:ignore -->\n   ```typescript\n   broken(\n   ```\n";
        t.assert.deepEqual(extract(markdown), []);
      });

      it("ignores a block when the comment has trailing spaces", (t: TestContext) => {
        const markdown =
          "<!-- ts-docs-verifier:ignore -->  \n```typescript\nbroken(\n```\n";
        t.assert.deepEqual(extract(markdown), []);
      });

      it("does not ignore a block when other text separates the comment and the fence", (t: TestContext) => {
        const markdown =
          "<!-- ts-docs-verifier:ignore -->\nsome text\n```ts\nconst a = 1;\n```\n";
        t.assert.deepEqual(extract(markdown), [
          { code: "const a = 1;\n", type: "ts" },
        ]);
      });

      it("only ignores the block immediately following the comment", (t: TestContext) => {
        const markdown =
          "<!-- ts-docs-verifier:ignore -->\n```ts\nconst a = 1;\n```\n\n```ts\nconst b = 2;\n```\n";
        t.assert.deepEqual(extract(markdown), [
          { code: "const b = 2;\n", type: "ts" },
        ]);
      });
    });

    describe("fences inside code", () => {
      it("does not truncate a block at triple backticks inside a string", (t: TestContext) => {
        const markdown =
          '```typescript\nconst fence = "```js";\nconst x: number = 1;\n```\n';
        t.assert.deepEqual(extract(markdown), [
          {
            code: 'const fence = "```js";\nconst x: number = 1;\n',
            type: "ts",
          },
        ]);
      });

      it("closes a block on a fence line of more than three backticks", (t: TestContext) => {
        const markdown = "```ts\nconst a = 1;\n````\n";
        t.assert.deepEqual(extract(markdown), [
          { code: "const a = 1;\n", type: "ts" },
        ]);
      });

      it("splits blocks whose closing and opening fences share a line", (t: TestContext) => {
        const markdown =
          "```typescript\ninterface Foo { bar: 123 }```" +
          "```typescript\ninterface Foo { bar: () => void }```";
        t.assert.deepEqual(extract(markdown), [
          { code: "interface Foo { bar: 123 }", type: "ts" },
          { code: "interface Foo { bar: () => void }", type: "ts" },
        ]);
      });

      it("extracts typescript blocks nested inside longer markdown fences", (t: TestContext) => {
        const markdown =
          "````Markdown\n```typescript\nconst a = 1;\n```\n````\n";
        t.assert.deepEqual(extract(markdown), [
          { code: "const a = 1;\n", type: "ts" },
        ]);
      });
    });

    describe("info string casing", () => {
      it("classifies an uppercase TSX fence as tsx", (t: TestContext) => {
        const markdown = "```TSX\nconst a = <div />;\n```\n";
        t.assert.deepEqual(extract(markdown), [
          { code: "const a = <div />;\n", type: "tsx" },
        ]);
      });

      it("classifies a mixed-case Tsx fence as tsx", (t: TestContext) => {
        const markdown = "```Tsx\nconst a = <div />;\n```\n";
        t.assert.deepEqual(extract(markdown), [
          { code: "const a = <div />;\n", type: "tsx" },
        ]);
      });

      it("classifies an uppercase TYPESCRIPT fence as ts", (t: TestContext) => {
        const markdown = "```TYPESCRIPT\nconst a = 1;\n```\n";
        t.assert.deepEqual(extract(markdown), [
          { code: "const a = 1;\n", type: "ts" },
        ]);
      });
    });
  });
});
