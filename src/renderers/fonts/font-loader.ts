/**
 * Font loading for the PDF renderer.
 * @module renderers/fonts/font-loader
 *
 * @description
 * repo2pdf bundles clean, OFL-licensed fonts (Inter for UI text, JetBrains Mono
 * for code) so output looks professional out of the box and is identical across
 * runtimes. Fonts are fully configurable: a consumer can override any role with
 * their own font bytes (a `Uint8Array`), which is also how the renderer stays
 * usable on edge/browser — pass the bytes in rather than reading from disk.
 *
 * In Node, the bundled `.ttf` files are read from disk on demand. On runtimes
 * without `fs`, supply `FontSet` bytes via config and no disk access occurs.
 */

import type { FontSet } from "../../types/config.types";

/** The five font roles the renderer uses. */
export interface RendererFontBytes {
  sans: Uint8Array;
  sansSemibold: Uint8Array;
  sansBold: Uint8Array;
  mono: Uint8Array;
  monoBold: Uint8Array;
  monoItalic: Uint8Array;
}

/** Map a font role to its bundled filename. */
const BUNDLED: Record<keyof RendererFontBytes, string> = {
  sans: "Inter-Regular.ttf",
  sansSemibold: "Inter-SemiBold.ttf",
  sansBold: "Inter-Bold.ttf",
  mono: "JetBrainsMono-Regular.ttf",
  monoBold: "JetBrainsMono-Bold.ttf",
  monoItalic: "JetBrainsMono-Italic.ttf",
};

/** Cache of bundled font bytes (read once per process). */
const cache = new Map<string, Uint8Array>();

/**
 * Read a bundled font file from disk (Node only). Cached after first read.
 *
 * @remarks
 * Uses a dynamic `require("fs")` so bundlers targeting edge/browser don't
 * statically pull `fs` into the graph; this path is only hit when no override
 * bytes are supplied (i.e. the Node/CLI default).
 */
function readBundled(file: string): Uint8Array {
  const cached = cache.get(file);
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require("path") as typeof import("path");
    const bytes = new Uint8Array(fs.readFileSync(path.join(__dirname, file)));
    cache.set(file, bytes);
    return bytes;
  } catch (error) {
    throw new Error(
      "Bundled font loading requires a Node (CommonJS) runtime; provide font bytes via config.style.fonts to run on edge/browser.",
      { cause: error },
    );
  }
}

/**
 * Resolve the full set of font bytes the renderer needs, applying any
 * user-provided overrides over the bundled defaults.
 *
 * @param override - Optional per-role font bytes from config.
 * @returns Complete font byte set.
 */
export function loadRendererFonts(override?: FontSet): RendererFontBytes {
  const pick = (
    role: keyof RendererFontBytes,
    fallbackRole?: keyof RendererFontBytes,
  ): Uint8Array => {
    const o =
      override?.[role] ?? (fallbackRole ? override?.[fallbackRole] : undefined);
    if (o) return o;
    return readBundled(BUNDLED[role]);
  };

  return {
    sans: pick("sans"),
    sansSemibold: pick("sansSemibold", "sansBold"),
    sansBold: pick("sansBold"),
    mono: pick("mono"),
    monoBold: pick("monoBold"),
    monoItalic: pick("monoItalic"),
  };
}
