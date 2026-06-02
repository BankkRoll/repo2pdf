/**
 * Pure-JS PDF renderer built on pdf-lib.
 * @module renderers/pdf-lib-renderer
 *
 * @description
 * Renders the document with `pdf-lib` — pure JavaScript, no Chromium, no native
 * modules. Returns a `Uint8Array`, so the caller decides what to do with the
 * bytes (write to disk, stream over HTTP, etc.). The renderer itself never
 * touches the filesystem, which is what makes it usable in Node, serverless,
 * edge, and the browser.
 *
 * pdf-lib has no layout engine, so this module owns layout: it embeds fonts,
 * measures text, wraps long code lines, paginates, and draws a polished cover,
 * table of contents, and per-file cards. Colors come from a pluggable
 * {@link Tokenizer} (Shiki by default in Node, plain text everywhere else).
 *
 * Brand icons are drawn with `drawSvgPath` from bundled 24x24 SVG path data
 * (Simple Icons). SVG space is y-DOWN while pdf-lib is y-UP, so icons are drawn
 * with a *negative* scale (`-S/24`) anchored at the icon's TOP edge — this keeps
 * them upright (verified empirically, not assumed). The table of contents is
 * made clickable via low-level link annotations that jump to each file's page.
 */

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  PDFName,
  PDFArray,
  rgb,
  type RGB,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Config } from "../types/config.types";
import type { ProcessedFile } from "../types/file.types";
import { getTheme, type Theme } from "../styles/themes";
import { formatFileSize, organizeFilesByDirectory } from "../utils/file-utils";
import type { PdfRenderer, RenderRepoInfo } from "./renderer.interface";
import type { Tokenizer, TokenizedLine } from "./tokenizer.interface";
import { resolveTokenizer, type HighlightMode } from "./tokenizers";
import { loadRendererFonts } from "./fonts/font-loader";
import {
  resolveLanguageIcon,
  FOLDER_ICON,
  GENERIC_FILE as GENERIC_FILE_ICON,
} from "./icons/language-icons";
import type { BrandIcon } from "./icons/icon-data";

/** Page geometry (A4 in points) and layout constants. */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = { x: 50, top: 54, bottom: 56 };
const CW = PAGE.width - MARGIN.x * 2; // content width
const RADIUS = 7;

const FS = {
  h1: 21,
  coverTitle: 15,
  body: 10,
  url: 8,
  stat: 9,
  statLabel: 6.5,
  tocLabel: 7,
  tocDir: 7,
  tocFile: 6.8,
  sectionDir: 11,
  fileName: 9.5,
  fileMeta: 7.5,
  badge: 7,
  code: 8.5,
  lineNo: 7.5,
  codeLH: 12.5,
  footer: 7.5,
};

