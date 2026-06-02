/**
 * Shared language normalization.
 * @module utils/language-map
 *
 * @description
 * Single source of truth for mapping detected language ids / dialects to the
 * language identifiers the syntax highlighter understands. File detection
 * ({@link determineLanguage}) produces a first-pass language from the extension;
 * this map resolves aliases and dialects (e.g. `mjs` -> `javascript`,
 * `kts` -> `kotlin`) so the tokenizer and any other consumer agree on one set
 * of names.
 */

/** Alias map: detected id/dialect -> normalized highlighter language id. */
const LANGUAGE_ALIASES: Record<string, string> = {
  // JavaScript / TypeScript family
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  // C family
  "c++": "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  h: "c",
  cs: "csharp",
  // JVM
  kt: "kotlin",
  kts: "kotlin",
  gradle: "groovy",
  // Shells
  sh: "bash",
  zsh: "bash",
  shell: "bash",
  // Misc dialects
  rb: "ruby",
  py: "python",
  rs: "rust",
  md: "markdown",
  yml: "yaml",
  htm: "html",
  conf: "ini",
  properties: "ini",
  svg: "xml",
  txt: "text",
};

/**
 * Normalize a language id to the highlighter's preferred identifier.
 *
 * @param language - A detected language id or dialect (case-insensitive).
 * @returns The normalized language id, or the lowercased input if no alias
 *          applies.
 */
export function normalizeLanguage(language: string | undefined): string {
  if (!language) return "text";
  const lower = language.toLowerCase();
  return LANGUAGE_ALIASES[lower] ?? lower;
}
