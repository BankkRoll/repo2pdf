/**
 * Syntax tokenization contract.
 * @module renderers/tokenizer.interface
 *
 * @description
 * The renderer needs colored tokens, not HTML. A {@link Tokenizer} turns a line
 * (or block) of code into runs of `{ text, color }` that the PDF renderer draws
 * directly. This keeps the highlighter pluggable and optional: the default
 * Shiki adapter gives rich colors in Node, while a plain-text tokenizer (or any
 * consumer-supplied one) keeps the core runnable on edge/serverless/browser
 * with no heavy dependency.
 */

/** A single styled run of text within a line. */
export interface SyntaxToken {
  /** The literal text of this run (no newlines). */
  text: string;
  /** Hex color (e.g. `#24292e`). Falls back to the theme foreground if absent. */
  color?: string;
  /** Whether this run is italic (e.g. comments in some themes). */
  italic?: boolean;
  /** Whether this run is bold. */
  bold?: boolean;
}

/** A tokenized line: an ordered list of styled runs. */
export type TokenizedLine = SyntaxToken[];

/**
 * Turns source code into per-line styled tokens for a given theme.
 *
 * @remarks
 * Implementations must split on newlines and return one {@link TokenizedLine}
 * per source line (preserving blank lines as empty arrays) so the renderer can
 * map lines to line numbers 1:1.
 */
export interface Tokenizer {
  /**
   * Tokenize code into styled lines.
   *
   * @param code - Source code (may contain `\n`)
   * @param language - Normalized language id (e.g. `typescript`)
   * @param theme - Theme name (used by color-aware tokenizers like Shiki)
   * @returns One styled line per source line
   */
  tokenize(
    code: string,
    language: string,
    theme: string,
  ): Promise<TokenizedLine[]> | TokenizedLine[];

  /** Release any resources held by the tokenizer (optional). */
  dispose?(): Promise<void> | void;
}
