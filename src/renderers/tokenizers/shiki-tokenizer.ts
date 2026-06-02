/**
 * Shiki-based tokenizer.
 * @module renderers/tokenizers/shiki-tokenizer
 *
 * @description
 * Uses Shiki's tokenizer (NOT its HTML output) to produce colored tokens for
 * the PDF renderer. This is the default highlighter in Node — it gives the same
 * theme-accurate colors as the old HTML pipeline. Shiki is an optional concern:
 * if it fails to load (or a lighter runtime is desired), the renderer falls back
 * to the {@link PlainTokenizer}.
 */

import type { Highlighter, ThemedToken } from "shiki";
import { getHighlighter, ensureLanguage } from "../../utils/shiki-manager";
import { disposeHighlighters } from "../../utils/shiki-manager";
import { normalizeLanguage } from "../../utils/language-map";
import type {
  Tokenizer,
  TokenizedLine,
  SyntaxToken,
} from "../tokenizer.interface";

/**
 * Tokenizer backed by the shared Shiki highlighter singleton.
 */
export class ShikiTokenizer implements Tokenizer {
  async tokenize(
    code: string,
    language: string,
    theme: string,
  ): Promise<TokenizedLine[]> {
    let highlighter: Highlighter;
    try {
      highlighter = await getHighlighter(theme);
    } catch {
      // Caller will fall back to plain text.
      throw new Error("Shiki highlighter unavailable");
    }

    const lang = await ensureLanguage(highlighter, normalizeLanguage(language));
    const { tokens } = highlighter.codeToTokens(code, {
      lang: lang as never,
      theme,
    });

    return tokens.map((line: ThemedToken[]) =>
      line.map((t): SyntaxToken => {
        // fontStyle is a bitfield: 1=italic, 2=bold, 4=underline.
        const fontStyle = t.fontStyle ?? 0;
        return {
          text: t.content,
          color: t.color,
          italic: (fontStyle & 1) !== 0,
          bold: (fontStyle & 2) !== 0,
        };
      }),
    );
  }

  async dispose(): Promise<void> {
    await disposeHighlighters();
  }
}
