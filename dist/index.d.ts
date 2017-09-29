/// <reference types="bluebird" />
import * as Bluebird from 'bluebird';
import { SnippetCompilationResult } from './src/SnippetCompiler';
export declare function compileSnippets(markdownFileOrFiles?: string | string[]): Bluebird<SnippetCompilationResult[]>;
