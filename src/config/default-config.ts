import type { Config } from "../types/config.types";

/**
 * Default configuration for repo2pdf
 */
export const defaultConfig: Config = {
  // Repository settings
  repository: {
    url: "",
    branch: "main",
    vcsType: "github",
    localPath: "",
    useCache: true,
  },

  // Output settings
  output: {
    format: "pdf",
    outputPath: "./output.pdf",
    singleFile: true,
    pageSize: "A4",
    landscape: false,
    margin: {
      top: "20px",
      right: "20px",
      bottom: "20px",
      left: "20px",
    },
  },

  // Style settings
  style: {
    theme: "github-dark",
    fontSize: "12px",
    fontFamily:
      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
    customCSS: "",
  },
  processing: {
    ignorePatterns: [
      // Dependencies
      "node_modules/**",
      "**/node_modules/**",
      "vendor/**",
      "bower_components/**",
      ".pnp/**",
      ".pnp.cjs",
      ".pnp.loader.mjs",
      ".yarn/**",

      // Version control
      ".git/**",
      ".svn/**",
      ".hg/**",

      // Build outputs
      "dist/**",
      "build/**",
      "out/**",
      "output/**",
      ".next/**",
      ".nuxt/**",
      ".output/**",
      ".vercel/**",
      ".netlify/**",
      ".docusaurus/**",
      ".svelte-kit/**",
      ".astro/**",
      "target/**",
      "bin/**",
      "obj/**",

      // Lock files
      "**/package-lock.json",
      "**/yarn.lock",
      "**/pnpm-lock.yaml",
      "**/bun.lockb",
      "**/composer.lock",
      "**/Gemfile.lock",
      "**/Cargo.lock",
      "**/poetry.lock",
      "**/Pipfile.lock",
      "**/go.sum",
      "**/shrinkwrap.yaml",

      // Cache directories
      ".cache/**",
      ".parcel-cache/**",
      ".turbo/**",
      ".eslintcache",
      ".stylelintcache",
      ".prettiercache",
      "**/__pycache__/**",
      "**/*.pyc",
      "**/*.pyo",
      ".pytest_cache/**",
      ".mypy_cache/**",
      ".ruff_cache/**",
      ".tox/**",
      ".nox/**",
      ".gradle/**",
      ".maven/**",

      // IDE and editor
      ".idea/**",
      ".vscode/**",
      ".vs/**",
      "*.swp",
      "*.swo",
      "*~",
      ".DS_Store",
      "Thumbs.db",
      "desktop.ini",
      "*.sublime-*",

      // Test coverage
      "coverage/**",
      ".nyc_output/**",
      "htmlcov/**",
      ".coverage",
      "*.lcov",

      // Logs
      "**/*.log",
      "logs/**",
      "npm-debug.log*",
      "yarn-debug.log*",
      "yarn-error.log*",
      "lerna-debug.log*",
      "pnpm-debug.log*",

      // Environment and secrets (note: .env.example is allowed by not matching .env.*)
      "**/.env",
      "**/.env.local",
      "**/.env.development",
      "**/.env.production",
      "**/.env.test",
      "**/*.pem",
      "**/*.key",
      "**/*.p12",
      "**/*.pfx",
      "**/*.keystore",
      "**/credentials.json",
      "**/secrets.json",

      // Temporary files
      "tmp/**",
      "temp/**",
      "*.tmp",
      "*.temp",
      "*.bak",
      "*.backup",

      // Archives
      "**/*.zip",
      "**/*.tar",
      "**/*.tar.gz",
      "**/*.tgz",
      "**/*.rar",
      "**/*.7z",
      "**/*.gz",
      "**/*.bz2",

      // Minified/compiled assets
      "**/*.min.js",
      "**/*.min.css",
      "**/*.map",
      "**/*.chunk.js",
      "**/*.bundle.js",

      // Binary/media (handled separately if includeBinaryFiles=true)
      "**/*.woff",
      "**/*.woff2",
      "**/*.ttf",
      "**/*.eot",
      "**/*.otf",
      "**/*.ico",

      // Database files
      "**/*.sqlite",
      "**/*.sqlite3",
      "**/*.db",

      // OS generated
      "ehthumbs.db",
      "ehthumbs_vista.db",
      "*.stackdump",
      "[Dd]esktop.ini",
      "$RECYCLE.BIN/**",
      "*.lnk",
    ],
    maxConcurrency: 5,
    removeComments: false,
    removeEmptyLines: false,
    includeBinaryFiles: false,
    includeHiddenFiles: false,
    timeout: 300000, // 5 minutes
    useIncrementalProcessing: true,
    incrementalChunkSize: 100,
  },
  cache: {
    enabled: true,
    ttl: 86400000, // 24 hours
    cacheDir: "./.repo2pdf-cache",
  },
  debug: false,
};
