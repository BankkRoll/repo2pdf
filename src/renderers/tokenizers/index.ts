/**
 * Tokenizer selection.
 * @module renderers/tokenizers
 *
 * @description
 * Resolves which {@link Tokenizer} to use. The contract: the DEFAULT must never
 * limit the runtime. So we default to the dependency-free {@link PlainTokenizer}
 * and only upgrade to {@link ShikiTokenizer} when it can actually be loaded
 * (Node, where its WASM grammars resolve). Consumers can also inject their own
 * tokenizer for full control on any runtime.
 */

import type { Tokenizer } from "../tokenizer.interface";
import type { HighlightMode } from "../../types/config.types";
import { PlainTokenizer } from "./plain-tokenizer";

export { PlainTokenizer } from "./plain-tokenizer";
export { ShikiTokenizer } from "./shiki-tokenizer";

/** How to pick a tokenizer. Re-exported from the canonical config types. */
export type { HighlightMode } from "../../types/config.types";

/**
 * Resolve a tokenizer.
 *
 * @param mode - `auto` (default): use Shiki if it loads, else plain text.
 *               `shiki`: force Shiki (throws if unavailable).
 *               `none`: always plain text (universal, no deps).
 * @param injected - A consumer-supplied tokenizer; takes precedence over `mode`.
 * @returns A ready-to-use tokenizer.
 *
 * @remarks
 * `auto` keeps the promise that the default never limits the runtime: on edge or
 * any environment where Shiki cannot load, it degrades to plain text instead of
 * throwing. Color is an enhancement, never a hard requirement.
 */
export async function resolveTokenizer(
  mode: HighlightMode = "auto",
  injected?: Tokenizer,
): Promise<Tokenizer> {
  if (injected) {
    return injected;
  }

  if (mode === "none") {
    return new PlainTokenizer();
  }

  // Attempt to load Shiki lazily so that bundlers/edge runtimes that can't
  // resolve it never pay for it unless asked.
  try {
    const { ShikiTokenizer } = await import("./shiki-tokenizer");
    return new ShikiTokenizer();
  } catch (error) {
    if (mode === "shiki") {
      throw error;
    }
    // auto: silently degrade to plain text — the renderer still works.
    return new PlainTokenizer();
  }
}
