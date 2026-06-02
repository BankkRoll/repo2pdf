/**
 * Shared string utilities for repo2pdf.
 * @module utils/string-utils
 *
 * @description
 * Single source of truth for HTML escaping and related string helpers.
 * Previously these were duplicated across the code processor and PDF generator;
 * centralizing them prevents drift in escaping behavior (a security-sensitive
 * concern) and keeps the codebase DRY.
 */

/**
 * Escape HTML special characters so untrusted text can be safely embedded in
 * generated HTML — both in text nodes and double-quoted attribute values.
 *
 * @remarks
 * The single-quote is escaped to `&#039;` so the result is also safe inside
 * single-quoted attribute contexts. This is intentionally identical to the
 * escaping that was previously duplicated, so generated output is unchanged.
 *
 * @param text - Untrusted text to escape
 * @returns HTML-safe string
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