/** Convert a hex color (`#rgb`/`#rrggbb`/`#rrggbbaa`) to a pdf-lib RGB. */
function hexToRgb(hex: string, fallback: RGB = rgb(0, 0, 0)): RGB {
  if (!hex) return fallback;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  // Invalid hex (wrong length or non-hex chars) falls back to the text color.
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return fallback;
  const n = parseInt(h, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Mix two colors (t=0 → a, t=1 → b). Used to derive subtle tints. */
function mix(a: RGB, b: RGB, t: number): RGB {
  return rgb(
    a.red + (b.red - a.red) * t,
    a.green + (b.green - a.green) * t,
    a.blue + (b.blue - a.blue) * t,
  );
}

/**
 * Convert SVG elliptical-arc commands (`A`/`a`) in a path to cubic Béziers.
 *
 * pdf-lib 1.17.1's `drawSvgPath` parser has no arc runner: an `A`/`a` command
 * corrupts the current point and throws on the next `H`/`V`/`L`. Most brand
 * icons are arc-free, but a few (e.g. markdown, ocaml) use arcs. We rewrite just
 * those arcs into Béziers (`C`) ahead of time so every bundled icon renders.
 * Non-arc paths are returned essentially unchanged.
 */
function normalizeSvgPath(d: string): string {
  // Tokenize into command letters + their numeric arguments.
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!tokens) return d;

  let out = "";
  let cx = 0;
  let cy = 0; // current point (absolute)
  let sx = 0;
  let sy = 0; // subpath start (for Z)
  let i = 0;
  let cmd = "";

  const readNums = (n: number): number[] => {
    const nums: number[] = [];
    for (let k = 0; k < n; k++) {
      const v = tokens[i++];
      nums.push(parseFloat(v));
    }
    return nums;
  };

  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-zA-Z]/.test(t)) {
      cmd = t;
      i++;
    } else if (!cmd) {
      i++;
      continue;
    }
    const lower = cmd.toLowerCase();
    const rel = cmd === lower;

    if (lower === "m" || lower === "l") {
      const [px, py] = readNums(2);
      cx = rel ? cx + px : px;
      cy = rel ? cy + py : py;
      if (lower === "m") {
        sx = cx;
        sy = cy;
      }
      out += `${lower === "m" ? "M" : "L"}${cx} ${cy}`;
      // Subsequent implicit pairs after M are L; keep cmd for repeats.
      if (lower === "m") cmd = rel ? "l" : "L";
    } else if (lower === "h") {
      const [px] = readNums(1);
      cx = rel ? cx + px : px;
      out += `L${cx} ${cy}`;
    } else if (lower === "v") {
      const [py] = readNums(1);
      cy = rel ? cy + py : py;
      out += `L${cx} ${cy}`;
    } else if (lower === "c") {
      const n = readNums(6);
      const a = rel
        ? [cx + n[0], cy + n[1], cx + n[2], cy + n[3], cx + n[4], cy + n[5]]
        : n;
      cx = a[4];
      cy = a[5];
      out += `C${a[0]} ${a[1]} ${a[2]} ${a[3]} ${a[4]} ${a[5]}`;
    } else if (lower === "s") {
      const n = readNums(4);
      const a = rel ? [cx + n[0], cy + n[1], cx + n[2], cy + n[3]] : n;
      // Pass through as a smooth curve (parser tracks its own control point).
      cx = a[2];
      cy = a[3];
      out += `${rel ? "s" : "S"}${n.join(" ")}`;
    } else if (lower === "q") {
      const n = readNums(4);
      const a = rel ? [cx + n[0], cy + n[1], cx + n[2], cy + n[3]] : n;
      cx = a[2];
      cy = a[3];
      out += `${rel ? "q" : "Q"}${n.join(" ")}`;
    } else if (lower === "t") {
      const n = readNums(2);
      const a = rel ? [cx + n[0], cy + n[1]] : n;
      cx = a[0];
      cy = a[1];
      out += `${rel ? "t" : "T"}${n.join(" ")}`;
    } else if (lower === "a") {
      const n = readNums(7);
      const ex = rel ? cx + n[5] : n[5];
      const ey = rel ? cy + n[6] : n[6];
      out += arcToBezier(
        cx,
        cy,
        n[0],
        n[1],
        n[2],
        n[3] !== 0,
        n[4] !== 0,
        ex,
        ey,
      );
      cx = ex;
      cy = ey;
    } else if (lower === "z") {
      out += "Z";
      cx = sx;
      cy = sy;
    } else {
      // Unknown command — skip its letter, leave args to be consumed as numbers.
      i++;
    }
  }
  return out;
}

/** Emit cubic-Bézier `C` segments approximating an SVG elliptical arc. */
function arcToBezier(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  angleDeg: number,
  largeArc: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): string {
  if (rx === 0 || ry === 0) return `L${x2} ${y2}`;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = (angleDeg * Math.PI) / 180;
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);

  // Step 1: compute (x1', y1') in the rotated frame.
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosP * dx + sinP * dy;
  const y1p = -sinP * dx + cosP * dy;

  // Correct out-of-range radii.
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }

  // Step 2: compute center (cx', cy').
  const sign = largeArc === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * (rx * y1p)) / ry;
  const cyp = (co * -(ry * x1p)) / rx;

  // Step 3: compute center in original frame.
  const cx = cosP * cxp - sinP * cyp + (x1 + x2) / 2;
  const cy = sinP * cxp + cosP * cyp + (y1 + y2) / 2;

  // Step 4: compute start angle and sweep angle.
  const ang = (ux: number, uy: number, vx: number, vy: number): number => {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
    let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const theta1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dTheta = ang(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry,
  );
  if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI;
  if (sweep && dTheta < 0) dTheta += 2 * Math.PI;

  // Split into ≤90° segments and emit a cubic for each.
  const segs = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const delta = dTheta / segs;
  const tg = (4 / 3) * Math.tan(delta / 4);
  let out = "";
  let th = theta1;
  for (let s = 0; s < segs; s++) {
    const cosT1 = Math.cos(th);
    const sinT1 = Math.sin(th);
    const th2 = th + delta;
    const cosT2 = Math.cos(th2);
    const sinT2 = Math.sin(th2);

    // Endpoints + control points in the unrotated ellipse, then rotate/translate.
    const p = (ct: number, st: number): [number, number] => {
      const ex = rx * ct;
      const ey = ry * st;
      const px = cosP * ex - sinP * ey + cx;
      const py = sinP * ex + cosP * ey + cy;
      return [px, py];
    };
    const e2 = p(cosT2, sinT2);
    const c1x = rx * (cosT1 - tg * sinT1);
    const c1y = ry * (sinT1 + tg * cosT1);
    const c2x = rx * (cosT2 + tg * sinT2);
    const c2y = ry * (sinT2 - tg * cosT2);
    const C1 = [cosP * c1x - sinP * c1y + cx, sinP * c1x + cosP * c1y + cy];
    const C2 = [cosP * c2x - sinP * c2y + cx, sinP * c2x + cosP * c2y + cy];
    out += `C${C1[0]} ${C1[1]} ${C2[0]} ${C2[1]} ${e2[0]} ${e2[1]}`;
    th = th2;
  }
  return out;
}

