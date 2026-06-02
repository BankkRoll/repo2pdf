/**
 * Shiki highlighter singleton manager.
 * @module utils/shiki-manager
 *
 * @description
 * Shiki is designed to be used as a singleton — creating one highlighter per
 * file (as the previous CodeProcessor did) leaks memory and triggers Shiki's
 * "too many instances" warning. This module owns a single highlighter per theme,
 * created lazily and cached by an awaitable promise so concurrent callers never
 * race to create duplicates. Languages are loaded on demand and remembered.
 */

import {
  createHighlighter,
  type BundledLanguage,
  type BundledTheme,
  type Highlighter,
} from "shiki";

/** Languages eagerly loaded when a highlighter is first created. */
const BASE_LANGUAGES = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "html",
  "css",
  "json",
  "markdown",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "php",
  "ruby",
  "swift",
  "bash",
  "yaml",
  "toml",
  "sql",
  "graphql",
  "xml",
  "dockerfile",
  "shellscript",
  // Languages the language map can resolve to — loaded up-front so they don't
  // silently fall back to plain text.
  "kotlin",
  "scss",
  "less",
  "groovy",
  "ini",
  "text",
] as const;

/** Cache of highlighter promises keyed by theme name. */
const highlighters = new Map<string, Promise<Highlighter>>();

/**
 * Get (or lazily create) the shared highlighter for a theme.
 *
 * @remarks
 * The promise is cached, so the first caller triggers creation and all
 * subsequent callers — including concurrent ones — await the same instance.
 *
 * @param theme - Theme name (a Shiki bundled theme)
 * @returns The shared highlighter instance for that theme
 */
export async function getHighlighter(theme: string): Promise<Highlighter> {
  let existing = highlighters.get(theme);
  if (!existing) {
    existing = createHighlighter({
      themes: [theme as BundledTheme],
      langs: [...BASE_LANGUAGES] as BundledLanguage[],
    });
    highlighters.set(theme, existing);
  }
  return existing;
}

/**
 * Ensure a language is loaded on the highlighter, loading it on demand.
 *
 * @param highlighter - The shared highlighter
 * @param lang - Candidate language id
 * @returns The language id if it is (now) loaded, otherwise `"text"`
 */
export async function ensureLanguage(
  highlighter: Highlighter,
  lang: string,
): Promise<string> {
  if (highlighter.getLoadedLanguages().includes(lang)) {
    return lang;
  }
  try {
    await highlighter.loadLanguage(lang as BundledLanguage);
    return lang;
  } catch {
    // Unknown/unsupported language — caller should fall back to plain text.
    return "text";
  }
}

/**
 * Dispose all cached highlighters and clear the cache.
 *
 * @remarks
 * Called once per run during cleanup so a long-lived process (e.g. tests or a
 * server embedding repo2pdf) doesn't accumulate highlighters across themes.
 */
export async function disposeHighlighters(): Promise<void> {
  for (const promise of highlighters.values()) {
    try {
      const highlighter = await promise;
      highlighter.dispose();
    } catch {
      // Highlighter failed to create; nothing to dispose.
    }
  }
  highlighters.clear();
}
