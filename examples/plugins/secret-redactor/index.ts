/**
 * Secret Redactor Plugin for repo2pdf
 *
 * @description
 * Demonstrates the `TRANSFORM_CONTENT` hook, which lets a plugin rewrite a
 * file's text before it is rendered. This example redacts common secrets
 * (API keys, tokens, passwords, private keys) so they never appear in the PDF.
 *
 * Note: in repo2pdf v3 the renderer performs syntax highlighting itself, so
 * TRANSFORM_CONTENT operates on plain text — return transformed source, not
 * HTML. (The renderer would draw any HTML tags literally.)
 *
 * @example
 * To use this plugin:
 * 1. Copy this directory to your project's `plugins/` folder
 * 2. The plugin will be automatically loaded by repo2pdf
 *
 * @packageDocumentation
 */

import { HookPoint } from "repo2pdf";
import type { Config, IRepo2PDFPlugin, RepoFile } from "repo2pdf";

/** The replacement token written in place of a detected secret. */
const REDACTED = "[REDACTED]";

/**
 * Patterns that match common secret assignments. Each replaces only the secret
 * value, preserving the surrounding key so the file stays readable.
 */
const SECRET_PATTERNS: Array<{
  re: RegExp;
  replace: (m: string, ...g: string[]) => string;
}> = [
  // key = "value" / key: 'value' for sensitive-looking keys
  {
    re: /\b([A-Za-z0-9_.-]*(?:api[_-]?key|secret|token|password|passwd|access[_-]?key|client[_-]?secret)[A-Za-z0-9_.-]*)\b(\s*[:=]\s*)(['"])[^'"]+\3/gi,
    replace: (_m, key, sep, q) => `${key}${sep}${q}${REDACTED}${q}`,
  },
  // Bearer tokens
  {
    re: /\b(Bearer\s+)[A-Za-z0-9._-]{8,}/g,
    replace: (_m, prefix) => `${prefix}${REDACTED}`,
  },
  // PEM private key blocks
  {
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replace: () =>
      `-----BEGIN PRIVATE KEY-----\n${REDACTED}\n-----END PRIVATE KEY-----`,
  },
];

/**
 * Plugin that redacts secrets from file content.
 */
class SecretRedactorPlugin implements IRepo2PDFPlugin {
  /** Number of redactions performed (useful for tests/inspection). */
  private redactions = 0;

  /**
   * Transform a file's content, redacting any detected secrets.
   */
  [HookPoint.TRANSFORM_CONTENT] = (
    content: string,
    _file: RepoFile,
    _config: Config,
  ): string => {
    let result = content;
    for (const { re, replace } of SECRET_PATTERNS) {
      result = result.replace(re, (...args: string[]) => {
        this.redactions++;
        // String.replace passes (match, ...groups, offset, string); our
        // replacers only use match + capture groups.
        return (replace as (...a: string[]) => string)(...args);
      });
    }
    return result;
  };

  /** Total number of redactions performed across all files. */
  public getRedactionCount(): number {
    return this.redactions;
  }
}

export default new SecretRedactorPlugin();
