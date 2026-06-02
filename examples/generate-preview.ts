/**
 * Generate a preview PDF of the repo2pdf repository itself.
 *
 * @description
 * Renders repo2pdf's own source tree to an always-up-to-date sample PDF
 * (`examples/preview/repo2pdf-preview.pdf`). Useful for the README, release
 * artifacts, and verifying the output design after changes.
 *
 * The cover metadata is set explicitly (clean name + canonical GitHub URL) so
 * the published preview never leaks a local filesystem path.
 *
 * Usage:
 *   npx ts-node examples/generate-preview.ts            # default (github-light)
 *   npx ts-node examples/generate-preview.ts --theme dracula
 *   npm run preview
 */

import fs from "fs";
import path from "path";
import { ConfigLoader } from "../src/config/config-loader";
import { LocalFetcher } from "../src/fetchers/local-fetcher";
import { FileProcessor } from "../src/processors/file-processor";
import { PDFGenerator } from "../src/generators/pdf-generator";
import { disposeHighlighters } from "../src/utils/shiki-manager";

/** Canonical cover metadata — never derived from the local path. */
const REPO_INFO = {
  name: "repo2pdf",
  description: "Convert any repository to a beautiful PDF",
  url: "https://github.com/BankkRoll/repo2pdf",
};

async function main(): Promise<void> {
  const repoRoot = path.resolve(__dirname, "..");
  const outDir = path.join(__dirname, "preview");
  const outputPath = path.join(outDir, "repo2pdf-preview.pdf");

  // Allow `--theme <name>`; default to the clean light theme.
  const themeArgIndex = process.argv.indexOf("--theme");
  const theme =
    themeArgIndex !== -1 && process.argv[themeArgIndex + 1]
      ? process.argv[themeArgIndex + 1]
      : "github-light";

  const config = await ConfigLoader.getInstance().loadConfig({
    repository: {
      url: REPO_INFO.url,
      vcsType: "local",
      localPath: repoRoot,
      useCache: false,
    },
    output: { format: "pdf", outputPath, singleFile: true },
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
    plugins: { enabled: false },
  });

  // Fetch + process the repo, then render with explicit cover metadata.
  const fetcher = new LocalFetcher();
  await fetcher.initialize(config.repository);
  const files = await fetcher.fetchRepository();
  const processed = await new FileProcessor(config).processFiles(files);

  fs.mkdirSync(outDir, { recursive: true });
  const generator = new PDFGenerator(config);
  const result = await generator.generatePDF(processed, REPO_INFO, outputPath);
  await disposeHighlighters();

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
