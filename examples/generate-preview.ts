/**
 * Generate a preview PDF of the repo2pdf repository itself.
 *
 * @description
 * Runs repo2pdf against its own source tree to produce an always-up-to-date
 * sample PDF (`examples/preview/repo2pdf-preview.pdf`). Useful for the README,
 * release artifacts, and verifying the output design after changes.
 *
 * Usage:
 *   npx ts-node examples/generate-preview.ts            # default (github-light)
 *   npx ts-node examples/generate-preview.ts --theme dracula
 *   npm run preview
 */

import path from "path";
import { convertRepository } from "../src/index";

async function main(): Promise<void> {
  const repoRoot = path.resolve(__dirname, "..");
  const outDir = path.join(__dirname, "preview");

  // Allow `--theme <name>` override; default to the clean light theme.
  const themeArgIndex = process.argv.indexOf("--theme");
  const theme =
    themeArgIndex !== -1 && process.argv[themeArgIndex + 1]
      ? process.argv[themeArgIndex + 1]
      : "github-light";

  const outputPath = path.join(outDir, "repo2pdf-preview.pdf");

  // Generate a focused preview: the library's own source + docs, skipping
  // build output, deps, tests fixtures, and the (large) lockfile.
  const result = await convertRepository({
    repository: {
      url: "https://github.com/BankkRoll/repo2pdf",
      vcsType: "local",
      localPath: repoRoot,
      useCache: false,
    },
    output: {
      format: "pdf",
      outputPath,
      singleFile: true,
    },
    style: {
      theme,
      lineNumbers: true,
      pageNumbers: true,
      includeTableOfContents: true,
    },
    processing: {
      ignorePatterns: [
        "node_modules/**",
        ".git/**",
        "dist/**",
        "coverage/**",
        "tests/fixtures/**",
        "tests/output/**",
        "examples/preview/**",
        "**/*.lock",
        "**/pnpm-lock.yaml",
        "**/*.log",
      ],
      maxConcurrency: 8,
      removeComments: false,
      removeEmptyLines: false,
      includeBinaryFiles: false,
      includeHiddenFiles: false,
    },
    cache: { enabled: false, ttl: 0 },
    // The preview script drives repo2pdf directly; no external plugins.
    plugins: { enabled: false },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Preview generated: ${result.outputPath} (${(result.fileSize / 1024).toFixed(1)} KB, theme: ${theme})`,
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to generate preview:", error);
  process.exit(1);
});
