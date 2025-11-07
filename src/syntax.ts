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

  // Minimal tag/text scanner with a color stack
  const stack: (string | undefined)[] = [];
  const getColorFromClasses = (cls?: string) => {
    if (!cls) return undefined;
    const m = /\bhljs-([^\s"]+)/.exec(cls);
    if (!m) return undefined;
    return colorMap.get(m[1].toLowerCase());
  };

  // Matches: opening <span ...>, closing </span>, or plain text chunks
  const re = /<\s*span\b([^>]*)>|<\/\s*span\s*>|([^<]+)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(htmlCode)) !== null) {
    if (m[1] !== undefined) {
      // Opening span: push color (if any)
      const attrs = m[1];
      const cls = /\bclass\s*=\s*"([^"]*)"/.exec(attrs)?.[1];
      stack.push(getColorFromClasses(cls));
    } else if (m[0].startsWith("</")) {
      // Closing span: pop color
      stack.pop();
    } else if (m[2] !== undefined) {
      // Text node
      const text = decode(m[2]);
      const parts = text.split("\n");

      for (let i = 0; i < parts.length; i++) {
        const line = parts[i];
        if (removeEmptyLines && line.trim() === "") continue;
        if (i > 0) data.push({ text: "\n" });

        const color = stack.length ? stack[stack.length - 1] : undefined;
        data.push({ text: line, color });
      }
    }
  }

  return data;
}
