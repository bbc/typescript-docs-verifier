import { expect } from "chai";
import * as fs from "fs/promises";
import * as path from "path";
import { CodeBlockExtractor } from "../src/CodeBlockExtractor";

describe("CodeBlockExtractor", () => {
  const tmp = path.join(__dirname, "fixtures", "CodeBlockExtractorSpec");

  beforeEach(async () => {
    await fs.mkdir(tmp, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  describe("extract", () => {
    it("extracts TypeScript code blocks from markdown", async () => {
      const content = `# Example
\`\`\`ts
const a = 1;
\`\`\`

\`\`\`typescript
function foo() {}
\`\`\``;

      const filePath = path.join(tmp, "README.md");
      await fs.writeFile(filePath, content, "utf-8");

      const blocks = await CodeBlockExtractor.extract(filePath);
      expect(blocks).to.have.length(2);
      expect(blocks[0].code.trim()).to.equal("const a = 1;");
      expect(blocks[0].type).to.equal("ts");
      expect(blocks[1].code.trim()).to.equal("function foo() {}");
      expect(blocks[1].type).to.equal("ts");
    });

    it("ignores blocks marked with <!-- ts-docs-verifier:ignore -->", async () => {
      const content = `# Ignored Example
<!-- ts-docs-verifier:ignore -->
\`\`\`ts
shouldNotAppear()
\`\`\`
\`\`\`ts
shouldAppear()
\`\`\``;

      const filePath = path.join(tmp, "IGNORE.md");
      await fs.writeFile(filePath, content, "utf-8");

      const blocks = await CodeBlockExtractor.extract(filePath);
      expect(blocks).to.have.length(1);
      expect(blocks[0].code).to.equal("shouldAppear()\n");
    });

    it("extracts TypeScript code blocks from markdown", async () => {
      const content = `# Example
\`\`\`ts
const a = 1;
\`\`\``;

      const filePath = path.join(tmp, "README.md");
      await fs.writeFile(filePath, content, "utf-8");

      const blocks = await CodeBlockExtractor.extract(filePath);
      expect(blocks).to.have.length(1);
      expect(blocks[0].code).to.equal("const a = 1;\n");
    });

    it("extracts two codeblocks when tail and head are on a single line", async () => {
      const content = `# Example
\`\`\`ts
const a = 1;
\`\`\`\`\`\`ts
const b = 2;\`\`\``;

      const filePath = path.join(tmp, "SINGLE_LINE.md");
      await fs.writeFile(filePath, content, "utf-8");

      const blocks = await CodeBlockExtractor.extract(filePath);
      expect(blocks).to.have.length(2);
      expect(blocks[0].code).to.equal("const a = 1;\n");
      expect(blocks[1].code).to.equal("const b = 2;");
    });

    it("should throw an error if the file does not exist", async () => {
      // file is never written
      await expect(
        CodeBlockExtractor.extract(path.join(tmp, `INVALID-${Date.now()}.md`))
      ).to.eventually.rejectedWith(Error, "ENOENT: no such file or directory");
    });

    it("should extract tsx code blocks", async () => {
      const content = `# Example
\`\`\`tsx
const Component = () => <div>Hello</div>;
\`\`\``;

      const filePath = path.join(tmp, "TSX.md");
      await fs.writeFile(filePath, content, "utf-8");

      const blocks = await CodeBlockExtractor.extract(filePath);
      expect(blocks).to.have.length(1);
      expect(blocks[0].type).to.equal("tsx");
      expect(blocks[0].code.trim()).to.equal(
        "const Component = () => <div>Hello</div>;"
      );
    });

    it("should handle multiple code blocks with different types", async () => {
      const content = `# Example
\`\`\`ts
const a = 1;
\`\`\`

\`\`\`tsx
const b = <div>2</div>;
\`\`\`

\`\`\`typescript
const c = 3;
\`\`\``;

      const filePath = path.join(tmp, "MULTIPLE.md");
      await fs.writeFile(filePath, content, "utf-8");

      const blocks = await CodeBlockExtractor.extract(filePath);
      expect(blocks).to.have.length(3);
      expect(blocks[0].type).to.equal("ts");
      expect(blocks[1].type).to.equal("tsx");
      expect(blocks[2].type).to.equal("ts");
      expect(blocks[0].code.trim()).to.equal("const a = 1;");
      expect(blocks[1].code.trim()).to.equal("const b = <div>2</div>;");
      expect(blocks[2].code.trim()).to.equal("const c = 3;");
    });

    it("should handle code blocks with newlines", async () => {
      const content = `# Example
\`\`\`ts
const a = 1;
const b = 2;
const c = 3;
\`\`\``;

      const filePath = path.join(tmp, "NEWLINES.md");
      await fs.writeFile(filePath, content, "utf-8");

      const blocks = await CodeBlockExtractor.extract(filePath);
      expect(blocks).to.have.length(1);
      expect(blocks[0].code).to.equal(
        "const a = 1;\nconst b = 2;\nconst c = 3;\n"
      );
    });

    it("should ignore non-typescript code blocks", async () => {
      const content = `# Example
\`\`\`js
const a = 1;
\`\`\`

\`\`\`shell
echo "hello"
\`\`\`

\`\`\`ts
const b = 2;
\`\`\`

\`\`\`json
{
  "key": "value"
}
\`\`\``;

      const filePath = path.join(tmp, "NON_TS.md");
      await fs.writeFile(filePath, content, "utf-8");

      const blocks = await CodeBlockExtractor.extract(filePath);
      expect(blocks).to.have.length(1);
      expect(blocks[0].type).to.equal("ts");
      expect(blocks[0].code).to.equal("const b = 2;\n");
    });
  });
});
