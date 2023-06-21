const hljs = require("highlight.js")

// Here's a simple JavaScript code snippet
const code = `
function helloWorld() {
  console.log("Hello, world!");
}
helloWorld();
`

// Here, we're using the 'javascript' language for highlighting
const highlightedCode = hljs.highlight(code, { language: "js" }).value

console.log(highlightedCode)
