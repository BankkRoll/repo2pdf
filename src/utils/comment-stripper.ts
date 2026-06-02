/**
 * String-aware comment stripping.
 * @module utils/comment-stripper
 *
 * @description
 * The previous implementation used naive regexes (`/\/\/.*$/gm`,
 * `/\/\*[\s\S]*?\*\//g`) that corrupt valid code — they strip line and block
 * comment markers that appear *inside string literals* (e.g. `"https://..."`).
 * This
 * module replaces that with a small single-pass scanner that tracks string and
 * comment state, so only real comments are removed.
 *
 * It is intentionally dependency-free and best-effort: it understands the common
 * C-family ("//" + block) and hash ("#") comment styles plus HTML/XML comments.
 * It is NOT a full parser, but it will never remove a comment marker that lives
 * inside a quoted string.
 */

/** Comment syntax families this stripper understands. */
type CommentStyle = "c-like" | "hash" | "markup";

/** Maps a Shiki/normalized language id to a comment style, or null to skip. */
function commentStyleFor(language?: string): CommentStyle | null {
  if (!language) return null;
  switch (language.toLowerCase()) {
    case "javascript":
    case "typescript":
    case "jsx":
    case "tsx":
    case "java":
    case "c":
    case "cpp":
    case "csharp":
    case "go":
    case "swift":
    case "php":
    case "rust":
    case "kotlin":
    case "scala":
    case "css":
    case "scss":
    case "less":
      return "c-like";
    case "python":
    case "ruby":
    case "shell":
    case "shellscript":
    case "bash":
    case "yaml":
    case "toml":
    case "ini":
    case "dockerfile":
      return "hash";
    case "html":
    case "xml":
    case "svg":
    case "markdown":
      return "markup";
    default:
      return null;
  }
}

/**
 * Remove comments from source while preserving comment-like sequences that
 * occur inside string literals.
 *
 * @param code - Source code
 * @param language - Normalized language id (e.g. "typescript", "python")
 * @returns Code with comments removed, or the original code if the language has
 *          no supported comment style.
 */
export function stripComments(code: string, language?: string): string {
  const style = commentStyleFor(language);
  if (!style) return code;

  if (style === "markup") {
    // HTML/XML/Markdown: only block comments <!-- ... -->. There are no string
    // literals to worry about at this granularity.
    return code.replace(/<!--[\s\S]*?-->/g, "");
  }

  const supportsBlock = style === "c-like";
  const lineMarker = style === "c-like" ? "//" : "#";

  let out = "";
  let i = 0;
  const n = code.length;

  // Quote character currently open, or null when not inside a string.
  let quote: string | null = null;

  while (i < n) {
    const ch = code[i];
    const next = i + 1 < n ? code[i + 1] : "";

    if (quote) {
      // Inside a string literal — copy verbatim, honoring backslash escapes
      // (backtick template strings don't use backslash for the closing quote,
      // but copying the escaped char verbatim is still safe).
      out += ch;
      if (ch === "\\" && i + 1 < n) {
        out += next;
        i += 2;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      i++;
      continue;
    }

    // Not in a string: check for comment starts.
    if (style === "c-like" && ch === "/" && next === "/") {
      // Line comment: skip to end of line (keep the newline).
      while (i < n && code[i] !== "\n") i++;
      continue;
    }
    if (supportsBlock && ch === "/" && next === "*") {
      // Block comment: skip until closing */.
      i += 2;
      while (i < n && !(code[i] === "*" && code[i + 1] === "/")) i++;
      i += 2; // consume the closing */
      continue;
    }
    if (style === "hash" && ch === lineMarker) {
      while (i < n && code[i] !== "\n") i++;
      continue;
    }

    // String literal start?
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      out += ch;
      i++;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}
