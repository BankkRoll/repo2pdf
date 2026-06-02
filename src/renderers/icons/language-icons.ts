/**
 * Language → brand-icon resolution.
 * @module renderers/icons/language-icons
 *
 * @description
 * Maps a file's language/extension to a bundled brand icon (Simple Icons path
 * data) plus a brand color, for drawing in the PDF via pdf-lib's drawSvgPath.
 * Falls back to a generic document glyph when no brand icon is known, so every
 * file still gets a clean mark.
 */

import { ICON_DATA, type BrandIcon } from "./icon-data";

/**
 * Curated brand colors per icon slug (Simple Icons brand hex). Kept here rather
 * than in the raw data so colors stay correct and editable in one place.
 */
const BRAND_COLORS: Record<string, string> = {
  typescript: "#3178C6",
  javascript: "#F7DF1E",
  react: "#61DAFB",
  html5: "#E34F26",
  css: "#1572B6",
  sass: "#CC6699",
  python: "#3776AB",
  go: "#00ADD8",
  rust: "#DEA584",
  c: "#A8B9CC",
  cplusplus: "#00599C",
  sharp: "#239120",
  php: "#777BB4",
  ruby: "#CC342D",
  swift: "#F05138",
  kotlin: "#7F52FF",
  scala: "#DC322F",
  dart: "#0175C2",
  elixir: "#4B275F",
  haskell: "#5D4F85",
  lua: "#2C2D72",
  perl: "#39457E",
  r: "#276DC3",
  julia: "#9558B2",
  json: "#000000",
  yaml: "#CB171E",
  toml: "#9C4221",
  xml: "#005FAD",
  markdown: "#000000",
  gnubash: "#4EAA25",
  powershell: "#5391FE",
  docker: "#2496ED",
  graphql: "#E10098",
  sqlite: "#003B57",
  mysql: "#4479A1",
  postgresql: "#4169E1",
  vuedotjs: "#4FC08D",
  svelte: "#FF3E00",
  astro: "#BC52EE",
  nextdotjs: "#000000",
  nodedotjs: "#5FA04E",
  clojure: "#5881D8",
  erlang: "#A90533",
  ocaml: "#EC6813",
  groovy: "#4298B8",
  solidity: "#363636",
  zig: "#F7A41D",
  nim: "#FFE953",
  crystal: "#000000",
  deno: "#70FFAF",
};

/** Map a normalized language id (or extension) to an icon slug. */
const LANGUAGE_TO_SLUG: Record<string, string> = {
  typescript: "typescript",
  tsx: "react",
  javascript: "javascript",
  jsx: "react",
  html: "html5",
  css: "css",
  scss: "sass",
  sass: "sass",
  less: "css",
  python: "python",
  go: "go",
  rust: "rust",
  c: "c",
  cpp: "cplusplus",
  csharp: "sharp",
  php: "php",
  ruby: "ruby",
  swift: "swift",
  kotlin: "kotlin",
  scala: "scala",
  dart: "dart",
  elixir: "elixir",
  haskell: "haskell",
  lua: "lua",
  perl: "perl",
  r: "r",
  julia: "julia",
  json: "json",
  yaml: "yaml",
  toml: "toml",
  xml: "xml",
  markdown: "markdown",
  bash: "gnubash",
  shell: "gnubash",
  powershell: "powershell",
  dockerfile: "docker",
  graphql: "graphql",
  sql: "postgresql",
  vue: "vuedotjs",
  svelte: "svelte",
  astro: "astro",
  clojure: "clojure",
  erlang: "erlang",
  ocaml: "ocaml",
  groovy: "groovy",
  solidity: "solidity",
  zig: "zig",
  nim: "nim",
  crystal: "crystal",
};

/** Generic document glyph (24x24) for files with no brand icon. */
export const GENERIC_FILE: BrandIcon = {
  path: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM13 3.5L18.5 9H13V3.5z",
  hex: "#8B949E",
};

/**
 * Resolve the brand icon for a language id, with brand color applied.
 *
 * @param language - Normalized language id (e.g. "typescript").
 * @param fallbackColor - Color for the generic glyph (theme-aware).
 * @returns The icon path + color to draw.
 */
export function resolveLanguageIcon(
  language: string | undefined,
  fallbackColor: string,
): BrandIcon {
  const slug = language ? LANGUAGE_TO_SLUG[language.toLowerCase()] : undefined;
  if (slug && ICON_DATA[slug]) {
    return {
      path: ICON_DATA[slug].path,
      hex: BRAND_COLORS[slug] ?? ICON_DATA[slug].hex,
    };
  }
  return { path: GENERIC_FILE.path, hex: fallbackColor };
}

/** A folder glyph (24x24) for directory headers and the TOC. */
export const FOLDER_ICON: BrandIcon = {
  path: "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z",
  hex: "#54AEFF",
};