interface Fonts {
  sans: PDFFont;
  sansSemibold: PDFFont;
  sansBold: PDFFont;
  mono: PDFFont;
  monoBold: PDFFont;
  monoItalic: PDFFont;
}

/** A pending TOC entry whose link target page is resolved after content layout. */
interface TocLink {
  /** TOC page the clickable rect lives on. */
  page: PDFPage;
  /** Clickable rect in PDF space [llx, lly, urx, ury]. */
  rect: [number, number, number, number];
  /** Target file path (key into the page-index map). */
  filePath: string;
}

/**
 * Renderer that produces a PDF document with pdf-lib.
 */
export class PdfLibRenderer implements PdfRenderer {
  private explicitHighlight?: HighlightMode;
  private injectedTokenizer?: Tokenizer;

  constructor(
    options: { highlight?: HighlightMode; tokenizer?: Tokenizer } = {},
  ) {
    this.explicitHighlight = options.highlight;
    this.injectedTokenizer = options.tokenizer;
  }

  async render(
    files: ProcessedFile[],
    repoInfo: RenderRepoInfo,
    config: Config,
  ): Promise<Uint8Array> {
    const theme = getTheme(config.style.theme || "github-light");
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);

    const bytes = loadRendererFonts(config.style.fonts);
    const fonts: Fonts = {
      sans: await doc.embedFont(bytes.sans, { subset: true }),
      sansSemibold: await doc.embedFont(bytes.sansSemibold, { subset: true }),
      sansBold: await doc.embedFont(bytes.sansBold, { subset: true }),
      mono: await doc.embedFont(bytes.mono, { subset: true }),
      monoBold: await doc.embedFont(bytes.monoBold, { subset: true }),
      monoItalic: await doc.embedFont(bytes.monoItalic, { subset: true }),
    };

    const tokenizer = await resolveTokenizer(
      this.explicitHighlight ?? config.style.highlight ?? "auto",
      this.injectedTokenizer,
    );

    const ctx = new RenderContext(doc, fonts, theme, config);
    const filesByDir = organizeFilesByDirectory(files);

    ctx.drawCover(repoInfo, files);
    if (config.style.includeTableOfContents) {
      ctx.drawTableOfContents(filesByDir);
    }
    await ctx.drawFiles(filesByDir, tokenizer, theme.shikiTheme);
    // Wire clickable TOC links now that every file's start page is known.
    ctx.wireTocLinks();
    if (config.style.pageNumbers) ctx.drawPageNumbers(repoInfo.name);

    if (tokenizer.dispose) await tokenizer.dispose();
    return doc.save();
  }
}

/**
 * Stateful layout/drawing helper — tracks the current page and vertical cursor,
 * handling page breaks transparently.
 */
class RenderContext {
  private page: PDFPage;
  private y: number;
  private readonly pages: PDFPage[] = [];

  /** Page index (into {@link pages}) where each file's card begins. */
  private readonly fileStartPage = new Map<string, number>();
  /** Recorded TOC entry rects, resolved to real links after content layout. */
  private readonly tocLinks: TocLink[] = [];

  private readonly cText: RGB;
  private readonly cHeading: RGB;
  private readonly cMuted: RGB;
  private readonly cBorder: RGB;
  private readonly cLink: RGB;
  private readonly cCardBg: RGB;
  private readonly cHeaderBg: RGB;
  private readonly cPageBg: RGB;
  private readonly cLineNum: RGB;
  private readonly cGutterBg: RGB;
  private readonly cBadgeText: RGB;
  private readonly isLight: boolean;

  constructor(
    private readonly doc: PDFDocument,
    private readonly f: Fonts,
    theme: Theme,
    private readonly config: Config,
  ) {
    const c = theme.colors;
    this.isLight = theme.type === "light";
    this.cText = hexToRgb(c.text);
    this.cHeading = hexToRgb(c.heading);
    this.cMuted = hexToRgb(c.textMuted);
    this.cBorder = hexToRgb(c.border);
    this.cLink = hexToRgb(c.link);
    this.cCardBg = hexToRgb(c.codeBackground);
    this.cHeaderBg = hexToRgb(c.headerBackground);
    this.cPageBg = this.isLight ? rgb(1, 1, 1) : hexToRgb(c.background);
    this.cLineNum = hexToRgb(c.lineNumber);
    // Gutter slightly offset from the code background for a subtle divider feel.
    this.cGutterBg = mix(
      this.cCardBg,
      this.isLight ? rgb(0, 0, 0) : rgb(1, 1, 1),
      0.03,
    );
    this.cBadgeText = this.isLight ? rgb(1, 1, 1) : hexToRgb(c.background);

    this.page = this.newPage();
    this.y = PAGE.height - MARGIN.top;
  }

