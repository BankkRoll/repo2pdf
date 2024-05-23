import { decode } from "html-entities";

export function htmlToJson(
  htmlCode: string,
  removeEmptyLines: boolean,
): { text: string; color?: string }[] {
  const data: { text: string; color?: string }[] = [];
  const colorMap = new Map<string, string>([
    ["comment", "#708090"], // SlateGray
    ["punctuation", "#2F4F4F"], // DarkSlateGray
    ["tag", "#008080"], // Teal
    ["attribute", "#2E8B57"], // SeaGreen
    ["doctag", "#2E8B57"], // SeaGreen
    ["keyword", "#000080"], // Navy
    ["meta", "#4682B4"], // SteelBlue
    ["name", "#556B2F"], // DarkOliveGreen
    ["selector-tag", "#008B8B"], // DarkCyan
    ["deletion", "#8B0000"], // DarkRed
    ["number", "#FF4500"], // OrangeRed
    ["quote", "#6A5ACD"], // SlateBlue
    ["selector-class", "#483D8B"], // DarkSlateBlue
    ["selector-id", "#9400D3"], // DarkViolet
    ["string", "#006400"], // DarkGreen
    ["template-tag", "#778899"], // LightSlateGray
    ["type", "#696969"], // DimGray
    ["section", "#20B2AA"], // LightSeaGreen
    ["title", "#9370DB"], // MediumPurple
    ["link", "#8A2BE2"], // BlueViolet
    ["operator", "#A52A2A"], // Brown
    ["regexp", "#B22222"], // FireBrick
    ["selector-attr", "#5F9EA0"], // CadetBlue
    ["selector-pseudo", "#7FFF00"], // Chartreuse
    ["symbol", "#DC143C"], // Crimson
    ["template-variable", "#8B008B"], // DarkMagenta
    ["variable", "#FFD700"], // Gold
    ["literal", "#32CD32"], // LimeGreen
    ["addition", "#228B22"], // ForestGreen
    ["built_in", "#ADFF2F"], // GreenYellow
    ["bullet", "#7CFC00"], // LawnGreen
    ["code", "#7F8C8D"], // Gray
  ]);

  const elementRegex =
    /<span\s+class="hljs-([^"]+)"[^>]*>([^<]*)(?:<\/span>)?/g;
  const nonelementRegex = /[^<]+|<\/span>|\n/g;

  let match;
  while ((match = elementRegex.exec(htmlCode)) !== null) {
    const [_, cls, text] = match;
    const color = colorMap.get(cls.split(" ")[0].toLowerCase()) || "black";
    data.push({ text: decode(text), color });
  }

  htmlCode = htmlCode.replace(elementRegex, "");

  while ((match = nonelementRegex.exec(htmlCode)) !== null) {
    const text = match[0];
    data.push({ text: text === "\n" ? text : decode(text) });
  }

  const fixedData: { text: string; color?: string }[] = [];
  for (const { text, color } of data) {
    const lines = text.split("\n");
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];

      // Conditionally skip lines that only contain whitespace
      if (removeEmptyLines && line.trim() === "") {
        continue;
      }

      if (j > 0) fixedData.push({ text: "\n" });
      fixedData.push({ text: line, color });
    }
  }

  return fixedData;
}
