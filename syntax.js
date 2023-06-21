/**
 * @param {string} htmlCode 
 */
function htmlToJson(htmlCode) {
  const originalCode = htmlCode;
  /**
   * @type {{text: string, color?: string}[]}
   */
  const data = [];
  const elementRegex = /^<span\s+class="hljs-([^"]+)"[^>]*>([^<]*)(?:<\/span>)?/;
  const nonelementRegex = /[^<]*/;
  while (htmlCode) {
    const match = htmlCode.match(elementRegex);
    if (match) {
      const fullText = match[0];
      const cls = match[1];
      const text = match[2];
      const color = "blue";
      // const color = cls;
      data.push({ text, color });
      htmlCode = htmlCode.slice(fullText.length);
    }
    else if (htmlCode.startsWith("<\/span>")) { // Failed ending from hljs
      htmlCode = htmlCode.slice("<\/span>".length);
    }
    else if (htmlCode.startsWith("\n")) {
      const text = "\n";
      htmlCode = htmlCode.slice(1);
      data.push({ text });
    }
    else {
      const match = htmlCode.match(nonelementRegex);
      const text = match[0];
      htmlCode = htmlCode.slice(text.length);
      data.push({ text });
    }
  }

  /**
   * @type {{text: string, color?: string}[]}
   */
  const fixedData = [];
  // Fix newlines
  for (let i = 0; i < data.length; i++) {
    const { text, color } = data[i];
    const lines = text.split("\n");
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      if (j > 0) fixedData.push({ text: "\n" });
      fixedData.push({ text: line, color });
    }
  }

  return fixedData;
}

exports.htmlToJson = htmlToJson;