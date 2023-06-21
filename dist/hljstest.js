"use strict";
const hljs = require("highlight.js");
const { htmlToJson } = require("./syntax");
// Here's a simple JavaScript code snippet
const code = `
function helloWorld() {
  console.log("Hello, world!");
}
helloWorld();
`;
// Here, we're using the 'javascript' language for highlighting
const highlightedCode = hljs.highlight(code, { language: "js" }).value;
console.log(highlightedCode);
const data = htmlToJson(highlightedCode);
console.log(data);
