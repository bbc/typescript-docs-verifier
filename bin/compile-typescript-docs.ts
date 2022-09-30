#! /usr/bin/env node

import ora from "ora";
import chalk from "chalk";
import * as yargs from "yargs";
import * as TypeScriptDocsVerifier from "../index";

const cliOptions = yargs
  .option("input-files", {
    description: "The list of input files to be processed",
    array: true,
    default: ["README.md"],
  })
  .option("project", {
    description:
      "The path (relative to the package root) to the tsconfig.json file to use when compiling snippets (defaults to the `tsconfig.json` in the package root)",
    string: true,
    requiresArg: false,
  });

const { "input-files": inputFiles, project } = cliOptions.parseSync();

const spinner = ora();
spinner
  .info(
    `Compiling documentation TypeScript code snippets from ${inputFiles.join(
      ", "
    )}`
  )
  .start();

const formatCode = (code: string, errorLines: number[]) => {
  const lines = code.split("\n").map((line, index) => {
    const lineNumber = index + 1;
    if (errorLines.includes(lineNumber)) {
      return chalk`{bold.red ${String(lineNumber).padStart(2)}| ${line}}`;
    } else {
      return `${String(lineNumber).padStart(2)}| ${line}`;
    }
  });
  return "    " + lines.join("\n    ");
};

const formatError = (error: Error) =>
  "  " + error.message.split("\n").join("\n      ");

const doCompilation = async () => {
  const results = await TypeScriptDocsVerifier.compileSnippets({
    markdownFiles: inputFiles,
    project,
  });
  spinner.info(`Found ${results.length} TypeScript snippets`).start();
  results.forEach((result) => {
    if (result.error) {
      process.exitCode = 1;
      spinner.fail(
        chalk`{red.bold Error compiling example code block ${result.index} in file ${result.file}:}`
      );
      console.log(formatError(result.error));
      console.log();
      console.log(chalk`{blue.bold  Original code:}`);
      console.log(formatCode(result.snippet, result.linesWithErrors));
    }
  });
  if (process.exitCode) {
    spinner.fail(chalk`{red.bold Compilation failed, see above errors}`);
  } else {
    spinner.succeed(chalk`{green.bold All snippets compiled OK}`);
  }
};

doCompilation().catch((error) => {
  process.exitCode = 1;
  console.error(error);
  try {
    spinner.fail();
  } catch (error) {
    console.error(error);
  }
});
