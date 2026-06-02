/**
 * Tests for the renderer font loader.
 *
 * `loadRendererFonts` resolves the six font roles the PDF renderer needs. With
 * no argument it reads the bundled OFL-licensed `.ttf` files from disk (Node).
 * A `FontSet` override replaces individual roles with caller-supplied bytes,
 * which is also how the renderer runs on `fs`-less runtimes.
 */

import { describe, expect, it } from "vitest";
import {
  loadRendererFonts,
  type RendererFontBytes,
} from "../src/renderers/fonts/font-loader";

const ROLES: Array<keyof RendererFontBytes> = [
  "sans",
  "sansSemibold",
  "sansBold",
  "mono",
  "monoBold",
  "monoItalic",
];

describe("loadRendererFonts", () => {
  it("returns all six font roles as non-empty Uint8Arrays", () => {
    const fonts = loadRendererFonts();

    expect(Object.keys(fonts).sort()).toEqual([...ROLES].sort());

    for (const role of ROLES) {
      const bytes = fonts[role];
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    }
  });

  it("uses a caller-provided override for the requested role", () => {
    const override = new Uint8Array([1, 2, 3, 4]);
    const fonts = loadRendererFonts({ mono: override });

    // The overridden role returns the exact bytes supplied.
    expect(fonts.mono).toBe(override);

    // Non-overridden roles still resolve to the bundled defaults.
    expect(fonts.sans).toBeInstanceOf(Uint8Array);
    expect(fonts.sans.length).toBeGreaterThan(0);
    expect(fonts.sans).not.toBe(override);
  });

  it("applies overrides independently per role", () => {
    const monoOverride = new Uint8Array([9, 9, 9]);
    const sansOverride = new Uint8Array([7, 7]);
    const fonts = loadRendererFonts({
      mono: monoOverride,
      sans: sansOverride,
    });

    expect(fonts.mono).toBe(monoOverride);
    expect(fonts.sans).toBe(sansOverride);
    // Remaining roles still come from the bundled fonts and are non-empty.
    expect(fonts.monoBold.length).toBeGreaterThan(0);
    expect(fonts.sansBold.length).toBeGreaterThan(0);
  });
});
