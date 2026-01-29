import path from "path";

/**
 * Extract file extension from a file path
 */
export function extractExtension(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase().substring(1);
  return extension;
}

/**
 * Determine file type based on extension
 */
export function determineFileType(
  extension: string,
): "code" | "image" | "binary" | "unknown" {
  const codeExtensions = [
    "js",
    "jsx",
    "ts",
    "tsx",
    "html",
    "css",
    "scss",
    "less",
    "json",
    "md",
    "markdown",
    "py",
    "rb",
    "java",
    "c",
    "cpp",
    "cs",
    "go",
    "rs",
    "php",
    "swift",
    "kt",
    "sh",
    "bash",
    "zsh",
    "yml",
    "yaml",
    "toml",
    "ini",
    "xml",
    "svg",
    "sql",
    "graphql",
    "dockerfile",
    "gitignore",
    "env",
    "editorconfig",
    "txt",
    "csv",
    "tsv",
  ];

  const imageExtensions = [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "bmp",
    "webp",
    "ico",
    "tif",
    "tiff",
  ];

  const binaryExtensions = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "zip",
    "rar",
    "tar",
    "gz",
    "exe",
    "dll",
    "so",
    "o",
    "a",
    "lib",
    "bin",
    "dat",
    "db",
    "sqlite",
    "mp3",
    "mp4",
    "avi",
    "mov",
    "wmv",
    "flv",
    "wav",
    "ogg",
    "ttf",
    "otf",
    "woff",
    "woff2",
    "eot",
  ];

  if (codeExtensions.includes(extension)) {
    return "code";
  } else if (imageExtensions.includes(extension)) {
    return "image";
  } else if (binaryExtensions.includes(extension)) {
    return "binary";
  } else {
    return "unknown";
  }
}

/**
 * Determine language based on extension
 */
export function determineLanguage(extension: string): string {
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    md: "markdown",
    markdown: "markdown",
    py: "python",
    rb: "ruby",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    go: "go",
    rs: "rust",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    ini: "ini",
    xml: "xml",
    svg: "svg",
    sql: "sql",
    graphql: "graphql",
    dockerfile: "dockerfile",
    gitignore: "gitignore",
    env: "env",
    editorconfig: "editorconfig",
    txt: "text",
    csv: "csv",
    tsv: "tsv",
  };

  return languageMap[extension] || "text";
}

/**
 * Deep merge objects
 * Note: undefined values in source are skipped (don't overwrite target)
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;

  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      // Skip undefined values - they shouldn't overwrite existing values
      if (source[key] === undefined) {
        continue;
      }
      if (isObject(source[key])) {
        if (!(target as any)[key]) Object.assign(target, { [key]: {} });
        deepMerge((target as any)[key], source[key] as any);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * Check if value is an object
 */
function isObject(item: any): boolean {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Detect language from filename
 */
export function detectLanguage(filename: string): string {
  const ext = extractExtension(filename);
  return determineLanguage(ext);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + " " + sizes[i]
  );
}
