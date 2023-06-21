/**
 * @param {string} htmlCode 
 */
function htmlToJson(htmlCode) {
  const originalCode = htmlCode;
  /**
   * @type {{text: string, color?: string}[]}
   */
  const data = [];
  const elementRegex = /^<span\s+class="hljs-\w+>([^<]*)<\/span>"/;
  while (true) {
    if (elementRegex.test(htmlCode)) {
      const match = htmlCode.match(elementRegex);
      if (match) {
        match
      }
      else {
        console.error("Unexpected error happened while parsing RegExp");
      }
    }
  }
}

exports.htmlToJson = htmlToJson;