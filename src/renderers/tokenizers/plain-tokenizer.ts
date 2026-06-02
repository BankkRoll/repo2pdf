/**
 * Plain-text tokenizer — the universal default.
 * @module renderers/tokenizers/plain-tokenizer
 *
 * @description
 * Zero dependencies, zero runtime requirements. Splits code into lines and emits
 * one uncolored token per line. This is the default so the core renderer runs
 * literally anywhere — edge, browser, serverless, Node — with no WASM, no `fs`,
 * no heavy highlighter. Color is an opt-in enhancement (see {@link ShikiTokenizer}).
 */

import type { Tokenizer, TokenizedLine } from "../tokenizer.interface";

/**
 * Tokenizer that performs no highlighting — every line is a single plain run.
 */
export class PlainTokenizer implements Tokenizer {
  tokenize(code: string): TokenizedLine[] {
    return code.split("\n").map((line) => (line ? [{ text: line }] : []));
  }
}
