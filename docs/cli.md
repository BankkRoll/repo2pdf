# CLI Reference

repo2pdf provides a powerful command-line interface for converting repositories to PDF.

## Prerequisites

- **Node.js** >= 18.0.0
- **Git** - Required for cloning remote repositories
- **Chromium/Chrome** - repo2pdf uses Puppeteer for PDF generation. Puppeteer automatically downloads Chromium during installation, but in some environments you may need to configure it manually (see [Programmatic API - Prerequisites](./programmatic.md#prerequisites) for Docker/CI setup)

## Installation

```bash
npm install -g repo2pdf
```

## Commands

### `convert`

Convert a repository to PDF.

```bash
repo2pdf convert <repository> [options]
```

**Arguments:**

- `<repository>` - Repository URL, GitHub shorthand (`user/repo`), or local path

**Options:**

| Option                   | Alias | Description                  | Default             |
| ------------------------ | ----- | ---------------------------- | ------------------- |
| `--output <path>`        | `-o`  | Output file path             | `./<repo-name>.pdf` |
| `--branch <branch>`      | `-b`  | Repository branch            | repo's default branch (auto-detected) |
| `--token <token>`        | `-t`  | Auth token for private repos | -                   |
| `--theme <theme>`        |       | Syntax highlighting theme    | `github-light`      |
| `--no-line-numbers`      |       | Disable line numbers         | -                   |
| `--no-page-numbers`      |       | Disable page numbers         | -                   |
| `--no-toc`               |       | Disable table of contents    | -                   |
| `--ignore <patterns...>` |       | Glob patterns to ignore      | -                   |
| `--include-binary`       |       | Include binary files         | `false`             |
| `--include-hidden`       |       | Include hidden files         | `false`             |
| `--remove-comments`      |       | Remove code comments         | `false`             |
| `--remove-empty-lines`   |       | Remove empty lines           | `false`             |
| `--concurrency <n>`      |       | Max concurrent operations    | `5`                 |
| `--no-cache`             |       | Disable caching              | -                   |
| `--debug`                |       | Enable debug output          | `false`             |

**Examples:**

```bash
# Convert a GitHub repository
repo2pdf convert https://github.com/user/repo

# Use GitHub shorthand
repo2pdf convert user/repo

# Convert a local directory
repo2pdf convert ./my-project

# Convert with custom output path
repo2pdf convert user/repo -o documentation.pdf

# Convert with a specific theme
repo2pdf convert user/repo --theme dracula

# Ignore test files and node_modules
repo2pdf convert user/repo --ignore "**/*.test.ts" "node_modules/**"

# Private repository with token
repo2pdf convert user/private-repo -t ghp_xxxxxxxxxxxxx

# Convert specific branch
repo2pdf convert user/repo -b develop

# Full example
repo2pdf convert user/repo \
  --output docs.pdf \
  --theme tokyo-night \
  --branch main \
  --ignore "node_modules/**" "*.test.ts" \
  --no-page-numbers
```

### `interactive`

Run repo2pdf in interactive mode with guided prompts.

```bash
repo2pdf interactive
```

Interactive mode walks you through:

1. Repository URL or path
2. Output file path and theme
3. Display options (line numbers, page numbers, table of contents)
4. File filtering (ignore patterns, include binary, include hidden)
5. Processing options (remove comments, remove empty lines)
6. Branch and auth token (for remote repositories)
7. Advanced options (concurrency, debug)

### `cache`

Manage the repository cache.

```bash
repo2pdf cache [options]
```

**Options:**

| Option    | Description           |
| --------- | --------------------- |
| `--stats` | Show cache statistics |
| `--clear` | Clear all cached data |

**Examples:**

```bash
# View cache statistics
repo2pdf cache --stats

# Clear the cache
repo2pdf cache --clear
```

## Repository Sources

### GitHub

```bash
# Full URL
repo2pdf convert https://github.com/user/repo

# Shorthand (assumes GitHub)
repo2pdf convert user/repo

# With branch
repo2pdf convert user/repo -b develop

# Private repository
repo2pdf convert user/private-repo -t ghp_xxxxxxxxxxxxx
```

### GitLab

```bash
# Full URL
repo2pdf convert https://gitlab.com/user/repo

# With token for private repos
repo2pdf convert https://gitlab.com/user/repo -t glpat-xxxxx
```

### Bitbucket

```bash
# Full URL
repo2pdf convert https://bitbucket.org/user/repo

# Private repo with an app password (format: "username:app_password")
repo2pdf convert https://bitbucket.org/user/repo -t "myuser:my_app_password"

# Private repo with a workspace/access token (no colon -> Bearer auth)
repo2pdf convert https://bitbucket.org/user/repo -t my_access_token
```

> **Bitbucket token format:** if `--token` contains a colon it is treated as
> `username:app_password` (HTTP Basic auth); otherwise it is treated as a
> workspace/access token (Bearer auth).

### Local Directory

```bash
# Relative path
repo2pdf convert ./my-project

# Absolute path
repo2pdf convert /home/user/projects/my-project
```

## File Filtering

Use glob patterns to include or exclude files:

```bash
# Ignore multiple patterns
repo2pdf convert user/repo \
  --ignore "node_modules/**" \
  --ignore "**/*.test.ts" \
  --ignore "**/*.spec.js" \
  --ignore "dist/**" \
  --ignore "coverage/**"
```

Common patterns:

- `node_modules/**` - Node.js dependencies
- `**/*.test.ts` - Test files
- `**/*.spec.js` - Spec files
- `dist/**` - Build output
- `coverage/**` - Coverage reports
- `.git/**` - Git directory
- `**/*.lock` - Lock files

## Environment Variables

Set default values using environment variables:

| Variable                 | Description             | Example            |
| ------------------------ | ----------------------- | ------------------ |
| `REPO2PDF_TOKEN`         | Default auth token      | `ghp_xxxxx`        |
| `REPO2PDF_BRANCH`        | Default branch          | `main`             |
| `REPO2PDF_DEBUG`         | Enable debug mode       | `true`             |
| `REPO2PDF_CACHE_ENABLED` | Enable/disable cache    | `true`             |
| `REPO2PDF_CACHE_TTL`     | Cache TTL in ms         | `86400000`         |
| `REPO2PDF_PLUGIN_DIR`    | Custom plugin directory | `/path/to/plugins` |

**Example:**

```bash
# Set token in environment
export REPO2PDF_TOKEN=ghp_xxxxxxxxxxxxx

# Now convert without -t flag
repo2pdf convert user/private-repo
```

## Exit Codes

| Code | Description                                                        |
| ---- | ----------------------------------------------------------------- |
| `0`  | Success                                                           |
| `1`  | Error (invalid input, repository not found, auth failure, or generation failure — run with `--debug` for details) |

## See Also

- [Themes](./themes.md) - Available themes and customization
- [Configuration](./configuration.md) - Configuration file reference
- [Programmatic API](./programmatic.md) - Using repo2pdf in code
