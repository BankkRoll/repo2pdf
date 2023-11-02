"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlToJson = void 0;
const html_entities_1 = require("html-entities");
function htmlToJson(htmlCode, removeEmptyLines) {
    const data = [];
    const colorMap = {
        comment: "#708090",
        punctuation: "#2F4F4F",
        tag: "#008080",
        attribute: "#2E8B57",
        doctag: "#2E8B57",
        keyword: "#000080",
        meta: "#4682B4",
        name: "#556B2F",
        "selector-tag": "#008B8B",
        deletion: "#8B0000",
        number: "#FF4500",
        quote: "#6A5ACD",
        "selector-class": "#483D8B",
        "selector-id": "#9400D3",
        string: "#006400",
        "template-tag": "#778899",
        type: "#696969",
        section: "#20B2AA",
        title: "#9370DB",
        link: "#8A2BE2",
        operator: "#A52A2A",
        regexp: "#B22222",
        "selector-attr": "#5F9EA0",
        "selector-pseudo": "#7FFF00",
        symbol: "#DC143C",
        "template-variable": "#8B008B",
        variable: "#FFD700",
        literal: "#32CD32",
        addition: "#228B22",
        built_in: "#ADFF2F",
        bullet: "#7CFC00",
        code: "#7F8C8D", // Gray
    };
    const elementRegex = /<span\s+class="hljs-([^"]+)"[^>]*>([^<]*)(?:<\/span>)?/g;
    const nonelementRegex = /[^<]+|<\/span>|\n/g;
    let match;
    while ((match = elementRegex.exec(htmlCode)) !== null) {
        const [fullText, cls, text] = match;
        const color = colorMap[cls.split(" ")[0].toLowerCase()] || "black";
        data.push({ text: (0, html_entities_1.decode)(text), color });
    }
    htmlCode = htmlCode.replace(elementRegex, "");
    while ((match = nonelementRegex.exec(htmlCode)) !== null) {
        const text = match[0];
        data.push({ text: text === "\n" ? text : (0, html_entities_1.decode)(text) });
    }
    const fixedData = [];
    for (let i = 0; i < data.length; i++) {
        const { text, color } = data[i];
        const lines = text.split("\n");
        for (let j = 0; j < lines.length; j++) {
            const line = lines[j];
            // Conditionally skip lines that only contain whitespace
            if (removeEmptyLines && line.trim() === "") {
                continue;
            }
            if (j > 0)
                fixedData.push({ text: "\n" });
            fixedData.push({ text: line, color });
        }
    }
    return fixedData;
}
exports.htmlToJson = htmlToJson;
//# sourceMappingURL=syntax.js.map