  // ---- page / cursor helpers --------------------------------------------

  private newPage(): PDFPage {
    const page = this.doc.addPage([PAGE.width, PAGE.height]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE.width,
      height: PAGE.height,
      color: this.cPageBg,
    });
    this.pages.push(page);
    this.page = page;
    return page;
  }

  private ensure(needed: number): void {
    if (this.y - needed < MARGIN.bottom) {
      this.newPage();
      this.y = PAGE.height - MARGIN.top;
    }
  }

  private text(
    s: string,
    x: number,
    font: PDFFont,
    size: number,
    color: RGB,
  ): void {
    this.page.drawText(s, { x, y: this.y, size, font, color });
  }

  private w(s: string, font: PDFFont, size: number): number {
    return font.widthOfTextAtSize(s, size);
  }

  private fit(s: string, font: PDFFont, size: number, maxW: number): string {
    if (this.w(s, font, size) <= maxW) return s;
    let t = s;
    while (t.length > 1 && this.w(t + "…", font, size) > maxW)
      t = t.slice(0, -1);
    return t + "…";
  }

  /**
   * Draw a 24x24 brand/SVG icon with its top-left at (`x`, `topY`) at pixel
   * size `size`, upright.
   *
   * SVG paths are y-DOWN; pdf-lib's `drawSvgPath` handles the flip internally
   * and anchors the icon's *top* edge at `y`. So a *positive* scale `size/24`
   * with `y = topY` renders the icon upright, occupying `[topY - size, topY]`
   * vertically. (Verified empirically against reference boxes — TS/JS/CSS/Python
   * and the folder all render the right way up and fill the box exactly.)
   */
  private drawIcon(
    page: PDFPage,
    icon: BrandIcon,
    x: number,
    topY: number,
    size: number,
    colorOverride?: RGB,
  ): void {
    const color = colorOverride ?? hexToRgb(icon.hex, this.cMuted);
    try {
      page.drawSvgPath(normalizeSvgPath(icon.path), {
        x,
        y: topY,
        scale: size / 24,
        color,
      });
    } catch {
      // Defensive fallback: if a path still can't be parsed, draw a simple
      // rounded mark so the layout never breaks.
      page.drawRectangle({
        x,
        y: topY - size,
        width: size,
        height: size,
        color,
      });
    }
  }

  /** Rounded-rect helper (filled, with optional border). */
  private roundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    r: number,
    fill: RGB,
    border?: RGB,
  ): void {
    // Clamp the radius so interior rects never get a negative width/height.
    r = Math.min(r, width / 2, height / 2);
    const p = this.page;
    // Body
    p.drawRectangle({ x: x + r, y, width: width - 2 * r, height, color: fill });
    p.drawRectangle({
      x,
      y: y + r,
      width,
      height: height - 2 * r,
      color: fill,
    });
    // Corners
    const corners = [
      [x + r, y + r],
      [x + width - r, y + r],
      [x + r, y + height - r],
      [x + width - r, y + height - r],
    ];
    for (const [cx, cy] of corners) {
      p.drawCircle({ x: cx, y: cy, size: r, color: fill });
    }
    if (border) {
      // Thin border approximation: draw border-colored rect behind a slightly
      // inset fill. Simpler + crisp for print at our line weights.
      p.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor: border,
        borderWidth: 0.75,
        color: undefined,
      });
    }
  }

  // ---- cover -------------------------------------------------------------

  drawCover(repoInfo: RenderRepoInfo, files: ProcessedFile[]): void {
    const totalLines = files.reduce(
      (s, f) =>
        f.type === "code" && f.processedContent
          ? s + f.processedContent.split("\n").length
          : s,
      0,
    );

    // Compact, single-band header: small badge + title/url on the left, plain
    // stats on the right, a thin divider below. No description pill or stats box.
    const top = this.y;
    const bs = 28; // badge size
    const badge = this.initials(repoInfo.name);

    // Right-side stats first (so the title can reserve width against them).
    const stats: [string, string][] = [
      [files.length.toLocaleString(), "FILES"],
      [totalLines.toLocaleString(), "LINES"],
      [
        new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        "GENERATED",
      ],
    ];
    const segW = stats.map(([num, label]) =>
      Math.max(
        this.w(num, this.f.sansBold, FS.stat),
        this.w(label, this.f.sansSemibold, FS.statLabel),
      ),
    );
    const statGap = 18;
    const statsW =
      segW.reduce((s, v) => s + v, 0) + statGap * (stats.length - 1);
    const statsRight = MARGIN.x + CW;
    const statsLeft = statsRight - statsW;
    const numBaseline = top - 9;
    const labelBaseline = top - 18;
    let sx = statsLeft;
    stats.forEach(([num, label], i) => {
      const cx = sx + segW[i] / 2;
      this.page.drawText(num, {
        x: cx - this.w(num, this.f.sansBold, FS.stat) / 2,
        y: numBaseline,
        size: FS.stat,
        font: this.f.sansBold,
        color: this.cHeading,
      });
      this.page.drawText(label, {
        x: cx - this.w(label, this.f.sansSemibold, FS.statLabel) / 2,
        y: labelBaseline,
        size: FS.statLabel,
        font: this.f.sansSemibold,
        color: this.cMuted,
      });
      if (i < stats.length - 1) {
        const divX = sx + segW[i] + statGap / 2;
        this.page.drawRectangle({
          x: divX,
          y: top - 21,
          width: 0.75,
          height: 18,
          color: this.cBorder,
        });
      }
      sx += segW[i] + statGap;
    });

    // Left: rounded badge
    this.roundedRect(MARGIN.x, top - bs, bs, bs, 7, this.cLink);
    const bw = this.w(badge, this.f.monoBold, 11);
    this.page.drawText(badge, {
      x: MARGIN.x + (bs - bw) / 2,
      y: top - bs / 2 - 4,
      size: 11,
      font: this.f.monoBold,
      color: this.cBadgeText,
    });

    // Left: title + url, vertically aligned with the badge.
    const tx = MARGIN.x + bs + 12;
    const tw = statsLeft - tx - 16;
    this.page.drawText(
      this.fit(repoInfo.name, this.f.sansBold, FS.coverTitle, tw),
      {
        x: tx,
        y: top - 11,
        size: FS.coverTitle,
        font: this.f.sansBold,
        color: this.cHeading,
      },
    );
    if (repoInfo.url) {
      this.page.drawText(this.fit(repoInfo.url, this.f.mono, FS.url, tw), {
        x: tx,
        y: top - 24,
        size: FS.url,
        font: this.f.mono,
        color: this.cLink,
      });
    }

    this.y = top - bs - 14;
    this.divider();
    this.y -= 18;
  }

  private initials(name: string): string {
    const cleaned = name.replace(/[^a-zA-Z0-9]+/g, " ").trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const s =
      parts.length >= 2
        ? parts[0][0] + parts[1][0]
        : cleaned.slice(0, 2) || "R2";
    return s.toUpperCase();
  }

  private divider(): void {
    this.page.drawRectangle({
      x: MARGIN.x,
      y: this.y,
      width: CW,
      height: 0.75,
      color: this.cBorder,
    });
  }

  // ---- table of contents (airy, 3 columns, monochrome icons, clickable) --

  drawTableOfContents(filesByDir: Record<string, ProcessedFile[]>): void {
    const dirs = Object.keys(filesByDir).sort((a, b) => a.localeCompare(b));

    // Flat entry list, balanced across 3 columns. File entries carry their
    // `path` so clickable links can be wired to the right page later.
    type Entry =
      | { kind: "dir"; label: string }
      | { kind: "file"; label: string; path: string };
    const entries: Entry[] = [];
    for (const dir of dirs) {
      entries.push({ kind: "dir", label: dir === "" ? "root" : `${dir}/` });
      for (const file of filesByDir[dir]) {
        entries.push({ kind: "file", label: file.name, path: file.path });
      }
    }

    const COLS = 4;
    const rowH = 10.5;
    const colGap = 16;
    const colW = (CW - colGap * (COLS - 1)) / COLS;
    const perCol = Math.ceil(entries.length / COLS);
    const headerH = 20;

    // Label + subtle underline (no heavy card border — keeps it airy).
    this.ensure(headerH + perCol * rowH + 10);
    const topY = this.y;
    this.page.drawText("TABLE OF CONTENTS", {
      x: MARGIN.x,
      y: topY - 9,
      size: FS.tocLabel,
      font: this.f.sansBold,
      color: this.cMuted,
    });
    this.page.drawRectangle({
      x: MARGIN.x,
      y: topY - headerH + 6,
      width: CW,
      height: 0.6,
      color: this.cBorder,
    });

    const dirIconSize = 8;
    const fileIconSize = 7;
    const fileIndent = 8;
    const startY = topY - headerH;

    for (let c = 0; c < COLS; c++) {
      const colX = MARGIN.x + c * (colW + colGap);
      const colEntries = entries.slice(c * perCol, (c + 1) * perCol);
      let rowTop = startY;
      for (const e of colEntries) {
        const baseline = rowTop - rowH + 3.5;
        if (e.kind === "dir") {
          // Monochrome folder glyph in the heading color.
          this.drawIcon(
            this.page,
            FOLDER_ICON,
            colX,
            this.iconTop(baseline, FS.tocDir, dirIconSize),
            dirIconSize,
            this.cMuted,
          );
          const labelX = colX + dirIconSize + 5;
          this.page.drawText(
            this.fit(e.label, this.f.monoBold, FS.tocDir, colX + colW - labelX),
            {
              x: labelX,
              y: baseline,
              size: FS.tocDir,
              font: this.f.monoBold,
              color: this.cHeading,
            },
          );
        } else {
          // Monochrome generic file glyph (subtle), label in body text color.
          const iconX = colX + fileIndent;
          this.drawIcon(
            this.page,
            GENERIC_FILE_ICON,
            iconX,
            this.iconTop(baseline, FS.tocFile, fileIconSize),
            fileIconSize,
            this.cMuted,
          );
          const labelX = iconX + fileIconSize + 5;
          const maxLabelW = colX + colW - labelX;
          this.page.drawText(
            this.fit(e.label, this.f.mono, FS.tocFile, maxLabelW),
            {
              x: labelX,
              y: baseline,
              size: FS.tocFile,
              font: this.f.mono,
              color: this.cText,
            },
          );
          // Record the clickable rect (PDF space, y-up) for later link wiring.
          this.tocLinks.push({
            page: this.page,
            rect: [colX, baseline - 2.5, colX + colW, baseline + rowH - 4],
            filePath: e.path,
          });
        }
        rowTop -= rowH;
      }
    }

    this.y = startY - perCol * rowH - 18;
  }

  /**
   * Top-edge Y for an icon of height `size` so it sits vertically centred on a
   * text run drawn at `baseline` with the given font `size`. (Cap height of the
   * text is ~0.66·fontSize; its visual centre sits ~0.33·fontSize above the
   * baseline.)
   */
  private iconTop(baseline: number, fontSize: number, size: number): number {
    return baseline + fontSize * 0.33 + size / 2;
  }

  /** Brand color for an icon, kept legible on very-light/very-dark themes. */
  private iconColor(icon: BrandIcon): RGB {
    const c = hexToRgb(icon.hex, this.cMuted);
    // Pure-black brand marks (e.g. JSON, Markdown) vanish on dark themes and look
    // heavy on light ones — nudge them toward the theme's muted text color.
    const isBlack = c.red < 0.12 && c.green < 0.12 && c.blue < 0.12;
    if (isBlack) return this.isLight ? mix(c, this.cMuted, 0.55) : this.cMuted;
    return c;
  }

  /** Look up a file's language by path from the grouped map (for TOC icons). */
  private fileLanguageFor(
    filesByDir: Record<string, ProcessedFile[]>,
    filePath: string,
  ): string | undefined {
    for (const list of Object.values(filesByDir)) {
      const hit = list.find((f) => f.path === filePath);
      if (hit) return hit.language;
    }
    return undefined;
  }

  /** Serialize an RGB back to a hex string (for the icon fallback color). */
  private colorHex(c: RGB): string {
    const h = (v: number) =>
      Math.round(Math.max(0, Math.min(1, v)) * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${h(c.red)}${h(c.green)}${h(c.blue)}`;
  }

  // ---- files -------------------------------------------------------------

  async drawFiles(
    filesByDir: Record<string, ProcessedFile[]>,
    tokenizer: Tokenizer,
    shikiTheme: string,
  ): Promise<void> {
    const dirs = Object.keys(filesByDir).sort((a, b) => a.localeCompare(b));
    for (const dir of dirs) {
      if (dir !== "") {
        this.ensure(30);
        const iconSize = 13;
        const headingBaseline = this.y - 11;
        // Section heading: folder icon centred against the heading baseline.
        this.drawIcon(
          this.page,
          FOLDER_ICON,
          MARGIN.x,
          this.iconTop(headingBaseline, FS.sectionDir, iconSize),
          iconSize,
          this.cLink,
        );
        this.page.drawText(`${dir}/`, {
          x: MARGIN.x + iconSize + 7,
          y: headingBaseline,
          size: FS.sectionDir,
          font: this.f.sansBold,
          color: this.cHeading,
        });
        this.y -= 18;
        this.page.drawRectangle({
          x: MARGIN.x,
          y: this.y,
          width: CW,
          height: 1.2,
          color: this.cBorder,
        });
        this.y -= 14;
      }
      for (const file of filesByDir[dir]) {
        await this.drawFileCard(file, tokenizer, shikiTheme);
      }
    }
  }

  private async drawFileCard(
    file: ProcessedFile,
    tokenizer: Tokenizer,
    shikiTheme: string,
  ): Promise<void> {
    const lineCount =
      file.type === "code" && file.processedContent
        ? file.processedContent.split("\n").length
        : 0;

    // Tokenize first so we can lay out body rows.
    let lines: TokenizedLine[] = [];
    if (file.type === "code" && file.processedContent) {
      try {
        lines = await tokenizer.tokenize(
          file.processedContent,
          file.language || "text",
          shikiTheme,
        );
      } catch {
        lines = file.processedContent
          .split("\n")
          .map((l) => (l ? [{ text: l }] : []));
      }
    }

    const headerH = 24;
    // Card header (own its own; body rows draw their own backgrounds and the
    // card border is stroked at the end so it spans page breaks cleanly).
    this.ensure(headerH + FS.codeLH + 8);
    const cardLeft = MARGIN.x;

    // Record the page where this file's card begins (for clickable TOC links).
    this.fileStartPage.set(file.path, this.pages.length - 1);

    // Header bar
    this.roundedRectTop(
      cardLeft,
      this.y - headerH,
      CW,
      headerH,
      RADIUS,
      this.cHeaderBg,
    );

    // Brand icon (left of the path), in its own brand color.
    const icon = resolveLanguageIcon(file.language, this.colorHex(this.cMuted));
    const iconSize = 13;
    const pathBaseline = this.y - 16;
    this.drawIcon(
      this.page,
      icon,
      cardLeft + 12,
      this.iconTop(pathBaseline, FS.fileName, iconSize),
      iconSize,
      this.iconColor(icon),
    );

    const pathX = cardLeft + 12 + iconSize + 7;

    // Right side: language badge + meta. Measure first so the path can wrap to
    // the remaining space without overlapping.
    let rx = cardLeft + CW - 12;
    const meta = `${formatFileSize(file.size)}${lineCount ? `  ·  ${lineCount} lines` : ""}`;
    const metaW = this.w(meta, this.f.mono, FS.fileMeta);
    rx -= metaW;
    this.page.drawText(meta, {
      x: rx,
      y: this.y - 15,
      size: FS.fileMeta,
      font: this.f.mono,
      color: this.cMuted,
    });
    if (file.type === "code" && file.language) {
      const badge = file.language.toUpperCase();
      const bw = this.w(badge, this.f.sansSemibold, FS.badge);
      rx -= bw + 12 + 14;
      const badgeBg = this.isLight
        ? mix(this.cHeaderBg, this.cLink, 0.12)
        : this.cCardBg;
      this.roundedRect(rx, this.y - 18, bw + 12, 13, 6, badgeBg);
      this.page.drawText(badge, {
        x: rx + 6,
        y: this.y - 15,
        size: FS.badge,
        font: this.f.sansSemibold,
        color: this.cLink,
      });
    }

    const pathMaxW = Math.max(40, rx - pathX - 10);
    this.page.drawText(
      this.fit(file.path, this.f.monoBold, FS.fileName, pathMaxW),
      {
        x: pathX,
        y: this.y - 16,
        size: FS.fileName,
        font: this.f.monoBold,
        color: this.cHeading,
      },
    );

    this.y -= headerH;

    // Body
    if (file.type === "code" && file.processedContent) {
      this.drawCodeBody(lines, lineCount);
    } else if (file.type === "image") {
      this.drawPlaceholder("Image file — not rendered in this output");
    } else {
      this.drawPlaceholder(`Binary file ${file.processedContent || ""}`.trim());
    }

    this.y -= 18;
  }

  /** Rounded only on the top two corners (header sits on top of square body). */
  private roundedRectTop(
    x: number,
    y: number,
    width: number,
    height: number,
    r: number,
    fill: RGB,
  ): void {
    // Clamp the radius so interior rects never get a negative width/height.
    r = Math.min(r, width / 2, height / 2);
    const p = this.page;
    p.drawRectangle({ x, y, width, height: height - r, color: fill });
    p.drawRectangle({
      x: x + r,
      y: y + height - r,
      width: width - 2 * r,
      height: r,
      color: fill,
    });
    p.drawCircle({ x: x + r, y: y + height - r, size: r, color: fill });
    p.drawCircle({ x: x + width - r, y: y + height - r, size: r, color: fill });
  }

  private drawPlaceholder(text: string): void {
    const h = 28;
    this.ensure(h);
    this.page.drawRectangle({
      x: MARGIN.x,
      y: this.y - h,
      width: CW,
      height: h,
      color: this.cCardBg,
      borderColor: this.cBorder,
      borderWidth: 0.75,
    });
    this.page.drawText(this.fit(text, this.f.sans, FS.fileMeta + 1, CW - 24), {
      x: MARGIN.x + 12,
      y: this.y - 18,
      size: FS.fileMeta + 1,
      font: this.f.sans,
      color: this.cMuted,
    });
    this.y -= h;
  }

  private drawCodeBody(lines: TokenizedLine[], lineCount: number): void {
    const showNums = this.config.style.lineNumbers && lineCount > 0;
    const gutterW = showNums ? 38 : 0;
    const padX = 12;
    const codeX = MARGIN.x + gutterW + padX;
    const codeWidth = CW - gutterW - padX * 2;
    const charW = this.w("M", this.f.mono, FS.code);
    const maxChars = Math.max(8, Math.floor(codeWidth / charW));

    let lineNo = 0;
    for (const tokens of lines) {
      lineNo++;
      const rows = this.wrapTokens(tokens, maxChars);
      for (let r = 0; r < rows.length; r++) {
        this.ensure(FS.codeLH);
        const rowTop = this.y;
        const rowY = rowTop - FS.codeLH + 3;

        // Code background
        this.page.drawRectangle({
          x: MARGIN.x,
          y: rowTop - FS.codeLH,
          width: CW,
          height: FS.codeLH,
          color: this.cCardBg,
        });
        if (showNums) {
          // Gutter fill + divider
          this.page.drawRectangle({
            x: MARGIN.x,
            y: rowTop - FS.codeLH,
            width: gutterW,
            height: FS.codeLH,
            color: this.cGutterBg,
          });
          this.page.drawRectangle({
            x: MARGIN.x + gutterW,
            y: rowTop - FS.codeLH,
            width: 0.6,
            height: FS.codeLH,
            color: this.cBorder,
          });
          if (r === 0) {
            const num = String(lineNo);
            this.page.drawText(num, {
              x: MARGIN.x + gutterW - 8 - this.w(num, this.f.mono, FS.lineNo),
              y: rowY,
              size: FS.lineNo,
              font: this.f.mono,
              color: this.cLineNum,
            });
          }
        }

        let x = codeX;
        for (const tok of rows[r]) {
          if (!tok.text) continue;
          const font = tok.bold
            ? this.f.monoBold
            : tok.italic
              ? this.f.monoItalic
              : this.f.mono;
          this.page.drawText(tok.text, {
            x,
            y: rowY,
            size: FS.code,
            font,
            color: tok.color ? hexToRgb(tok.color, this.cText) : this.cText,
          });
          x += this.w(tok.text, font, FS.code);
        }
        this.y -= FS.codeLH;
      }
    }
  }

  private wrapTokens(tokens: TokenizedLine, maxChars: number): TokenizedLine[] {
    // Assumes monospace Latin: one column per char, no CJK/RTL/combining-mark handling.
    const rows: TokenizedLine[] = [];
    let row: TokenizedLine = [];
    let count = 0;
    for (const tok of tokens) {
      let text = tok.text.replace(/\t/g, "  ");
      while (text.length > 0) {
        const space = maxChars - count;
        if (space <= 0) {
          rows.push(row);
          row = [];
          count = 0;
          continue;
        }
        const chunk = text.slice(0, space);
        row.push({ ...tok, text: chunk });
        count += chunk.length;
        text = text.slice(space);
      }
    }
    rows.push(row);
    return rows.length ? rows : [[]];
  }

  // ---- clickable TOC links ----------------------------------------------

  /**
   * Resolve each recorded TOC entry into a real PDF link annotation that jumps
   * to the target file's start page. Called after all content is laid out, so
   * `fileStartPage` is fully populated. Annotations are low-level PDF objects
   * (pdf-lib has no high-level internal-link API); each is registered in the
   * doc's context and appended to its TOC page's `Annots` array.
   */
  wireTocLinks(): void {
    const ctx = this.doc.context;
    for (const link of this.tocLinks) {
      const targetIndex = this.fileStartPage.get(link.filePath);
      if (targetIndex === undefined) continue;
      const targetPage = this.pages[targetIndex];
      const targetRef = targetPage.ref;
      const [x1, y1, x2, y2] = link.rect;

      const annotation = ctx.register(
        ctx.obj({
          Type: "Annot",
          Subtype: "Link",
          // No visible border around the clickable area.
          Border: [0, 0, 0],
          Rect: [x1, y1, x2, y2],
          // Jump to the top of the target page (XYZ with null zoom keeps zoom).
          Dest: [targetRef, "XYZ", null, PAGE.height, null],
        }),
      );

      // `lookup(name, PDFArray)` THROWS when the key is absent (pdf-lib quirk),
      // so look up untyped and branch on the runtime type instead.
      const existing = link.page.node.lookup(PDFName.of("Annots"));
      if (existing instanceof PDFArray) {
        existing.push(annotation);
      } else {
        link.page.node.set(PDFName.of("Annots"), ctx.obj([annotation]));
      }
    }
  }

  // ---- footer ------------------------------------------------------------

  drawPageNumbers(repoName: string): void {
    const total = this.pages.length;
    this.pages.forEach((page, i) => {
      const label = `${repoName}`;
      const num = `${i + 1} / ${total}`;
      page.drawText(label, {
        x: MARGIN.x,
        y: MARGIN.bottom - 30,
        size: FS.footer,
        font: this.f.sans,
        color: this.cMuted,
      });
      const nw = this.w(num, this.f.sans, FS.footer);
      page.drawText(num, {
        x: PAGE.width - MARGIN.x - nw,
        y: MARGIN.bottom - 30,
        size: FS.footer,
        font: this.f.sans,
        color: this.cMuted,
      });
    });
  }
}
