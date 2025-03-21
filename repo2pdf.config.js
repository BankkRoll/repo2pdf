module.exports = {
  repository: {
    branch: "main",
  },
  output: {
    format: "pdf",
    pageSize: "A4",
    landscape: false,
    margin: {
      top: "1cm",
      right: "1cm",
      bottom: "1cm",
      left: "1cm",
    },
  },
  style: {
    theme: "github-dark",
    fontSize: "14px",
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    lineNumbers: true,
    pageNumbers: true,
    includeTableOfContents: true,
  },
  processing: {
    ignorePatterns: ["node_modules/**", ".git/**", "dist/**", "build/**"],
    maxConcurrency: 5,
    removeComments: false,
    removeEmptyLines: false,
    includeBinaryFiles: true,
    includeHiddenFiles: false,
  },
  debug: false,
};
