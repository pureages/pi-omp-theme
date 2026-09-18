// @nguyenquangthai/pi-omp-theme — compiled bundle.
// The .ts extension is deliberate: Pi's jiti loader always transpiles .ts and
// resolves @earendil-works/* to the running Pi's own modules (see tsup.config.ts).

// extension-src/omp-theme/shared/render-budget.ts
import {
  truncateToWidth as tuiTruncateToWidth,
  visibleWidth as tuiVisibleWidth,
  wrapTextWithAnsi
} from "@earendil-works/pi-tui";
var MAX_RENDER_LINE_CHARS = 2e3;
var DEFAULT_COLLAPSED_RENDER_LINES = 10;
var MAX_BOXED_RESULT_RENDERED_HEAD_LINES = 40;
var MAX_BOXED_RESULT_RENDERED_TAIL_LINES = 8;
var MAX_BOXED_RESULT_RENDERED_LINES = 160;
var RENDER_TRUNCATION_SUFFIX = "\u2026 (truncated)";
var TRUNCATE_ELLIPSIS = "\u2026";
var ANSI_RESET = "\x1B[0m";
var ESC = "\x1B";
var SGR_PREFIX_PATTERN = new RegExp(`^(?:${ESC}\\[[0-9;]*m)+`);
var SGR_SUFFIX_PATTERN = new RegExp(`(?:${ESC}\\[[0-9;]*m)+$`);
function truncateAtCodePointBoundary(text2, maxChars) {
  if (text2.length <= maxChars) return text2;
  const code = text2.charCodeAt(maxChars);
  const end = code >= 56320 && code <= 57343 ? maxChars - 1 : maxChars;
  return text2.slice(0, end);
}
function clampRenderLine(line, maxChars = MAX_RENDER_LINE_CHARS) {
  if (line.length <= maxChars) return line;
  return truncateAtCodePointBoundary(line, maxChars) + RENDER_TRUNCATION_SUFFIX;
}
function isPrintableAsciiCode(code) {
  return code >= 32 && code <= 126;
}
function isSimpleWidthOneGlyphCode(code) {
  if (code >= 9472 && code <= 9599) return true;
  if (code >= 9600 && code <= 9631) return true;
  if (code >= 9632 && code <= 9727) return true;
  if (code >= 10240 && code <= 10495) return true;
  return code === 178 || // ²
  code === 183 || // ·
  code === 960 || // π
  code === 8211 || // –
  code === 8212 || // —
  code === 8226 || // •
  code === 8230 || // …
  code === 8593 || // ↑
  code === 8594 || // →
  code === 8595 || // ↓
  code === 8627 || // ↳
  code === 8709 || // ∅
  code === 8776 || // ≈
  code === 8943 || // ⋯
  code === 8856 || // ⊘
  code === 8981 || // ⌕
  code === 9095 || // ⎇
  code === 8644 || // ⇄
  code === 8694 || // ⇶
  code === 9209 || // ⏹
  code === 9608 || // █
  code === 9612 || // ▌
  code === 9617 || // ░
  code === 9636 || // ▤
  code === 9654 || // ▶
  code === 9673 || // ◉
  code === 9676 || // ◌
  code === 9678 || // ◎
  code === 9744 || // ☐
  code === 9745 || // ☑
  code === 9888 || // ⚠
  code === 9998 || // ✎
  code === 10003 || // ✓
  code === 10004 || // ✔
  code === 10007 || // ✗
  code === 10008 || // ✘
  code === 10095 || // ❯
  code === 10132 || // ➔
  code === 10140 || // ➜
  code === 10227;
}
function isSimpleWidthOneCode(code) {
  return isPrintableAsciiCode(code) || isSimpleWidthOneGlyphCode(code);
}
function breakLongAsciiWord(word, width) {
  const lines = [];
  for (let i = 0; i < word.length; i += width) {
    lines.push(word.slice(i, i + width));
  }
  return lines.length > 0 ? lines : [""];
}
function wrapPrintableAsciiLine(line, width) {
  if (!line) return [""];
  if (line.length <= width) return [line];
  const wrapped = [];
  let currentLine = "";
  let currentVisibleLength = 0;
  let tokenStart = 0;
  while (tokenStart < line.length) {
    const tokenIsSpace = line[tokenStart] === " ";
    let tokenEnd = tokenStart + 1;
    while (tokenEnd < line.length && line[tokenEnd] === " " === tokenIsSpace) tokenEnd++;
    const token = line.slice(tokenStart, tokenEnd);
    const tokenVisibleLength = token.length;
    if (tokenVisibleLength > width && !tokenIsSpace) {
      if (currentLine) {
        wrapped.push(currentLine.trimEnd());
        currentLine = "";
        currentVisibleLength = 0;
      }
      const broken = breakLongAsciiWord(token, width);
      wrapped.push(...broken.slice(0, -1));
      currentLine = broken[broken.length - 1] ?? "";
      currentVisibleLength = currentLine.length;
      tokenStart = tokenEnd;
      continue;
    }
    const totalNeeded = currentVisibleLength + tokenVisibleLength;
    if (totalNeeded > width && currentVisibleLength > 0) {
      wrapped.push(currentLine.trimEnd());
      if (tokenIsSpace) {
        currentLine = "";
        currentVisibleLength = 0;
      } else {
        currentLine = token;
        currentVisibleLength = tokenVisibleLength;
      }
    } else {
      currentLine += token;
      currentVisibleLength += tokenVisibleLength;
    }
    tokenStart = tokenEnd;
  }
  if (currentLine) wrapped.push(currentLine);
  return wrapped.length > 0 ? wrapped.map((wrappedLine) => wrappedLine.trimEnd()) : [""];
}
function matchSimpleSgrWrappedText(text2) {
  const prefixMatch = SGR_PREFIX_PATTERN.exec(text2);
  const suffixMatch = SGR_SUFFIX_PATTERN.exec(text2);
  if (!prefixMatch || !suffixMatch) return null;
  const prefix = prefixMatch[0];
  const suffix = suffixMatch[0];
  const bodyStart = prefix.length;
  const bodyEnd = suffixMatch.index;
  if (bodyEnd < bodyStart) return null;
  const body = text2.slice(bodyStart, bodyEnd);
  const bodyWidth = knownVisibleWidth(body);
  if (!bodyWidth || bodyWidth.kind === "sgrAscii" || bodyWidth.kind === "sgrSimple") return null;
  return { prefix, body, suffix, kind: bodyWidth.kind === "ascii" ? "sgrAscii" : "sgrSimple" };
}
function wrapSimpleSgrWrappedText(text2, width) {
  const match = matchSimpleSgrWrappedText(text2);
  if (!match) return null;
  return {
    lines: wrapPrintableAsciiLine(match.body, width).map((line) => `${match.prefix}${line}${match.suffix}`),
    kind: match.kind
  };
}
function readSgrSequenceEnd(text2, offset) {
  if (text2.charCodeAt(offset) !== 27 || text2[offset + 1] !== "[") return -1;
  let cursor = offset + 2;
  while (cursor < text2.length) {
    const code = text2.charCodeAt(cursor);
    if (code === 109) return cursor + 1;
    if (code !== 59 && (code < 48 || code > 57)) return -1;
    cursor++;
  }
  return -1;
}
function knownVisibleWidth(text2) {
  let width = 0;
  let sawSgr = false;
  let sawSimpleGlyph = false;
  for (let i = 0; i < text2.length; ) {
    const sgrEnd = readSgrSequenceEnd(text2, i);
    if (sgrEnd > i) {
      sawSgr = true;
      i = sgrEnd;
      continue;
    }
    const code = text2.charCodeAt(i);
    if (!isSimpleWidthOneCode(code)) return null;
    if (!isPrintableAsciiCode(code)) sawSimpleGlyph = true;
    width++;
    i++;
  }
  if (sawSgr) return { visibleWidth: width, kind: sawSimpleGlyph ? "sgrSimple" : "sgrAscii" };
  return { visibleWidth: width, kind: sawSimpleGlyph ? "simple" : "ascii" };
}
function knownEllipsisWidth(text2) {
  if (text2 === TRUNCATE_ELLIPSIS) return 1;
  return knownVisibleWidth(text2)?.visibleWidth ?? null;
}
function truncatePrintableAscii(text2, width, ellipsis = TRUNCATE_ELLIPSIS) {
  if (width <= 0) return { text: "", visibleWidth: 0 };
  if (text2.length <= width) return { text: text2, visibleWidth: text2.length };
  const ellipsisWidth = knownEllipsisWidth(ellipsis);
  if (ellipsisWidth === null) return { text: text2.slice(0, width), visibleWidth: width };
  if (ellipsisWidth >= width) {
    if (ellipsis === TRUNCATE_ELLIPSIS) return { text: TRUNCATE_ELLIPSIS, visibleWidth: 1 };
    return { text: ellipsis.slice(0, width), visibleWidth: Math.min(width, ellipsis.length) };
  }
  const targetWidth = Math.max(0, width - ellipsisWidth);
  return { text: `${text2.slice(0, targetWidth)}${ellipsis}`, visibleWidth: targetWidth + ellipsisWidth };
}
function truncateSgrAscii(text2, width, ellipsis, visibleWidth2) {
  if (visibleWidth2 <= width) return { text: text2, visibleWidth: visibleWidth2 };
  const ellipsisWidth = knownEllipsisWidth(ellipsis);
  if (ellipsisWidth === null) return null;
  if (ellipsisWidth >= width) return truncatePrintableAscii(ellipsis, width, "");
  const targetWidth = Math.max(0, width - ellipsisWidth);
  let keptWidth = 0;
  let output = "";
  for (let i = 0; i < text2.length && keptWidth < targetWidth; ) {
    const sgrEnd = readSgrSequenceEnd(text2, i);
    if (sgrEnd > i) {
      output += text2.slice(i, sgrEnd);
      i = sgrEnd;
      continue;
    }
    const code = text2.charCodeAt(i);
    if (!isSimpleWidthOneCode(code)) return null;
    output += text2[i] ?? "";
    keptWidth++;
    i++;
  }
  return { text: `${output}${ANSI_RESET}${ellipsis}${ANSI_RESET}`, visibleWidth: keptWidth + ellipsisWidth };
}
function fastTruncateText(text2, width, ellipsis = TRUNCATE_ELLIPSIS) {
  const knownWidth = knownVisibleWidth(text2);
  if (!knownWidth) return null;
  if (knownWidth.kind === "ascii" || knownWidth.kind === "simple")
    return { ...truncatePrintableAscii(text2, width, ellipsis), kind: knownWidth.kind };
  const simple = matchSimpleSgrWrappedText(text2);
  if (simple) {
    const truncated2 = truncatePrintableAscii(simple.body, width, ellipsis);
    return {
      text: `${simple.prefix}${truncated2.text}${simple.suffix}`,
      visibleWidth: truncated2.visibleWidth,
      kind: simple.kind
    };
  }
  const truncated = truncateSgrAscii(text2, width, ellipsis, knownWidth.visibleWidth);
  return truncated ? { ...truncated, kind: knownWidth.kind } : null;
}
function safeVisibleWidth(text2) {
  const fastWidth = knownVisibleWidth(text2);
  if (fastWidth) return fastWidth.visibleWidth;
  if (text2 === TRUNCATE_ELLIPSIS) return 1;
  return tuiVisibleWidth(text2);
}
function safeTruncateToWidth(text2, maxWidth, ellipsis = "...", pad2 = false) {
  const width = Math.floor(maxWidth);
  if (!Number.isFinite(width) || width <= 0) return "";
  if (text2.length === 0) return pad2 ? " ".repeat(width) : "";
  const truncated = fastTruncateText(text2, width, ellipsis);
  if (truncated)
    return pad2 ? `${truncated.text}${" ".repeat(Math.max(0, width - truncated.visibleWidth))}` : truncated.text;
  return tuiTruncateToWidth(text2, maxWidth, ellipsis, pad2);
}
function fastBoxLineContent(content, width) {
  const contentWidth = Math.floor(width);
  if (!Number.isFinite(contentWidth) || contentWidth <= 0) return null;
  return fastTruncateText(content, contentWidth);
}
function safeWrapTextWithAnsi(text2, width, maxChars = MAX_RENDER_LINE_CHARS) {
  const clamped = clampRenderLine(text2, maxChars);
  const wrapWidth = Math.floor(width);
  if (!Number.isFinite(wrapWidth) || wrapWidth <= 0) {
    return wrapTextWithAnsi(clamped, width);
  }
  const clampedWidth = knownVisibleWidth(clamped);
  if (clampedWidth?.kind === "ascii" || clampedWidth?.kind === "simple") {
    return wrapPrintableAsciiLine(clamped, wrapWidth);
  }
  const simpleSgrWrapped = wrapSimpleSgrWrappedText(clamped, wrapWidth);
  if (simpleSgrWrapped) {
    return simpleSgrWrapped.lines;
  }
  return wrapTextWithAnsi(clamped, width);
}
function boxedResultRenderBudget(rawLineBudget = DEFAULT_COLLAPSED_RENDER_LINES) {
  const rawLines = Math.max(
    0,
    Math.floor(Number.isFinite(rawLineBudget) ? rawLineBudget : DEFAULT_COLLAPSED_RENDER_LINES)
  );
  const maxRenderedLines = Math.max(1, Math.min(rawLines * 3, MAX_BOXED_RESULT_RENDERED_LINES));
  const tailLines = Math.min(
    Math.ceil(rawLines * 0.15),
    MAX_BOXED_RESULT_RENDERED_TAIL_LINES,
    Math.max(0, maxRenderedLines - 1)
  );
  const headLines = Math.min(
    rawLines,
    MAX_BOXED_RESULT_RENDERED_HEAD_LINES,
    Math.max(1, maxRenderedLines - tailLines - 1)
  );
  return { headLines, tailLines, maxRenderedLines };
}

// extension-src/omp-theme/shared/ansi.ts
function isFinal(byte) {
  return byte >= "@" && byte <= "~";
}
var CUBE_STEPS = [0, 95, 135, 175, 215, 255];
function xterm256ToRgb(index) {
  if (index >= 0 && index < 16) {
    const base = [
      [0, 0, 0],
      [128, 0, 0],
      [0, 128, 0],
      [128, 128, 0],
      [0, 0, 128],
      [128, 0, 128],
      [0, 128, 128],
      [192, 192, 192],
      [128, 128, 128],
      [255, 0, 0],
      [0, 255, 0],
      [255, 255, 0],
      [0, 0, 255],
      [255, 0, 255],
      [0, 255, 255],
      [255, 255, 255]
    ];
    const entry = base[index] ?? [0, 0, 0];
    const [r, g, b] = entry;
    return { r, g, b };
  }
  if (index >= 16 && index < 232) {
    const cube = index - 16;
    return {
      r: CUBE_STEPS[Math.floor(cube / 36)] ?? 0,
      g: CUBE_STEPS[Math.floor(cube % 36 / 6)] ?? 0,
      b: CUBE_STEPS[cube % 6] ?? 0
    };
  }
  if (index >= 232 && index < 256) {
    const gray = 8 + 10 * (index - 232);
    return { r: gray, g: gray, b: gray };
  }
  return void 0;
}
function parseAnsiFgToRgb(prefix) {
  const esc = "\x1B";
  const direct = new RegExp(`^${esc}\\[38;2;(\\d{1,3});(\\d{1,3});(\\d{1,3})m$`).exec(prefix);
  if (direct) {
    const r = Number.parseInt(direct[1] ?? "0", 10);
    const g = Number.parseInt(direct[2] ?? "0", 10);
    const b = Number.parseInt(direct[3] ?? "0", 10);
    if (r <= 255 && g <= 255 && b <= 255) return { r, g, b };
  }
  const indexed = new RegExp(`^${esc}\\[38;5;(\\d{1,3})m$`).exec(prefix);
  if (indexed) {
    const index = Number.parseInt(indexed[1] ?? "0", 10);
    if (index <= 255) return xterm256ToRgb(index);
  }
  return void 0;
}
function stripAnsi(value) {
  let output = "";
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) !== 27) {
      output += value[i];
      continue;
    }
    i++;
    if (value[i] === "[") {
      while (i + 1 < value.length && !isFinal(value[i + 1] ?? "")) i++;
      i++;
    } else if (value[i] === "]") {
      while (i + 1 < value.length && value.charCodeAt(i + 1) !== 7) {
        i++;
        if (value.charCodeAt(i) === 27 && value[i + 1] === "\\") {
          i++;
          break;
        }
      }
      if (i + 1 < value.length && value.charCodeAt(i + 1) === 7) i++;
    }
  }
  return output;
}
function visibleWidth(value) {
  return safeVisibleWidth(value);
}
var ANSI_RESET2 = "\x1B[0m";
function resetAnsi(value) {
  return `${value}${ANSI_RESET2}`;
}
function fitAnsiWidth(value, width, ellipsis = "\u2026") {
  return visibleWidth(value) <= width ? value : truncateAnsi(value, width, ellipsis);
}
function truncateAnsi(value, width, ellipsis = "\u2026") {
  if (width <= 0) return "";
  if (visibleWidth(value) <= width) return resetAnsi(value);
  const truncated = safeTruncateToWidth(value, width, ellipsis);
  return truncated.endsWith(ANSI_RESET2) ? truncated : resetAnsi(truncated);
}
var RESET_BACKGROUND = "\x1B[49m";
function isHexColor(value) {
  const cleaned = value.replace("#", "");
  return cleaned.length === 3 ? /^[0-9a-fA-F]{3}$/.test(cleaned) : (cleaned.length === 6 || cleaned.length === 8) && /^[0-9a-fA-F]+$/.test(cleaned);
}
function hexToRgb(hex) {
  const cleaned = hex.replace("#", "");
  if (cleaned.length === 3) {
    const r2 = Number.parseInt((cleaned[0] ?? "") + (cleaned[0] ?? ""), 16);
    const g2 = Number.parseInt((cleaned[1] ?? "") + (cleaned[1] ?? ""), 16);
    const b2 = Number.parseInt((cleaned[2] ?? "") + (cleaned[2] ?? ""), 16);
    return { r: r2, g: g2, b: b2 };
  }
  if (cleaned.length !== 6 && cleaned.length !== 8 || !/^[0-9a-fA-F]+$/.test(cleaned)) {
    return { r: 0, g: 0, b: 0 };
  }
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  return { r, g, b };
}
var CUBE_VALUES = [0, 95, 135, 175, 215, 255];
var GRAY_VALUES = Array.from({ length: 24 }, (_, i) => 8 + i * 10);
function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
}
function findClosestCubeIndex(value) {
  let minDist = Number.POSITIVE_INFINITY;
  let minIdx = 0;
  for (let i = 0; i < CUBE_VALUES.length; i++) {
    const dist = Math.abs(value - (CUBE_VALUES[i] ?? 0));
    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }
  return minIdx;
}
function findClosestGrayIndex(gray) {
  let minDist = Number.POSITIVE_INFINITY;
  let minIdx = 0;
  for (let i = 0; i < GRAY_VALUES.length; i++) {
    const dist = Math.abs(gray - (GRAY_VALUES[i] ?? 0));
    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }
  return minIdx;
}
function rgbTo256(r, g, b) {
  const rIdx = findClosestCubeIndex(r);
  const gIdx = findClosestCubeIndex(g);
  const bIdx = findClosestCubeIndex(b);
  const cubeR = CUBE_VALUES[rIdx] ?? 0;
  const cubeG = CUBE_VALUES[gIdx] ?? 0;
  const cubeB = CUBE_VALUES[bIdx] ?? 0;
  const cubeIndex = 16 + 36 * rIdx + 6 * gIdx + bIdx;
  const cubeDist = colorDistance(r, g, b, cubeR, cubeG, cubeB);
  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const grayIdx = findClosestGrayIndex(gray);
  const grayValue = GRAY_VALUES[grayIdx] ?? 0;
  const grayIndex = 232 + grayIdx;
  const grayDist = colorDistance(r, g, b, grayValue, grayValue, grayValue);
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (spread < 10 && grayDist < cubeDist) return grayIndex;
  return cubeIndex;
}
function colorEscapes(mode, hex, kind) {
  if (!isHexColor(hex)) return void 0;
  const { r, g, b } = hexToRgb(hex);
  const cacheKey = `${mode}:${kind}:${hex}`;
  const cache2 = kind === "fg" ? fgEscapeCache : bgEscapeCache;
  let cached = cache2.get(cacheKey);
  if (!cached) {
    if (mode === "256color") {
      const idx = rgbTo256(r, g, b);
      cached = {
        prefix: `\x1B[${kind === "fg" ? 38 : 48};5;${idx}m`,
        suffix: kind === "fg" ? "\x1B[39m" : RESET_BACKGROUND
      };
    } else {
      cached = {
        prefix: `\x1B[${kind === "fg" ? 38 : 48};2;${r};${g};${b}m`,
        suffix: kind === "fg" ? "\x1B[39m" : RESET_BACKGROUND
      };
    }
    cache2.set(cacheKey, cached);
  }
  return cached;
}
var fgEscapeCache = /* @__PURE__ */ new Map();
var bgEscapeCache = /* @__PURE__ */ new Map();
function fgHex(theme, hex, text2) {
  const mode = typeof theme?.getColorMode === "function" ? theme.getColorMode() : "truecolor";
  const escapes = colorEscapes(mode, hex, "fg");
  if (!escapes) return text2;
  return `${escapes.prefix}${text2}${escapes.suffix}`;
}

// extension-src/omp-theme/shared/box.ts
import { homedir as homedir2 } from "os";
import { relative, resolve as resolve2 } from "path";

// extension-src/omp-theme/shared/elapsed.ts
var ELAPSED_KEY = "__elapsedMs";
function formatElapsedMs(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "";
  if (ms < 1e3) return `${Math.round(ms)}ms`;
  const s = ms / 1e3;
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
}
function getElapsedMs(result) {
  if (!result || typeof result.details !== "object" || result.details === null) return void 0;
  const elapsed = result.details[ELAPSED_KEY];
  return typeof elapsed === "number" && Number.isFinite(elapsed) ? elapsed : void 0;
}

// extension-src/omp-theme/shared/keybinding-hints.ts
import { getKeybindings } from "@earendil-works/pi-tui";
function formatKeyDisplayText(text2, platform = process.platform) {
  return text2.split("/").map(
    (key) => key.split("+").map((part) => {
      const displayPart = platform === "darwin" && part.toLowerCase() === "alt" ? "option" : part;
      return displayPart ? displayPart.charAt(0).toUpperCase() + displayPart.slice(1) : displayPart;
    }).join("+")
  ).join("/");
}
function displayKeyText(keybinding) {
  try {
    return formatKeyDisplayText(getKeybindings().getKeys(keybinding).join("/"));
  } catch {
    return "";
  }
}
function displayKeyHint(keybinding, description) {
  const key = displayKeyText(keybinding);
  return key ? `${key} ${description}` : "";
}
function toolExpandHint() {
  return displayKeyHint("app.tools.expand", "to expand");
}
function toolExpandKeyText() {
  return displayKeyText("app.tools.expand");
}

// extension-src/omp-theme/shared/theme-extras.ts
import { existsSync, readdirSync, readFileSync } from "fs";
import { homedir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
var extensionDir = dirname(fileURLToPath(import.meta.url));
var THEME_EXTRA_DEFAULTS = Object.freeze({
  assistantPrefix: "\u2022",
  assistantPrefixColor: "",
  dividerChar: "\u2500",
  dividerColor: "",
  showDivider: "true",
  quoteStyle: "false",
  quoteChar: "\u2506",
  quoteColor: "",
  inputBorderColor: "",
  bashPromptColor: "",
  tagBgColor: "",
  parensTextColor: "",
  parensBracketColor: "",
  slashSelectedColor: "",
  slashCommandColor: "",
  slashDescriptionColor: "",
  slashHintColor: "",
  userBoxBorderColor: "",
  gitInsertionColor: "#2ea043",
  gitDeletionColor: "#f85149"
});
var cachedExtras = null;
var cachedVars = null;
var cachedColors = null;
var cachedThemeExport = null;
var cachedThemeName = null;
function themeDiscoveryFromContent(content) {
  if (!content || typeof content !== "object") return null;
  const record3 = content;
  const extras = record3.extras && typeof record3.extras === "object" ? record3.extras : null;
  const vars = record3.vars && typeof record3.vars === "object" ? record3.vars : null;
  const colors = record3.colors && typeof record3.colors === "object" ? record3.colors : null;
  const themeExport = record3.export && typeof record3.export === "object" ? record3.export : null;
  return extras || vars || colors || themeExport ? { extras, vars, colors, themeExport } : null;
}
function readThemeDiscoveryFromPath(filePath) {
  try {
    if (!filePath || !existsSync(filePath)) return null;
    const content = JSON.parse(readFileSync(filePath, "utf-8"));
    return themeDiscoveryFromContent(content);
  } catch {
    return null;
  }
}
function resolveThemeSourcePath(theme) {
  if (!theme || typeof theme !== "object") return "";
  const record3 = theme;
  if (typeof record3.sourcePath === "string") return record3.sourcePath;
  const definition = record3.definition && typeof record3.definition === "object" ? record3.definition : void 0;
  return typeof definition?.sourcePath === "string" ? definition.sourcePath : "";
}
function addThemeDir(searchDirs, dir) {
  if (existsSync(dir)) searchDirs.add(dir);
}
function addBundledThemeDirs(searchDirs) {
  for (const root of [extensionDir, process.cwd()]) {
    for (const scope of ["@earendil-works", "@mariozechner"]) {
      addThemeDir(
        searchDirs,
        resolve(root, "node_modules", scope, "pi-coding-agent", "dist", "modes", "interactive", "theme")
      );
      addThemeDir(searchDirs, resolve(root, "node_modules", scope, "pi-coding-agent", "dist", "theme"));
    }
  }
}
function collectThemeDirs(root, searchDirs, maxDepth = 4) {
  if (maxDepth < 0 || !existsSync(root)) return;
  try {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const dir = join(root, entry.name);
      if (entry.name === "themes") {
        searchDirs.add(dir);
        continue;
      }
      collectThemeDirs(dir, searchDirs, maxDepth - 1);
    }
  } catch {
  }
}
function readSettingsPackagePaths(settingsPath) {
  if (!existsSync(settingsPath)) return [];
  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    const entries = [
      ...Array.isArray(settings.packages) ? settings.packages : [],
      ...Array.isArray(settings.extensions) ? settings.extensions : []
    ];
    return entries.map(
      (entry) => typeof entry === "string" ? entry : entry && typeof entry === "object" ? String(entry.source ?? "") : ""
    ).filter((entry) => entry && !entry.startsWith("npm:") && !entry.startsWith("git:"));
  } catch {
    return [];
  }
}
function discoverThemeExtras(themeName) {
  const searchDirs = /* @__PURE__ */ new Set();
  addThemeDir(searchDirs, join(homedir(), ".pi", "agent", "themes"));
  addThemeDir(searchDirs, resolve(process.cwd(), ".pi", "themes"));
  addBundledThemeDirs(searchDirs);
  collectThemeDirs(join(homedir(), ".pi", "agent", "git"), searchDirs);
  collectThemeDirs(resolve(process.cwd(), ".pi", "git"), searchDirs);
  const localPackagePaths = [
    ...readSettingsPackagePaths(join(homedir(), ".pi", "agent", "settings.json")),
    ...readSettingsPackagePaths(resolve(process.cwd(), ".pi", "settings.json"))
  ];
  for (const packagePath of localPackagePaths) {
    addThemeDir(searchDirs, resolve(process.cwd(), packagePath, "themes"));
  }
  for (const dir of searchDirs) {
    try {
      for (const file of readdirSync(dir)) {
        if (!file.endsWith(".json")) continue;
        const filePath = join(dir, file);
        try {
          const content = JSON.parse(readFileSync(filePath, "utf-8"));
          if (content?.name === themeName) {
            const result = themeDiscoveryFromContent(content);
            if (result) return result;
          }
        } catch {
        }
      }
    } catch {
    }
  }
  return null;
}
function resolveThemeName(theme) {
  if (!theme || typeof theme !== "object") return null;
  const record3 = theme;
  const definition = record3.definition && typeof record3.definition === "object" ? record3.definition : void 0;
  if (typeof definition?.name === "string") return definition.name;
  if (typeof record3.name === "string") return record3.name;
  try {
    const settingsPath = join(homedir(), ".pi", "agent", "settings.json");
    if (existsSync(settingsPath)) {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      if (typeof settings.theme === "string") return settings.theme;
    }
  } catch {
  }
  return null;
}
function readThemeToken(name) {
  const varValue = cachedVars && typeof cachedVars[name] === "string" ? cachedVars[name] : "";
  if (varValue) return varValue;
  return cachedColors && typeof cachedColors[name] === "string" ? cachedColors[name] : "";
}
function resolveThemeColorToken(value) {
  let resolved = value;
  const seen = /* @__PURE__ */ new Set();
  for (let depth = 0; depth < 8; depth++) {
    if (!resolved) return "";
    if (isHexColor(resolved)) return resolved;
    if (seen.has(resolved)) return "";
    seen.add(resolved);
    const next = readThemeToken(resolved);
    if (!next) return "";
    resolved = next;
  }
  return "";
}
function resolveThemeExtraValue(key, value) {
  if (!key.endsWith("Color")) return value;
  return resolveThemeColorToken(value) || value;
}
function setFullTheme(theme, force = false) {
  const themeName = resolveThemeName(theme);
  const sourcePath = resolveThemeSourcePath(theme);
  if (!themeName && !sourcePath) return;
  const cacheKey = sourcePath || themeName;
  if (!force && cacheKey === cachedThemeName && (cachedExtras !== null || cachedVars !== null || cachedColors !== null || cachedThemeExport !== null))
    return;
  cachedThemeName = cacheKey;
  const result = readThemeDiscoveryFromPath(sourcePath) ?? (themeName ? discoverThemeExtras(themeName) : null);
  cachedExtras = result?.extras ?? null;
  cachedVars = result?.vars ?? null;
  cachedColors = result?.colors ?? null;
  cachedThemeExport = result?.themeExport ?? null;
}
function getThemeExtra(_theme, key) {
  const extraValue = cachedExtras?.[key];
  if (typeof extraValue === "string" || typeof extraValue === "boolean") {
    return resolveThemeExtraValue(key, String(extraValue));
  }
  return resolveThemeExtraValue(key, THEME_EXTRA_DEFAULTS[key] ?? "");
}

// extension-src/omp-theme/shared/box.ts
function shortenPath(path) {
  const home = homedir2();
  if (path.startsWith(home)) return `~${path.slice(home.length)}`;
  return path;
}
function resolveAbsolutePath(rawPath, cwd) {
  const path = rawPath.trim();
  if (!path) return "";
  const home = process.env.HOME;
  if (home && (path === "~" || path.startsWith("~/"))) {
    return path === "~" ? home : resolve2(home, path.slice(2));
  }
  return resolve2(cwd, path);
}
function resolveRelativePath(rawPath, cwd) {
  const absPath = resolveAbsolutePath(rawPath, cwd);
  if (!absPath) return "(unknown)";
  const relPath = relative(cwd, absPath).replace(/\\/g, "/");
  return relPath || ".";
}
function replaceTabs(text2) {
  return text2.replace(/\t/g, "   ");
}
function getTextOutput(result) {
  if (!result?.content) return "";
  const textBlocks = result.content.filter((contentBlock) => {
    if (!contentBlock || typeof contentBlock !== "object") return false;
    return contentBlock.type === "text";
  });
  return textBlocks.map((contentBlock) => String(contentBlock.text ?? "")).join("\n").replace(/\r/g, "");
}
function countWords(text2) {
  let count = 0;
  let inWord = false;
  for (const char of text2) {
    const isWord = /[\p{L}\p{N}_'-]/u.test(char);
    if (isWord && !inWord) count++;
    inWord = isWord;
  }
  return count;
}
function formatCompactCount(value) {
  if (value < 1e3) return `${Math.round(value)}`;
  if (value < 1e4) return `${(value / 1e3).toFixed(1)}k`;
  if (value < 1e6) return `${Math.round(value / 1e3)}k`;
  if (value < 1e7) return `${(value / 1e6).toFixed(1)}M`;
  return `${Math.round(value / 1e6)}M`;
}
function formatBoxedWords(text2) {
  const words = countWords(text2);
  return `~${formatCompactCount(words)} ${words === 1 ? "word" : "words"}`;
}
var BOX_HORIZONTAL = "\u2500";
var BOX_VERTICAL = "\u2502";
var BOX_SIDE_PADDING = 1;
var BOX_MIN_WIDTH = 12;
var BOX_ROUND_TOP_LEFT = "\u256D";
var BOX_ROUND_TOP_RIGHT = "\u256E";
var BOX_ROUND_BOTTOM_LEFT = "\u2570";
var BOX_ROUND_BOTTOM_RIGHT = "\u256F";
var BOX_DIVIDER_LEFT = "\u251C";
var BOX_DIVIDER_RIGHT = "\u2524";
var BOX_LABELED_RIGHT_DASH_MIN = 3;
var BOX_LABEL_CAP = BOX_HORIZONTAL.repeat(3);
function boxWidth(width) {
  return Math.max(BOX_MIN_WIDTH, width);
}
function boxInnerWidth(width) {
  return Math.max(1, boxWidth(width) - 2 - BOX_SIDE_PADDING * 2);
}
function boxedToolWidthKey(toolName, detail) {
  return `${toolName}:${detail}`;
}
function titleCaseToolWord(value) {
  const spaced = value.replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").trim();
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}
function formatToolName(toolName) {
  if (toolName.startsWith("mcp__")) {
    const rest = toolName.slice(5);
    const split = rest.includes("__") ? rest.indexOf("__") : rest.indexOf("_");
    if (split > 0) {
      const server = titleCaseToolWord(rest.slice(0, split));
      const tool = titleCaseToolWord(rest.slice(split).replace(/^_+/, ""));
      if (server && tool) return `${server}: ${tool}`;
    }
  }
  return titleCaseToolWord(toolName) || toolName;
}
function formatToolParamName(name) {
  const spaced = name.replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").trim();
  return spaced ? spaced[0]?.toUpperCase() + spaced.slice(1) : name;
}
var MAX_PARAM_VALUE_LENGTH = 120;
function formatOperationSummary(value) {
  if (!Array.isArray(value) || value.length === 0) return void 0;
  if (!value.every((item) => item && typeof item === "object" && !Array.isArray(item))) return void 0;
  const types = Array.from(
    new Set(value.map((item) => item.type).filter((type) => typeof type === "string"))
  );
  if (types.length === 0) return void 0;
  const typeSummary = types.length === 1 ? ` (${types[0]})` : ` (${types.slice(0, 3).join(", ")}${types.length > 3 ? ", \u2026" : ""})`;
  return `${value.length} ${value.length === 1 ? "operation" : "operations"}${typeSummary}`;
}
function formatToolParamValue(value) {
  if (value === void 0) return "";
  if (value === null) return "null";
  if (typeof value === "string") {
    if (value.length <= MAX_PARAM_VALUE_LENGTH) return value;
    return `${value.slice(0, MAX_PARAM_VALUE_LENGTH)}\u2026`;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return formatOperationSummary(value) ?? `${value.length} ${value.length === 1 ? "item" : "items"}`;
  }
  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    return `{${keys.length} ${keys.length === 1 ? "key" : "keys"}}`;
  }
  try {
    const json = JSON.stringify(value);
    if (json.length <= MAX_PARAM_VALUE_LENGTH) return json;
    return `${json.slice(0, MAX_PARAM_VALUE_LENGTH)}\u2026`;
  } catch {
    return String(value);
  }
}
function formatToolParamLines(args, theme) {
  if (args === void 0 || args === null) return [];
  if (typeof args !== "object" || Array.isArray(args)) {
    const value = formatToolParamValue(args);
    return value ? [`Params: ${value}`] : [];
  }
  const entries = Object.entries(args).filter(([, value]) => value !== void 0);
  if (entries.length === 0) return [];
  const lines = [];
  for (const [key, value] of entries) {
    const formattedValue = formatToolParamValue(value);
    if (!formattedValue) continue;
    const [firstLine = "", ...restLines] = formattedValue.replace(/\r/g, "").split("\n");
    const keyLabel = formatToolParamName(key);
    if (theme) {
      lines.push(`${theme.fg("dim", `${keyLabel}:`)} ${theme.fg("text", firstLine)}`);
      lines.push(...restLines.map((line) => `  ${theme.fg("text", line)}`));
    } else {
      lines.push(`${keyLabel}: ${firstLine}`);
      lines.push(...restLines.map((line) => `  ${line}`));
    }
  }
  return lines;
}
function colorFromExtra(theme, extraKey, fallbackColor, text2) {
  const color = getThemeExtra(theme, extraKey);
  if (color) {
    if (isHexColor(color)) return fgHex(theme, color, text2);
    try {
      return theme.fg(color, text2);
    } catch {
    }
  }
  return theme.fg(fallbackColor, text2);
}
var TOOL_GLYPHS = {
  bash: "\u276F",
  read: "\u25A4",
  write: "\u270E",
  edit: "\u270E",
  quick: "\u270E",
  substitute: "\u270E",
  target: "\u270E",
  grep: "\u2315",
  find: "\u2315",
  search: "\u2315",
  glob: "\u2315",
  web: "\u2315",
  ls: "\u25A4",
  list: "\u25A4",
  git: "\u2387",
  gh: "\u2387",
  // U+2611 ☑ reads as "already done", which is wrong for a call that writes or
  // updates a list, and it lives in a block terminals often paint two cells
  // wide while pi-tui measures one — the icon then crowds the title beside it.
  // U+274F is a plain checklist box from Dingbats, which is one cell everywhere.
  todo: "\u274F",
  task: "\u21F6",
  agent: "\u21F6",
  memory: "\u{1F9E0}",
  // pi-tui measures U+1F5D1 🗑 as one cell, but terminals commonly paint it two:
  // a row carrying it then overflows the frame it was measured against.
  delete: "\u232B",
  move: "\u279C",
  fetch: "\u{1F310}",
  browser: "\u{1F310}",
  lsp: "\u{1F4A1}",
  eval: "\u25B6",
  debug: "\u{1F41E}",
  mcp: "\u{1F50C}",
  ask: "?",
  review: "\u25C9",
  goal: "\u25CE",
  ssh: "\u21C4"
};
function toolGlyph(name) {
  const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const exact = TOOL_GLYPHS[key];
  if (exact) return exact;
  for (const word of key.split("_")) {
    const glyph = word ? TOOL_GLYPHS[word] : void 0;
    if (glyph) return glyph;
  }
  return "\u2794";
}
function formatToolTitlePrefix(theme, name) {
  return colorFromExtra(theme, "bashPromptColor", "bashMode", `${toolGlyph(name)} ${name}`);
}
function formatBoxedToolTitle(theme, name, isError, status) {
  const coloredTitle = isError ? theme.fg("error", `${toolGlyph(name)} ${name} \u2718`) : status === "running" ? `${formatToolTitlePrefix(theme, name)} ${theme.fg("text", "\u27F3")}` : formatToolTitlePrefix(theme, name);
  return typeof theme?.bold === "function" ? theme.bold(coloredTitle) : coloredTitle;
}
function formatBoxedRunningStatus(theme, elapsedMs) {
  const elapsed = elapsedMs === void 0 ? "" : `${theme.fg("text", ` \xB7 ${(elapsedMs / 1e3).toFixed(1)}s`)}`;
  return `${theme.fg("dim", "\u25CC Running")}${elapsed}`;
}
var boxDimTheme;
function setBoxTheme(theme) {
  boxDimTheme = theme;
}
function dimLine(text2) {
  if (boxDimTheme) return boxDimTheme.fg("dim", text2);
  return `\x1B[2m${text2}\x1B[22m`;
}
var boxChrome = "boxed";
function setBoxChrome(mode) {
  boxChrome = mode;
}
function boxFrameText(theme, text2) {
  if (boxChrome === "light") return " ".repeat(safeVisibleWidth(text2));
  return theme.fg("borderMuted", text2);
}
function boxBorder(theme, left, right, width) {
  if (boxChrome === "light") return BOX_OMITTED_LINE;
  const renderedWidth = boxWidth(width);
  const innerWidth = renderedWidth - 2;
  return boxFrameText(theme, `${left}${BOX_HORIZONTAL.repeat(innerWidth)}${right}`);
}
function boxLabeledBorder(theme, start, end, leftLabel, rightLabel, width) {
  const renderedWidth = boxWidth(width);
  let left = leftLabel ?? "";
  const right = rightLabel ?? "";
  let leftWidth = safeVisibleWidth(left);
  const rightWidth = safeVisibleWidth(right);
  const leftOverhead = left ? BOX_LABEL_CAP.length + 2 : 0;
  const rightOverhead = right ? 2 : 0;
  let rightFill = right ? BOX_LABELED_RIGHT_DASH_MIN : 0;
  let fill = renderedWidth - start.length - end.length - leftOverhead - leftWidth - rightOverhead - rightWidth - rightFill;
  if (right && fill < 0) {
    rightFill = 1;
    fill = renderedWidth - start.length - end.length - leftOverhead - leftWidth - rightOverhead - rightWidth - rightFill;
  }
  if (fill < 0) {
    const reserved = start.length + end.length + leftOverhead + (right ? rightOverhead + rightWidth + rightFill : 0) + 1;
    const maxLeft = renderedWidth - reserved;
    left = maxLeft > 0 ? safeTruncateToWidth(left, maxLeft, "\u2026") : "";
    leftWidth = safeVisibleWidth(left);
    fill = renderedWidth - start.length - end.length - (left ? leftWidth + leftOverhead : 0) - (right ? rightOverhead + rightWidth + rightFill : 0);
  }
  if (boxChrome === "light") {
    const head = left || right;
    if (!head) return " ".repeat(renderedWidth);
    const tail = left && right ? right : "";
    const gap = Math.max(1, renderedWidth - safeVisibleWidth(head) - safeVisibleWidth(tail));
    return `${head}${" ".repeat(gap)}${tail}`;
  }
  const parts = [boxFrameText(theme, `${start}${left ? `${BOX_LABEL_CAP} ` : ""}`)];
  if (left) parts.push(left);
  parts.push(boxFrameText(theme, `${left ? " " : ""}${BOX_HORIZONTAL.repeat(Math.max(0, fill))}`));
  if (right) {
    parts.push(boxFrameText(theme, " "), right, boxFrameText(theme, ` ${BOX_HORIZONTAL.repeat(rightFill)}`));
  }
  parts.push(boxFrameText(theme, end));
  return parts.join("");
}
var BOX_OMITTED_LINE = "\x1B[pi-omp-theme:omit]";
function dropOmittedLines(lines) {
  return lines.filter((line) => line !== BOX_OMITTED_LINE);
}
function boxBlankLine(theme, width) {
  return BOX_OMITTED_LINE;
  const renderedWidth = boxWidth(width);
  const contentWidth = boxInnerWidth(renderedWidth);
  const sidePad = " ".repeat(BOX_SIDE_PADDING);
  return `${boxFrameText(theme, BOX_VERTICAL)}${sidePad}${" ".repeat(contentWidth)}${sidePad}${boxFrameText(theme, BOX_VERTICAL)}`;
}
function boxLineAligned(theme, left, right, width) {
  const renderedWidth = boxWidth(width);
  const contentWidth = boxInnerWidth(renderedWidth);
  const rightWidth = safeVisibleWidth(right);
  const sidePad = " ".repeat(BOX_SIDE_PADDING);
  if (!right || rightWidth >= contentWidth) {
    return boxLine(theme, right || left, renderedWidth);
  }
  const maxLeftWidth = Math.max(1, contentWidth - rightWidth - 1);
  const truncatedLeft = safeTruncateToWidth(left, maxLeftWidth, "\u2026");
  const gap = " ".repeat(Math.max(1, contentWidth - safeVisibleWidth(truncatedLeft) - rightWidth));
  return `${boxFrameText(theme, BOX_VERTICAL)}${sidePad}${truncatedLeft}${gap}${right}${sidePad}${boxFrameText(theme, BOX_VERTICAL)}`;
}
function boxLine(theme, content, width) {
  const renderedWidth = boxWidth(width);
  if (boxChrome === "light") {
    const truncated2 = safeTruncateToWidth(content, renderedWidth, "\u2026");
    return `${truncated2}${" ".repeat(Math.max(0, renderedWidth - safeVisibleWidth(truncated2)))}`;
  }
  const contentWidth = boxInnerWidth(renderedWidth);
  const fastContent = fastBoxLineContent(content, contentWidth);
  const sidePad = " ".repeat(BOX_SIDE_PADDING);
  if (fastContent) {
    const fill2 = " ".repeat(Math.max(0, contentWidth - fastContent.visibleWidth));
    return `${boxFrameText(theme, BOX_VERTICAL)}${sidePad}${fastContent.text}${fill2}${sidePad}${boxFrameText(theme, BOX_VERTICAL)}`;
  }
  const truncated = safeTruncateToWidth(content, contentWidth, "\u2026");
  const fill = " ".repeat(Math.max(0, contentWidth - safeVisibleWidth(truncated)));
  return `${boxFrameText(theme, BOX_VERTICAL)}${sidePad}${truncated}${fill}${sidePad}${boxFrameText(theme, BOX_VERTICAL)}`;
}
function boxInsetLabel(theme, label, rightLabel, width) {
  const styled = label.includes("\x1B") ? label : theme.fg("toolTitle", label);
  return boxLabeledBorder(theme, BOX_DIVIDER_LEFT, BOX_DIVIDER_RIGHT, styled, rightLabel, width);
}
function boxedWrappedLines(theme, content, width) {
  return safeWrapTextWithAnsi(content, boxInnerWidth(width)).map((line) => boxLine(theme, line, width));
}
function boxedTruncatedLine(theme, content, width) {
  return boxLine(theme, safeTruncateToWidth(content, boxInnerWidth(width), "\u2026"), width);
}
function pushBoundedLines(target, lines, maxLines) {
  const slots = maxLines - target.length;
  if (slots <= 0) return false;
  if (lines.length > slots) {
    target.push(...lines.slice(0, slots));
    return false;
  }
  target.push(...lines);
  return true;
}
function renderBoxedOutputLines(theme, outputLines, width, rawLineBudget = DEFAULT_COLLAPSED_RENDER_LINES) {
  const budget = boxedResultRenderBudget(rawLineBudget);
  const headLimit = Math.max(0, Math.min(budget.headLines, budget.maxRenderedLines));
  const tailLimit = Math.max(0, Math.min(budget.tailLines, Math.max(0, budget.maxRenderedLines - headLimit - 1)));
  const head = [];
  let nextInputIndex = 0;
  let truncated = false;
  for (; nextInputIndex < outputLines.length; nextInputIndex++) {
    const fragments = (outputLines[nextInputIndex] ?? "").split("\n");
    let headExceeded = false;
    for (const fragment of fragments) {
      const line = boxedTruncatedLine(theme, fragment, width);
      if (!pushBoundedLines(head, [line], headLimit)) {
        headExceeded = true;
        break;
      }
    }
    if (headExceeded) {
      truncated = true;
      nextInputIndex++;
      break;
    }
  }
  if (!truncated && nextInputIndex >= outputLines.length) return head;
  const tail = [];
  const tailStart = Math.max(nextInputIndex, outputLines.length - tailLimit);
  for (let i = tailStart; i < outputLines.length; i++) {
    const fragments = (outputLines[i] ?? "").split("\n");
    for (const fragment of fragments) {
      const line = boxedTruncatedLine(theme, fragment, width);
      tail.push(line);
      if (tail.length > tailLimit) tail.splice(0, tail.length - tailLimit);
    }
  }
  const skippedInputLines = Math.max(0, tailStart - nextInputIndex);
  const skippedText = skippedInputLines > 0 ? `\u2026 rendered output truncated; ${skippedInputLines} input lines skipped before tail` : "\u2026 rendered output truncated";
  return [...head, boxLine(theme, theme.fg("muted", skippedText), width), ...tail];
}
function renderBoxedToolCall(theme, toolName, detailLines, options = {}) {
  let cache2 = null;
  return {
    invalidate() {
      cache2 = null;
    },
    render(width) {
      const resultSeen = typeof options.resultSeen === "function" ? options.resultSeen() : Boolean(options.resultSeen);
      if (cache2?.width === width && cache2.resultSeen === resultSeen) return cache2.lines;
      const title = formatBoxedToolTitle(
        theme,
        toolName,
        options.isError,
        options.isPending ? options.running ? "running" : "pending" : void 0
      );
      const headerLabel = options.headerDetail ? `${title}: ${options.headerDetail}` : title;
      const renderedWidth = boxWidth(width);
      const lines = [
        options.showHeader === false ? boxBorder(theme, BOX_ROUND_TOP_LEFT, BOX_ROUND_TOP_RIGHT, renderedWidth) : boxLabeledBorder(theme, BOX_ROUND_TOP_LEFT, BOX_ROUND_TOP_RIGHT, headerLabel, void 0, renderedWidth),
        // The breathing row belongs to the body; without one it just stacks
        // against the divider the result section opens with.
        ...detailLines.length > 0 ? [boxBlankLine(theme, renderedWidth)] : [],
        ...detailLines.flatMap((line) => boxedWrappedLines(theme, line, renderedWidth))
      ];
      if (options.isPending && !resultSeen) {
        const pendingLabel = options.pendingLabel ?? theme.fg("dim", `\u2026 ${options.pendingText ?? "Waiting for output\u2026"}`);
        lines.push(
          boxLine(theme, pendingLabel, renderedWidth),
          boxBorder(theme, BOX_ROUND_BOTTOM_LEFT, BOX_ROUND_BOTTOM_RIGHT, renderedWidth)
        );
      } else {
        lines.push(boxBlankLine(theme, renderedWidth));
      }
      cache2 = { width, resultSeen, lines: dropOmittedLines(lines) };
      return cache2.lines;
    }
  };
}
var COMPACT_FOOTER_KEY = "__piOmpThemeCompactFooter";
var COMPACT_FOOTER_ERROR_KEY = "__piOmpThemeCompactFooterError";
var COMPACT_FOOTER_PARTIAL_KEY = "__piOmpThemeCompactFooterPartial";
function clearCompactBoxedFooter(state) {
  if (!state || typeof state !== "object") return;
  delete state[COMPACT_FOOTER_KEY];
  delete state[COMPACT_FOOTER_ERROR_KEY];
  delete state[COMPACT_FOOTER_PARTIAL_KEY];
}
function renderCompactBoxedToolCall(theme, toolName, detailLine, options = {}) {
  return {
    invalidate() {
    },
    render(width) {
      const renderedWidth = boxWidth(width);
      const title = formatBoxedToolTitle(
        theme,
        toolName,
        options.isError,
        options.isPending ? options.running ? "running" : "pending" : void 0
      );
      const headerLabel = detailLine ? `${title}: ${detailLine}` : title;
      const compactFooter = typeof options.state?.[COMPACT_FOOTER_KEY] === "string" ? options.state[COMPACT_FOOTER_KEY] : "";
      const _footerIsError = Boolean(options.state?.[COMPACT_FOOTER_ERROR_KEY]);
      const _footerIsPartial = Boolean(options.state?.[COMPACT_FOOTER_PARTIAL_KEY]);
      const bodyLines = options.bodyLines ? options.bodyLines(boxInnerWidth(renderedWidth)) : [];
      const lines = [
        boxLabeledBorder(theme, BOX_ROUND_TOP_LEFT, BOX_ROUND_TOP_RIGHT, headerLabel, void 0, renderedWidth),
        ...bodyLines.length > 0 ? bodyLines.map((line) => boxLine(theme, line, renderedWidth)) : [boxBlankLine(theme, renderedWidth)]
      ];
      const status = compactFooter || (options.isPending ? options.pendingLabel ?? (options.running ? formatBoxedRunningStatus(theme, void 0) : theme.fg("dim", `\u2026 ${options.pendingText ?? "Waiting for output\u2026"}`)) : "");
      if (status) {
        const footerLine = [status, options.bottomRightLabel ?? ""].filter(Boolean).join("   ");
        lines.push(
          boxLine(theme, footerLine, renderedWidth),
          boxBorder(theme, BOX_ROUND_BOTTOM_LEFT, BOX_ROUND_BOTTOM_RIGHT, renderedWidth)
        );
      }
      return dropOmittedLines(lines);
    }
  };
}
function renderBoxedToolResult(theme, body, options = {}) {
  let cache2 = null;
  return {
    invalidate() {
      cache2 = null;
      if (typeof body !== "function") body.invalidate();
    },
    render(width) {
      if (cache2?.width === width) return cache2.lines;
      const renderedWidth = boxWidth(width);
      const maxContentWidth = boxInnerWidth(renderedWidth);
      const bodyLines = typeof body === "function" ? body(maxContentWidth) : body.render(maxContentWidth);
      const errorPrefix = options.isError ? [theme.fg("error", options.errorLabel ?? "\u2718 Error")] : [];
      const outputLines = bodyLines.length > 0 ? [...errorPrefix, ...bodyLines] : [theme.fg("muted", `\u2205 ${options.emptyText ?? "(no output)"}`)];
      const outputFragments = outputLines.flatMap((line) => line.split("\n"));
      const footerText = (options.footerLines ?? []).join(" \xB7 ");
      const dividerText = typeof options.dividerLabel === "function" ? options.dividerLabel(renderedWidth) : options.dividerLabel ?? "Output";
      const rendered = [
        ...options.showDivider === false ? [] : [boxInsetLabel(theme, dividerText, void 0, renderedWidth)],
        ...renderBoxedOutputLines(
          theme,
          outputFragments,
          renderedWidth,
          options.renderLineBudget ?? outputFragments.length
        ),
        ...footerText || options.expandHint ? [
          boxLineAligned(
            theme,
            theme.fg("dim", footerText),
            options.expandHint ? theme.fg("dim", options.expandHint) : "",
            renderedWidth
          )
        ] : [],
        boxBorder(theme, BOX_ROUND_BOTTOM_LEFT, BOX_ROUND_BOTTOM_RIGHT, renderedWidth)
      ];
      const visible = dropOmittedLines(rendered);
      cache2 = { width, lines: visible };
      return visible;
    }
  };
}
function formatBoxedFooterFromValues(theme, elapsedMs, output, extraParts = []) {
  const wall = elapsedMs === void 0 ? "--" : `${(elapsedMs / 1e3).toFixed(2)}s`;
  const elapsedPart = theme.fg("text", wall);
  const extraPartList = extraParts.filter(Boolean).map((part) => theme.fg("dim", part));
  const wordsPart = theme.fg("dim", formatBoxedWords(output));
  return [elapsedPart, ...extraPartList, wordsPart].join(theme.fg("dim", " \xB7 "));
}
function formatBoxedFooterParts(theme, result, extraParts = [], elapsedMs) {
  return formatBoxedFooterFromValues(theme, elapsedMs ?? getElapsedMs(result), getTextOutput(result), extraParts);
}
function formatBoxedFooter(theme, result, extraParts = [], elapsedMs) {
  return formatBoxedFooterParts(theme, result, extraParts, elapsedMs);
}
function renderCompactBoxedFooter(theme, result, options = {}) {
  if (options.state && typeof options.state === "object") {
    options.state[COMPACT_FOOTER_KEY] = formatBoxedFooterParts(theme, result, [], options.elapsedMs);
    options.state[COMPACT_FOOTER_ERROR_KEY] = Boolean(options.isError);
    options.state[COMPACT_FOOTER_PARTIAL_KEY] = Boolean(options.isPartial);
    return { invalidate() {
    }, render: () => [] };
  }
  return {
    invalidate() {
    },
    render(width) {
      const renderedWidth = boxWidth(width);
      return [
        boxLabeledBorder(
          theme,
          BOX_ROUND_BOTTOM_LEFT,
          BOX_ROUND_BOTTOM_RIGHT,
          formatBoxedFooterParts(theme, result, [], options.elapsedMs),
          void 0,
          renderedWidth
        )
      ];
    }
  };
}
function formatToolOutputLine(theme, line, color = "toolOutput") {
  if (color === "error") return theme.fg("error", line);
  const clean = stripAnsi(line);
  if (/^##\s/.test(clean)) return theme.fg("muted", line);
  if (/^\?\?\s/.test(clean))
    return theme.bold ? theme.bold(theme.fg("syntaxVariable", line)) : theme.fg("syntaxVariable", line);
  return theme.fg(color, line);
}
function selectRenderLines(text2, maxLines, tail = false) {
  const source = text2 ?? "";
  if (!source) return { lines: [], omitted: 0 };
  const limit = Math.max(0, maxLines);
  const selected = [];
  let lineCount = 0;
  let lineStart = 0;
  for (let i = 0; i <= source.length; i++) {
    if (i < source.length && source[i] !== "\n") continue;
    const rawLine = source.slice(lineStart, i).replace(/\r/g, "");
    lineCount++;
    if (limit > 0) {
      const line = clampRenderLine(rawLine);
      if (tail) {
        selected.push(line);
        if (selected.length > limit) selected.shift();
      } else if (selected.length < limit) {
        selected.push(line);
      }
    }
    lineStart = i + 1;
  }
  if (selected.length === 1 && selected[0] === "") return { lines: [], omitted: 0 };
  return { lines: selected, omitted: Math.max(0, lineCount - selected.length) };
}

// extension-src/omp-theme/features/tools/boxed/output-tree.ts
var TREE_INDENT = "  ";
var TREE_CHILD_INDENT = "  ";
var OUTPUT_TREE_HEAD_LIMIT = 6;
var GREP_COLLAPSED_LINE_LIMIT = 6;
var GREP_EXPANDED_LINE_LIMIT = 24;
var FILE_ICON_FOLDER = "\uF415";
var FILE_ICON_DEFAULT = "\uE612";
var SEARCH_ICON = "\uF002";
var SEARCH_ICON_UNICODE = "\u2315";
var FILE_ICONS = {
  ts: "\uE628",
  //  (nf-seti-typescript)
  tsx: "\uE7BA",
  //  (nf-seti-react)
  js: "\uE62C",
  //  (nf-seti-javascript)
  jsx: "\uE7BA",
  //  (nf-seti-react)
  mjs: "\uE62C",
  cjs: "\uE62C",
  json: "\uE62B",
  //  (nf-seti-json)
  md: "\uE609",
  //  (nf-seti-markdown)
  mdx: "\uE609",
  css: "\uE749",
  //  (nf-seti-css)
  scss: "\uE749",
  sass: "\uE749",
  less: "\uE749",
  html: "\uE60E",
  //  (nf-seti-html)
  htm: "\uE60E",
  py: "\uE606",
  //  (nf-seti-python)
  go: "\uE627",
  //  (nf-seti-go)
  rs: "\uE7A8",
  //  (nf-seti-rust)
  sh: "\uE795",
  //  (nf-seti-shell)
  bash: "\uE795",
  zsh: "\uE795",
  fish: "\uE795",
  yml: "\uE615",
  //  (nf-seti-yaml)
  yaml: "\uE615",
  toml: "\uE615",
  java: "\uE738",
  //  (nf-seti-java)
  c: "\uE61E",
  //  (nf-seti-c)
  h: "\uE61E",
  cpp: "\uE61E",
  hpp: "\uE61E",
  cs: "\uE61E",
  svg: "\uE62A",
  //  (nf-seti-svg)
  png: "\uE61D",
  //  (nf-seti-image)
  jpg: "\uE61D",
  jpeg: "\uE61D",
  gif: "\uE61D",
  webp: "\uE61D",
  pdf: "\uE67A",
  //  (nf-seti-pdf)
  dockerfile: "\uE7B0",
  //  (nf-seti-docker)
  lock: "\uE7B0",
  gitignore: "\uE702",
  //  (nf-seti-git)
  gitattributes: "\uE702",
  vue: "\uED43",
  //  (nf-vue)
  svelte: "\uE697"
};
function fileIcon(path) {
  if (path.endsWith("/")) return FILE_ICON_FOLDER;
  const name = path.split("/").pop() ?? path;
  const lower = name.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : lower;
  return FILE_ICONS[ext] ?? FILE_ICONS[lower] ?? FILE_ICON_DEFAULT;
}
var NOTICE_LINE_PATTERN = /^\[[^\]]*\]$/;
function stripNotices(text2) {
  return text2.replace(/\r/g, "").split("\n").map((line) => line.trimEnd()).filter((line) => line.length > 0 && !NOTICE_LINE_PATTERN.test(line.trim()));
}
function parseLsOutput(rawText) {
  return stripNotices(rawText).map((line) => line.trim()).filter((line) => line.length > 0 && line !== "(empty directory)");
}
function parseLsLongOutput(rawText) {
  const entries = [];
  for (const line of stripNotices(rawText)) {
    if (!/^[bcdlsp-][rwxtsST-]{9}/.test(line)) continue;
    const parts = line.split(/\s+/);
    const name = parts.slice(8).join(" ").trim();
    if (!name || name === "." || name === "..") continue;
    const isDir = (parts[0] ?? "").startsWith("d");
    entries.push(isDir ? `${name}/` : name);
  }
  return entries;
}
function parseFindOutput(rawText) {
  return stripNotices(rawText).map((line) => line.trim()).filter((line) => line.length > 0);
}
var GREP_MATCH_PATTERN = /^(.*?):(\d+):[ \t]?(.*)$/;
var GREP_CONTEXT_FALLBACK_PATTERN = /^(.*)-(\d+)-[ \t]?(.*)$/;
var GREP_BARE_MATCH_PATTERN = /^(\d+):[ \t]?(.*)$/;
var GREP_BARE_CONTEXT_PATTERN = /^(\d+)-[ \t]?(.*)$/;
function parsedDisplayLine(match, isMatch, fileOverride) {
  if (!match) return void 0;
  const file = fileOverride ?? match[1];
  const lineNo = fileOverride === void 0 ? match[2] : match[1];
  const content = fileOverride === void 0 ? match[3] : match[2];
  if (!file || lineNo === void 0 || content === void 0) return void 0;
  const parsed = Number(lineNo);
  if (!Number.isFinite(parsed) || parsed < 1) return void 0;
  return { file, line: parsed, content, isMatch };
}
function pushUniqueDisplayLine(lines, indexes, line) {
  const key = `${line.file}\0${line.line}`;
  const existingIndex = indexes.get(key);
  if (existingIndex === void 0) {
    indexes.set(key, lines.length);
    lines.push(line);
    return;
  }
  const existing = lines[existingIndex];
  if (line.isMatch && existing && !existing.isMatch) lines[existingIndex] = line;
}
function parsedContextLine(rawLine, knownFiles) {
  for (const file of knownFiles) {
    const prefix = `${file}-`;
    if (!rawLine.startsWith(prefix)) continue;
    const match = /^(\d+)-[ \t]?(.*)$/.exec(rawLine.slice(prefix.length));
    if (!match) continue;
    const parsed = Number(match[1]);
    if (!Number.isFinite(parsed) || parsed < 1) continue;
    return { file, line: parsed, content: match[2] ?? "", isMatch: false };
  }
  return parsedDisplayLine(GREP_CONTEXT_FALLBACK_PATTERN.exec(rawLine), false);
}
function parseGrepDisplayOutput(rawText) {
  const rawLines = stripNotices(rawText);
  const knownFiles = [
    ...new Set(
      rawLines.map((line) => parsedDisplayLine(GREP_MATCH_PATTERN.exec(line), true)?.file).filter((file) => Boolean(file))
    )
  ].sort((left, right) => right.length - left.length);
  const lines = [];
  const indexes = /* @__PURE__ */ new Map();
  for (const line of rawLines) {
    const parsed = parsedDisplayLine(GREP_MATCH_PATTERN.exec(line), true) ?? parsedContextLine(line, knownFiles);
    if (parsed) pushUniqueDisplayLine(lines, indexes, parsed);
  }
  return lines;
}
function parseGrepOutput(rawText) {
  return parseGrepDisplayOutput(rawText).filter((line) => line.isMatch).map(({ file, line, content }) => ({ file, line, content }));
}
function parseGrepBareDisplayOutput(rawText, file) {
  const lines = [];
  const indexes = /* @__PURE__ */ new Map();
  for (const line of stripNotices(rawText)) {
    const parsed = parsedDisplayLine(GREP_BARE_MATCH_PATTERN.exec(line), true, file) ?? parsedDisplayLine(GREP_BARE_CONTEXT_PATTERN.exec(line), false, file);
    if (parsed) pushUniqueDisplayLine(lines, indexes, parsed);
  }
  return lines;
}
function parseGrepBareOutput(rawText, file) {
  return parseGrepBareDisplayOutput(rawText, file).filter((line) => line.isMatch).map(({ file: parsedFile, line, content }) => ({ file: parsedFile, line, content }));
}
function groupMatchesByFile(matches) {
  const order = [];
  const buckets = /* @__PURE__ */ new Map();
  for (const match of matches) {
    let bucket = buckets.get(match.file);
    if (!bucket) {
      bucket = [];
      buckets.set(match.file, bucket);
      order.push(match.file);
    }
    bucket.push(match);
  }
  return order.map((file) => ({ file, matches: buckets.get(file) ?? [] }));
}
function renderOutputTree(theme, header, entries, width, options = {}) {
  const headLimit = options.headLimit ?? OUTPUT_TREE_HEAD_LIMIT;
  const moreUnit = options.moreUnit ?? "file";
  const entryColor = options.entryColor ?? "toolOutput";
  const indent = options.indent ?? TREE_INDENT;
  const safeWidth = Math.max(1, width);
  const label = (entry) => options.withIcons && entry ? `${fileIcon(entry)} ${entry}` : entry;
  const out = [safeTruncateToWidth(header, safeWidth, "\u2026")];
  if (entries.length === 0) return out;
  const visible = entries.slice(0, headLimit);
  const more = entries.length - visible.length;
  const lastIndex = visible.length - 1;
  for (let i = 0; i < visible.length; i++) {
    const branch = i < lastIndex || more > 0 ? "\u251C\u2500" : "\u2514\u2500";
    const line = `${indent}${dimLine(branch)} ${theme.fg(entryColor, label(visible[i] ?? ""))}`;
    out.push(safeTruncateToWidth(line, safeWidth, "\u2026"));
  }
  if (more > 0) {
    const line = `${indent}${dimLine("\u2514\u2500")} ${theme.fg("dim", `\u2026 ${more} more ${pluralForm(moreUnit, more)}`)}`;
    out.push(safeTruncateToWidth(line, safeWidth, "\u2026"));
  }
  return out;
}
function groupDisplayLines(lines) {
  const groups = [];
  const byFile = /* @__PURE__ */ new Map();
  for (const line of lines) {
    let group = byFile.get(line.file);
    if (!group) {
      group = { file: line.file, lines: [] };
      byFile.set(line.file, group);
      groups.push(group);
    }
    group.lines.push(line);
  }
  return groups;
}
function fullRowCount(groups, multiFile) {
  return groups.reduce((count, group) => count + group.lines.length + (multiFile ? 1 : 0), 0);
}
function selectCollapsedGroups(groups, lineBudget, multiFile) {
  const matchesOnly = groups.map((group) => ({
    file: group.file,
    lines: group.lines.filter((line) => line.isMatch)
  }));
  if (fullRowCount(matchesOnly, multiFile) <= lineBudget) {
    return matchesOnly.filter((group) => group.lines.length > 0).map((group) => ({ group, lines: [...group.lines] }));
  }
  const contentBudget = Math.max(0, lineBudget - 1);
  const selected = /* @__PURE__ */ new Map();
  let usedRows = 0;
  for (let round = 0; ; round++) {
    let progressed = false;
    for (const group of matchesOnly) {
      const line = group.lines[round];
      if (!line) continue;
      const existing = selected.get(group.file);
      const cost = existing ? 1 : multiFile ? 2 : 1;
      if (usedRows + cost > contentBudget) continue;
      if (existing) existing.lines.push(line);
      else selected.set(group.file, { group, lines: [line] });
      usedRows += cost;
      progressed = true;
    }
    if (!progressed) break;
  }
  return matchesOnly.flatMap((group) => {
    const value = selected.get(group.file);
    return value ? [value] : [];
  });
}
function expandedSliceWithMatch(lines, capacity) {
  if (capacity <= 0) return [];
  const prefix = lines.slice(0, capacity);
  if (prefix.some((line) => line.isMatch)) return prefix;
  const firstMatch = lines.findIndex((line) => line.isMatch);
  if (firstMatch < 0) return [];
  const start = Math.max(0, firstMatch - (capacity - 1));
  return lines.slice(start, firstMatch + 1);
}
function selectExpandedGroups(groups, lineBudget, multiFile) {
  if (fullRowCount(groups, multiFile) <= lineBudget) {
    return groups.map((group) => ({ group, lines: [...group.lines] }));
  }
  const contentBudget = Math.max(0, lineBudget - 1);
  const selected = [];
  let usedRows = 0;
  for (const group of groups) {
    const headerCost = multiFile ? 1 : 0;
    const available = contentBudget - usedRows - headerCost;
    const lines = expandedSliceWithMatch(group.lines, available);
    if (lines.length === 0) continue;
    selected.push({ group, lines });
    usedRows += headerCost + lines.length;
    if (lines.length < group.lines.length) break;
  }
  return selected;
}
function formatMatchRow(theme, line, lineNumberWidth) {
  const marker2 = line.isMatch ? "*" : " ";
  const lineNumber = `${marker2}${String(line.line).padStart(lineNumberWidth, " ")}`;
  const contentColor = line.isMatch ? "toolOutput" : "dim";
  return `${theme.fg("dim", lineNumber)}${dimLine("\u2502")} ${theme.fg(contentColor, replaceTabs(line.content))}`;
}
function moreSummary(theme, hiddenMatches, hiddenLines, hiddenFiles) {
  const primary = hiddenMatches > 0 ? `${hiddenMatches} more ${pluralForm("match", hiddenMatches)}` : `${hiddenLines} more ${pluralForm("line", hiddenLines)}`;
  const files = hiddenFiles > 0 ? ` \xB7 ${hiddenFiles} more ${pluralForm("file", hiddenFiles)}` : "";
  return theme.fg("dim", `\u2026 ${primary}${files}`);
}
function renderGrepTree(theme, header, matches, width, options = {}) {
  const indent = options.indent ?? TREE_INDENT;
  const safeWidth = Math.max(1, width);
  const lineBudget = Math.max(0, Math.floor(options.lineBudget ?? OUTPUT_TREE_HEAD_LIMIT));
  const out = [safeTruncateToWidth(header, safeWidth, "\u2026")];
  if (matches.length === 0 || lineBudget === 0) return out;
  const fallbackLines = matches.map((match) => ({ ...match, isMatch: true }));
  const displayLines = options.displayLines?.some((line) => line.isMatch) ? options.displayLines : fallbackLines;
  const groups = groupDisplayLines(displayLines);
  const multiFile = groups.length > 1;
  const selected = options.expanded ? selectExpandedGroups(groups, lineBudget, multiFile) : selectCollapsedGroups(groups, lineBudget, multiFile);
  const selectedLines = selected.flatMap((entry) => entry.lines);
  const selectedMatches = selectedLines.filter((line) => line.isMatch).length;
  const totalDisplayMatches = displayLines.filter((line) => line.isMatch).length;
  const hiddenMatches = Math.max(matches.length - selectedMatches, totalDisplayMatches - selectedMatches, 0);
  const hiddenLines = options.expanded ? Math.max(displayLines.length - selectedLines.length, 0) : 0;
  const selectedFiles = new Set(selected.filter((entry) => entry.lines.some((line) => line.isMatch)).map((entry) => entry.group.file));
  const hiddenFiles = groups.filter((group) => !selectedFiles.has(group.file)).length;
  const hasSummary = hiddenMatches > 0 || hiddenLines > 0;
  const push = (line) => out.push(safeTruncateToWidth(line, safeWidth, "\u2026"));
  selected.forEach((entry, index) => {
    const isLast = index === selected.length - 1 && !hasSummary;
    const branchPrefix = `${indent}${dimLine(isLast ? "\u2514\u2500" : "\u251C\u2500")} `;
    const continuePrefix = `${indent}${isLast ? "  " : dimLine("\u2502 ")} `;
    const lineNumberWidth = entry.group.lines.reduce(
      (max, line) => Math.max(max, String(line.line).length),
      1
    );
    if (multiFile) {
      const rawLabel = options.withIcons ? `${fileIcon(entry.group.file)} ${entry.group.file}` : entry.group.file;
      const styledLabel = theme.fg("accent", rawLabel);
      push(`${branchPrefix}${options.link?.(styledLabel, entry.group.file) ?? styledLabel}`);
      for (const line of entry.lines) {
        const styledLine = formatMatchRow(theme, line, lineNumberWidth);
        push(`${continuePrefix}${options.link?.(styledLine, line.file, line.line) ?? styledLine}`);
      }
      return;
    }
    entry.lines.forEach((line, lineIndex) => {
      const styledLine = formatMatchRow(theme, line, lineNumberWidth);
      const linked = options.link?.(styledLine, line.file, line.line) ?? styledLine;
      push(`${lineIndex === 0 ? branchPrefix : continuePrefix}${linked}`);
    });
  });
  if (hasSummary && out.length - 1 < lineBudget) {
    push(`${indent}${dimLine("\u2514\u2500")} ${moreSummary(theme, hiddenMatches, hiddenLines, hiddenFiles)}`);
  }
  return out;
}
function pluralForm(noun, count) {
  if (count === 1) return noun;
  return /(s|x|z|ch|sh)$/i.test(noun) ? `${noun}es` : `${noun}s`;
}

// extension-src/omp-theme/shared/viewport.ts
var presentationTui;
function notePresentationTui(candidate) {
  if (!candidate || typeof candidate !== "object") return;
  const tui = candidate;
  if (tui.mode === void 0 && !Array.isArray(tui.previousLines) && typeof tui.previousViewportTop !== "number") return;
  presentationTui = tui;
}
function clearPresentationTui() {
  presentationTui = void 0;
}
function getPresentationTui() {
  return presentationTui;
}
function paintedRowCount() {
  const lines = presentationTui?.previousLines;
  return Array.isArray(lines) ? lines.length : void 0;
}
function trackedViewportTop() {
  const tui = presentationTui;
  if (!tui || tui.mode === "fullscreen") return void 0;
  const top = tui.previousViewportTop;
  return typeof top === "number" && Number.isFinite(top) ? top : void 0;
}
function topRowScrolledAway() {
  const top = trackedViewportTop();
  return top !== void 0 && top > 0;
}

// extension-src/omp-theme/features/tools/boxed/render-viewport.ts
var DOCK_ALLOWANCE_ROWS = 12;
var rowHints = /* @__PURE__ */ new Map();
var frozenPanels = /* @__PURE__ */ new Map();
function notePresentationTui2(candidate) {
  notePresentationTui(candidate);
}
function clearPresentationTui2() {
  clearPresentationTui();
}
function noteToolRowHint(toolCallId) {
  if (!toolCallId || rowHints.has(toolCallId)) return;
  const rows = paintedRowCount();
  if (rows !== void 0) rowHints.set(toolCallId, rows);
}
function resetToolRowHints() {
  rowHints.clear();
  frozenPanels.clear();
}
function toolRowPlacement(toolCallId) {
  if (!getPresentationTui()) return "unknown";
  const viewportTop = trackedViewportTop();
  if (viewportTop === void 0) return getPresentationTui()?.mode === "fullscreen" ? "inside" : "unknown";
  const hint = rowHints.get(toolCallId);
  if (hint === void 0) return "unknown";
  return hint - DOCK_ALLOWANCE_ROWS >= viewportTop ? "inside" : "above";
}
function panelLines(toolCallId, variant, width, render) {
  if (!toolCallId) return render();
  const key = JSON.stringify([toolCallId, variant]);
  const frozen = frozenPanels.get(key);
  if (frozen && frozen.width === width && toolRowPlacement(toolCallId) === "above") return frozen.lines;
  const lines = render();
  if (frozen) frozenPanels.delete(key);
  frozenPanels.set(key, { width, lines });
  return lines;
}

// extension-src/omp-theme/features/tools/boxed/session-config.ts
var sessionToolsConfig = {
  maxCollapsedLines: 10,
  maxExpandedLines: 50,
  dimOutput: false,
  showElapsed: true,
  batchOpenGlyph: "\u25CF",
  nerdFonts: false,
  collapseAfterTurn: true,
  collapseMutatingTools: false,
  batchQuietCalls: true
};
function setToolsRenderConfig(config) {
  sessionToolsConfig = { ...sessionToolsConfig, ...config };
}
function getToolsRenderConfig() {
  return sessionToolsConfig;
}
var STARTED_AT_KEY = "__piOmpThemeStartedAt";
var ENDED_AT_KEY = "__piOmpThemeEndedAt";
var RESULT_SEEN_KEY = "__piOmpThemeResultSeen";
var TICKER_KEY = "__piOmpThemeElapsedTicker";
function recordExecutionStarted(state, executionStarted) {
  if (!executionStarted || !state || typeof state !== "object") return;
  if (typeof state[STARTED_AT_KEY] !== "number") state[STARTED_AT_KEY] = performance.now();
}
function recordExecutionEnded(state) {
  if (!state || typeof state !== "object") return;
  if (typeof state[ENDED_AT_KEY] !== "number") state[ENDED_AT_KEY] = performance.now();
}
function getStateElapsedMs(state) {
  if (!state || typeof state !== "object") return void 0;
  const started = state[STARTED_AT_KEY];
  if (typeof started !== "number") return void 0;
  const ended = state[ENDED_AT_KEY];
  if (typeof ended === "number") return Math.max(0, ended - started);
  return Math.max(0, performance.now() - started);
}
function isResultSeen(state) {
  return Boolean(state && typeof state === "object" && state[RESULT_SEEN_KEY] === true);
}
function markResultSeen(state) {
  if (!state || typeof state !== "object") return;
  state[RESULT_SEEN_KEY] = true;
}
var tickerStates = /* @__PURE__ */ new Set();
function startElapsedTicker(state, invalidate, toolCallId) {
  if (!state || typeof state !== "object") return;
  if (state[TICKER_KEY] !== void 0) return;
  state[TICKER_KEY] = setInterval(() => {
    if (toolCallId && toolRowPlacement(toolCallId) === "above") {
      stopElapsedTicker(state);
      return;
    }
    invalidate();
  }, 1e3);
  tickerStates.add(state);
}
function stopElapsedTicker(state) {
  if (!state || typeof state !== "object") return;
  const handle = state[TICKER_KEY];
  if (handle !== void 0) clearInterval(handle);
  delete state[TICKER_KEY];
  tickerStates.delete(state);
}
function stopAllElapsedTickers() {
  for (const state of tickerStates) {
    const handle = state[TICKER_KEY];
    if (handle !== void 0) clearInterval(handle);
    delete state[TICKER_KEY];
    recordExecutionEnded(state);
  }
  tickerStates.clear();
}

// extension-src/omp-theme/features/tools/boxed/batch.ts
var BATCHABLE_TOOL_NAMES = /* @__PURE__ */ new Set(["read", "ls", "find"]);
function isBatchableTool(toolName) {
  if (!getToolsRenderConfig().batchQuietCalls) return false;
  return typeof toolName === "string" && BATCHABLE_TOOL_NAMES.has(toolName);
}
var BATCH_TREE_HEAD_LIMIT = 5;
var BATCH_MEMBER_FILE_HEAD_LIMIT = 4;
var BATCH_ERROR_LINES = 2;
var BATCH_TREE_INDENT = TREE_INDENT;
var EMPTY_BATCH_COMPONENT = Object.freeze({
  invalidate() {
  },
  render() {
    return [];
  }
});
var activeBatch;
var batchByCallId = /* @__PURE__ */ new Map();
function closeActiveBatch() {
  if (!activeBatch) return;
  activeBatch.closed = true;
  activeBatch = void 0;
}
function resetBatchRegistry() {
  activeBatch = void 0;
  batchByCallId.clear();
}
function createBatch(meta, leaderId, detail, opts = {}) {
  const batch = {
    meta,
    leaderId,
    startedAt: performance.now(),
    closed: false,
    members: [
      {
        toolCallId: leaderId,
        detail,
        status: "pending",
        isError: false,
        ...opts.pattern ? { pattern: opts.pattern } : {},
        ...opts.pathLabel ? { pathLabel: opts.pathLabel } : {}
      }
    ]
  };
  activeBatch = batch;
  batchByCallId.set(leaderId, batch);
  return batch;
}
function registerBatchCall(meta, detail, context, opts = {}) {
  const existing = batchByCallId.get(context.toolCallId);
  if (existing) {
    const member2 = existing.members.find((entry) => entry.toolCallId === context.toolCallId);
    if (member2) {
      member2.detail = detail;
      if (opts.pattern !== void 0) member2.pattern = opts.pattern;
      if (opts.pathLabel !== void 0) member2.pathLabel = opts.pathLabel;
    }
    return { batch: existing, isLeader: existing.leaderId === context.toolCallId };
  }
  const current = activeBatch;
  if (!current || current.closed || current.meta.toolName !== meta.toolName) {
    closeActiveBatch();
    return { batch: createBatch(meta, context.toolCallId, detail, opts), isLeader: true };
  }
  const member = {
    toolCallId: context.toolCallId,
    detail,
    status: "pending",
    isError: false,
    ...opts.pattern ? { pattern: opts.pattern } : {},
    ...opts.pathLabel ? { pathLabel: opts.pathLabel } : {}
  };
  current.members.push(member);
  batchByCallId.set(context.toolCallId, current);
  return { batch: current, isLeader: false };
}
function registerBatchResult(meta, data, context) {
  const batch = batchByCallId.get(context.toolCallId);
  if (!batch || batch.meta.toolName !== meta.toolName) return { batch: void 0, isLeader: false };
  const member = batch.members.find((entry) => entry.toolCallId === context.toolCallId);
  if (member) {
    member.status = data.isPartial ? "running" : "done";
    member.isError = !data.isPartial && data.isError;
    if (member.isError && data.errorText !== void 0) member.errorText = data.errorText;
    else delete member.errorText;
    if (data.entries !== void 0) member.outputEntries = data.entries;
  }
  if (batch.completedAt === void 0 && batch.members.every((entry) => entry.status === "done")) {
    batch.completedAt = performance.now();
  }
  return { batch, isLeader: batch.leaderId === context.toolCallId };
}
function batchStatus(batch) {
  let done = 0;
  let failed = 0;
  for (const member of batch.members) {
    if (member.status !== "done") continue;
    done++;
    if (member.isError) failed++;
  }
  const total = batch.members.length;
  const allDone = done === total;
  return {
    total,
    done,
    failed,
    allDone,
    elapsedMs: allDone && batch.completedAt !== void 0 ? batch.completedAt - batch.startedAt : void 0
  };
}
function formatElapsed(theme, elapsedMs) {
  return theme.fg("dim", ` \xB7 ${(elapsedMs / 1e3).toFixed(2)}s`);
}
function bold(theme, text2) {
  return typeof theme?.bold === "function" ? theme.bold(text2) : text2;
}
function isOutputTool(meta) {
  return meta.toolName === "ls" || meta.toolName === "find";
}
function formatBatchHeader(theme, batch, status) {
  const label = `${batch.meta.headerLabel ?? batch.meta.label} (${status.total})`;
  if (status.failed > 0) return theme.fg("error", bold(theme, `\u2718 ${label} \xB7 ${status.failed} failed`));
  if (status.allDone) {
    const glyph = getToolsRenderConfig().batchOpenGlyph;
    const elapsed = status.elapsedMs === void 0 ? "" : formatElapsed(theme, status.elapsedMs);
    return `${theme.fg("text", bold(theme, `${glyph} ${label}`))}${elapsed}`;
  }
  if (status.done > 0)
    return `${theme.fg("text", bold(theme, `\u25CC ${label}`))}${theme.fg("dim", ` \xB7 ${status.done}/${status.total}`)}`;
  return bold(theme, formatToolTitlePrefix(theme, label));
}
function memberGlyph(theme, member, show) {
  if (!show) return "";
  if (member.isError) return theme.fg("error", "\u2718");
  if (member.status === "done") return theme.fg("success", "\u2713");
  return theme.fg("text", "\u25CC");
}
function renderErrorLines(theme, errorText, width) {
  const raw = stripAnsi(errorText).split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  if (raw.length === 0) return [];
  const prefix = `${dimLine("  \u2502  ")}`;
  const out = raw.slice(0, BATCH_ERROR_LINES).map((line) => safeTruncateToWidth(`${prefix}${theme.fg("error", line)}`, Math.max(1, width), "\u2026"));
  if (raw.length > BATCH_ERROR_LINES)
    out.push(safeTruncateToWidth(`${prefix}${theme.fg("error", "\u2026")}`, Math.max(1, width), "\u2026"));
  return out;
}
function renderBatchTree(theme, batch, status, width) {
  const showGlyphs = !status.allDone || status.failed > 0;
  const visible = batch.members.slice(0, BATCH_TREE_HEAD_LIMIT);
  const more = batch.members.length - visible.length;
  const lastIndex = visible.length - 1;
  const out = [];
  for (let i = 0; i < visible.length; i++) {
    const member = visible[i];
    if (!member) continue;
    const branch = i < lastIndex || more > 0 ? "\u251C\u2500" : "\u2514\u2500";
    const glyph = memberGlyph(theme, member, showGlyphs);
    const pathColor = member.isError ? "error" : member.status === "done" ? "accent" : "text";
    const line = `${BATCH_TREE_INDENT}${dimLine(branch)}${glyph ? ` ${glyph}` : ""} ${theme.fg(pathColor, member.detail)}`;
    out.push(safeTruncateToWidth(line, Math.max(1, width), "\u2026"));
    if (member.isError && member.errorText) out.push(...renderErrorLines(theme, member.errorText, width));
  }
  if (more > 0) {
    out.push(
      safeTruncateToWidth(
        `${BATCH_TREE_INDENT}${dimLine("\u2514\u2500")} ${theme.fg("dim", `${more} more`)}`,
        Math.max(1, width),
        "\u2026"
      )
    );
  }
  return out;
}
function formatLoneOutputHeader(theme, meta, member) {
  const label = meta.headerLabel ?? meta.label;
  const count = member.outputEntries?.length ?? 0;
  const filesPart = theme.fg("accent", `${count} ${count === 1 ? "file" : "files"}`);
  const patternPart = meta.toolName === "find" && member.pattern ? `${theme.fg("text", member.pattern)} ` : "";
  const pathPart = member.pathLabel ? theme.fg("dim", ` \xB7 in ${member.pathLabel}`) : "";
  const unicodeIcon = meta.toolName === "ls" ? "\u25A4" : SEARCH_ICON_UNICODE;
  const icon = `${getToolsRenderConfig().nerdFonts ? SEARCH_ICON : unicodeIcon} `;
  return `${icon}${bold(theme, `${label}:`)} ${patternPart}${filesPart}${pathPart}`;
}
function renderMemberSubtree(theme, member, isLastMember, width) {
  const safeWidth = Math.max(1, width);
  const trunk = isLastMember ? " " : dimLine("\u2502");
  const out = [];
  const entries = member.outputEntries ?? [];
  if (member.isError) {
    const line = `${BATCH_TREE_INDENT}${dimLine(isLastMember ? "\u2514\u2500" : "\u251C\u2500")} ${theme.fg("error", "\u2718")} ${theme.fg("error", member.pathLabel ?? member.detail)}`;
    out.push(safeTruncateToWidth(line, safeWidth, "\u2026"));
    if (member.errorText) out.push(...renderErrorLines(theme, member.errorText, width));
    return out;
  }
  if (member.status !== "done" || member.outputEntries === void 0) {
    const glyph = member.status === "done" ? theme.fg("success", "\u2713") : theme.fg("text", "\u25CC");
    const line = `${BATCH_TREE_INDENT}${dimLine(isLastMember ? "\u2514\u2500" : "\u251C\u2500")} ${glyph} ${theme.fg("text", member.pathLabel ?? member.detail)}`;
    out.push(safeTruncateToWidth(line, safeWidth, "\u2026"));
    return out;
  }
  const countLabel = theme.fg("dim", ` \xB7 ${entries.length} ${pluralForm("file", entries.length)}`);
  const headerLine = `${BATCH_TREE_INDENT}${dimLine(isLastMember ? "\u2514\u2500" : "\u251C\u2500")} ${theme.fg("accent", member.pathLabel ?? member.detail)}${countLabel}`;
  out.push(safeTruncateToWidth(headerLine, safeWidth, "\u2026"));
  const visible = entries.slice(0, BATCH_MEMBER_FILE_HEAD_LIMIT);
  const more = entries.length - visible.length;
  const lastIndex = visible.length - 1;
  const icons = getToolsRenderConfig().nerdFonts;
  for (let i = 0; i < visible.length; i++) {
    const entry = visible[i] ?? "";
    const label = icons && entry ? `${fileIcon(entry)} ${entry}` : entry;
    const branch = i < lastIndex || more > 0 ? "\u251C\u2500" : "\u2514\u2500";
    const line = `${BATCH_TREE_INDENT}${trunk}${TREE_CHILD_INDENT}${dimLine(branch)} ${theme.fg("toolOutput", label)}`;
    out.push(safeTruncateToWidth(line, safeWidth, "\u2026"));
  }
  if (more > 0) {
    const line = `${BATCH_TREE_INDENT}${trunk}${TREE_CHILD_INDENT}${dimLine("\u2514\u2500")} ${theme.fg("dim", `\u2026 ${more} more ${pluralForm("file", more)}`)}`;
    out.push(safeTruncateToWidth(line, safeWidth, "\u2026"));
  }
  return out;
}
function renderOutputBatchPanel(theme, batch, status, width) {
  const safeWidth = Math.max(1, width);
  if (batch.members.length === 1) {
    const member = batch.members[0];
    if (member && member.outputEntries !== void 0 && !member.isError) {
      const header2 = safeTruncateToWidth(formatLoneOutputHeader(theme, batch.meta, member), safeWidth, "\u2026");
      return renderOutputTree(theme, header2, member.outputEntries, safeWidth, {
        headLimit: OUTPUT_TREE_HEAD_LIMIT,
        moreUnit: "file",
        entryColor: "toolOutput",
        indent: BATCH_TREE_INDENT,
        withIcons: getToolsRenderConfig().nerdFonts
      });
    }
  }
  const header = safeTruncateToWidth(formatBatchHeader(theme, batch, status), safeWidth, "\u2026");
  const out = [header];
  const visible = batch.members.slice(0, BATCH_TREE_HEAD_LIMIT);
  const more = batch.members.length - visible.length;
  visible.forEach((member, index) => {
    const isLast = index === visible.length - 1 && more <= 0;
    out.push(...renderMemberSubtree(theme, member, isLast, safeWidth));
  });
  if (more > 0) {
    out.push(
      safeTruncateToWidth(`${BATCH_TREE_INDENT}${dimLine("\u2514\u2500")} ${theme.fg("dim", `${more} more`)}`, safeWidth, "\u2026")
    );
  }
  return out;
}
function isLoneRead(batch) {
  return batch.meta.toolName === "read" && batch.members.length === 1;
}
function renderLoneReadPanel(theme, batch, status, width) {
  const member = batch.members[0];
  if (!member) return [];
  const prefix = bold(theme, formatToolTitlePrefix(theme, batch.meta.label));
  const glyph = memberGlyph(theme, member, !status.allDone || status.failed > 0);
  const pathColor = member.isError ? "error" : member.status === "done" ? "accent" : "text";
  const out = [
    safeTruncateToWidth(
      `${prefix}${glyph ? ` ${glyph}` : ""} ${theme.fg(pathColor, member.detail)}`,
      Math.max(1, width),
      "\u2026"
    )
  ];
  if (member.isError && member.errorText) out.push(...renderErrorLines(theme, member.errorText, width));
  return out;
}
function renderBatchPanelLines(theme, batch, status, width) {
  if (isLoneRead(batch)) return renderLoneReadPanel(theme, batch, status, width);
  if (isOutputTool(batch.meta) && batch.members.some((member) => member.outputEntries !== void 0)) {
    return renderOutputBatchPanel(theme, batch, status, width);
  }
  const header = safeTruncateToWidth(formatBatchHeader(theme, batch, status), Math.max(1, width), "\u2026");
  const lines = [header];
  lines.push(...renderBatchTree(theme, batch, status, width));
  return lines;
}
function renderBatchAwareCall(theme, batch) {
  return {
    invalidate() {
    },
    render(width) {
      return renderBatchPanelLines(theme, batch, batchStatus(batch), width);
    }
  };
}
function emptyBatchResult() {
  return {
    invalidate() {
    },
    render() {
      return [];
    }
  };
}

// extension-src/omp-theme/features/tools/boxed/turn-summary.ts
var MUTATING_TOOLS = /* @__PURE__ */ new Set(["edit", "write", "quick_edit", "substitute_edit", "target_edit"]);
function isMutatingTool(toolName) {
  return MUTATING_TOOLS.has(toolName);
}
var TURN_COLLAPSE_EXEMPT_TOOLS = /* @__PURE__ */ new Set(["ask_user_question"]);
function mutatingCollapses() {
  return getToolsRenderConfig().collapseMutatingTools;
}
function isTurnCollapsibleTool(toolName) {
  if (TURN_COLLAPSE_EXEMPT_TOOLS.has(toolName)) return false;
  return !isMutatingTool(toolName) || mutatingCollapses();
}
var memberByCallId = /* @__PURE__ */ new Map();
var invalidateByCallId = /* @__PURE__ */ new Map();
function resetTurnRegistry() {
  memberByCallId.clear();
  invalidateByCallId.clear();
  resetToolRowHints();
}
function toolCallsOf(message) {
  if (!message || typeof message !== "object") return [];
  const content = message.content;
  if (!Array.isArray(content)) return [];
  const calls = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const candidate = item;
    if (candidate.type === "toolCall") calls.push(candidate);
  }
  return calls;
}
function registerTurn(calls, isErrorById, ended) {
  if (calls.length === 0) return void 0;
  const complete = calls.every((call) => typeof call.id === "string" && isErrorById.has(call.id));
  const members = calls.map((call) => {
    const toolCallId = String(call.id ?? "");
    return {
      toolCallId,
      toolName: typeof call.name === "string" ? call.name : "tool",
      hasResult: isErrorById.has(toolCallId),
      isError: isErrorById.get(toolCallId) === true
    };
  });
  const leader = members.find((member) => !member.isError && isTurnCollapsibleTool(member.toolName));
  const turn = {
    leaderId: leader?.toolCallId ?? "",
    ended: ended && complete,
    members: Object.freeze(members)
  };
  for (const member of members) memberByCallId.set(member.toolCallId, { turn, member });
  return turn;
}
var currentRun;
function beginAgentRun() {
  currentRun = void 0;
}
function registerTurnFromMessage(message, toolResults) {
  const calls = toolCallsOf(message);
  if (calls.length === 0) return;
  const isErrorById = /* @__PURE__ */ new Map();
  for (const result of toolResults) {
    if (typeof result?.toolCallId !== "string") continue;
    isErrorById.set(result.toolCallId, result.isError === true);
  }
  const newMembers = calls.map((call) => {
    const toolCallId = String(call.id ?? "");
    return {
      toolCallId,
      toolName: typeof call.name === "string" ? call.name : "tool",
      hasResult: isErrorById.has(toolCallId),
      isError: isErrorById.get(toolCallId) === true
    };
  });
  const leader = newMembers.find((member) => !member.isError && isTurnCollapsibleTool(member.toolName));
  if (!currentRun) {
    currentRun = {
      leaderId: leader?.toolCallId ?? "",
      ended: false,
      members: Object.freeze(newMembers)
    };
  } else {
    if (currentRun.leaderId === "" && leader) currentRun.leaderId = leader.toolCallId;
    currentRun.members = Object.freeze([...currentRun.members, ...newMembers]);
  }
  for (const member of newMembers) memberByCallId.set(member.toolCallId, { turn: currentRun, member });
}
function finishAgentRun() {
  const run = currentRun;
  currentRun = void 0;
  if (!run) return void 0;
  if (run.members.every((member) => member.hasResult)) run.ended = true;
  return run.ended ? run : void 0;
}
function rebuildTurnRegistryFromEntries(entries) {
  memberByCallId.clear();
  if (!Array.isArray(entries)) return;
  const isErrorById = /* @__PURE__ */ new Map();
  const resultById = /* @__PURE__ */ new Set();
  const runs = [];
  let current;
  const closeRun = () => {
    if (current && current.calls.length > 0) runs.push(current);
    current = void 0;
  };
  entries.forEach((entry) => {
    if (entry?.type !== "message") return;
    const message = entry.message;
    if (message?.role === "toolResult" && typeof message.toolCallId === "string") {
      resultById.add(message.toolCallId);
      isErrorById.set(message.toolCallId, message.isError === true);
    } else if (message?.role === "assistant") {
      if (!current) current = { calls: [], lastStopReason: void 0, followedByUser: false };
      const calls = toolCallsOf(message);
      current.calls.push(...calls);
      if (typeof message.stopReason === "string" && message.stopReason !== "")
        current.lastStopReason = message.stopReason;
    } else if (message?.role === "user") {
      if (current) {
        current.followedByUser = true;
        closeRun();
      } else {
        closeRun();
      }
    }
  });
  closeRun();
  for (const run of runs) {
    const complete = run.calls.every((call) => typeof call.id === "string" && resultById.has(call.id));
    const ended = complete && (run.followedByUser || run.lastStopReason !== void 0);
    registerTurn(run.calls, isErrorById, ended);
  }
}
function getTurnEntry(toolCallId) {
  return memberByCallId.get(toolCallId);
}
function noteTurnMemberRender(toolCallId, invalidate) {
  if (typeof invalidate !== "function") return;
  invalidateByCallId.set(toolCallId, invalidate);
}
function invalidateTurnMembers(turn) {
  if (turn.leaderId && toolRowPlacement(turn.leaderId) === "above") return false;
  for (const member of turn.members) {
    const invalidate = invalidateByCallId.get(member.toolCallId);
    if (!invalidate) continue;
    try {
      invalidate();
    } catch {
      invalidateByCallId.delete(member.toolCallId);
    }
  }
  return true;
}
function noteTurnMemberElapsed(toolCallId, elapsedMs) {
  if (elapsedMs === void 0) return;
  const entry = memberByCallId.get(toolCallId);
  if (!entry || entry.member.elapsedMs !== void 0) return;
  entry.member.elapsedMs = elapsedMs;
}
var TURN_SUMMARY_STYLE = Object.freeze({
  read: { verb: "Read", unit: "file" },
  bash: { verb: "ran", unit: "shell command" },
  ls: { verb: "Listed", unit: "path" },
  find: { verb: "Found", unit: "file" },
  grep: { verb: "Grepped", unit: "pattern" },
  edit: { verb: "Edited", unit: "file" },
  write: { verb: "Wrote", unit: "file" },
  quick_edit: { verb: "Edited", unit: "file" },
  substitute_edit: { verb: "Edited", unit: "file" },
  target_edit: { verb: "Edited", unit: "file" }
});
function turnSummaryParts(turn) {
  const counts = /* @__PURE__ */ new Map();
  const order = [];
  let failedCount = 0;
  let elapsedMs;
  for (const member of turn.members) {
    if (member.isError) {
      failedCount++;
      continue;
    }
    if (!isTurnCollapsibleTool(member.toolName)) continue;
    if (member.elapsedMs !== void 0) elapsedMs = (elapsedMs ?? 0) + member.elapsedMs;
    const existing = counts.get(member.toolName);
    if (existing === void 0) {
      counts.set(member.toolName, 1);
      order.push(member.toolName);
    } else counts.set(member.toolName, existing + 1);
  }
  const parts = order.map((toolName) => {
    const count = counts.get(toolName) ?? 0;
    const style = TURN_SUMMARY_STYLE[toolName];
    return style ? `${style.verb} ${count} ${pluralForm(style.unit, count)}` : `used ${count} ${toolName}`;
  });
  return { parts, failedCount, elapsedMs };
}
function formatTurnSummaryLine(theme, turn) {
  const summary = turnSummaryParts(turn);
  const parts = summary.parts.join(", ");
  let line = `${theme.fg("dim", `\u2794 ${parts}`)}`;
  if (summary.failedCount > 0)
    line += theme.fg("error", ` \xB7 ${summary.failedCount} ${pluralForm("failure", summary.failedCount)}`);
  if (summary.elapsedMs !== void 0) line += theme.fg("dim", ` \xB7 ${(summary.elapsedMs / 1e3).toFixed(2)}s`);
  return line;
}
function renderTurnSummaryCall(theme, turn) {
  return {
    invalidate() {
    },
    render(width) {
      return [safeTruncateToWidth(formatTurnSummaryLine(theme, turn), Math.max(1, width), "\u2026")];
    }
  };
}
function emptyTurnResult() {
  return {
    invalidate() {
    },
    render() {
      return [];
    }
  };
}

// extension-src/omp-theme/features/tools/boxed/bash.ts
import { resolve as resolve3 } from "path";
import { pathToFileURL } from "url";
import { highlightCode as highlightCode2 } from "@earendil-works/pi-coding-agent";
import { getCapabilities, hyperlink } from "@earendil-works/pi-tui";

// extension-src/omp-theme/features/tools/boxed/command-shape.ts
var BASH_PREFIX_COMMANDS = /* @__PURE__ */ new Set(["sudo", "env", "time", "nice", "nohup", "command", "stdbuf", "ionice", "watch"]);
var BASH_SHELL_META_CHARS = /* @__PURE__ */ new Set(["<", ">", "(", ")", "`"]);
function tokenizeCommandLine(line) {
  const tokens = [];
  let current = "";
  let inToken = false;
  let quote = null;
  let hasMeta = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i] ?? "";
    if (quote) {
      if (char === "\\" && quote === '"') {
        current += line[++i] ?? "";
        continue;
      }
      if (char === quote) {
        quote = null;
        continue;
      }
      current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      inToken = true;
      continue;
    }
    if (char === " " || char === "	") {
      if (inToken) {
        tokens.push(current);
        current = "";
        inToken = false;
      }
      continue;
    }
    if (BASH_SHELL_META_CHARS.has(char) || char === "$" && (line[i + 1] ?? "") === "(") {
      hasMeta = true;
      continue;
    }
    current += char;
    inToken = true;
  }
  if (quote) return null;
  if (inToken) tokens.push(current);
  return { tokens, hasMeta };
}
function isHeadOrTailTail(tokens) {
  if (tokens.length === 0 || tokens[0] !== "head" && tokens[0] !== "tail") return false;
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i] ?? "";
    if (token === "-n") continue;
    if (/^\d+$/.test(token)) continue;
    if (/^-\d+$/.test(token)) continue;
    return false;
  }
  return true;
}
function parseSimpleBashCommand(command, options = {}) {
  const commandText = String(command ?? "").trim();
  if (!commandText || commandText.includes("\n")) return null;
  const tokenized = tokenizeCommandLine(commandText);
  if (!tokenized || tokenized.hasMeta || tokenized.tokens.length === 0) return null;
  let tokens = tokenized.tokens;
  if (options.allowTrailingTruncationPipe) {
    const pipes = tokens.flatMap((token, i) => token === "|" ? [i] : []);
    if (pipes.length > 0) {
      if (pipes.length > 1) return null;
      const last = pipes[0] ?? -1;
      if (!isHeadOrTailTail(tokens.slice(last + 1))) return null;
      tokens = tokens.slice(0, last);
    }
  } else if (tokens.includes("|")) {
    return null;
  }
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[index] ?? "")) index++;
  while (index < tokens.length && BASH_PREFIX_COMMANDS.has(tokens[index] ?? "")) index++;
  let cdDir;
  while (tokens[index] === "cd" && index + 2 < tokens.length && tokens[index + 1] !== void 0 && (tokens[index + 2] === "&&" || tokens[index + 2] === ";")) {
    cdDir = tokens[index + 1];
    index += 3;
  }
  const rest = tokens.slice(index);
  if (rest.length === 0 || rest.some((token) => token === "&&" || token === ";" || token === "&")) return null;
  return { tokens: rest, ...cdDir !== void 0 ? { cdDir } : {} };
}

// extension-src/omp-theme/features/tools/boxed/gh.ts
var GH_REPO_VALUE_FLAGS = /* @__PURE__ */ new Set(["-R", "--repo"]);
function stripRepoFlags(args) {
  const out = [];
  for (let i = 0; i < args.length; ) {
    const token = args[i] ?? "";
    if (GH_REPO_VALUE_FLAGS.has(token)) {
      i += 2;
      continue;
    }
    if (token.startsWith("--repo=")) {
      i += 1;
      continue;
    }
    out.push(token);
    i += 1;
  }
  return out;
}
function findJobId(args) {
  for (let i = 0; i < args.length; i++) {
    const token = args[i] ?? "";
    if (token === "--job") return args[i + 1];
    const attached = /^--job=(.+)$/.exec(token);
    if (attached) return attached[1];
  }
  return void 0;
}
function classifyGhCommand(command) {
  const shape2 = parseSimpleBashCommand(command);
  if (!shape2) return null;
  const rest = shape2.tokens;
  if ((rest[0] ?? "").split("/").pop() !== "gh") return null;
  const args = rest.slice(1);
  if (args.length === 0) return null;
  const tokens = stripRepoFlags(args);
  const commandWord = tokens[0];
  const subcommand = tokens[1];
  if (commandWord === "pr") {
    if (subcommand === "list") return { kind: "pr-list" };
    if (subcommand === "view") return { kind: "pr-view" };
    if (subcommand === "checks") return { kind: "pr-checks" };
    if (subcommand === "create") return { kind: "pr-create" };
    return null;
  }
  if (commandWord === "issue") {
    if (subcommand === "list") return { kind: "issue-list" };
    if (subcommand === "view") return { kind: "issue-view" };
    return null;
  }
  if (commandWord === "run") {
    if (subcommand === "list") return { kind: "run-list" };
    if (subcommand === "view") {
      const jobId = findJobId(args);
      if (jobId !== void 0) return { kind: "run-job", jobId };
      return { kind: "run-view" };
    }
    return null;
  }
  return null;
}
var GH_STATES = /* @__PURE__ */ new Set(["OPEN", "CLOSED", "MERGED"]);
var GH_CHECK_STATES = /* @__PURE__ */ new Set([
  "pass",
  "fail",
  "pending",
  "skipping",
  "neutral",
  "cancelled",
  "timed_out",
  "startup_failure",
  "stale",
  "action_required"
]);
function probeJson(text2) {
  const trimmed = text2.trimStart();
  const first = trimmed[0];
  if (first !== "{" && first !== "[") return { notJson: true };
  try {
    return { json: JSON.parse(trimmed) };
  } catch {
    return null;
  }
}
function asString(value) {
  return typeof value === "string" ? value : void 0;
}
function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function authorOf(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return asString(value.login);
  return void 0;
}
function nameList(value, field = "login") {
  if (!Array.isArray(value) || value.length === 0) return void 0;
  const names = value.map((item) => item && typeof item === "object" ? asString(item[field]) : void 0).filter((name) => typeof name === "string");
  return names.length > 0 ? names.join(", ") : void 0;
}
function parseListTable(text2, kind) {
  const rows = [];
  for (const rawLine of text2.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trimEnd();
    if (line === "") continue;
    const fields = line.split("	");
    if (fields.length < 4) return null;
    const numberField = fields[0] ?? "";
    if (!/^\d+$/.test(numberField)) return null;
    const title = fields[1] ?? "";
    let stateIndex = -1;
    for (let i = 2; i < fields.length - 1; i++) {
      if (GH_STATES.has((fields[i] ?? "").toUpperCase())) {
        stateIndex = i;
        break;
      }
    }
    if (stateIndex < 0) return null;
    const state = (fields[stateIndex] ?? "").toUpperCase();
    const branch = kind === "pr-list" ? fields[2] ?? "" : "";
    rows.push({
      number: Number(numberField),
      title,
      ...branch ? { branch } : {},
      state
    });
  }
  return { kind, rows };
}
function parseListJson(json, kind) {
  if (!Array.isArray(json)) return null;
  const rows = [];
  for (const item of json) {
    if (!item || typeof item !== "object") return null;
    const obj = item;
    const number = asNumber(obj.number);
    if (number === void 0) return null;
    const title = asString(obj.title);
    if (title === void 0) return null;
    const stateRaw = asString(obj.state);
    if (stateRaw === void 0 || !GH_STATES.has(stateRaw.toUpperCase())) return null;
    const branch = asString(obj.headRefName);
    rows.push({ number, title, state: stateRaw.toUpperCase(), ...branch ? { branch } : {} });
  }
  return { kind, rows };
}
function parseGhList(text2, kind) {
  const probe = probeJson(text2);
  if (probe === null) return null;
  if ("notJson" in probe) return parseListTable(text2, kind);
  return parseListJson(probe.json, kind);
}
var VIEW_FIELD_LINE = /^([a-zA-Z][a-zA-Z0-9-]*?):\t(.*)$/;
function parseViewRich(text2, kind) {
  const lines = text2.replace(/\r/g, "").split("\n");
  const fields = {};
  let bodyStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line === "--") {
      bodyStart = i + 1;
      break;
    }
    const match = VIEW_FIELD_LINE.exec(line);
    if (!match) {
      if (line.trim() === "") continue;
      return null;
    }
    const key = match[1] ?? "";
    const value = match[2] ?? "";
    if (fields[key] === void 0) fields[key] = value;
  }
  const title = fields.title;
  const stateRaw = fields.state;
  if (!title || !stateRaw) return null;
  const state = stateRaw.toUpperCase();
  const body = bodyStart >= 0 ? lines.slice(bodyStart).join("\n").replace(/\s+$/u, "") : void 0;
  const number = /^\d+$/.test(fields.number ?? "") ? Number(fields.number) : void 0;
  const additions = /^\d+$/.test(fields.additions ?? "") ? Number(fields.additions) : void 0;
  const deletions = /^\d+$/.test(fields.deletions ?? "") ? Number(fields.deletions) : void 0;
  return {
    kind,
    title,
    state,
    ...fields.author ? { author: fields.author } : {},
    ...number !== void 0 ? { number } : {},
    ...fields.url ? { url: fields.url } : {},
    ...additions !== void 0 ? { additions } : {},
    ...deletions !== void 0 ? { deletions } : {},
    ...fields.labels ? { labels: fields.labels } : {},
    ...fields.reviewers ? { reviewers: fields.reviewers } : {},
    ...body?.trim() ? { body } : {}
  };
}
function parseViewJson(json, kind) {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json;
  const title = asString(o.title);
  const stateRaw = asString(o.state);
  if (!title || !stateRaw || !GH_STATES.has(stateRaw.toUpperCase())) return null;
  const state = stateRaw.toUpperCase();
  const author = authorOf(o.author);
  const number = asNumber(o.number);
  const url = asString(o.url);
  const additions = asNumber(o.additions);
  const deletions = asNumber(o.deletions);
  const changedFiles = asNumber(o.changedFiles);
  const baseRefName = asString(o.baseRefName);
  const headRefName = asString(o.headRefName);
  const mergeable = asString(o.mergeable);
  const reviewDecision = asString(o.reviewDecision);
  const reviewers = nameList(o.reviewRequests) ?? nameList(o.reviews);
  const body = asString(o.body);
  return {
    kind,
    title,
    state,
    ...author ? { author } : {},
    ...number !== void 0 ? { number } : {},
    ...url ? { url } : {},
    ...additions !== void 0 ? { additions } : {},
    ...deletions !== void 0 ? { deletions } : {},
    ...changedFiles !== void 0 ? { changedFiles } : {},
    ...baseRefName ? { baseRefName } : {},
    ...headRefName ? { headRefName } : {},
    ...mergeable ? { mergeable } : {},
    ...reviewDecision ? { reviewDecision } : {},
    ...reviewers ? { reviewers } : {},
    ...body?.trim() ? { body } : {}
  };
}
function parseGhView(text2, kind) {
  const probe = probeJson(text2);
  if (probe === null) return null;
  if ("notJson" in probe) return parseViewRich(text2, kind);
  return parseViewJson(probe.json, kind);
}
function parseChecksTable(text2) {
  const rows = [];
  for (const rawLine of text2.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trimEnd();
    if (line === "") continue;
    const fields = line.split("	");
    if (fields.length < 2) return null;
    const name = fields[0] ?? "";
    const state = (fields[1] ?? "").toLowerCase();
    if (!GH_CHECK_STATES.has(state)) return null;
    const duration = fields[2] !== void 0 && fields[2] !== "" ? fields[2] : void 0;
    const url = fields[3];
    rows.push({
      name,
      state,
      ...duration ? { duration } : {},
      ...url ? { url } : {}
    });
  }
  return { kind: "pr-checks", rows };
}
var PR_CREATE_URL = /^(https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/(\d+))/;
function parseGhCreate(text2) {
  const trimmed = text2.replace(/\r/g, "").trim();
  const match = PR_CREATE_URL.exec(trimmed);
  if (!match) return null;
  const url = match[1] ?? "";
  const number = match[2] !== void 0 ? Number(match[2]) : void 0;
  return { kind: "pr-create", url, ...number !== void 0 ? { number } : {} };
}
function parseRunListTable(text2) {
  const rows = [];
  for (const rawLine of text2.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trimEnd();
    if (line === "") continue;
    const fields = line.split("	");
    if (fields.length < 7) return null;
    const id = fields[6] ?? "";
    if (!/^\d+$/.test(id)) return null;
    const status = fields[0] ?? "";
    const conclusionField = fields[1] ?? "";
    const conclusion = conclusionField !== "" ? conclusionField : void 0;
    const title = fields[2] ?? "";
    const workflow = fields[3] ?? "";
    const branch = fields[4] ?? "";
    const event = fields[5] ?? "";
    const elapsed = fields[7] !== void 0 && fields[7] !== "" ? fields[7] : void 0;
    rows.push({
      status,
      ...conclusion ? { conclusion } : {},
      title,
      workflow,
      branch,
      event,
      id,
      ...elapsed ? { elapsed } : {}
    });
  }
  return { kind: "run-list", rows };
}
function parseRunListJson(json) {
  if (!Array.isArray(json)) return null;
  const rows = [];
  for (const item of json) {
    if (!item || typeof item !== "object") return null;
    const o = item;
    const status = asString(o.status);
    const id = asNumber(o.databaseId ?? o.id);
    if (status === void 0 || id === void 0) return null;
    const workflow = asString(o.workflowName) ?? asString(o.name) ?? "";
    const title = asString(o.displayTitle) ?? workflow;
    rows.push({
      status,
      ...asString(o.conclusion) ? { conclusion: asString(o.conclusion) } : {},
      title,
      workflow,
      branch: asString(o.headBranch) ?? "",
      event: asString(o.event) ?? "",
      id: String(id),
      ...asString(o.elapsed) ? { elapsed: o.elapsed } : {}
    });
  }
  return { kind: "run-list", rows };
}
function parseGhRunList(text2) {
  const probe = probeJson(text2);
  if (probe === null) return null;
  if ("notJson" in probe) return parseRunListTable(text2);
  return parseRunListJson(probe.json);
}
var RUN_VIEW_STATUS_LINE = /^([✓✘◌*])\s+(\S+)\s+(.+?)\s+·\s+(\d+)\s*$/u;
var RUN_VIEW_JOB_LINE = /^([✓✘◌*])\s+(.+?)\s+\((\d+)\)\s+in\s+(\S+)\s+\(ID\s+(\d+)\)\s*$/u;
function isRunViewHint(line) {
  return line.startsWith("For more information about the job, try:") || line.startsWith("View this run on GitHub:");
}
function parseGhRunView(text2) {
  const lines = text2.replace(/\r/g, "").split("\n");
  let idx = 0;
  while (idx < lines.length && (lines[idx] ?? "").trim() === "") idx++;
  if (idx >= lines.length) return null;
  const statusMatch = RUN_VIEW_STATUS_LINE.exec(lines[idx] ?? "");
  if (!statusMatch) return null;
  const state = statusMatch[1] ?? "";
  const branch = statusMatch[2] ?? "";
  const workflow = statusMatch[3] ?? "";
  const id = statusMatch[4] ?? "";
  idx++;
  let trigger;
  while (idx < lines.length && (lines[idx] ?? "").trim() === "") idx++;
  if (idx < lines.length && /^Triggered via .+/.test(lines[idx] ?? "")) {
    trigger = lines[idx];
    idx++;
  }
  const jobs = [];
  const annotations = [];
  const skipBlanks = () => {
    while (idx < lines.length && (lines[idx] ?? "").trim() === "") idx++;
  };
  skipBlanks();
  if ((lines[idx] ?? "") === "JOBS") {
    idx++;
    while (idx < lines.length) {
      const line = lines[idx] ?? "";
      if (line === "") {
        idx++;
        break;
      }
      if (line === "ANNOTATIONS" || isRunViewHint(line)) break;
      const jobMatch = RUN_VIEW_JOB_LINE.exec(line);
      if (!jobMatch) return null;
      jobs.push({
        state: jobMatch[1] ?? "",
        name: jobMatch[2] ?? "",
        count: Number(jobMatch[3] ?? 0),
        duration: jobMatch[4] ?? "",
        id: jobMatch[5] ?? ""
      });
      idx++;
    }
  }
  skipBlanks();
  if ((lines[idx] ?? "") === "ANNOTATIONS") {
    idx++;
    while (idx < lines.length) {
      const line = lines[idx] ?? "";
      if (line === "") {
        idx++;
        break;
      }
      if (isRunViewHint(line)) break;
      const annotationMatch = /^!\s+(.+)$/.exec(line);
      if (annotationMatch) {
        annotations.push({ text: annotationMatch[1] ?? "" });
        idx++;
        continue;
      }
      const sourceMatch = /^[A-Za-z0-9_ ./()-]+\(\d+\): \S+#\d+$/.exec(line);
      if (sourceMatch) {
        annotations.push({ text: line });
        idx++;
        continue;
      }
      return null;
    }
  }
  for (let i = idx; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim() === "") continue;
    if (isRunViewHint(line)) continue;
    return null;
  }
  return {
    kind: "run-view",
    ...state ? { state } : {},
    ...branch ? { branch } : {},
    ...workflow ? { workflow } : {},
    ...id ? { id } : {},
    ...trigger ? { trigger } : {},
    jobs,
    annotations
  };
}
function parseGhRunJob(text2, jobId) {
  const body = String(text2 ?? "").replace(/\r/g, "");
  const lines = body.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return { kind: "run-job", jobId, lines };
}
function parseGhOutput(cls, output) {
  const text2 = String(output ?? "");
  switch (cls.kind) {
    case "pr-list":
      return parseGhList(text2, "pr-list");
    case "issue-list":
      return parseGhList(text2, "issue-list");
    case "pr-view":
      return parseGhView(text2, "pr-view");
    case "issue-view":
      return parseGhView(text2, "issue-view");
    case "pr-checks":
      return parseChecksTable(text2);
    case "pr-create":
      return parseGhCreate(text2);
    case "run-list":
      return parseGhRunList(text2);
    case "run-view":
      return parseGhRunView(text2);
    case "run-job":
      return parseGhRunJob(text2, cls.jobId);
  }
}
var GH_ICON = "\uF408";
var GH_CARD_HEAD_LIMIT = 6;
var GH_BODY_PREVIEW_LINES = 8;
function ghCardHeader(theme, cls, parsed) {
  const icon = getToolsRenderConfig().nerdFonts ? `${GH_ICON} ` : "";
  let prefix;
  switch (cls.kind) {
    case "pr-list":
      prefix = `${icon}PRs`;
      break;
    case "pr-view":
      prefix = `${icon}PR`;
      break;
    case "pr-checks":
      prefix = `${icon}PR checks`;
      break;
    case "pr-create":
      prefix = `${icon}PR created`;
      break;
    case "issue-list":
      prefix = `${icon}Issues`;
      break;
    case "issue-view":
      prefix = `${icon}Issue`;
      break;
    case "run-list":
      prefix = `${icon}Runs`;
      break;
    case "run-view":
      prefix = `${icon}Run`;
      break;
    case "run-job":
      prefix = `${icon}Run job`;
      break;
  }
  if (parsed) {
    if (parsed.kind === "pr-view" || parsed.kind === "issue-view") {
      if (parsed.number !== void 0) prefix += ` #${parsed.number}`;
      prefix += ` \xB7 ${parsed.title}`;
    } else if (parsed.kind === "pr-create") {
      if (parsed.number !== void 0) prefix += ` #${parsed.number}`;
    } else if (parsed.kind === "run-view") {
      if (parsed.workflow) prefix += ` \xB7 ${parsed.workflow}`;
      if (parsed.id) prefix += ` \xB7 ${parsed.id}`;
    } else if (parsed.kind === "run-job") {
      prefix += ` \xB7 ${parsed.jobId}`;
    }
  }
  return typeof theme?.bold === "function" ? theme.bold(prefix) : prefix;
}
function ghStateColor(state) {
  if (state === "OPEN") return "accent";
  if (state === "MERGED") return "toolDiffAdded";
  return "dim";
}
function runGlyph(theme, status, conclusion) {
  if (status === "completed") {
    if (conclusion === "success") return theme.fg("toolDiffAdded", "\u2713");
    if (conclusion === "failure") return theme.fg("error", "\u2718");
    return theme.fg("dim", "\u25CC");
  }
  return theme.fg("warning", "\u25CC");
}
function runStateGlyph(theme, glyph) {
  if (glyph === "\u2713") return theme.fg("toolDiffAdded", "\u2713");
  if (glyph === "\u2718") return theme.fg("error", "\u2718");
  return theme.fg("warning", "\u25CC");
}
function checkStateColor(state) {
  if (state === "pass") return "toolDiffAdded";
  if (state === "fail") return "error";
  if (state === "pending") return "warning";
  return "dim";
}
function renderMoreRow(theme, unit, more, width) {
  return safeTruncateToWidth(
    `${TREE_INDENT}${dimLine("\u2514\u2500")} ${theme.fg("dim", `\u2026 ${more} more ${pluralForm(unit, more)}`)}`,
    width,
    "\u2026"
  );
}
function renderListCard(theme, parsed, out, width) {
  const rows = parsed.rows;
  const noun = parsed.kind === "pr-list" ? "PR" : "issue";
  if (rows.length === 0) {
    out.push(theme.fg("muted", `  no open ${pluralForm(noun, 2)}`));
    return out;
  }
  out.push(`  ${theme.fg("accent", `${rows.length} ${pluralForm(noun, rows.length)}`)}`);
  const visible = rows.slice(0, GH_CARD_HEAD_LIMIT);
  const more = rows.length - visible.length;
  const lastIndex = visible.length - 1;
  for (let i = 0; i < visible.length; i++) {
    const row = visible[i];
    if (!row) continue;
    const branchGlyph = i < lastIndex || more > 0 ? "\u251C\u2500" : "\u2514\u2500";
    const color = ghStateColor(row.state);
    const num = theme.fg(color, `#${row.number}`);
    const title = theme.fg("toolOutput", row.title);
    const stateSuffix = row.state !== "OPEN" ? theme.fg("dim", ` (${row.state.toLowerCase()})`) : "";
    const branchPart = row.branch ? theme.fg("dim", `  ${row.branch}`) : "";
    const line = `${TREE_INDENT}${dimLine(branchGlyph)} ${num}  ${title}${stateSuffix}${branchPart}`;
    out.push(safeTruncateToWidth(line, width, "\u2026"));
  }
  if (more > 0) out.push(renderMoreRow(theme, noun, more, width));
  return out;
}
function renderBodyPreview(theme, body, out, width) {
  const bodyLines = body.replace(/\s+$/u, "").split("\n");
  const visible = bodyLines.slice(0, GH_BODY_PREVIEW_LINES);
  for (const line of visible) {
    out.push(safeTruncateToWidth(`  ${theme.fg("muted", line)}`, width, "\u2026"));
  }
  const more = bodyLines.length - visible.length;
  if (more > 0) {
    const expandKey = toolExpandKeyText();
    const hint = expandKey ? ` \xB7 ${expandKey}` : "";
    out.push(safeTruncateToWidth(`  ${theme.fg("dim", `\u2026 ${more} more lines${hint}`)}`, width, "\u2026"));
  }
  return out;
}
function renderViewCard(theme, parsed, out, width) {
  const stateParts = [theme.fg(ghStateColor(parsed.state), parsed.state)];
  if (parsed.baseRefName && parsed.headRefName) {
    stateParts.push(theme.fg("dim", "\xB7"), theme.fg("text", `${parsed.baseRefName} \u2192 ${parsed.headRefName}`));
  }
  out.push(safeTruncateToWidth(`  ${stateParts.join(theme.fg("dim", " "))}`, width, "\u2026"));
  const summaryParts = [];
  const diffParts = [];
  if (parsed.additions !== void 0 && parsed.additions > 0) {
    diffParts.push(theme.fg("toolDiffAdded", `+${parsed.additions}`));
  }
  if (parsed.deletions !== void 0 && parsed.deletions > 0) {
    diffParts.push(theme.fg("toolDiffRemoved", `-${parsed.deletions}`));
  }
  if (diffParts.length > 0) summaryParts.push(diffParts.join(" "));
  if (parsed.changedFiles !== void 0) {
    summaryParts.push(theme.fg("accent", `${parsed.changedFiles} ${pluralForm("file", parsed.changedFiles)}`));
  }
  if (summaryParts.length > 0) {
    out.push(safeTruncateToWidth(`  ${summaryParts.join(theme.fg("dim", " \xB7 "))}`, width, "\u2026"));
  }
  if (parsed.author) {
    out.push(safeTruncateToWidth(`  ${theme.fg("dim", "author")} ${theme.fg("text", parsed.author)}`, width, "\u2026"));
  }
  if (parsed.reviewers) {
    out.push(
      safeTruncateToWidth(`  ${theme.fg("dim", "reviewers")} ${theme.fg("toolOutput", parsed.reviewers)}`, width, "\u2026")
    );
  } else if (parsed.reviewDecision) {
    out.push(
      safeTruncateToWidth(`  ${theme.fg("dim", "review")} ${theme.fg("text", parsed.reviewDecision)}`, width, "\u2026")
    );
  }
  if (parsed.mergeable) {
    out.push(
      safeTruncateToWidth(`  ${theme.fg("dim", "mergeable")} ${theme.fg("text", parsed.mergeable)}`, width, "\u2026")
    );
  }
  if (parsed.body?.trim()) renderBodyPreview(theme, parsed.body, out, width);
  return out;
}
function renderChecksCard(theme, parsed, out, width) {
  const rows = parsed.rows;
  if (rows.length === 0) {
    out.push(theme.fg("muted", "  no checks reported"));
    return out;
  }
  const visible = rows.slice(0, GH_CARD_HEAD_LIMIT);
  const more = rows.length - visible.length;
  const lastIndex = visible.length - 1;
  for (let i = 0; i < visible.length; i++) {
    const row = visible[i];
    if (!row) continue;
    const branchGlyph = i < lastIndex || more > 0 ? "\u251C\u2500" : "\u2514\u2500";
    const name = theme.fg("toolOutput", row.name);
    const state = theme.fg(checkStateColor(row.state), row.state);
    const duration = row.duration && row.duration !== "0" ? theme.fg("dim", `  ${row.duration}`) : "";
    const line = `${TREE_INDENT}${dimLine(branchGlyph)} ${name}  ${state}${duration}`;
    out.push(safeTruncateToWidth(line, width, "\u2026"));
  }
  if (more > 0) out.push(renderMoreRow(theme, "check", more, width));
  return out;
}
function renderCreateCard(theme, parsed, out, width) {
  out.push(safeTruncateToWidth(`  ${theme.fg("text", parsed.url)}`, width, "\u2026"));
  return out;
}
function renderRunListCard(theme, parsed, out, width) {
  const rows = parsed.rows;
  if (rows.length === 0) {
    out.push(theme.fg("muted", "  no recent runs"));
    return out;
  }
  const visible = rows.slice(0, GH_CARD_HEAD_LIMIT);
  const more = rows.length - visible.length;
  const lastIndex = visible.length - 1;
  for (let i = 0; i < visible.length; i++) {
    const row = visible[i];
    if (!row) continue;
    const branchGlyph = i < lastIndex || more > 0 ? "\u251C\u2500" : "\u2514\u2500";
    const glyph = runGlyph(theme, row.status, row.conclusion);
    const workflow = theme.fg("text", row.workflow || row.title);
    const branch = theme.fg("dim", `  ${row.branch}`);
    const id = theme.fg("dim", `  ${row.id}`);
    const line = `${TREE_INDENT}${dimLine(branchGlyph)} ${glyph} ${workflow}${branch}${id}`;
    out.push(safeTruncateToWidth(line, width, "\u2026"));
  }
  if (more > 0) out.push(renderMoreRow(theme, "run", more, width));
  return out;
}
function renderRunViewCard(theme, parsed, out, width) {
  if (parsed.trigger) {
    out.push(safeTruncateToWidth(`  ${theme.fg("dim", parsed.trigger)}`, width, "\u2026"));
  }
  const visibleJobs = parsed.jobs.slice(0, GH_CARD_HEAD_LIMIT);
  const moreJobs = parsed.jobs.length - visibleJobs.length;
  const lastJobIndex = visibleJobs.length - 1;
  for (let i = 0; i < visibleJobs.length; i++) {
    const job = visibleJobs[i];
    if (!job) continue;
    const branchGlyph = i < lastJobIndex || moreJobs > 0 || parsed.annotations.length > 0 ? "\u251C\u2500" : "\u2514\u2500";
    const glyph = runStateGlyph(theme, job.state);
    const name = theme.fg("toolOutput", `${job.name}${job.count !== void 0 ? ` (${job.count})` : ""}`);
    const detail = theme.fg("dim", `${job.duration ? ` ${job.duration}` : ""}${job.id ? ` \xB7 ${job.id}` : ""}`);
    const line = `${TREE_INDENT}${dimLine(branchGlyph)} ${glyph} ${name}${detail}`;
    out.push(safeTruncateToWidth(line, width, "\u2026"));
  }
  if (moreJobs > 0) out.push(renderMoreRow(theme, "job", moreJobs, width));
  for (let i = 0; i < parsed.annotations.length; i++) {
    const annotation = parsed.annotations[i];
    if (!annotation) continue;
    const branchGlyph = i < parsed.annotations.length - 1 ? "\u251C\u2500" : "\u2514\u2500";
    const line = `${TREE_INDENT}${dimLine(branchGlyph)} ${theme.fg("warning", "!")} ${theme.fg("dim", annotation.text)}`;
    out.push(safeTruncateToWidth(line, width, "\u2026"));
  }
  return out;
}
function renderGhCardLines(theme, state, width) {
  const safeWidth = Math.max(1, width);
  const out = [safeTruncateToWidth(ghCardHeader(theme, state.cls, state.parsed), safeWidth, "\u2026")];
  const parsed = state.parsed;
  if (!parsed) return out;
  if (parsed.kind === "pr-list" || parsed.kind === "issue-list") renderListCard(theme, parsed, out, safeWidth);
  else if (parsed.kind === "pr-view" || parsed.kind === "issue-view") renderViewCard(theme, parsed, out, safeWidth);
  else if (parsed.kind === "pr-checks") renderChecksCard(theme, parsed, out, safeWidth);
  else if (parsed.kind === "pr-create") renderCreateCard(theme, parsed, out, safeWidth);
  else if (parsed.kind === "run-list") renderRunListCard(theme, parsed, out, safeWidth);
  else if (parsed.kind === "run-view") renderRunViewCard(theme, parsed, out, safeWidth);
  return out.map((line) => safeTruncateToWidth(line, safeWidth, "\u2026"));
}
var GH_RUN_JOB_BUDGET_COLLAPSED = 40;
var GH_RUN_JOB_BUDGET_EXPANDED = 200;
function renderGhRunJobResult(theme, parsed, options, context) {
  const expanded = Boolean(options.expanded);
  const elapsedMs = getStateElapsedMs(context.state);
  const footerParts = [];
  if (elapsedMs !== void 0) footerParts.push(theme.fg("text", formatElapsedMs(elapsedMs)));
  const footer = footerParts.join(theme.fg("dim", " \xB7 "));
  const hasLog = parsed.lines.some((line) => line.trim() !== "");
  const budget = expanded ? GH_RUN_JOB_BUDGET_EXPANDED : GH_RUN_JOB_BUDGET_COLLAPSED;
  return renderBoxedToolResult(
    theme,
    () => hasLog ? parsed.lines.map((line) => theme.fg("toolOutput", line)) : [theme.fg("muted", "No log output")],
    {
      dividerLabel: `Log \xB7 ${parsed.jobId}`,
      footerLines: footer ? [footer] : [],
      renderLineBudget: budget
    }
  );
}

// extension-src/omp-theme/features/tools/boxed/git.ts
import { getLanguageFromPath } from "@earendil-works/pi-coding-agent";

// extension-src/omp-theme/shared/split-diff.ts
import { highlightCode } from "@earendil-works/pi-coding-agent";
var ESC2 = "\x1B";
var BG_ANSI_PATTERN = new RegExp(`${ESC2}\\[(?:4\\d|10\\d|48;5;\\d{1,3}|48;2;\\d{1,3};\\d{1,3};\\d{1,3}|49)m`, "g");
var CONTROL_CHARS = "\0-\b\v\f-\x7F";
var ADD_ROW_BACKGROUND_MIX_RATIO = 0.24;
var REMOVE_ROW_BACKGROUND_MIX_RATIO = 0.12;
var ADD_INLINE_EMPHASIS_MIX_RATIO = 0.44;
var REMOVE_INLINE_EMPHASIS_MIX_RATIO = 0.26;
var CONTEXT_KEEP_DEFAULT = 2;
var CONTEXT_RUN_SHOW_MAX = 4;
var SPLIT_DIFF_MIN_WIDTH = 114;
function ansi256ToRgb(code) {
  if (code <= 15) {
    const base16 = [
      { r: 0, g: 0, b: 0 },
      { r: 128, g: 0, b: 0 },
      { r: 0, g: 128, b: 0 },
      { r: 128, g: 128, b: 0 },
      { r: 0, g: 0, b: 128 },
      { r: 128, g: 0, b: 128 },
      { r: 0, g: 128, b: 128 },
      { r: 192, g: 192, b: 192 },
      { r: 128, g: 128, b: 128 },
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 255, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 0, b: 255 },
      { r: 0, g: 255, b: 255 },
      { r: 255, g: 255, b: 255 }
    ];
    return base16[code] ?? { r: 255, g: 255, b: 255 };
  }
  if (code >= 232) {
    const value = Math.max(0, Math.min(255, 8 + (code - 232) * 10));
    return { r: value, g: value, b: value };
  }
  const cube = code - 16;
  const levels = [0, 95, 135, 175, 215, 255];
  const blue = cube % 6;
  const green = Math.floor(cube / 6) % 6;
  const red = Math.floor(cube / 36) % 6;
  return {
    r: levels[red] ?? 0,
    g: levels[green] ?? 0,
    b: levels[blue] ?? 0
  };
}
function parseAnsiColorCode(ansi) {
  if (!ansi) return null;
  const rgbMatch = new RegExp(`${ESC2}\\[(?:3|4)8;2;(\\d{1,3});(\\d{1,3});(\\d{1,3})m`).exec(ansi);
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1] ?? "0", 10);
    const g = Number.parseInt(rgbMatch[2] ?? "0", 10);
    const b = Number.parseInt(rgbMatch[3] ?? "0", 10);
    return { r, g, b };
  }
  const bitMatch = new RegExp(`${ESC2}\\[(?:3|4)8;5;(\\d{1,3})m`).exec(ansi);
  if (bitMatch) {
    const code = Number.parseInt(bitMatch[1] ?? "0", 10);
    return ansi256ToRgb(code);
  }
  return null;
}
function rgbToBgAnsi(color) {
  const r = Math.max(0, Math.min(255, Math.round(color.r)));
  const g = Math.max(0, Math.min(255, Math.round(color.g)));
  const b = Math.max(0, Math.min(255, Math.round(color.b)));
  return `\x1B[48;2;${r};${g};${b}m`;
}
function mixRgb(base, tint, ratio) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return {
    r: base.r * (1 - clamped) + tint.r * clamped,
    g: base.g * (1 - clamped) + tint.g * clamped,
    b: base.b * (1 - clamped) + tint.b * clamped
  };
}
function resolveDiffPalette(theme) {
  const baseBg = parseAnsiColorCode(theme.getBgAnsi?.("toolSuccessBg")) ?? parseAnsiColorCode(theme.getBgAnsi?.("toolPendingBg")) ?? { r: 32, g: 35, b: 42 };
  const addFg = parseAnsiColorCode(theme.getFgAnsi?.("toolDiffAdded")) ?? { r: 88, g: 173, b: 88 };
  const removeFg = parseAnsiColorCode(theme.getFgAnsi?.("toolDiffRemoved")) ?? { r: 196, g: 98, b: 98 };
  const addRowBg = mixRgb(baseBg, addFg, ADD_ROW_BACKGROUND_MIX_RATIO);
  const removeRowBg = mixRgb(baseBg, removeFg, REMOVE_ROW_BACKGROUND_MIX_RATIO);
  const addEmphasisBg = mixRgb(baseBg, addFg, ADD_INLINE_EMPHASIS_MIX_RATIO);
  const removeEmphasisBg = mixRgb(baseBg, removeFg, REMOVE_INLINE_EMPHASIS_MIX_RATIO);
  return {
    addRowBgAnsi: rgbToBgAnsi(addRowBg),
    removeRowBgAnsi: rgbToBgAnsi(removeRowBg),
    addEmphasisBgAnsi: rgbToBgAnsi(addEmphasisBg),
    removeEmphasisBgAnsi: rgbToBgAnsi(removeEmphasisBg)
  };
}
function keepBackgroundAcrossResets(text2, rowBgAnsi) {
  if (!text2) return text2;
  return text2.replace(new RegExp(`${ESC2}\\[([0-9;]*)m`, "g"), (sequence, rawCodes) => {
    const split = String(rawCodes ?? "").split(";").filter(Boolean);
    const codes = split.length > 0 ? split : ["0"];
    const hasGlobalReset = codes.includes("0");
    const hasBgReset = codes.includes("49");
    if (!hasGlobalReset && !hasBgReset) return sequence;
    const rebuiltCodes = codes.filter((code) => code !== "49");
    const rebuilt = rebuiltCodes.length > 0 ? `\x1B[${rebuiltCodes.join(";")}m` : "";
    return `${rebuilt}${rowBgAnsi}`;
  });
}
function applyBackgroundToVisibleRange(ansiText, start, end, backgroundAnsi, restoreBackgroundAnsi) {
  if (!ansiText || start >= end || end <= 0) return ansiText;
  let output = "";
  let visibleIndex = 0;
  let index = 0;
  let inRange = false;
  while (index < ansiText.length) {
    if (ansiText[index] === "\x1B") {
      const sequenceEnd = ansiText.indexOf("m", index);
      if (sequenceEnd !== -1) {
        output += ansiText.slice(index, sequenceEnd + 1);
        index = sequenceEnd + 1;
        continue;
      }
    }
    if (visibleIndex === start && !inRange) {
      output += backgroundAnsi;
      inRange = true;
    }
    if (visibleIndex === end && inRange) {
      output += restoreBackgroundAnsi;
      inRange = false;
    }
    output += ansiText[index] ?? "";
    visibleIndex++;
    index++;
  }
  if (inRange) output += restoreBackgroundAnsi;
  return output;
}
function sanitizeSingleLineText(value) {
  return value.replace(/\r/g, "").replace(/\n/g, "").replace(new RegExp(`[${CONTROL_CHARS}]`, "g"), "");
}
function stripInlineBreaksPreserveAnsi(value) {
  return value.replace(/\r/g, "").replace(/\n/g, "");
}
function padRight(value, width) {
  const visual = safeVisibleWidth(stripAnsi(value));
  if (visual >= width) return value;
  return value + " ".repeat(width - visual);
}
function fitToWidth(value, width) {
  return padRight(safeTruncateToWidth(value, width), width);
}
function padRenderedLineWidth(line, width) {
  const safeWidth = Math.max(1, width);
  const current = safeVisibleWidth(stripAnsi(line));
  if (current >= safeWidth) return line;
  return line + " ".repeat(safeWidth - current);
}
function wrapPlainText(text2, width) {
  const safeWidth = Math.max(1, width);
  const safeText = sanitizeSingleLineText(text2);
  if (!safeText) return [""];
  const lines = [];
  let cursor = 0;
  while (cursor < safeText.length) {
    const remaining = safeText.length - cursor;
    if (remaining <= safeWidth) {
      lines.push(safeText.slice(cursor));
      break;
    }
    const window = safeText.slice(cursor, cursor + safeWidth);
    const breakOnSpace = window.lastIndexOf(" ");
    if (breakOnSpace > 0) {
      const next = breakOnSpace + 1;
      lines.push(safeText.slice(cursor, cursor + next));
      cursor += next;
      continue;
    }
    lines.push(window);
    cursor += safeWidth;
  }
  return lines.length > 0 ? lines : [""];
}
function parseLineNumber(value) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return void 0;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function makeDiffLine(prefix, lineNumber, line) {
  return {
    prefix,
    lineNumber: lineNumber === void 0 ? "" : String(lineNumber),
    line
  };
}
function parseDiffLine(rawLine) {
  if (/^(?:diff --git |index |--- |\+\+\+ |@@)/.test(rawLine)) return void 0;
  const match = rawLine.match(/^([+\- ])\s?(.*)$/);
  if (!match) return void 0;
  const [, prefix, rest = ""] = match;
  if (prefix !== "+" && prefix !== "-" && prefix !== " ") return void 0;
  const gutterMatch = rest.match(/^(\d+)\s(.*)$/);
  const lineNumber = gutterMatch?.[1] ?? "";
  const line = gutterMatch?.[2] ?? rest;
  const cleanLineNumber = sanitizeSingleLineText(lineNumber);
  const cleanLine = sanitizeSingleLineText(line).replace(/\t/g, "    ");
  return { prefix, lineNumber: cleanLineNumber, line: cleanLine };
}
function computeInlineDiffSpans(leftLine, rightLine) {
  if (leftLine === rightLine) return { left: [], right: [] };
  let start = 0;
  const minLen = Math.min(leftLine.length, rightLine.length);
  while (start < minLen && leftLine[start] === rightLine[start]) start++;
  let leftEnd = leftLine.length;
  let rightEnd = rightLine.length;
  while (leftEnd > start && rightEnd > start && leftLine[leftEnd - 1] === rightLine[rightEnd - 1]) {
    leftEnd--;
    rightEnd--;
  }
  const leftSpan = leftEnd > start ? [{ start, end: leftEnd }] : [];
  const rightSpan = rightEnd > start ? [{ start, end: rightEnd }] : [];
  return { left: leftSpan, right: rightSpan };
}
function buildSplitRows(diff) {
  const rows = [];
  const pendingLeft = [];
  const pendingRight = [];
  let oldCursor;
  let newCursor;
  const flushPending = () => {
    while (pendingLeft.length > 0 || pendingRight.length > 0) {
      const left = pendingLeft.shift();
      const right = pendingRight.shift();
      if (left && right) rows.push({ kind: "changed", left, right });
      else if (left) rows.push({ kind: "removed", left });
      else if (right) rows.push({ kind: "added", right });
    }
  };
  for (const rawLine of diff.split("\n")) {
    const parsed = parseDiffLine(rawLine);
    if (!parsed) continue;
    const parsedNum = parseLineNumber(parsed.lineNumber);
    if (parsed.prefix === "-") {
      const oldNum2 = parsedNum ?? oldCursor;
      if (oldNum2 !== void 0) oldCursor = oldNum2 + 1;
      pendingLeft.push(makeDiffLine("-", oldNum2, parsed.line));
      continue;
    }
    if (parsed.prefix === "+") {
      const newNum2 = parsedNum ?? newCursor;
      if (newNum2 !== void 0) newCursor = newNum2 + 1;
      pendingRight.push(makeDiffLine("+", newNum2, parsed.line));
      continue;
    }
    flushPending();
    const oldNum = parsedNum ?? oldCursor;
    const newNum = newCursor ?? oldNum;
    if (oldNum !== void 0) oldCursor = oldNum + 1;
    if (newNum !== void 0) newCursor = newNum + 1;
    rows.push({
      kind: "context",
      left: makeDiffLine(" ", oldNum, parsed.line),
      right: makeDiffLine(" ", newNum, parsed.line)
    });
  }
  flushPending();
  return rows;
}
function countDiffStats(diff) {
  let additions = 0;
  let removals = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) additions += 1;
    if (line.startsWith("-")) removals += 1;
  }
  return { additions, removals };
}
function extractEditedPath(message) {
  const m = message.match(/Successfully replaced (?:text|\d+ block\(s\)|lines L\d+-\d+) in (.+)\.$/);
  return m?.[1];
}
function firstText(content) {
  for (const part of content) {
    if (part.type === "text" && typeof part.text === "string") {
      return part.text;
    }
  }
  return "";
}
function longestChangedLineWidth(rows) {
  let longest = 0;
  for (const row of rows) {
    const candidates = [];
    if (row.kind === "changed") {
      if (row.left) candidates.push(row.left.line);
      if (row.right) candidates.push(row.right.line);
    } else if (row.kind === "added" && row.right) {
      candidates.push(row.right.line);
    } else if (row.kind === "removed" && row.left) {
      candidates.push(row.left.line);
    }
    for (const candidate of candidates) {
      longest = Math.max(longest, safeVisibleWidth(candidate));
    }
  }
  return longest;
}
function pickDiffMode(stats, rows, width) {
  if (stats.additions <= 0 || stats.removals <= 0) return "unified";
  if (width < SPLIT_DIFF_MIN_WIDTH) return "unified";
  if (longestChangedLineWidth(rows) > width / 2) return "unified";
  return "split";
}
function collapseContextRows(rows, options) {
  const keep = options.keep;
  const runShowMax = options.runShowMax ?? CONTEXT_RUN_SHOW_MAX;
  const out = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    if (row?.kind !== "context") {
      if (row) out.push({ kind: "row", row });
      i++;
      continue;
    }
    let j = i;
    while (j < rows.length && rows[j]?.kind === "context") j++;
    const run = j - i;
    if (run <= runShowMax) {
      for (let k = i; k < j; k++) out.push({ kind: "row", row: rows[k] });
    } else {
      const leading = i === 0;
      const trailing = j >= rows.length;
      const keepHead = leading ? 0 : Math.min(keep, run);
      const keepTail = trailing ? 0 : Math.min(keep, Math.max(0, run - keepHead));
      const hidden = Math.max(0, run - keepHead - keepTail);
      if (keepHead > 0) {
        for (let k = i; k < i + keepHead; k++) out.push({ kind: "row", row: rows[k] });
      }
      if (hidden > 0) out.push({ kind: "gap", hidden });
      if (keepTail > 0) {
        for (let k = j - keepTail; k < j; k++) out.push({ kind: "row", row: rows[k] });
      }
    }
    i = j;
  }
  return out;
}
function planEntries(rows, maxRows) {
  const budget = Math.max(1, maxRows);
  let entries = collapseContextRows(rows, { keep: CONTEXT_KEEP_DEFAULT });
  if (entries.length <= budget) return entries;
  entries = collapseContextRows(rows, { keep: 0, runShowMax: 0 });
  if (entries.length <= budget) return entries;
  const kept = entries.slice(0, Math.max(1, budget - 1));
  const omitted = Math.max(0, entries.length - kept.length);
  if (omitted <= 0) return kept;
  return [...kept, { kind: "omitted", count: omitted }];
}
function formatGapLabel(hidden) {
  return `\u22EF ${hidden} unchanged ${hidden === 1 ? "line" : "lines"} hidden`;
}
function formatOmittedLabel(count) {
  const expandHint = toolExpandHint();
  return `\u22EF ${count} ${count === 1 ? "line" : "lines"} omitted${expandHint ? ` \xB7 ${expandHint}` : ""}`;
}
var DiffRenderContext = class {
  constructor(theme, rows, language) {
    this.theme = theme;
    this.language = language;
    let maxDigits = 3;
    for (const row of rows) {
      const leftDigits = row.left?.lineNumber.trim().length ?? 0;
      const rightDigits = row.right?.lineNumber.trim().length ?? 0;
      maxDigits = Math.max(maxDigits, leftDigits, rightDigits);
      if (row.kind === "changed" && row.left && row.right) {
        const spans = computeInlineDiffSpans(row.left.line, row.right.line);
        if (spans.left.length > 0) this.inlineHighlights.set(row.left, spans.left);
        if (spans.right.length > 0) this.inlineHighlights.set(row.right, spans.right);
      }
    }
    this.lineNumberWidth = maxDigits;
    this.palette = resolveDiffPalette(theme);
    this.containerBgAnsi = RESET_BACKGROUND;
  }
  theme;
  language;
  lineNumberWidth;
  palette;
  containerBgAnsi;
  highlightCache = /* @__PURE__ */ new Map();
  inlineHighlights = /* @__PURE__ */ new WeakMap();
  fg(color, text2) {
    return this.theme.fg(color, text2);
  }
  inlineSpans(line) {
    return this.inlineHighlights.get(line) ?? [];
  }
  syntaxHighlight(line) {
    if (!this.language) return stripInlineBreaksPreserveAnsi(line);
    const safeLine = sanitizeSingleLineText(line);
    const key = `${this.language}
${safeLine}`;
    const cached = this.highlightCache.get(key);
    if (cached) return cached;
    let highlighted = safeLine;
    try {
      highlighted = highlightCode(safeLine, this.language)[0] ?? safeLine;
      highlighted = stripInlineBreaksPreserveAnsi(highlighted).replace(BG_ANSI_PATTERN, "");
    } catch {
      highlighted = safeLine;
    }
    this.highlightCache.set(key, highlighted);
    return highlighted;
  }
};
var UnifiedDiffRenderer = class {
  constructor(ctx, entries) {
    this.ctx = ctx;
    this.entries = entries;
  }
  ctx;
  entries;
  gapLine(entry, width) {
    return padRenderedLineWidth(this.ctx.fg("muted", formatGapLabel(entry.hidden)), width);
  }
  omittedLine(entry, width) {
    return padRenderedLineWidth(this.ctx.fg("muted", formatOmittedLabel(entry.count)), width);
  }
  render(width) {
    const safeWidth = Math.max(20, width);
    const prefixWidth = 1 + 1 + this.ctx.lineNumberWidth + 2;
    const codeWidth = Math.max(1, safeWidth - prefixWidth);
    const lines = [];
    for (const entry of this.entries) {
      if (entry.kind === "gap") {
        lines.push(this.gapLine(entry, safeWidth));
        continue;
      }
      if (entry.kind === "omitted") {
        lines.push(this.omittedLine(entry, safeWidth));
        continue;
      }
      lines.push(...this.rowLines(entry.row, codeWidth, safeWidth));
    }
    return lines;
  }
  rowLines(row, codeWidth, width) {
    const segments = [];
    if (row.kind === "changed") {
      if (row.left) segments.push({ kind: "remove", line: row.left });
      if (row.right) segments.push({ kind: "add", line: row.right });
    } else if (row.kind === "added" && row.right) {
      segments.push({ kind: "add", line: row.right });
    } else if (row.kind === "removed" && row.left) {
      segments.push({ kind: "remove", line: row.left });
    } else {
      const line = row.left ?? row.right;
      if (line) segments.push({ kind: "context", line });
    }
    const out = [];
    for (const segment2 of segments) {
      out.push(...this.segmentLines(segment2.kind, segment2.line, codeWidth, width));
    }
    return out;
  }
  segmentLines(kind, line, codeWidth, width) {
    const isAdd = kind === "add";
    const isRemove = kind === "remove";
    const blank = line.line === "";
    const visualKind = kind === "context" || blank ? "context" : kind;
    const markerChar = kind === "context" ? " " : isAdd ? "+" : "-";
    const markerColor = isAdd ? "toolDiffAdded" : isRemove ? "toolDiffRemoved" : "dim";
    const gutterColor = visualKind === "context" ? "dim" : isAdd ? "toolDiffAdded" : "toolDiffRemoved";
    const gutter = line.lineNumber.trim().padStart(this.ctx.lineNumberWidth, " ");
    const firstPrefixAnsi = `${this.ctx.fg(markerColor, markerChar)} ${this.ctx.fg(gutterColor, gutter)}  `;
    const firstPrefixPlain = `${markerChar} ${gutter}  `;
    const contPrefixAnsi = `${this.ctx.fg("dim", " ")} ${this.ctx.fg("dim", " ".repeat(this.ctx.lineNumberWidth))}  `;
    const contPrefixPlain = ` ${" ".repeat(1 + this.ctx.lineNumberWidth)}  `;
    const rowBg = visualKind === "add" ? this.ctx.palette.addRowBgAnsi : visualKind === "remove" ? this.ctx.palette.removeRowBgAnsi : void 0;
    const emphasisBg = visualKind === "add" ? this.ctx.palette.addEmphasisBgAnsi : visualKind === "remove" ? this.ctx.palette.removeEmphasisBgAnsi : void 0;
    const spans = this.ctx.inlineSpans(line);
    const plainSegments = wrapPlainText(line.line, codeWidth);
    const out = [];
    let consumed = 0;
    for (let i = 0; i < plainSegments.length; i++) {
      const prefixAnsi = i === 0 ? firstPrefixAnsi : contPrefixAnsi;
      const prefixPlain = i === 0 ? firstPrefixPlain : contPrefixPlain;
      const plainSegment = plainSegments[i] ?? "";
      let segment2 = this.ctx.syntaxHighlight(plainSegment);
      if (spans.length > 0 && emphasisBg) {
        const segmentStart = consumed;
        for (let si = spans.length - 1; si >= 0; si--) {
          const span = spans[si];
          if (!span) continue;
          const localStart = Math.max(0, span.start - segmentStart);
          const localEnd = Math.min(plainSegment.length, span.end - segmentStart);
          if (localEnd > localStart) {
            segment2 = applyBackgroundToVisibleRange(
              segment2,
              localStart,
              localEnd,
              emphasisBg,
              rowBg ?? this.ctx.containerBgAnsi
            );
          }
        }
      }
      segment2 = fitToWidth(segment2, codeWidth);
      let rendered = prefixAnsi + segment2;
      const expectedWidth = safeVisibleWidth(prefixPlain) + codeWidth;
      const currentWidth = safeVisibleWidth(stripAnsi(rendered));
      if (currentWidth < expectedWidth) {
        rendered += " ".repeat(expectedWidth - currentWidth);
      }
      if (rowBg) {
        rendered = `${rowBg}${keepBackgroundAcrossResets(rendered, rowBg)}${this.ctx.containerBgAnsi}`;
      }
      out.push(padRenderedLineWidth(rendered, width));
      consumed += plainSegment.length;
    }
    return out;
  }
};
var SplitDiffRenderer = class {
  constructor(ctx, entries) {
    this.ctx = ctx;
    this.entries = entries;
  }
  ctx;
  entries;
  getCellLineKind(kind, side) {
    if (kind === "changed") return side === "left" ? "remove" : "add";
    if (kind === "removed" && side === "left") return "remove";
    if (kind === "added" && side === "right") return "add";
    return "context";
  }
  getVisualLineKind(kind, side, line) {
    const base = this.getCellLineKind(kind, side);
    if ((kind === "added" || kind === "removed") && (line?.line ?? "") === "") {
      return "context";
    }
    return base;
  }
  getNumberColor(lineKind) {
    if (lineKind === "remove") return "toolDiffRemoved";
    if (lineKind === "add") return "toolDiffAdded";
    return "dim";
  }
  getRowBackground(lineKind) {
    if (lineKind === "add") return this.ctx.palette.addRowBgAnsi;
    if (lineKind === "remove") return this.ctx.palette.removeRowBgAnsi;
    return void 0;
  }
  getEmphasisBackground(lineKind) {
    if (lineKind === "add") return this.ctx.palette.addEmphasisBgAnsi;
    if (lineKind === "remove") return this.ctx.palette.removeEmphasisBgAnsi;
    return void 0;
  }
  getCellFillBackground(kind, side) {
    switch (kind) {
      case "changed":
        return side === "left" ? this.ctx.palette.removeRowBgAnsi : this.ctx.palette.addRowBgAnsi;
      case "removed":
        return side === "left" ? this.ctx.palette.removeRowBgAnsi : void 0;
      case "added":
        return side === "right" ? this.ctx.palette.addRowBgAnsi : void 0;
      default:
        return void 0;
    }
  }
  blankCell(kind, side, columnWidth) {
    const lineKind = this.getCellLineKind(kind, side);
    const markerChar = lineKind === "add" || lineKind === "remove" ? "\u258C" : " ";
    const markerColor = lineKind === "add" ? "toolDiffAdded" : lineKind === "remove" ? "toolDiffRemoved" : "borderMuted";
    const marker2 = this.ctx.fg(markerColor, markerChar);
    const lineNumber = this.ctx.fg("dim", " ".repeat(this.ctx.lineNumberWidth));
    const divider = this.ctx.fg("borderMuted", " \u2502 ");
    const prefix = `${marker2} ${lineNumber}${divider}`;
    const prefixPlain = `${markerChar} ${" ".repeat(this.ctx.lineNumberWidth)} \u2502 `;
    const tailWidth = Math.max(0, columnWidth - safeVisibleWidth(prefixPlain));
    let rendered = prefix + " ".repeat(tailWidth);
    const bg = this.getCellFillBackground(kind, side);
    if (!bg) return padRenderedLineWidth(rendered, columnWidth);
    rendered = `${bg}${keepBackgroundAcrossResets(rendered, bg)}${this.ctx.containerBgAnsi}`;
    return padRenderedLineWidth(rendered, columnWidth);
  }
  formatCellLines(kind, side, line, columnWidth) {
    if (!line) return [this.blankCell(kind, side, columnWidth)];
    const lineKind = this.getVisualLineKind(kind, side, line);
    const markerChar = lineKind === "add" || lineKind === "remove" ? "\u258C" : " ";
    const markerColor = lineKind === "add" ? "toolDiffAdded" : lineKind === "remove" ? "toolDiffRemoved" : "borderMuted";
    const lineNumber = line.lineNumber.trim().padStart(this.ctx.lineNumberWidth, " ");
    const firstPrefixAnsi = this.ctx.fg(markerColor, markerChar) + " " + this.ctx.fg(this.getNumberColor(lineKind), lineNumber) + this.ctx.fg("borderMuted", " \u2502 ");
    const firstPrefixPlain = `${markerChar} ${lineNumber} \u2502 `;
    const contPrefixAnsi = this.ctx.fg(markerColor, markerChar) + " " + this.ctx.fg("dim", " ".repeat(this.ctx.lineNumberWidth)) + this.ctx.fg("borderMuted", " \u2502 ");
    const contPrefixPlain = `${markerChar} ${" ".repeat(this.ctx.lineNumberWidth)} \u2502 `;
    const codeWidth = Math.max(1, columnWidth - safeVisibleWidth(firstPrefixPlain));
    const rowBg = this.getRowBackground(lineKind);
    const emphasisBg = this.getEmphasisBackground(lineKind);
    const plainSegments = wrapPlainText(line.line, codeWidth);
    const lines = [];
    const spans = this.ctx.inlineSpans(line);
    let consumed = 0;
    for (let i = 0; i < plainSegments.length; i++) {
      const prefixAnsi = i === 0 ? firstPrefixAnsi : contPrefixAnsi;
      const prefixPlain = i === 0 ? firstPrefixPlain : contPrefixPlain;
      const plainSegment = plainSegments[i] ?? "";
      let segment2 = this.ctx.syntaxHighlight(plainSegment);
      if (spans.length > 0 && emphasisBg) {
        const segmentStart = consumed;
        for (let si = spans.length - 1; si >= 0; si--) {
          const span = spans[si];
          if (!span) continue;
          const localStart = Math.max(0, span.start - segmentStart);
          const localEnd = Math.min(plainSegment.length, span.end - segmentStart);
          if (localEnd > localStart) {
            segment2 = applyBackgroundToVisibleRange(
              segment2,
              localStart,
              localEnd,
              emphasisBg,
              rowBg ?? this.ctx.containerBgAnsi
            );
          }
        }
      }
      segment2 = fitToWidth(segment2, codeWidth);
      let rendered = prefixAnsi + segment2;
      const expectedWidth = safeVisibleWidth(prefixPlain) + codeWidth;
      const currentWidth = safeVisibleWidth(stripAnsi(rendered));
      if (currentWidth < expectedWidth) {
        rendered += " ".repeat(expectedWidth - currentWidth);
      }
      if (rowBg) {
        rendered = `${rowBg}${keepBackgroundAcrossResets(rendered, rowBg)}${this.ctx.containerBgAnsi}`;
      }
      lines.push(padRenderedLineWidth(rendered, columnWidth));
      consumed += plainSegment.length;
    }
    return lines;
  }
  gapLine(entry, width) {
    return padRenderedLineWidth(this.ctx.fg("muted", formatGapLabel(entry.hidden)), width);
  }
  omittedLine(entry, width) {
    return padRenderedLineWidth(this.ctx.fg("muted", formatOmittedLabel(entry.count)), width);
  }
  render(width) {
    const safeWidth = Math.max(20, width);
    const columnSeparator = this.ctx.fg("borderMuted", " \u2502 ");
    const separatorWidth = safeVisibleWidth(stripAnsi(columnSeparator));
    const leftWidth = Math.max(20, Math.floor((safeWidth - separatorWidth) / 2));
    const rightWidth = Math.max(20, safeWidth - separatorWidth - leftWidth);
    const formatHeaderCell = (label, columnWidth) => {
      const markerPad = "  ";
      const lineNumberLabel = fitToWidth(label, this.ctx.lineNumberWidth);
      const prefixAnsi = this.ctx.fg("dim", markerPad) + this.ctx.fg("dim", lineNumberLabel) + this.ctx.fg("borderMuted", " \u2502 ");
      const prefixPlain = `${markerPad}${stripAnsi(lineNumberLabel)} \u2502 `;
      const codeWidth = Math.max(0, columnWidth - safeVisibleWidth(prefixPlain));
      return padRenderedLineWidth(prefixAnsi + " ".repeat(codeWidth), columnWidth);
    };
    const lines = [];
    lines.push(
      padRenderedLineWidth(
        formatHeaderCell("old", leftWidth) + columnSeparator + formatHeaderCell("new", rightWidth),
        safeWidth
      )
    );
    for (const entry of this.entries) {
      if (entry.kind === "gap") {
        lines.push(this.gapLine(entry, safeWidth));
        continue;
      }
      if (entry.kind === "omitted") {
        lines.push(this.omittedLine(entry, safeWidth));
        continue;
      }
      const row = entry.row;
      const leftCellLines = this.formatCellLines(row.kind, "left", row.left, leftWidth);
      const rightCellLines = this.formatCellLines(row.kind, "right", row.right, rightWidth);
      const rowHeight = Math.max(leftCellLines.length, rightCellLines.length);
      for (let i = 0; i < rowHeight; i++) {
        const fallbackKind = row.kind === "changed" ? "context" : row.kind;
        const leftCell = leftCellLines[i] ?? this.blankCell(fallbackKind, "left", leftWidth);
        const rightCell = rightCellLines[i] ?? this.blankCell(fallbackKind, "right", rightWidth);
        const joined = padRenderedLineWidth(leftCell + columnSeparator + rightCell, safeWidth);
        lines.push(joined);
      }
    }
    return lines;
  }
};
var AdaptiveDiffComponent = class {
  constructor(theme, rows, maxRows, language) {
    this.rows = rows;
    this.ctx = new DiffRenderContext(theme, rows, language);
    this.stats = { additions: 0, removals: 0 };
    for (const row of rows) {
      if (row.kind === "added" || row.kind === "changed") this.stats.additions++;
      if (row.kind === "removed" || row.kind === "changed") this.stats.removals++;
    }
    const entries = planEntries(rows, maxRows);
    this.collapsed = entries.some((entry) => entry.kind !== "row");
    this.unified = new UnifiedDiffRenderer(this.ctx, entries);
    this.split = new SplitDiffRenderer(this.ctx, entries);
  }
  rows;
  cacheWidth;
  cacheLines;
  ctx;
  stats;
  unified;
  split;
  collapsed;
  /** True when any unchanged context was collapsed or rows were omitted. */
  hasCollapsed() {
    return this.collapsed;
  }
  modeForWidth(width) {
    return pickDiffMode(this.stats, this.rows, Math.max(20, width));
  }
  render(width) {
    if (this.cacheWidth === width && this.cacheLines) return this.cacheLines;
    const safeWidth = Math.max(20, width);
    const mode = this.modeForWidth(safeWidth);
    const lines = mode === "split" ? this.split.render(safeWidth) : this.unified.render(safeWidth);
    this.cacheWidth = width;
    this.cacheLines = lines;
    return lines;
  }
  invalidate() {
    this.cacheWidth = void 0;
    this.cacheLines = void 0;
  }
};

// extension-src/omp-theme/features/tools/boxed/git.ts
var GIT_SHORT_STATUS_FLAGS = /* @__PURE__ */ new Set(["-s", "--short", "--porcelain"]);
var GIT_DIFF_FORMAT_REJECT = /* @__PURE__ */ new Set([
  "-p",
  "--patch",
  "--numstat",
  "--shortstat",
  "--dirstat",
  "--summary",
  "--name-only",
  "--name-status",
  "--raw",
  "--word-diff"
]);
var GIT_DIFF_PATCH_REJECT = /* @__PURE__ */ new Set([
  "--numstat",
  "--shortstat",
  "--dirstat",
  "--summary",
  "--name-only",
  "--name-status",
  "--raw",
  "--word-diff",
  "--binary",
  "--no-patch",
  "-s",
  "--patch-with-stat",
  "--patch-with-raw"
]);
var GIT_SHOW_REJECT = /* @__PURE__ */ new Set([...GIT_DIFF_PATCH_REJECT, "--stat", "--oneline", "--format", "--pretty"]);
var GIT_SHOW_STAT_REJECT = /* @__PURE__ */ new Set([...GIT_DIFF_PATCH_REJECT, "-p", "--patch", "--oneline"]);
var GIT_LOG_FORMAT_REJECT = /* @__PURE__ */ new Set([
  "-p",
  "--patch",
  "--stat",
  "--numstat",
  "--shortstat",
  "--dirstat",
  "--summary",
  "--name-only",
  "--name-status",
  "--raw",
  "--graph",
  "--format",
  "--pretty",
  "--word-diff",
  "--color",
  "--show-signature"
]);
var GIT_COMMIT_REJECT = /* @__PURE__ */ new Set([
  "-v",
  "--verbose",
  "-p",
  "--patch",
  "-i",
  "--interactive",
  "--porcelain",
  "--dry-run"
]);
var GIT_PUSH_REJECT = /* @__PURE__ */ new Set(["--porcelain", "-v", "--verbose", "--dry-run", "-n"]);
var GIT_PULL_REJECT = /* @__PURE__ */ new Set(["-v", "--verbose", "--rebase"]);
var GIT_FETCH_REJECT = /* @__PURE__ */ new Set(["-v", "--verbose", "--dry-run"]);
var GIT_SWITCH_REJECT = /* @__PURE__ */ new Set(["-p", "--patch", "-i", "--interactive", "--orphan"]);
var GIT_ADD_REJECT = /* @__PURE__ */ new Set(["-p", "--patch", "-i", "--interactive", "-v", "--verbose"]);
var GIT_RESET_REJECT = /* @__PURE__ */ new Set(["-p", "--patch"]);
var GIT_MERGE_REJECT = /* @__PURE__ */ new Set(["-v", "--verbose"]);
var GIT_REBASE_REJECT = /* @__PURE__ */ new Set(["-i", "--interactive", "-x", "--exec"]);
function classifyGitCommand(command) {
  const shape2 = parseSimpleBashCommand(command);
  if (!shape2) return null;
  const rest = shape2.tokens;
  if ((rest[0] ?? "").split("/").pop() !== "git") return null;
  const args = rest.slice(1);
  if (args.length === 0) return null;
  const sub = args[0] ?? "";
  if (sub === "status") {
    if (args.some((arg) => arg === "-z" || arg === "--null" || arg.startsWith("--porcelain=v2"))) return null;
    const short = args.some((arg) => GIT_SHORT_STATUS_FLAGS.has(arg) || /^-[sS][a-zA-Z]*$/.test(arg)) || args.some((arg) => arg.startsWith("--porcelain=v1"));
    return { kind: "status", short };
  }
  if (sub === "diff") {
    const hasStat = args.some((arg) => arg === "--stat" || arg.startsWith("--stat="));
    if (hasStat) {
      if (args.some(
        (arg) => GIT_DIFF_FORMAT_REJECT.has(arg) || arg.startsWith("--format=") || arg.startsWith("--pretty=")
      )) {
        return null;
      }
      return { kind: "diff-stat" };
    }
    if (args.some((arg) => GIT_DIFF_PATCH_REJECT.has(arg) || arg.startsWith("--word-diff="))) {
      return null;
    }
    return { kind: "diff", show: false };
  }
  if (sub === "show") {
    const hasStat = args.some((arg) => arg === "--stat" || arg.startsWith("--stat="));
    if (hasStat) {
      if (args.some(
        (arg) => GIT_SHOW_STAT_REJECT.has(arg) || /^-[A-Za-z]*p[A-Za-z]*$/.test(arg) || arg.startsWith("--word-diff=") || arg.startsWith("--format=") || arg.startsWith("--pretty=")
      )) {
        return null;
      }
      return { kind: "show-stat" };
    }
    if (args.some(
      (arg) => GIT_SHOW_REJECT.has(arg) || arg.startsWith("--word-diff=") || arg.startsWith("--format=") || arg.startsWith("--pretty=")
    )) {
      return null;
    }
    return { kind: "diff", show: true };
  }
  if (sub === "log") {
    if (args.some((arg) => GIT_LOG_FORMAT_REJECT.has(arg) || arg.startsWith("--format=") || arg.startsWith("--pretty="))) {
      return null;
    }
    return { kind: "log" };
  }
  if (sub === "commit") {
    if (args.some((arg) => GIT_COMMIT_REJECT.has(arg) || /^-[A-Za-z]*[vpi][A-Za-z]*$/.test(arg))) return null;
    return { kind: "action", command: "commit" };
  }
  if (sub === "push") {
    if (args.some((arg) => GIT_PUSH_REJECT.has(arg) || /^-[A-Za-z]*[vn][A-Za-z]*$/.test(arg))) return null;
    return { kind: "action", command: "push" };
  }
  if (sub === "pull") {
    if (args.some((arg) => GIT_PULL_REJECT.has(arg) || /^-[A-Za-z]*v[A-Za-z]*$/.test(arg))) return null;
    return { kind: "action", command: "pull" };
  }
  if (sub === "fetch") {
    if (args.some((arg) => GIT_FETCH_REJECT.has(arg) || /^-[A-Za-z]*v[A-Za-z]*$/.test(arg))) return null;
    return { kind: "action", command: "fetch" };
  }
  if (sub === "switch" || sub === "checkout") {
    if (args.some((arg) => GIT_SWITCH_REJECT.has(arg) || /^-[A-Za-z]*[pi][A-Za-z]*$/.test(arg))) return null;
    return { kind: "action", command: sub };
  }
  if (sub === "add" || sub === "restore") {
    if (args.some((arg) => GIT_ADD_REJECT.has(arg) || /^-[A-Za-z]*[piv][A-Za-z]*$/.test(arg))) return null;
    return { kind: "action", command: sub };
  }
  if (sub === "reset") {
    if (args.some((arg) => GIT_RESET_REJECT.has(arg) || /^-[A-Za-z]*p[A-Za-z]*$/.test(arg))) return null;
    return { kind: "action", command: "reset" };
  }
  if (sub === "merge") {
    if (args.some((arg) => GIT_MERGE_REJECT.has(arg) || /^-[A-Za-z]*v[A-Za-z]*$/.test(arg))) return null;
    return { kind: "action", command: "merge" };
  }
  if (sub === "rebase") {
    if (args.some(
      (arg) => GIT_REBASE_REJECT.has(arg) || arg.startsWith("--exec=") || /^-[A-Za-z]*[ix][A-Za-z]*$/.test(arg)
    ))
      return null;
    return { kind: "action", command: "rebase" };
  }
  return null;
}
var LONG_STATUS_VERBS = {
  "new file": ["A", " "],
  modified: ["M", " "],
  deleted: ["D", " "],
  renamed: ["R", " "],
  copied: ["C", " "],
  typechange: ["T", " "],
  "both modified": ["U", "U"],
  "both added": ["A", "A"],
  "both deleted": ["D", "D"],
  "added by us": ["A", "U"],
  "added by them": ["U", "A"],
  "deleted by us": ["D", "U"],
  "deleted by them": ["U", "D"],
  unmerged: ["U", "U"]
};
var LONG_SECTION_HEADERS = {
  "Changes to be committed:": "staged",
  "Changes not staged for commit:": "unstaged",
  "Untracked files:": "untracked",
  "Ignored files:": "ignored",
  "Unmerged paths:": "unmerged"
};
var LONG_STATUS_ENTRY = /^([a-z ]+?):\s+(.+)$/;
var LONG_BRANCH = /^On branch (.+)$/;
var LONG_DETACHED = /^HEAD detached at ([0-9a-f]+)/;
var LONG_AHEAD = /^Your branch is ahead of '(.*)' by (\d+) commit/;
var LONG_BEHIND = /^Your branch is behind '(.*)' by (\d+) commit/;
var LONG_DIVERGED = /^Your branch and '(.*)' have diverged/;
var LONG_DIVERGED_COUNTS = /^and have (\d+) and (\d+) different commits each/;
function parseGitStatusLong(text2) {
  const files = [];
  let branch;
  let ahead;
  let behind;
  let diverged = false;
  let section = null;
  let divergedNext = false;
  let sawContent = false;
  for (const rawLine of text2.split("\n")) {
    const line = rawLine.trimEnd();
    if (line === "") continue;
    const branchMatch = LONG_BRANCH.exec(line);
    if (branchMatch) {
      sawContent = true;
      branch = branchMatch[1];
      continue;
    }
    const detached = LONG_DETACHED.exec(line);
    if (detached) {
      sawContent = true;
      branch = detached[1];
      continue;
    }
    const aheadMatch = LONG_AHEAD.exec(line);
    if (aheadMatch) {
      sawContent = true;
      ahead = Number(aheadMatch[2]);
      continue;
    }
    const behindMatch = LONG_BEHIND.exec(line);
    if (behindMatch) {
      sawContent = true;
      behind = Number(behindMatch[2]);
      continue;
    }
    const divergedMatch = LONG_DIVERGED.exec(line);
    if (divergedMatch) {
      sawContent = true;
      diverged = true;
      divergedNext = true;
      continue;
    }
    if (divergedNext) {
      const counts = LONG_DIVERGED_COUNTS.exec(line);
      if (!counts) return null;
      sawContent = true;
      ahead = Number(counts[1]);
      behind = Number(counts[2]);
      divergedNext = false;
      continue;
    }
    const sectionHeader = LONG_SECTION_HEADERS[line];
    if (sectionHeader !== void 0) {
      sawContent = true;
      section = sectionHeader;
      continue;
    }
    if (/^\s{2}\(/.test(line)) continue;
    if (line.startsWith("no changes added to commit") || line === "nothing to commit, working tree clean" || line === "You have unmerged paths." || line === "No commits yet") {
      sawContent = true;
      continue;
    }
    if (line.startsWith("Your branch is up to date with ")) {
      sawContent = true;
      continue;
    }
    if (line.startsWith("	")) {
      const body = line.slice(1).trimStart();
      if (!body) return null;
      if (section === "untracked" || section === "ignored") {
        const mark = section === "untracked" ? "?" : "!";
        sawContent = true;
        files.push({ x: mark, y: mark, path: body });
        continue;
      }
      const verbMatch = LONG_STATUS_ENTRY.exec(body);
      if (!verbMatch) return null;
      const xy = LONG_STATUS_VERBS[verbMatch[1] ?? ""];
      if (!xy) return null;
      const path = (verbMatch[2] ?? "").trim();
      if (!path) return null;
      sawContent = true;
      if (section === "staged") files.push({ x: xy[0], y: " ", path });
      else if (section === "unstaged") files.push({ x: " ", y: xy[0], path });
      else files.push({ x: xy[0], y: xy[1], path });
      continue;
    }
    return null;
  }
  if (divergedNext) return null;
  if (!sawContent) return null;
  return {
    kind: "status",
    files,
    ...branch !== void 0 ? { branch } : {},
    ...ahead !== void 0 ? { ahead } : {},
    ...behind !== void 0 ? { behind } : {},
    ...diverged ? { diverged: true } : {}
  };
}
var SHORT_STATUS_BRANCH = /^## (.+)$/;
var SHORT_STATUS_BRANCH_DETAIL = /^(.+?)(?:\.\.\.(.+?))?(?: \[([^\]]+)\])?$/;
var SHORT_STATUS_FILE = /^([ MADRCU?!])([ MADRCU?!]) (.*)$/;
function parseGitStatusShort(text2) {
  if (text2.includes("\0")) return null;
  const files = [];
  let branch;
  let ahead;
  let behind;
  let diverged = false;
  let sawStatus = false;
  for (const rawLine of text2.split("\n")) {
    const line = rawLine.trimEnd();
    if (line === "") continue;
    const branchLine = SHORT_STATUS_BRANCH.exec(line);
    if (branchLine) {
      sawStatus = true;
      const detail = SHORT_STATUS_BRANCH_DETAIL.exec(branchLine[1] ?? "");
      if (detail) {
        branch = detail[1];
        const bracket = detail[3];
        if (bracket) {
          const aheadM = /ahead (\d+)/.exec(bracket);
          const behindM = /behind (\d+)/.exec(bracket);
          if (aheadM) ahead = Number(aheadM[1]);
          if (behindM) behind = Number(behindM[1]);
          if (aheadM && behindM) diverged = true;
        }
      }
      continue;
    }
    const fileMatch = SHORT_STATUS_FILE.exec(line);
    if (!fileMatch) return null;
    sawStatus = true;
    files.push({ x: fileMatch[1] ?? "", y: fileMatch[2] ?? "", path: fileMatch[3] ?? "" });
  }
  if (!sawStatus && text2.trim() !== "") return null;
  return {
    kind: "status",
    files,
    ...branch !== void 0 ? { branch } : {},
    ...ahead !== void 0 ? { ahead } : {},
    ...behind !== void 0 ? { behind } : {},
    ...diverged ? { diverged: true } : {}
  };
}
function parseGitStatus(cls, text2) {
  if (cls.kind !== "status") return null;
  return cls.short ? parseGitStatusShort(text2) : parseGitStatusLong(text2);
}
var DIFF_STAT_SUMMARY = /^\s*(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?$/;
var DIFF_STAT_FILE = /^(.*)\s+\|\s+(\d+)\s*.*$/;
var DIFF_STAT_BINARY = /^(.*)\s+\|\s+Bin\s+.*$/;
function parseGitDiffStat(text2) {
  const files = [];
  let filesChanged;
  let insertions;
  let deletions;
  let sawLine = false;
  for (const rawLine of text2.split("\n")) {
    const line = rawLine.trimEnd();
    if (line === "") continue;
    sawLine = true;
    const summary = DIFF_STAT_SUMMARY.exec(line);
    if (summary) {
      filesChanged = Number(summary[1]);
      if (summary[2] !== void 0) insertions = Number(summary[2]);
      if (summary[3] !== void 0) deletions = Number(summary[3]);
      continue;
    }
    const binary = DIFF_STAT_BINARY.exec(line);
    if (binary) {
      const path = (binary[1] ?? "").trim();
      if (!path) return null;
      files.push({ path, binary: true });
      continue;
    }
    const file = DIFF_STAT_FILE.exec(line);
    if (file) {
      const path = (file[1] ?? "").trim();
      if (!path) return null;
      files.push({ path, changes: Number(file[2]) });
      continue;
    }
    return null;
  }
  if (!sawLine) return { kind: "diff-stat", files };
  if (files.length === 0 && filesChanged === void 0) return null;
  return {
    kind: "diff-stat",
    files,
    ...filesChanged !== void 0 ? { filesChanged } : {},
    ...insertions !== void 0 ? { insertions } : {},
    ...deletions !== void 0 ? { deletions } : {}
  };
}
var LOG_COMMIT_LINE = /^commit ([0-9a-f]{4,40})(?: \((.*)\))?$/;
var LOG_ONELINE = /^([0-9a-f]{4,40})(?: \(([^)]*)\))?\s*(.*)$/;
var LOG_HEADER_LINE = /^(?:Author|Date|Merge):/;
var LOG_MESSAGE_LINE = /^\s{4}(.*)$/;
function parseGitLog(text2) {
  const lines = text2.split("\n").map((line) => line.trimEnd()).filter((line) => line.length > 0);
  if (lines.length === 0) return { kind: "log", commits: [] };
  if (lines.every((line) => LOG_ONELINE.test(line))) {
    const commits2 = lines.map((line) => {
      const match = LOG_ONELINE.exec(line);
      const refs = match?.[2];
      return {
        hash: match?.[1] ?? "",
        ...refs ? { refs } : {},
        subject: (match?.[3] ?? "").trim()
      };
    });
    return { kind: "log", commits: commits2 };
  }
  const commits = [];
  let current = null;
  for (const line of lines) {
    const start = LOG_COMMIT_LINE.exec(line);
    if (start) {
      current = {
        hash: start[1] ?? "",
        ...start[2] ? { refs: start[2] } : {},
        subject: ""
      };
      commits.push(current);
      continue;
    }
    if (!current) return null;
    if (LOG_HEADER_LINE.test(line)) continue;
    const message = LOG_MESSAGE_LINE.exec(line);
    if (message) {
      if (current.subject === "") current.subject = (message[1] ?? "").trim();
      continue;
    }
    return null;
  }
  if (commits.length === 0) return null;
  return { kind: "log", commits };
}
function parseGitShowStat(text2) {
  const lines = String(text2 ?? "").replace(/\r/g, "").split("\n").map((line) => line.trimEnd());
  let i = 0;
  while (i < lines.length && (lines[i] ?? "") === "") i++;
  if (i >= lines.length) return null;
  const commitMatch = LOG_COMMIT_LINE.exec(lines[i] ?? "");
  if (!commitMatch) return null;
  const hash = commitMatch[1] ?? "";
  i++;
  let subject = "";
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line === "") {
      i++;
      continue;
    }
    if (LOG_HEADER_LINE.test(line)) {
      i++;
      continue;
    }
    const message = LOG_MESSAGE_LINE.exec(line);
    if (message) {
      if (subject === "") subject = (message[1] ?? "").trim();
      i++;
      continue;
    }
    break;
  }
  const stat = parseGitDiffStat(lines.slice(i).join("\n"));
  if (!stat) return null;
  return {
    kind: "show-stat",
    hash,
    subject,
    files: stat.files,
    ...stat.filesChanged !== void 0 ? { filesChanged: stat.filesChanged } : {},
    ...stat.insertions !== void 0 ? { insertions: stat.insertions } : {},
    ...stat.deletions !== void 0 ? { deletions: stat.deletions } : {}
  };
}
var DIFF_GIT_HEADER = /^diff --git a\/(.*) b\/(.*)$/;
var HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
var NEW_FILE_MODE = /^new file mode /;
var DELETED_FILE_MODE = /^deleted file mode /;
function stripDiffPathPrefix(rawPath) {
  let path = rawPath;
  if (path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1);
  if (path.startsWith("a/")) return path.slice(2);
  if (path.startsWith("b/")) return path.slice(2);
  return path;
}
function parseDiffChunk(chunk) {
  const header = chunk[0] ?? "";
  const dgMatch = DIFF_GIT_HEADER.exec(header);
  if (!dgMatch) return null;
  const dgOld = dgMatch[1] ?? void 0;
  const dgNew = dgMatch[2] ?? void 0;
  let oldPath;
  let newPath;
  let status;
  let binary = false;
  let renameDetected = false;
  const bodyLines = [];
  let additions = 0;
  let removals = 0;
  let inHunk = false;
  let oldLine = 0;
  let newLine = 0;
  for (let i = 1; i < chunk.length; i++) {
    const line = chunk[i] ?? "";
    const hunk = HUNK_HEADER.exec(line);
    if (hunk) {
      oldLine = Number(hunk[1] ?? 0);
      newLine = Number(hunk[2] ?? 0);
      inHunk = true;
      continue;
    }
    if (!inHunk) {
      if (line === "") continue;
      if (line.startsWith("index ")) continue;
      if (NEW_FILE_MODE.test(line)) {
        status = "added";
        continue;
      }
      if (DELETED_FILE_MODE.test(line)) {
        status = "deleted";
        continue;
      }
      if (line.startsWith("old mode ") || line.startsWith("new mode ")) continue;
      if (line.startsWith("similarity index ") || line.startsWith("dissimilarity index ")) {
        renameDetected = true;
        continue;
      }
      if (line.startsWith("rename from ")) {
        oldPath = line.slice("rename from ".length);
        renameDetected = true;
        status = "renamed";
        continue;
      }
      if (line.startsWith("rename to ")) {
        newPath = line.slice("rename to ".length);
        renameDetected = true;
        status = "renamed";
        continue;
      }
      if (line.startsWith("copy from ") || line.startsWith("copy to ")) continue;
      if (line.startsWith("--- ")) {
        const value = line.slice(4);
        if (value !== "/dev/null") oldPath = stripDiffPathPrefix(value);
        continue;
      }
      if (line.startsWith("+++ ")) {
        const value = line.slice(4);
        if (value !== "/dev/null") newPath = stripDiffPathPrefix(value);
        continue;
      }
      if (line.startsWith("Binary files ") || line === "Binary files differ") {
        binary = true;
        const bm = line.match(/^Binary files (?:a\/(\S*) )?and (?:b\/(\S*) )?differ/);
        if (bm) {
          if (!oldPath && bm[1]) oldPath = bm[1];
          if (!newPath && bm[2]) newPath = bm[2];
        }
        continue;
      }
      if (line.startsWith("GIT binary patch")) return null;
      return null;
    }
    if (line.startsWith("\\ No newline")) continue;
    if (line.startsWith("+")) {
      bodyLines.push(`+ ${newLine} ${line.slice(1)}`);
      newLine++;
      additions++;
      continue;
    }
    if (line.startsWith("-")) {
      bodyLines.push(`- ${oldLine} ${line.slice(1)}`);
      oldLine++;
      removals++;
      continue;
    }
    if (line.startsWith(" ")) {
      bodyLines.push(` ${oldLine} ${line.slice(1)}`);
      oldLine++;
      newLine++;
      continue;
    }
    if (line === "") {
      bodyLines.push(` ${oldLine} `);
      oldLine++;
      newLine++;
      continue;
    }
    return null;
  }
  if (!newPath) newPath = dgNew;
  if (!oldPath) oldPath = dgOld;
  let displayPath3;
  if (renameDetected && oldPath && newPath && oldPath !== newPath) {
    displayPath3 = `${oldPath} => ${newPath}`;
  } else {
    displayPath3 = newPath ?? oldPath ?? "(unknown)";
  }
  if (!status) {
    if (binary) status = "modified";
    else if (oldPath && newPath) status = "modified";
    else if (newPath && !oldPath) status = "added";
    else if (oldPath && !newPath) status = "deleted";
  }
  return {
    path: displayPath3,
    ...status ? { status } : {},
    ...binary ? { binary: true } : {},
    additions,
    removals,
    body: bodyLines.join("\n")
  };
}
function parseUnifiedDiff(text2) {
  if (text2 === "") return [];
  const lines = text2.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const chunks = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      if (current) chunks.push(current);
      current = [line];
    } else if (current) {
      current.push(line);
    } else {
      return null;
    }
  }
  if (current) chunks.push(current);
  if (chunks.length === 0) return null;
  const files = [];
  for (const chunk of chunks) {
    const file = parseDiffChunk(chunk);
    if (!file) return null;
    files.push(file);
  }
  return files;
}
var SHOW_COMMIT_LINE = /^commit ([0-9a-f]{4,40})/;
var SHOW_SUBJECT_LINE = /^ {4}(.+)$/;
function parseGitDiff(text2, show) {
  const raw = String(text2 ?? "").replace(/\r/g, "");
  let body = raw;
  let hash;
  let subject;
  if (show) {
    const diffIndex = raw.indexOf("diff --git");
    if (diffIndex < 0) return null;
    const headerPart = raw.slice(0, diffIndex);
    body = raw.slice(diffIndex);
    const commitMatch = SHOW_COMMIT_LINE.exec(headerPart);
    if (commitMatch) hash = commitMatch[1];
    for (const headerLine of headerPart.split("\n")) {
      const subjectMatch = SHOW_SUBJECT_LINE.exec(headerLine);
      if (subjectMatch) {
        subject = (subjectMatch[1] ?? "").trim();
        break;
      }
    }
  }
  const files = parseUnifiedDiff(body);
  if (!files) return null;
  return {
    kind: "diff",
    show,
    files,
    ...hash !== void 0 ? { hash } : {},
    ...subject !== void 0 ? { subject } : {}
  };
}
var COMMIT_SUCCESS = /^\[(\S+) ([0-9a-f]{7,40})\] (.*)$/;
var REF_CHAR_LABEL = /^([*=.-]) (?:\[([^\]]*)\]|(\S+))\s+(\S+)\s+->\s+(\S+)$/;
var REF_RANGE = /^([0-9a-f]{4,}\.\.[0-9a-f]{4,})\s+(\S+)\s+->\s+(\S+)$/;
function normalizeRefLine(trimmed) {
  const labeled = REF_CHAR_LABEL.exec(trimmed);
  if (labeled) {
    const marker2 = labeled[1] ?? "";
    const label = labeled[2] !== void 0 ? `[${labeled[2]}]` : labeled[3] ?? "";
    return `${marker2} ${label} ${labeled[4]} -> ${labeled[5]}`;
  }
  const range = REF_RANGE.exec(trimmed);
  if (range) return `${range[1]} ${range[2]} -> ${range[3]}`;
  return null;
}
function isProgressNoise(line) {
  return /^(?:Enumerating|Counting|Compressing|Writing|Deltaing|Resolving|Using) objects:/i.test(line) || /^Total \d+/i.test(line) || line.startsWith("remote: ") || line.startsWith("remote:");
}
function parseGitCommit(text2) {
  const lines = String(text2 ?? "").replace(/\r/g, "").split("\n").map((line) => line.trimEnd());
  let start = 0;
  while (start < lines.length && (lines[start] ?? "") === "") start++;
  let end = lines.length;
  while (end > start && (lines[end - 1] ?? "") === "") end--;
  const body = lines.slice(start, end);
  if (body.length === 0) return null;
  const head = COMMIT_SUCCESS.exec(body[0] ?? "");
  if (head) {
    const branch = head[1] ?? "";
    const hash = head[2] ?? "";
    const subject = (head[3] ?? "").trim();
    if (!branch || !hash) return null;
    let filesChanged;
    let insertions;
    let deletions;
    for (const line of body.slice(1)) {
      const summary = DIFF_STAT_SUMMARY.exec(line);
      if (!summary) return null;
      filesChanged = Number(summary[1]);
      if (summary[2] !== void 0) insertions = Number(summary[2]);
      if (summary[3] !== void 0) deletions = Number(summary[3]);
    }
    return {
      kind: "action",
      command: "commit",
      files: [],
      branch,
      hash,
      ...subject ? { subject } : {},
      ...filesChanged !== void 0 ? { filesChanged } : {},
      ...insertions !== void 0 ? { insertions } : {},
      ...deletions !== void 0 ? { deletions } : {}
    };
  }
  const first = body[0] ?? "";
  const last = body[body.length - 1] ?? "";
  const cleanNothing = body.some((line) => line === "nothing to commit, working tree clean");
  const unstagedNothing = last.startsWith("no changes added to commit");
  if (/^On branch .+/.test(first) && (cleanNothing || unstagedNothing)) {
    return { kind: "action", command: "commit", files: [], status: "nothing to commit" };
  }
  return null;
}
function parseGitPush(text2) {
  let remote;
  let status;
  const refs = [];
  let sawContent = false;
  for (const rawLine of String(text2 ?? "").replace(/\r/g, "").split("\n")) {
    const line = rawLine.trimEnd();
    if (line === "") continue;
    if (isProgressNoise(line)) continue;
    if (/^branch '.*' set up to track '.*'\.$/.test(line)) continue;
    if (line.startsWith("Pushing to ")) continue;
    const toLine = /^To (.+)$/.exec(line);
    if (toLine) {
      sawContent = true;
      remote = toLine[1] ?? "";
      continue;
    }
    if (line === "Everything up-to-date") {
      sawContent = true;
      status = "Everything up-to-date";
      continue;
    }
    const ref = normalizeRefLine(line.trim());
    if (ref) {
      sawContent = true;
      refs.push(ref);
      continue;
    }
    return null;
  }
  if (!sawContent) return null;
  return {
    kind: "action",
    command: "push",
    files: [],
    ...remote !== void 0 ? { remote } : {},
    ...status !== void 0 ? { status } : {},
    ...refs.length > 0 ? { refs } : {}
  };
}
function parseGitPull(text2) {
  const lines = String(text2 ?? "").replace(/\r/g, "").split("\n").map((line) => line.trimEnd());
  const nonEmpty = lines.filter((line) => line !== "");
  if (nonEmpty.length === 0) return null;
  if (nonEmpty.length === 1 && nonEmpty[0] === "Already up to date.") {
    return { kind: "action", command: "pull", files: [], status: "Already up to date." };
  }
  let range;
  let ffIndex = -1;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx] ?? "";
    if (line === "") continue;
    if (line.startsWith("From ")) continue;
    if (/^\s+[0-9a-f]{4,}\.\.[0-9a-f]{4,}\s+.+ -> .+$/.test(line)) continue;
    const updating = /^Updating ([0-9a-f]{4,}\.\.[0-9a-f]{4,})$/.exec(line);
    if (updating) {
      range = updating[1] ?? "";
      continue;
    }
    if (line === "Fast-forward") {
      ffIndex = idx;
      break;
    }
    return null;
  }
  if (!range || ffIndex < 0) return null;
  const stat = parseGitDiffStat(lines.slice(ffIndex + 1).join("\n"));
  if (!stat) return null;
  return {
    kind: "action",
    command: "pull",
    files: stat.files,
    status: "Fast-forward",
    range,
    ...stat.filesChanged !== void 0 ? { filesChanged: stat.filesChanged } : {},
    ...stat.insertions !== void 0 ? { insertions: stat.insertions } : {},
    ...stat.deletions !== void 0 ? { deletions: stat.deletions } : {}
  };
}
function parseGitFetch(text2) {
  let remote;
  const refs = [];
  let sawContent = false;
  for (const rawLine of String(text2 ?? "").replace(/\r/g, "").split("\n")) {
    const line = rawLine.trimEnd();
    if (line === "") continue;
    if (isProgressNoise(line)) continue;
    const fromLine = /^From (.+)$/.exec(line);
    if (fromLine) {
      sawContent = true;
      remote = fromLine[1] ?? "";
      continue;
    }
    const ref = normalizeRefLine(line.trim());
    if (ref) {
      sawContent = true;
      refs.push(ref);
      continue;
    }
    return null;
  }
  if (!sawContent) return { kind: "action", command: "fetch", files: [], status: "no new refs" };
  return {
    kind: "action",
    command: "fetch",
    files: [],
    ...remote !== void 0 ? { remote } : {},
    ...refs.length > 0 ? { refs } : {}
  };
}
var DIFF_STAT_NOTICE_LINE = /^\s+(?:create|delete) mode \d+ |^\s+(?:old|new) mode |^\s+mode change |^\s+(?:similarity|dissimilarity) index |^\s+(?:rename|copy) (?:from|to) |^\s+rewrite /;
function parseGitDiffStatTolerant(text2) {
  const filtered = String(text2 ?? "").split("\n").filter((line) => !DIFF_STAT_NOTICE_LINE.test(line)).join("\n");
  return parseGitDiffStat(filtered);
}
var SWITCH_NEW_BRANCH = /^Switched to a new branch '(.+)'$/;
var SWITCH_BRANCH = /^Switched to branch '(.+)'$/;
var SWITCH_ALREADY = /^Already on '(.+)'$/;
var CHECKOUT_PATHS = /^Updated (\d+) paths? from the index$/;
function parseGitSwitchCheckout(text2, command) {
  const significant = [];
  for (const rawLine of String(text2 ?? "").replace(/\r/g, "").split("\n")) {
    const line = rawLine.trimEnd();
    if (line === "") continue;
    if (line.startsWith("Your branch ")) continue;
    if (/^\s+\(/.test(line)) continue;
    significant.push(line);
  }
  if (significant.length === 0) {
    return { kind: "action", command, files: [], status: "completed, no output" };
  }
  if (significant.length === 1) {
    const line = significant[0] ?? "";
    const created = SWITCH_NEW_BRANCH.exec(line);
    if (created && created[1] !== void 0)
      return { kind: "action", command, files: [], branch: created[1], created: true };
    const existing = SWITCH_BRANCH.exec(line);
    if (existing && existing[1] !== void 0) return { kind: "action", command, files: [], branch: existing[1] };
    const already = SWITCH_ALREADY.exec(line);
    if (already && already[1] !== void 0) return { kind: "action", command, files: [], branch: already[1] };
    const paths = CHECKOUT_PATHS.exec(line);
    if (paths) {
      const count = Number(paths[1]);
      return {
        kind: "action",
        command,
        files: [],
        status: `Updated ${count} ${pluralForm("file", count)} from the index`
      };
    }
  }
  return null;
}
function parseGitAddRestore(text2, command) {
  const body = String(text2 ?? "").replace(/\r/g, "");
  if (body.trim() === "") {
    return { kind: "action", command, files: [], status: "completed, no output" };
  }
  return null;
}
var RESET_HEAD_NOW = /^HEAD is now at ([0-9a-f]{4,40}) (.*)$/;
var RESET_UNSTAGED_HEADER = "Unstaged changes after reset:";
var RESET_UNSTAGED_ROW = /^([MADRC?!]{1,2})\t(.+)$/;
function parseGitReset(text2) {
  const lines = String(text2 ?? "").replace(/\r/g, "").split("\n").map((line) => line.trimEnd());
  const nonEmpty = lines.filter((line) => line !== "");
  if (nonEmpty.length === 0) {
    return { kind: "action", command: "reset", files: [], status: "completed, no output" };
  }
  if (nonEmpty.length === 1) {
    const head = RESET_HEAD_NOW.exec(nonEmpty[0] ?? "");
    if (head && head[1] !== void 0) {
      const subject = (head[2] ?? "").trim();
      return {
        kind: "action",
        command: "reset",
        files: [],
        hash: head[1],
        ...subject ? { subject } : {}
      };
    }
    return null;
  }
  if ((nonEmpty[0] ?? "") === RESET_UNSTAGED_HEADER) {
    const resetFiles = [];
    for (const row of nonEmpty.slice(1)) {
      const match = RESET_UNSTAGED_ROW.exec(row ?? "");
      if (!match) return null;
      const marker2 = match[1] ?? "";
      resetFiles.push({ x: marker2[0] ?? " ", y: marker2[1] ?? " ", path: match[2] ?? "" });
    }
    if (resetFiles.length === 0) return null;
    return { kind: "action", command: "reset", files: [], resetFiles };
  }
  return null;
}
var MERGE_UPDATING = /^Updating ([0-9a-f]{4,}\.\.[0-9a-f]{4,})$/;
var MERGE_MADE = /^Merge made by the '.*' strategy\.$/;
function parseGitMerge(text2) {
  const lines = String(text2 ?? "").replace(/\r/g, "").split("\n").map((line) => line.trimEnd());
  let start = 0;
  while (start < lines.length && (lines[start] ?? "") === "") start++;
  let end = lines.length;
  while (end > start && (lines[end - 1] ?? "") === "") end--;
  const body = lines.slice(start, end);
  if (body.length === 0) return null;
  if (body.length === 1 && (body[0] ?? "") === "Already up to date.") {
    return { kind: "action", command: "merge", files: [], status: "Already up to date." };
  }
  let idx = 0;
  let range;
  const updating = MERGE_UPDATING.exec(body[0] ?? "");
  if (updating) {
    range = updating[1];
    idx = 1;
  }
  const marker2 = body[idx] ?? "";
  if (range && marker2 === "Fast-forward") {
    const stat = parseGitDiffStatTolerant(body.slice(idx + 1).join("\n"));
    if (!stat) return null;
    return {
      kind: "action",
      command: "merge",
      files: stat.files,
      status: "Fast-forward",
      range,
      ...stat.filesChanged !== void 0 ? { filesChanged: stat.filesChanged } : {},
      ...stat.insertions !== void 0 ? { insertions: stat.insertions } : {},
      ...stat.deletions !== void 0 ? { deletions: stat.deletions } : {}
    };
  }
  if (MERGE_MADE.exec(marker2)) {
    const stat = parseGitDiffStatTolerant(body.slice(idx + 1).join("\n"));
    if (!stat) return null;
    return {
      kind: "action",
      command: "merge",
      files: stat.files,
      status: marker2,
      ...stat.filesChanged !== void 0 ? { filesChanged: stat.filesChanged } : {},
      ...stat.insertions !== void 0 ? { insertions: stat.insertions } : {},
      ...stat.deletions !== void 0 ? { deletions: stat.deletions } : {}
    };
  }
  return null;
}
var REBASE_SUCCESS = /^Successfully rebased and updated refs\/heads\/(.+)$/;
var REBASE_UPTODATE = /^Current branch (.+) is up to date\.$/;
function parseGitRebase(text2) {
  const significant = [];
  for (const rawLine of String(text2 ?? "").replace(/\r/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    if (line === "") continue;
    if (/^Rebasing \(\d+\/\d+\)/.test(line)) continue;
    if (/^Rewriting commits \(\d+\/\d+\)/.test(line)) continue;
    significant.push(line);
  }
  if (significant.length === 1) {
    const line = significant[0] ?? "";
    const success = REBASE_SUCCESS.exec(line);
    if (success && success[1] !== void 0)
      return {
        kind: "action",
        command: "rebase",
        files: [],
        branch: success[1].replace(/\.$/, ""),
        status: "Rebased"
      };
    const upToDate = REBASE_UPTODATE.exec(line);
    if (upToDate && upToDate[1] !== void 0)
      return { kind: "action", command: "rebase", files: [], branch: upToDate[1], status: "Up to date." };
  }
  return null;
}
function parseGitAction(command, text2) {
  if (command === "commit") return parseGitCommit(text2);
  if (command === "push") return parseGitPush(text2);
  if (command === "pull") return parseGitPull(text2);
  if (command === "fetch") return parseGitFetch(text2);
  if (command === "switch" || command === "checkout") return parseGitSwitchCheckout(text2, command);
  if (command === "add" || command === "restore") return parseGitAddRestore(text2, command);
  if (command === "reset") return parseGitReset(text2);
  if (command === "merge") return parseGitMerge(text2);
  return parseGitRebase(text2);
}
var GIT_ICON = "\uE725";
var GIT_CARD_HEAD_LIMIT = 6;
var GIT_CONFLICT_PAIRS = /* @__PURE__ */ new Set(["UU", "AA", "DD", "AU", "UA", "DU", "UD"]);
function gitCardHeader(theme, cls, parsed) {
  const icon = getToolsRenderConfig().nerdFonts ? `${GIT_ICON} ` : "";
  let prefix;
  if (cls.kind === "diff") {
    const label = cls.show ? "Git show" : "Git diff";
    prefix = `${icon}${label}`;
    if (cls.show && parsed?.kind === "diff" && parsed.hash) {
      const shortHash = parsed.hash.slice(0, 7);
      prefix += ` \xB7 ${shortHash}`;
      if (parsed.subject) prefix += ` \xB7 ${parsed.subject}`;
    }
  } else if (cls.kind === "show-stat") {
    prefix = `${icon}Git show`;
    if (parsed?.kind === "show-stat") {
      prefix += ` \xB7 ${parsed.hash.slice(0, 7)}`;
      if (parsed.subject) prefix += ` \xB7 ${parsed.subject}`;
    }
  } else if (cls.kind === "action") {
    const label = cls.command === "commit" ? "Git commit" : cls.command === "push" ? "Git push" : cls.command === "pull" ? "Git pull" : cls.command === "fetch" ? "Git fetch" : cls.command === "switch" ? "Git switch" : cls.command === "checkout" ? "Git checkout" : cls.command === "add" ? "Git add" : cls.command === "restore" ? "Git restore" : cls.command === "reset" ? "Git reset" : cls.command === "merge" ? "Git merge" : "Git rebase";
    prefix = `${icon}${label}`;
    if (parsed?.kind === "action") {
      if ((parsed.command === "commit" || parsed.command === "reset") && parsed.hash) {
        prefix += ` \xB7 ${parsed.hash.slice(0, 7)}`;
        if (parsed.subject) prefix += ` \xB7 ${parsed.subject}`;
      } else if ((parsed.command === "switch" || parsed.command === "checkout" || parsed.command === "rebase") && parsed.branch) {
        prefix += ` \xB7 ${parsed.branch}`;
      }
    }
  } else {
    const label = cls.kind === "status" ? "Git status" : cls.kind === "diff-stat" ? "Git diff --stat" : "Git log";
    prefix = `${icon}${label}`;
  }
  return typeof theme?.bold === "function" ? theme.bold(prefix) : prefix;
}
function statusMarker(file) {
  const xy = `${file.x}${file.y}`;
  if (GIT_CONFLICT_PAIRS.has(xy)) return "U";
  if (file.x === "?" || file.x === "!") return file.x;
  const staged = file.x !== " " ? file.x : "";
  const worktree = file.y !== " " && file.y !== "?" && file.y !== "!" ? file.y : "";
  return `${staged}${worktree}` || " ";
}
function statusMarkColor(file) {
  const xy = `${file.x}${file.y}`;
  if (GIT_CONFLICT_PAIRS.has(xy)) return "error";
  if (file.x === "?") return "warning";
  if (file.x === "!") return "dim";
  if (file.x !== " ") return "accent";
  return "toolOutput";
}
function statusCounts(theme, parsed) {
  let staged = 0;
  let modified = 0;
  let untracked = 0;
  let ignored = 0;
  let conflicted = 0;
  for (const file of parsed.files) {
    const xy = `${file.x}${file.y}`;
    if (GIT_CONFLICT_PAIRS.has(xy)) conflicted++;
    else if (file.x === "?" || file.x === "!") {
      if (file.x === "!") ignored++;
      else untracked++;
    } else if (file.x !== " ") staged++;
    else if (file.y !== " ") modified++;
  }
  const parts = [];
  if (conflicted > 0) parts.push(theme.fg("error", `${conflicted} conflicted`));
  if (staged > 0) parts.push(theme.fg("accent", `${staged} staged`));
  if (modified > 0) parts.push(theme.fg("accent", `${modified} modified`));
  if (untracked > 0) parts.push(theme.fg("warning", `${untracked} untracked`));
  if (ignored > 0) parts.push(theme.fg("dim", `${ignored} ignored`));
  return parts;
}
function renderStatusCard(theme, parsed, out, width) {
  const counts = statusCounts(theme, parsed);
  if (counts.length > 0) out.push(`  ${counts.join(theme.fg("dim", " \xB7 "))}`);
  else out.push(theme.fg("muted", "  nothing to commit, working tree clean"));
  if (parsed.branch && (parsed.ahead !== void 0 || parsed.behind !== void 0)) {
    const parts = [theme.fg("text", parsed.branch)];
    if (parsed.ahead !== void 0) parts.push(theme.fg("accent", `ahead ${parsed.ahead}`));
    if (parsed.behind !== void 0) parts.push(theme.fg("warning", `behind ${parsed.behind}`));
    out.push(`  ${parts.join(theme.fg("dim", " \xB7 "))}`);
  }
  const files = parsed.files;
  return renderStatusFileRows(theme, files, out, width);
}
function renderStatusFileRows(theme, files, out, width) {
  const visible = files.slice(0, GIT_CARD_HEAD_LIMIT);
  const more = files.length - visible.length;
  const lastIndex = visible.length - 1;
  for (let i = 0; i < visible.length; i++) {
    const file = visible[i];
    if (!file) continue;
    const branch = i < lastIndex || more > 0 ? "\u251C\u2500" : "\u2514\u2500";
    const mark = statusMarker(file);
    const line = `${TREE_INDENT}${dimLine(branch)} ${theme.fg(statusMarkColor(file), mark)}  ${theme.fg("toolOutput", file.path)}`;
    out.push(safeTruncateToWidth(line, width, "\u2026"));
  }
  if (more > 0) {
    out.push(
      safeTruncateToWidth(
        `${TREE_INDENT}${dimLine("\u2514\u2500")} ${theme.fg("dim", `\u2026 ${more} more ${pluralForm("file", more)}`)}`,
        width,
        "\u2026"
      )
    );
  }
  return out;
}
function renderDiffStatCard(theme, parsed, out, width) {
  const summaryParts = [];
  if (parsed.filesChanged !== void 0) {
    summaryParts.push(theme.fg("accent", `${parsed.filesChanged} ${pluralForm("file", parsed.filesChanged)} changed`));
  }
  const diffParts = [];
  if (parsed.insertions !== void 0 && parsed.insertions > 0) {
    diffParts.push(theme.fg("toolDiffAdded", `+${parsed.insertions}`));
  }
  if (parsed.deletions !== void 0 && parsed.deletions > 0) {
    diffParts.push(theme.fg("toolDiffRemoved", `-${parsed.deletions}`));
  }
  if (diffParts.length > 0) summaryParts.push(diffParts.join(" "));
  if (summaryParts.length > 0) out.push(`  ${summaryParts.join(theme.fg("dim", " \xB7 "))}`);
  else out.push(theme.fg("muted", "  no changes"));
  const files = parsed.files;
  const visible = files.slice(0, GIT_CARD_HEAD_LIMIT);
  const more = files.length - visible.length;
  const lastIndex = visible.length - 1;
  for (let i = 0; i < visible.length; i++) {
    const file = visible[i];
    if (!file) continue;
    const branch = i < lastIndex || more > 0 ? "\u251C\u2500" : "\u2514\u2500";
    const changes = file.changes ?? 0;
    const detail = theme.fg("dim", file.binary ? "\xB7 binary" : `\xB7 ${changes} ${pluralForm("change", changes)}`);
    const line = `${TREE_INDENT}${dimLine(branch)} ${theme.fg("toolOutput", file.path)} ${detail}`;
    out.push(safeTruncateToWidth(line, width, "\u2026"));
  }
  if (more > 0) {
    out.push(
      safeTruncateToWidth(
        `${TREE_INDENT}${dimLine("\u2514\u2500")} ${theme.fg("dim", `\u2026 ${more} more ${pluralForm("file", more)}`)}`,
        width,
        "\u2026"
      )
    );
  }
  return out;
}
function renderLogCard(theme, parsed, out, width) {
  const commits = parsed.commits;
  if (commits.length === 0) {
    out.push(theme.fg("muted", "  no commits"));
    return out;
  }
  const visible = commits.slice(0, GIT_CARD_HEAD_LIMIT);
  const more = commits.length - visible.length;
  const lastIndex = visible.length - 1;
  for (let i = 0; i < visible.length; i++) {
    const commit = visible[i];
    if (!commit) continue;
    const branch = i < lastIndex || more > 0 ? "\u251C\u2500" : "\u2514\u2500";
    const refs = commit.refs ? ` (${commit.refs})` : "";
    const subject = commit.subject ? `  ${commit.subject}` : "";
    const line = `${TREE_INDENT}${dimLine(branch)} ${theme.fg("accent", commit.hash)}${theme.fg("dim", refs)}${theme.fg("toolOutput", subject)}`;
    out.push(line);
  }
  if (more > 0) {
    out.push(
      safeTruncateToWidth(
        `${TREE_INDENT}${dimLine("\u2514\u2500")} ${theme.fg("dim", `\u2026 ${more} more ${pluralForm("commit", more)}`)}`,
        width,
        "\u2026"
      )
    );
  }
  return out;
}
function renderDiffCard(theme, parsed, out, width) {
  const files = parsed.files;
  if (files.length === 0) {
    out.push(theme.fg("muted", "  no changes"));
    return out;
  }
  let additions = 0;
  let removals = 0;
  for (const file of files) {
    additions += file.additions;
    removals += file.removals;
  }
  const parts = [theme.fg("accent", `${files.length} ${pluralForm("file", files.length)}`)];
  if (additions > 0) parts.push(theme.fg("toolDiffAdded", `+${additions}`));
  if (removals > 0) parts.push(theme.fg("toolDiffRemoved", `-${removals}`));
  out.push(safeTruncateToWidth(`  ${parts.join(" ")}`, width, "\u2026"));
  return out;
}
function renderActionCard(theme, parsed, out, width) {
  if (parsed.command === "commit") {
    if (parsed.status) {
      out.push(theme.fg("muted", `  ${parsed.status}`));
      return out;
    }
    renderDiffStatCard(theme, parsed, out, width);
    return out;
  }
  if (parsed.command === "pull") {
    if (parsed.status === "Already up to date.") {
      out.push(theme.fg("muted", "  Already up to date."));
      return out;
    }
    if (parsed.range) out.push(`  ${theme.fg("text", parsed.range)}`);
    out.push(`  ${theme.fg("accent", "Fast-forward")}`);
    renderDiffStatCard(theme, parsed, out, width);
    return out;
  }
  if (parsed.command === "push") {
    if (parsed.remote) out.push(theme.fg("dim", `  To ${parsed.remote}`));
    for (const ref of parsed.refs ?? []) out.push(safeTruncateToWidth(`  ${theme.fg("toolOutput", ref)}`, width, "\u2026"));
    if (parsed.status) out.push(theme.fg("muted", `  ${parsed.status}`));
    return out;
  }
  if (parsed.command === "fetch") {
    if (parsed.status) {
      out.push(theme.fg("muted", `  ${parsed.status}`));
      return out;
    }
    if (parsed.remote) out.push(theme.fg("dim", `  From ${parsed.remote}`));
    for (const ref of parsed.refs ?? []) out.push(safeTruncateToWidth(`  ${theme.fg("toolOutput", ref)}`, width, "\u2026"));
    return out;
  }
  if (parsed.command === "merge") {
    if (parsed.status === "Already up to date.") {
      out.push(theme.fg("muted", "  Already up to date."));
      return out;
    }
    if (parsed.range) out.push(`  ${theme.fg("text", parsed.range)}`);
    if (parsed.status) out.push(`  ${theme.fg("accent", parsed.status)}`);
    renderDiffStatCard(theme, parsed, out, width);
    return out;
  }
  if (parsed.command === "reset") {
    if (parsed.resetFiles && parsed.resetFiles.length > 0) {
      return renderStatusFileRows(theme, parsed.resetFiles, out, width);
    }
    if (parsed.status) out.push(theme.fg("muted", `  ${parsed.status}`));
    return out;
  }
  if (parsed.status) out.push(theme.fg("muted", `  ${parsed.status}`));
  return out;
}
function parseGitOutput(cls, output) {
  const text2 = String(output ?? "");
  if (cls.kind === "status") return parseGitStatus(cls, text2);
  if (cls.kind === "diff-stat") return parseGitDiffStat(text2);
  if (cls.kind === "show-stat") return parseGitShowStat(text2);
  if (cls.kind === "diff") return parseGitDiff(text2, cls.show);
  if (cls.kind === "action") return parseGitAction(cls.command, text2);
  return parseGitLog(text2);
}
function renderGitCardLines(theme, state, width) {
  const safeWidth = Math.max(1, width);
  const out = [safeTruncateToWidth(gitCardHeader(theme, state.cls, state.parsed), safeWidth, "\u2026")];
  const parsed = state.parsed;
  if (!parsed) return out;
  if (parsed.kind === "status") renderStatusCard(theme, parsed, out, safeWidth);
  else if (parsed.kind === "diff-stat") renderDiffStatCard(theme, parsed, out, safeWidth);
  else if (parsed.kind === "show-stat") renderDiffStatCard(theme, parsed, out, safeWidth);
  else if (parsed.kind === "diff") renderDiffCard(theme, parsed, out, safeWidth);
  else if (parsed.kind === "action") renderActionCard(theme, parsed, out, safeWidth);
  else renderLogCard(theme, parsed, out, safeWidth);
  return out.map((line) => safeTruncateToWidth(line, safeWidth, "\u2026"));
}
var GIT_DIFF_MAX_HIGHLIGHT_CHARS = 12e3;
var GIT_DIFF_MAX_HIGHLIGHT_ROWS = 120;
var GIT_DIFF_MAX_ROWS_COLLAPSED = 36;
var GIT_DIFF_MAX_ROWS_EXPANDED = 160;
function fileBoxTopLabel(theme, path) {
  const body = theme.fg("text", path);
  return typeof theme?.bold === "function" ? theme.bold(body) : body;
}
function binaryBodyLine(theme, status) {
  const verb = status === "added" ? "added" : status === "deleted" ? "removed" : status === "renamed" ? "renamed" : "changed";
  return theme.fg("muted", `Binary file ${verb} (content not shown)`);
}
function renderGitDiffResult(theme, parsed, options, context) {
  const expanded = Boolean(options.expanded);
  const elapsedMs = getStateElapsedMs(context.state);
  const fileCount = parsed.files.length;
  const footerParts = [];
  if (elapsedMs !== void 0) footerParts.push(theme.fg("text", formatElapsedMs(elapsedMs)));
  footerParts.push(theme.fg("dim", `${fileCount} ${pluralForm("file", fileCount)}`));
  const footer = footerParts.join(theme.fg("dim", " \xB7 "));
  const fileBoxes = [];
  if (parsed.files.length === 0) {
    const emptyFooterParts = [];
    if (elapsedMs !== void 0) emptyFooterParts.push(theme.fg("text", formatElapsedMs(elapsedMs)));
    const emptyFooter = emptyFooterParts.join(theme.fg("dim", " \xB7 "));
    fileBoxes.push({
      topLabel: fileBoxTopLabel(theme, parsed.show ? "Git show" : "Git diff"),
      resultComponent: renderBoxedToolResult(theme, () => [theme.fg("muted", "No changes")], {
        showDivider: false,
        footerLines: emptyFooter ? [emptyFooter] : []
      })
    });
  } else {
    for (const file of parsed.files) {
      const topLabel = fileBoxTopLabel(theme, file.path);
      if (file.binary) {
        fileBoxes.push({
          topLabel,
          resultComponent: renderBoxedToolResult(theme, () => [binaryBodyLine(theme, file.status)], {
            showDivider: false,
            footerLines: [footer]
          })
        });
        continue;
      }
      const rows = buildSplitRows(file.body);
      const language = getLanguageFromPath(file.path);
      const shouldHighlight = Boolean(language) && file.body.length <= GIT_DIFF_MAX_HIGHLIGHT_CHARS && rows.length <= GIT_DIFF_MAX_HIGHLIGHT_ROWS;
      const maxRows = expanded ? GIT_DIFF_MAX_ROWS_EXPANDED : GIT_DIFF_MAX_ROWS_COLLAPSED;
      const view = new AdaptiveDiffComponent(theme, rows, maxRows, shouldHighlight ? language : void 0);
      const expandHint = !expanded && view.hasCollapsed() ? toolExpandHint() : "";
      fileBoxes.push({
        topLabel,
        resultComponent: renderBoxedToolResult(theme, view, {
          showDivider: false,
          footerLines: [footer],
          ...expandHint ? { expandHint } : {}
        })
      });
    }
  }
  let cacheWidth;
  let cacheLines;
  return {
    invalidate() {
      cacheWidth = void 0;
      cacheLines = void 0;
      for (const box of fileBoxes) box.resultComponent.invalidate();
    },
    render(width) {
      if (cacheWidth === width && cacheLines) return cacheLines;
      const renderedWidth = boxWidth(width);
      const lines = [];
      for (const box of fileBoxes) {
        lines.push(boxLabeledBorder(theme, "\u256D", "\u256E", box.topLabel, void 0, renderedWidth));
        lines.push(boxBlankLine(theme, renderedWidth));
        lines.push(...box.resultComponent.render(width));
      }
      cacheWidth = width;
      cacheLines = dropOmittedLines(lines);
      return lines;
    }
  };
}

// extension-src/omp-theme/features/tools/boxed/shared.ts
function pendingFlag(context) {
  return Boolean(context.isPartial);
}
function displayPath(rawPath, context) {
  const path = String(rawPath ?? "");
  if (!path) return "(unknown)";
  return shortenPath(resolveRelativePath(path, context.cwd));
}
function pathRangeDetail(rawPath, offset, limit, context) {
  const path = displayPath(rawPath, context);
  let range = "";
  if (offset !== void 0 || limit !== void 0) {
    const start = offset ?? 1;
    const end = limit !== void 0 ? Number(start) + Number(limit) - 1 : "";
    range = `:${start}${end ? `-${end}` : ""}`;
  }
  return path ? `${path}${range}` : "(unknown)";
}
function compactCall(theme, toolName, detailLine, options) {
  return renderCompactBoxedToolCall(theme, toolName, detailLine, {
    widthKey: boxedToolWidthKey(toolName, options.detailKey),
    state: options.context.state,
    isError: Boolean(options.context.isError),
    isPartial: Boolean(options.context.isPartial),
    isPending: pendingFlag(options.context),
    running: Boolean(options.context.executionStarted)
  });
}
function noteExecutionStart(context) {
  recordExecutionStarted(context.state, context.executionStarted);
}
function noteBoxedCallState(context) {
  if (!context.executionStarted) return;
  if (context.isPartial) startElapsedTicker(context.state, context.invalidate, context.toolCallId);
  else {
    recordExecutionEnded(context.state);
    stopElapsedTicker(context.state);
  }
}
function noteBoxedResultPhase(context, isPartial) {
  const firstResultPass = !isResultSeen(context.state);
  markResultSeen(context.state);
  if (isPartial) startElapsedTicker(context.state, context.invalidate, context.toolCallId);
  else {
    recordExecutionEnded(context.state);
    stopElapsedTicker(context.state);
  }
  return firstResultPass;
}
function stateElapsedMs(context) {
  return getStateElapsedMs(context.state);
}
function compactFooterWithState(theme, result, context, options = {}) {
  const elapsedMs = stateElapsedMs(context);
  return renderCompactBoxedFooter(theme, result, {
    state: context.state,
    isError: Boolean(options.isError ?? context.isError),
    isPartial: Boolean(options.isPartial ?? context.isPartial),
    ...elapsedMs === void 0 ? {} : { elapsedMs }
  });
}
function resultFooterLines(theme, result, context, extraParts = []) {
  return [formatBoxedFooter(theme, result, extraParts, stateElapsedMs(context))];
}
function clearFooterState(context) {
  clearCompactBoxedFooter(context.state);
}

// extension-src/omp-theme/features/tools/boxed/bash.ts
var MAX_LINE_CHARS = 2e3;
var ESC3 = "\x1B";
var BASH_TOOL_NOTICE_PATTERN = /^\[Showing (?:last|lines)\b.*\. Full output: .+\]$/;
var BG_ANSI_PATTERN2 = new RegExp(`${ESC3}\\[4[0-9;]*m`, "g");
var SHELL_VAR_PATTERN = /\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/;
var SHELL_OP_PATTERN = /^(?:&&|\|\||>>|>&|\|&|[|&;()<>])$/;
function highlightBashFallback(line) {
  try {
    const highlighted = highlightCode2(line, "bash")[0] ?? line;
    return highlighted.replace(BG_ANSI_PATTERN2, "");
  } catch {
    return line;
  }
}
function normalizeShellWord(word) {
  return word.replace(/^(['"])(.*)\1$/, "$2");
}
function colorShellWord(theme, word, commandExpected) {
  const normalized = normalizeShellWord(word);
  if (/^[A-Za-z_][A-Za-z0-9_]*=.*/.test(normalized)) return theme.fg("syntaxVariable", word);
  if (normalized.startsWith("-")) return theme.fg("syntaxKeyword", word);
  if (normalized.includes("/") || /^\.{1,2}(?:\/|$)/.test(normalized)) return theme.fg("syntaxVariable", word);
  if (SHELL_VAR_PATTERN.test(normalized)) return theme.fg("syntaxVariable", word);
  return commandExpected ? theme.fg("syntaxFunction", word) : theme.fg("syntaxString", word);
}
function tokenizeShellLinePreservingText(line) {
  const tokens = [];
  let current = "";
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const char = line[i] ?? "";
    const next = line[i + 1] ?? "";
    if (quote) {
      current += char;
      if (char === "\\" && next) current += line[++i] ?? "";
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) tokens.push(current);
      current = "";
      tokens.push(char);
      continue;
    }
    if (char === "#" && !current) {
      if (current) tokens.push(current);
      tokens.push(line.slice(i));
      return tokens;
    }
    const two = `${char}${next}`;
    if (SHELL_OP_PATTERN.test(two) || SHELL_OP_PATTERN.test(char)) {
      if (current) tokens.push(current);
      current = "";
      if (SHELL_OP_PATTERN.test(two)) {
        tokens.push(two);
        i++;
      } else {
        tokens.push(char);
      }
      continue;
    }
    current += char;
  }
  if (quote) return void 0;
  if (current) tokens.push(current);
  return tokens;
}
function highlightBashLine(line, theme) {
  const tokens = tokenizeShellLinePreservingText(line);
  if (!tokens) return highlightBashFallback(line);
  let commandExpected = true;
  return tokens.map((token) => {
    if (/^\s+$/.test(token)) return token;
    if (token.startsWith("#")) return theme.fg("syntaxComment", token);
    if (SHELL_OP_PATTERN.test(token)) {
      commandExpected = token === "|" || token === "||" || token === "&&" || token === ";" || token === "&";
      return theme.fg("syntaxOperator", token);
    }
    const styled = colorShellWord(theme, token, commandExpected);
    if (!/^[A-Za-z_][A-Za-z0-9_]*=.*/.test(normalizeShellWord(token))) commandExpected = false;
    return styled;
  }).join("");
}
function clampLineLength(line, max = MAX_LINE_CHARS) {
  if (line.length <= max) return line;
  return `${truncateAtCodePointBoundary(line, max)}\u2026 (truncated)`;
}
function countNewlines(text2, from, to) {
  let count = 0;
  for (let i = from; i < to; i++) {
    if (text2.charCodeAt(i) === 10) count++;
  }
  return count;
}
function stripBashToolNoticeLines(text2) {
  const filteredLines = text2.replace(/\r/g, "").split("\n").filter((line) => !BASH_TOOL_NOTICE_PATTERN.test(line.trim()));
  return filteredLines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}
function bashWidthKey(rawCommand, timeout) {
  return boxedToolWidthKey("Bash", `${rawCommand}|${timeout ?? ""}`);
}
function renderBoxedBashCall(theme, commandLines, context, widthKey) {
  const maxCommandLines = 5;
  const shownCount = Math.min(commandLines.length, maxCommandLines + 1);
  const detailLines = [];
  for (let i = 0; i < shownCount; i++) {
    const prefix = i === 0 ? theme.fg("dim", "$ ") : theme.fg("dim", "> ");
    detailLines.push(`${prefix}${highlightBashLine(commandLines[i] ?? "", theme)}`);
  }
  if (commandLines.length > maxCommandLines + 1) {
    detailLines.push(theme.fg("muted", `... ${commandLines.length - maxCommandLines - 1} more lines`));
  }
  const running = Boolean(context.executionStarted);
  const resultSeen = () => isResultSeen(context.state);
  const base = {
    widthKey,
    isError: Boolean(context.isError),
    isPartial: Boolean(context.isPartial),
    isPending: Boolean(context.isPartial),
    running
  };
  if (running && context.isPartial && !resultSeen()) {
    detailLines.push(theme.fg("dim", "No output received yet"));
    return renderBoxedToolCall(theme, "Bash", detailLines, {
      ...base,
      showHeader: false,
      pendingLabel: formatBoxedRunningStatus(theme, getStateElapsedMs(context.state)),
      resultSeen
    });
  }
  return renderBoxedToolCall(theme, "Bash", detailLines, { ...base, showHeader: false, resultSeen });
}
var BASH_STATUS_PATTERNS = [
  {
    re: /(?:^|\n\n)Command timed out after ([\d.]+) seconds$/i,
    build: (match) => ({ kind: "timeout", seconds: Number(match[1]) })
  },
  { re: /(?:^|\n\n)[^\n]*aborted$/i, build: () => ({ kind: "cancelled" }) },
  {
    re: /(?:^|\n\n)Command exited with code (\d+)$/i,
    build: (match) => ({ kind: "exit", exitCode: Number(match[1]) })
  }
];
function parseBashTerminalStatus(text2) {
  const clean = String(text2 ?? "").replace(/\r/g, "");
  for (const { re, build } of BASH_STATUS_PATTERNS) {
    const match = clean.match(re);
    if (match && match.index !== void 0) {
      return { status: build(match), body: clean.slice(0, match.index).trimEnd() };
    }
  }
  if (/^(?:operation )?aborted(?: after \d+ retry attempts?)?$/i.test(clean.trim())) {
    return { status: { kind: "cancelled" }, body: "" };
  }
  return { status: void 0, body: clean };
}
function bashErrorLabel(status) {
  if (status?.kind === "timeout") return "\u2718 Timed out";
  if (status?.kind === "cancelled") return "\u2718 Cancelled";
  return void 0;
}
function bashEmptyBodyText(status, isError) {
  if (status?.kind === "timeout") return "No output was received before the timeout";
  if (status?.kind === "cancelled") return "Command was cancelled without producing output";
  if (isError) return "Command failed without producing output";
  return "Command completed without producing output";
}
function bashFooter(theme, status, elapsedMs, bodyText, isError) {
  const elapsed = elapsedMs === void 0 ? "--" : `${(elapsedMs / 1e3).toFixed(2)}s`;
  const words = bodyText.trim() ? formatBoxedWords(bodyText) : "";
  if (status?.kind === "timeout") {
    const seconds = Number.isFinite(status.seconds) && status.seconds > 0 ? status.seconds : Number.NaN;
    return theme.fg(
      "warning",
      Number.isFinite(seconds) ? `Terminated after ${seconds.toFixed(1)}s` : "Terminated by timeout"
    );
  }
  if (status?.kind === "cancelled") {
    return [theme.fg("warning", "Cancelled"), theme.fg("text", elapsed)].join(theme.fg("dim", " \xB7 "));
  }
  const exitLabel = status?.kind === "exit" ? `Exit ${status.exitCode}` : isError ? "Failed" : "Exit 0";
  const exitColor = status?.kind === "exit" && status.exitCode !== 0 ? "error" : "text";
  const parts = [theme.fg(exitColor, exitLabel), theme.fg("text", elapsed)];
  if (words) parts.push(theme.fg("dim", words));
  return parts.join(theme.fg("dim", " \xB7 "));
}
var INTERACTIVE_COMMANDS = /* @__PURE__ */ new Set([
  "pi",
  "vim",
  "vi",
  "nvim",
  "nano",
  "less",
  "more",
  "man",
  "top",
  "htop",
  "btop",
  "ssh",
  "telnet",
  "python",
  "python3",
  "node",
  "sqlite3",
  "mysql",
  "psql",
  "redis-cli",
  "mongosh",
  "bc",
  "irssi"
]);
function isInteractiveCommand(command) {
  const base = (String(command ?? "").trim().split(/\s+/)[0] ?? "").split("/").pop() ?? "";
  return INTERACTIVE_COMMANDS.has(base);
}
function bashBodyComponent(preview, emptyLines) {
  if (!emptyLines) return preview;
  return {
    invalidate: () => preview.invalidate(),
    render(width) {
      const lines = preview.render(width);
      return lines.length > 0 ? lines : emptyLines;
    }
  };
}
function renderBashStreamingResult(theme, raw, options, context) {
  const body = stripBashToolNoticeLines(stripAnsi(raw));
  const hasOutput = body.trim().length > 0;
  const elapsed = getStateElapsedMs(context.state);
  const emptyLines = [theme.fg("dim", "No output received yet")];
  if (!hasOutput && isInteractiveCommand(context?.args?.command) && (elapsed ?? 0) >= 1e3) {
    emptyLines.push(theme.fg("dim", "The process may be waiting for terminal input"));
  }
  const preview = createBashResultPreview(theme, body, options);
  const rawCommand = String(context?.args?.command ?? "...");
  return renderBoxedToolResult(theme, bashBodyComponent(preview, hasOutput ? void 0 : emptyLines), {
    widthKey: bashWidthKey(rawCommand, context?.args?.timeout),
    referenceLines: rawCommand.split("\n").map((line, index) => `${index === 0 ? "$ " : "> "}${line}`),
    dividerLabel: "Output",
    showDivider: hasOutput,
    footerLines: [formatBoxedRunningStatus(theme, elapsed)],
    isPartial: true
  });
}
function renderBashFinalResult(theme, raw, options, context) {
  const isError = Boolean(context.isError);
  const clean = stripAnsi(raw);
  const { status, body: statusStripped } = parseBashTerminalStatus(clean);
  const output = stripBashToolNoticeLines(statusStripped);
  const elapsed = getStateElapsedMs(context.state);
  const footer = bashFooter(theme, status, elapsed, output, isError);
  const errorLabel = isError ? bashErrorLabel(status) ?? "\u2718 Error" : void 0;
  const rawCommand = String(context?.args?.command ?? "...");
  const widthKey = bashWidthKey(rawCommand, context?.args?.timeout);
  const referenceLines = rawCommand.split("\n").map((line, index) => `${index === 0 ? "$ " : "> "}${line}`);
  if (!options.expanded) {
    const scanLines = getToolsRenderConfig().maxCollapsedLines + 10;
    let nlCount = 0;
    let tailStart = 0;
    for (let i = statusStripped.length - 1; i >= 0; i--) {
      if (statusStripped.charCodeAt(i) === 10) {
        nlCount++;
        if (nlCount >= scanLines) {
          tailStart = i + 1;
          break;
        }
      }
    }
    const tail = stripBashToolNoticeLines(stripAnsi(statusStripped.slice(tailStart)));
    const totalLinesBefore = tailStart > 0 ? countNewlines(statusStripped, 0, tailStart) : 0;
    const preview2 = createBashResultPreview(theme, tail, options);
    const expandHint = totalLinesBefore > 0 ? toolExpandHint() : "";
    return renderBoxedToolResult(
      theme,
      bashBodyComponent(
        preview2,
        statusStripped.trim() ? void 0 : [theme.fg("muted", bashEmptyBodyText(status, isError))]
      ),
      {
        widthKey,
        referenceLines,
        footerLines: [footer],
        ...expandHint ? { expandHint } : {},
        isError,
        isPartial: false,
        ...errorLabel ? { errorLabel } : {}
      }
    );
  }
  const preview = createBashResultPreview(theme, output, options);
  return renderBoxedToolResult(
    theme,
    bashBodyComponent(preview, output.trim() ? void 0 : [theme.fg("muted", bashEmptyBodyText(status, isError))]),
    {
      widthKey,
      referenceLines,
      footerLines: [footer],
      isError,
      isPartial: false,
      ...errorLabel ? { errorLabel } : {}
    }
  );
}
var EMPTY_BASH_RESULT = Object.freeze({
  invalidate() {
  },
  render() {
    return [];
  }
});
function createBashResultPreview(theme, text2, options) {
  let cacheKey = "";
  let cacheLines = null;
  return {
    invalidate() {
      cacheKey = "";
      cacheLines = null;
    },
    render(width) {
      const bodyWidth = Math.max(1, width);
      const cfg = getToolsRenderConfig();
      const expanded = Boolean(options.expanded);
      const cacheId = `${bodyWidth}|${expanded ? 1 : 0}|${cfg.maxExpandedLines}|${cfg.dimOutput ? 1 : 0}`;
      if (cacheLines && cacheKey === cacheId) return cacheLines;
      if (!expanded) {
        const needed = cfg.maxCollapsedLines;
        let totalNewlines = 0;
        let scanFrom = 0;
        for (let i = text2.length - 1; i >= 0; i--) {
          if (text2.charCodeAt(i) === 10) {
            totalNewlines++;
            if (totalNewlines === needed) {
              scanFrom = i + 1;
              break;
            }
          }
        }
        if (text2.length === 0) {
          cacheKey = cacheId;
          cacheLines = [];
          return cacheLines;
        }
        const tail = replaceTabs(text2.slice(scanFrom)).replace(/\r/g, "");
        const shownLines = tail ? tail.split("\n").map((l) => clampLineLength(l)) : [];
        if (shownLines.length === 0) {
          cacheKey = cacheId;
          cacheLines = [];
          return cacheLines;
        }
        const truncatedShown = shownLines.map((line) => {
          const truncated = safeTruncateToWidth(line, bodyWidth, "\u2026");
          return cfg.dimOutput ? formatToolOutputLine(theme, truncated) : formatToolOutputLine(theme, truncated, "text");
        });
        cacheKey = cacheId;
        cacheLines = truncatedShown;
        return cacheLines;
      }
      const normalized = replaceTabs(text2);
      const logicalLines = normalized.split("\n").map((l) => clampLineLength(l));
      const hasOutput = !(logicalLines.length === 1 && logicalLines[0] === "");
      if (!hasOutput) {
        cacheKey = cacheId;
        cacheLines = [];
        return cacheLines;
      }
      const truncatedLines = logicalLines.map((line) => safeTruncateToWidth(line, bodyWidth, "\u2026"));
      const expandedLines = truncatedLines.length === 1 && truncatedLines[0] === "" ? [] : truncatedLines;
      const applyColor = (l) => cfg.dimOutput ? formatToolOutputLine(theme, l) : formatToolOutputLine(theme, l, "text");
      if (cfg.maxExpandedLines > 0 && expandedLines.length > cfg.maxExpandedLines) {
        const truncated = expandedLines.slice(-cfg.maxExpandedLines).map(applyColor);
        const remaining = expandedLines.length - cfg.maxExpandedLines;
        truncated.unshift(theme.fg("dim", `\u2026 ${remaining} earlier lines`));
        cacheKey = cacheId;
        cacheLines = truncated;
        return cacheLines;
      }
      cacheKey = cacheId;
      cacheLines = expandedLines.map(applyColor);
      return cacheLines;
    }
  };
}
var BASH_GREP_COMMANDS = /* @__PURE__ */ new Set(["grep", "egrep", "fgrep", "rg"]);
var GREP_VALUE_FLAGS = /* @__PURE__ */ new Set([
  "-e",
  "--regexp",
  "-g",
  "--glob",
  "--type",
  "-t",
  "--include",
  "--exclude",
  "-C",
  "-A",
  "-B",
  "--context",
  "--after-context",
  "--before-context",
  "-m",
  "--max-count",
  "-M",
  "--max-columns",
  "--ignore-file"
]);
var FIND_VALUE_FLAGS = /* @__PURE__ */ new Set([
  "-type",
  "-mtime",
  "-atime",
  "-ctime",
  "-size",
  "-maxdepth",
  "-mindepth",
  "-perm",
  "-group",
  "-user",
  "-newer"
]);
function classifyByArgs(kind, args) {
  const positionals = [];
  let pattern;
  for (let i = 0; i < args.length; i++) {
    const token = args[i] ?? "";
    if (kind === "grep" && (token === "-e" || token === "--regexp") || kind === "find" && (token === "-name" || token === "-iname" || token === "-path" || token === "-ipath")) {
      pattern = args[++i];
      continue;
    }
    if (kind === "grep" && GREP_VALUE_FLAGS.has(token)) {
      i++;
      continue;
    }
    if (kind === "find" && FIND_VALUE_FLAGS.has(token)) {
      i++;
      continue;
    }
    if (token.startsWith("-")) continue;
    positionals.push(token);
  }
  const rawPath = positionals[0] ?? ".";
  const pathLabel3 = rawPath === "." ? "current directory" : shortenPath(rawPath);
  if (kind === "ls") return { kind, pathLabel: pathLabel3 };
  if (kind === "find") return { kind, ...pattern !== void 0 ? { pattern } : {}, pathLabel: pathLabel3 };
  const grepPattern = pattern ?? positionals[0];
  const pathArgs = pattern !== void 0 ? positionals : positionals.slice(1);
  const grepPath = pathArgs.join(" ");
  const grepPathLabel = !grepPath || grepPath === "." ? "current directory" : shortenPath(grepPath);
  return {
    kind,
    ...grepPattern !== void 0 ? { pattern: grepPattern } : {},
    pathLabel: grepPathLabel,
    ...pathArgs.length === 1 ? { singlePath: pathArgs[0] ?? "" } : {}
  };
}
function classifyBashCommand(command) {
  const shape2 = parseSimpleBashCommand(command, { allowTrailingTruncationPipe: true });
  if (!shape2) return null;
  const rest = shape2.tokens;
  const base = (rest[0] ?? "").split("/").pop() ?? "";
  let kind = null;
  if (base === "ls") kind = "ls";
  else if (base === "find") kind = "find";
  else if (BASH_GREP_COMMANDS.has(base)) kind = "grep";
  if (!kind) return null;
  const cls = classifyByArgs(kind, rest.slice(1));
  if (shape2.cdDir && cls.pathLabel === "current directory") {
    return {
      kind,
      ...cls.pattern !== void 0 ? { pattern: cls.pattern } : {},
      pathLabel: shortenPath(shape2.cdDir),
      ...cls.singlePath !== void 0 ? { singlePath: cls.singlePath } : {}
    };
  }
  return cls;
}
function bashTreeHeader(theme, cls, counts) {
  const label = cls.kind === "find" ? "Find" : cls.kind === "ls" ? "List" : "Grep";
  const hasDetail = Boolean(cls.pattern) || Boolean(counts);
  const icon = getToolsRenderConfig().nerdFonts ? `${theme.fg("toolTitle", SEARCH_ICON)} ` : "";
  const prefixText = hasDetail ? `${label}:` : label;
  const prefix = theme.fg("toolTitle", typeof theme?.bold === "function" ? theme.bold(prefixText) : prefixText);
  const patternPart = cls.pattern ? ` ${theme.fg("muted", cls.pattern.replace(/\r\n?|\n/g, " "))}` : "";
  let middle = "";
  if (counts) {
    if (cls.kind === "grep") {
      const matches = counts.matches ?? 0;
      const files = counts.files ?? 0;
      middle = theme.fg(
        "dim",
        ` ${matches} ${pluralForm("match", matches)} \xB7 ${files} ${pluralForm("file", files)}`
      );
    } else {
      const files = counts.files ?? 0;
      middle = theme.fg("dim", ` ${files} ${pluralForm("file", files)}`);
    }
  }
  const pathPart = cls.pathLabel && cls.pathLabel !== "current directory" ? theme.fg("dim", ` \xB7 in ${cls.pathLabel}`) : "";
  return `${icon}${prefix}${patternPart}${middle}${pathPart}`;
}
function isLongFormatLs(text2) {
  const first = text2.split("\n").map((line) => line.trim()).find((line) => line.length > 0 && !/^total\s+\d+$/i.test(line));
  return Boolean(first) && /^[bcdlsp-][rwxtsST-]{9}[\s@]/.test(first);
}
function parseBashTreeOutput(cls, output) {
  if (cls.kind === "ls") {
    if (isLongFormatLs(output)) return { entries: parseLsLongOutput(output) };
    return { entries: parseLsOutput(output) };
  }
  if (cls.kind === "find") return { entries: parseFindOutput(output) };
  const matches = parseGrepOutput(output);
  const displayLines = parseGrepDisplayOutput(output);
  if (matches.length === 0 && output.trim().length > 0) {
    if (cls.singlePath) {
      const bare = parseGrepBareOutput(output, cls.singlePath);
      if (bare.length > 0) {
        return { matches: bare, displayLines: parseGrepBareDisplayOutput(output, cls.singlePath) };
      }
    }
    return null;
  }
  return { matches, displayLines };
}
function classifyBashSemantic(command) {
  return classifyBashCommand(command) ?? classifyGitCommand(command) ?? classifyGhCommand(command);
}
function isBashTreeClass(cls) {
  return cls.kind === "ls" || cls.kind === "find" || cls.kind === "grep";
}
function isGhClass(cls) {
  switch (cls.kind) {
    case "pr-list":
    case "pr-view":
    case "pr-checks":
    case "pr-create":
    case "issue-list":
    case "issue-view":
    case "run-list":
    case "run-view":
    case "run-job":
      return true;
    default:
      return false;
  }
}
function isGhRunJobClass(cls) {
  return cls.kind === "run-job";
}
function isGitDiffClass(cls) {
  return !isBashTreeClass(cls) && cls.kind === "diff";
}
function isGitActionClass(cls) {
  return !isBashTreeClass(cls) && cls.kind === "action";
}
function parseSemanticOutput(cls, output) {
  if (isBashTreeClass(cls)) return parseBashTreeOutput(cls, output);
  if (isGhClass(cls)) return parseGhOutput(cls, output);
  return parseGitOutput(cls, output);
}
var semanticStates = /* @__PURE__ */ new Map();
function bashSettledResultLivesInCall(toolCallId) {
  const state = semanticStates.get(toolCallId);
  if (!state?.parsed || state.fallback) return false;
  return !isGitDiffClass(state.cls) && !isGhRunJobClass(state.cls);
}
function resetBashTreeRegistry() {
  semanticStates.clear();
}
function linkBashGrepLine(context, styledText, file, line) {
  if (!getCapabilities().hyperlinks) return styledText;
  const url = pathToFileURL(resolve3(context.cwd, file));
  if (line !== void 0) url.searchParams.set("line", String(line));
  return hyperlink(styledText, url.href);
}
function renderBashTreeLines(theme, state, width, expanded, context) {
  const safeWidth = Math.max(1, width);
  const cls = state.cls;
  if (state.parsed && "entries" in state.parsed) {
    const entries = state.parsed.entries;
    return renderOutputTree(theme, bashTreeHeader(theme, cls, { files: entries.length }), entries, safeWidth, {
      moreUnit: "file",
      indent: TREE_INDENT,
      withIcons: getToolsRenderConfig().nerdFonts
    });
  }
  if (state.parsed && "matches" in state.parsed) {
    const matches = state.parsed.matches;
    const config = getToolsRenderConfig();
    const configuredLimit = expanded ? config.maxExpandedLines : config.maxCollapsedLines;
    const ompLimit = expanded ? GREP_EXPANDED_LINE_LIMIT : GREP_COLLAPSED_LINE_LIMIT;
    return renderGrepTree(
      theme,
      bashTreeHeader(theme, cls, { matches: matches.length, files: groupMatchesByFile(matches).length }),
      matches,
      safeWidth,
      {
        indent: TREE_INDENT,
        withIcons: config.nerdFonts,
        lineBudget: Math.max(0, Math.min(configuredLimit, ompLimit)),
        expanded,
        displayLines: state.parsed.displayLines,
        link: (styledText, file, line) => linkBashGrepLine(context, styledText, file, line)
      }
    );
  }
  return [safeTruncateToWidth(bashTreeHeader(theme, cls), safeWidth, "\u2026")];
}
var EMPTY_BASH_TREE_RESULT = {
  invalidate() {
  },
  render() {
    return [];
  }
};
function renderSemanticPanel(theme, toolCallId, context) {
  const state = semanticStates.get(toolCallId);
  return {
    invalidate() {
    },
    render(width) {
      if (!state) return [];
      if (state.fallback) {
        return renderBoxedBashCall(
          theme,
          state.command.split("\n"),
          context,
          bashWidthKey(state.command, context?.args?.timeout)
        ).render(width);
      }
      if (isBashTreeClass(state.cls)) {
        const treeState = { cls: state.cls };
        if (state.parsed !== void 0) treeState.parsed = state.parsed;
        return renderBashTreeLines(theme, treeState, width, context.expanded, context);
      }
      if (isGhClass(state.cls)) {
        const ghState = { cls: state.cls };
        if (state.parsed !== void 0) ghState.parsed = state.parsed;
        return renderGhCardLines(theme, ghState, width);
      }
      const gitState = { cls: state.cls };
      if (state.parsed !== void 0) gitState.parsed = state.parsed;
      return renderGitCardLines(theme, gitState, width);
    }
  };
}
var bashTool = {
  call(args, theme, context) {
    noteExecutionStart(context);
    const cls = classifyBashSemantic(String(args?.command ?? ""));
    if (cls) {
      semanticStates.set(context.toolCallId, { cls, command: String(args?.command ?? "") });
      return renderSemanticPanel(theme, context.toolCallId, context);
    }
    noteBoxedCallState(context);
    const rawCommand = String(args?.command ?? "...");
    return renderBoxedBashCall(theme, rawCommand.split("\n"), context, bashWidthKey(rawCommand, args?.timeout));
  },
  result(result, options, theme, context) {
    const firstResultPass = !isResultSeen(context.state);
    markResultSeen(context.state);
    const cls = classifyBashSemantic(String(context?.args?.command ?? ""));
    if (cls && (!context.isError || isGitActionClass(cls))) {
      if (!options.isPartial) {
        recordExecutionEnded(context.state);
        stopElapsedTicker(context.state);
      }
      if (!options.isPartial || isBashTreeClass(cls)) {
        const output = stripBashToolNoticeLines(stripAnsi(getTextOutput(result)));
        const parsed = parseSemanticOutput(cls, output);
        const state = semanticStates.get(context.toolCallId);
        if (parsed) {
          if (state) state.parsed = parsed;
          else
            semanticStates.set(context.toolCallId, {
              cls,
              command: String(context?.args?.command ?? ""),
              parsed
            });
          if (isGitDiffClass(cls)) {
            return renderGitDiffResult(theme, parsed, options, context);
          }
          if (isGhRunJobClass(cls)) {
            return renderGhRunJobResult(theme, parsed, options, context);
          }
          return EMPTY_BASH_TREE_RESULT;
        }
        if (state) state.fallback = true;
      }
    } else if (options.isPartial) {
      startElapsedTicker(context.state, context.invalidate, context.toolCallId);
    } else {
      recordExecutionEnded(context.state);
      stopElapsedTicker(context.state);
    }
    const raw = getTextOutput(result);
    if (options.isPartial) {
      if (firstResultPass) return EMPTY_BASH_RESULT;
      return renderBashStreamingResult(theme, raw, options, context);
    }
    return renderBashFinalResult(theme, raw, options, context);
  }
};

// extension-src/omp-theme/features/tools/boxed/edit.ts
import { getLanguageFromPath as getLanguageFromPath2 } from "@earendil-works/pi-coding-agent";
var MAX_HIGHLIGHT_DIFF_CHARS = 12e3;
var MAX_HIGHLIGHT_DIFF_ROWS = 120;
var EMPTY_EDIT_RESULT = Object.freeze({
  invalidate() {
  },
  render() {
    return [];
  }
});
function editDiffFooter(theme, result, context, stats) {
  const elapsedMs = getElapsedMs(result) ?? stateElapsedMs(context);
  const parts = [];
  if (elapsedMs !== void 0) parts.push(theme.fg("text", formatElapsedMs(elapsedMs)));
  const plus = stats.additions > 0 ? theme.fg("toolDiffAdded", `+${stats.additions}`) : theme.fg("dim", "+0");
  const minus = stats.removals > 0 ? theme.fg("toolDiffRemoved", `-${stats.removals}`) : theme.fg("dim", "-0");
  parts.push(theme.fg("dim", "1 file"), `${plus} ${minus}`);
  return parts.join(theme.fg("dim", " \xB7 "));
}
var editTool = {
  call(args, theme, context) {
    noteExecutionStart(context);
    noteBoxedCallState(context);
    const detail = displayPath(String(args?.path ?? args?.file_path ?? ""), context);
    return renderBoxedToolCall(theme, "Edit", [], {
      headerDetail: detail,
      isError: Boolean(context.isError),
      isPartial: Boolean(context.isPartial),
      isPending: Boolean(context.isPartial),
      running: Boolean(context.executionStarted),
      resultSeen: () => isResultSeen(context.state)
    });
  },
  result(result, options, theme, context) {
    if (options.isPartial) {
      const firstResultPass = noteBoxedResultPhase(context, options.isPartial);
      if (firstResultPass) return EMPTY_EDIT_RESULT;
      return renderBoxedToolResult(theme, () => [`${theme.fg("dim", "\u21B3")} ${theme.fg("muted", "Applying edit...")}`], {
        showDivider: false,
        footerLines: [formatBoxedRunningStatus(theme, stateElapsedMs(context))],
        isPartial: true
      });
    }
    if (context.isError) {
      const output = getTextOutput(result);
      return renderBoxedToolResult(theme, () => [theme.fg("error", stripAnsi(output).trim() || "Error")], {
        footerLines: resultFooterLines(theme, result, context),
        isError: true
      });
    }
    const details = result.details;
    const diff = details?.diff;
    if (!diff) {
      const output = stripAnsi(getTextOutput(result)).trim();
      const fallback = `\u21B3 ${output || "Edit applied"}`;
      return renderBoxedToolResult(theme, () => [theme.fg("dim", fallback)], {
        footerLines: resultFooterLines(theme, result, context)
      });
    }
    const message = firstText(result.content);
    const argPath = String(context?.args?.path ?? context?.args?.file_path ?? "");
    const sourcePath = details?.path ?? (argPath || extractEditedPath(message));
    const language = sourcePath ? getLanguageFromPath2(sourcePath) : void 0;
    const rows = buildSplitRows(diff);
    const expanded = options.expanded;
    const shouldHighlight = Boolean(language) && diff.length <= MAX_HIGHLIGHT_DIFF_CHARS && rows.length <= MAX_HIGHLIGHT_DIFF_ROWS;
    const stats = countDiffStats(diff);
    const maxRows = expanded ? 160 : 36;
    const diffView = new AdaptiveDiffComponent(theme, rows, maxRows, shouldHighlight ? language : void 0);
    const expandHint = !expanded && diffView.hasCollapsed() ? toolExpandHint() : "";
    return renderBoxedToolResult(
      theme,
      {
        render(width) {
          return diffView.render(width);
        },
        invalidate() {
          diffView.invalidate();
        }
      },
      {
        showDivider: false,
        ...expandHint ? { expandHint } : {},
        footerLines: [editDiffFooter(theme, result, context, stats)]
      }
    );
  }
};

// extension-src/omp-theme/features/tools/boxed/fallback.ts
var MAX_FALLBACK_PREVIEW_LINES = 10;
function renderFallbackCall(toolName, args, theme, context) {
  noteExecutionStart(context);
  noteBoxedCallState(context);
  return renderBoxedToolCall(theme, formatToolName(String(toolName ?? "Tool")), formatToolParamLines(args, theme), {
    isError: Boolean(context.isError),
    isPartial: Boolean(context.isPartial),
    isPending: Boolean(context.isPartial),
    running: Boolean(context.executionStarted),
    resultSeen: () => isResultSeen(context.state)
  });
}
function renderFallbackResult(_toolName, result, options, theme, context) {
  const firstResultPass = noteBoxedResultPhase(context, options.isPartial);
  const isError = Boolean(context.isError);
  const expanded = Boolean(options.expanded);
  const maxLines = expanded ? getToolsRenderConfig().maxExpandedLines : MAX_FALLBACK_PREVIEW_LINES;
  const output = getTextOutput(result);
  const elapsedMs = getStateElapsedMs(context.state);
  const { lines, omitted } = selectRenderLines(output, maxLines);
  const expandHint = !expanded && omitted > 0 ? toolExpandHint() : "";
  if (options.isPartial) {
    if (firstResultPass) return EMPTY_FALLBACK_RESULT;
    const hasOutput = output.trim().length > 0;
    return renderBoxedToolResult(
      theme,
      () => {
        const body = lines.map((line) => formatToolOutputLine(theme, line, "toolOutput"));
        if (!hasOutput) body.push(theme.fg("dim", "No output received yet"));
        return body;
      },
      {
        dividerLabel: "Output",
        showDivider: hasOutput,
        footerLines: [formatBoxedRunningStatus(theme, elapsedMs)],
        isPartial: true
      }
    );
  }
  return renderBoxedToolResult(
    theme,
    () => {
      const body = lines.map((line) => formatToolOutputLine(theme, line, isError ? "error" : "toolOutput"));
      if (expanded && omitted > 0) {
        body.push(theme.fg("muted", `\u2026 ${omitted} more lines omitted by render budget`));
      }
      return body;
    },
    {
      footerLines: [formatBoxedFooterWithElapsed(theme, elapsedMs, output)],
      renderLineBudget: maxLines,
      ...expandHint ? { expandHint } : {},
      isError,
      isPartial: Boolean(options.isPartial)
    }
  );
}
var EMPTY_FALLBACK_RESULT = Object.freeze({
  invalidate() {
  },
  render() {
    return [];
  }
});
function formatBoxedFooterWithElapsed(theme, elapsedMs, output) {
  const elapsed = elapsedMs === void 0 ? "--" : `${(elapsedMs / 1e3).toFixed(2)}s`;
  const words = output.trim() ? formatBoxedWords(output) : "";
  const parts = [theme.fg("text", elapsed)];
  if (words) parts.push(theme.fg("dim", words));
  return parts.join(theme.fg("dim", " \xB7 "));
}

// extension-src/omp-theme/features/tools/boxed/find.ts
var FIND_META = Object.freeze({
  toolName: "find",
  label: "Find",
  headerLabel: "Find"
});
function pathLabel(rawPath) {
  const displayPath3 = String(rawPath ?? ".");
  return displayPath3 === "." || displayPath3 === "" ? "current directory" : shortenPath(displayPath3);
}
function queryDetail(pattern, rawPath) {
  const path = pathLabel(rawPath);
  return pattern ? `${pattern} in ${path}` : path;
}
var findTool = {
  call(args, theme, context) {
    noteExecutionStart(context);
    const pattern = String(args?.pattern ?? "");
    const rawPath = String(args?.path ?? ".");
    const detail = queryDetail(pattern, rawPath);
    const { isLeader, batch } = registerBatchCall(FIND_META, detail, context, {
      pattern,
      pathLabel: pathLabel(rawPath)
    });
    if (!isLeader) return EMPTY_BATCH_COMPONENT;
    return renderBatchAwareCall(theme, batch);
  },
  result(result, options, _theme, context) {
    const output = stripAnsi(getTextOutput(result)).trimEnd();
    const entries = context.isError ? void 0 : parseFindOutput(output);
    registerBatchResult(
      FIND_META,
      {
        isPartial: Boolean(options.isPartial),
        isError: Boolean(context.isError),
        errorText: context.isError ? output || void 0 : void 0,
        ...entries !== void 0 ? { entries } : {}
      },
      context
    );
    return emptyBatchResult();
  }
};

// extension-src/omp-theme/features/tools/boxed/grep.ts
import { statSync } from "fs";
import { basename, resolve as resolve4 } from "path";
import { pathToFileURL as pathToFileURL2 } from "url";
import { getCapabilities as getCapabilities2, hyperlink as hyperlink2 } from "@earendil-works/pi-tui";
var GREP_ERROR_LINES = 2;
var grepPanels = /* @__PURE__ */ new Map();
function resetGrepRegistry() {
  grepPanels.clear();
}
function pathLabel2(rawPath) {
  const displayPath3 = String(rawPath ?? ".");
  return displayPath3 === "." || displayPath3 === "" ? "current directory" : shortenPath(displayPath3);
}
function localSearchPathKind(rawPath, cwd) {
  try {
    return statSync(resolveAbsolutePath(rawPath || ".", cwd)).isFile() ? "file" : "directory";
  } catch {
    return void 0;
  }
}
function registerGrepCall(toolCallId, pattern, label, rawPath, cwd) {
  const searchPathKind = localSearchPathKind(rawPath, cwd);
  const existing = grepPanels.get(toolCallId);
  if (existing) {
    existing.pattern = pattern;
    existing.pathLabel = label;
    existing.rawPath = rawPath;
    existing.cwd = cwd;
    existing.searchPathKind = searchPathKind;
    return;
  }
  grepPanels.set(toolCallId, {
    pattern,
    pathLabel: label,
    rawPath,
    cwd,
    searchPathKind,
    matches: void 0,
    displayLines: void 0,
    isError: false,
    errorText: void 0,
    isPartial: true,
    truncationLabel: void 0
  });
}
function registerGrepResult(toolCallId, data) {
  const state = grepPanels.get(toolCallId);
  if (!state) return;
  state.matches = data.matches;
  state.displayLines = data.displayLines;
  state.isError = data.isError;
  state.errorText = data.errorText;
  state.isPartial = data.isPartial;
  state.truncationLabel = data.truncationLabel;
}
function bold2(theme, text2) {
  return typeof theme?.bold === "function" ? theme.bold(text2) : text2;
}
function flattened(text2) {
  return replaceTabs(text2).replace(/\r\n?|\n/g, " ");
}
function resolvedGrepFile(state, file) {
  const searchPath = resolveAbsolutePath(state.rawPath || ".", state.cwd) || state.cwd;
  if (state.searchPathKind === "file") return searchPath;
  if (state.searchPathKind === "directory") return resolve4(searchPath, file);
  const normalizedFile = file.replace(/\\/g, "/");
  const searchName = basename(searchPath).replace(/\\/g, "/");
  return normalizedFile === searchName ? searchPath : resolve4(searchPath, file);
}
function linkFile(state, styledText, file, line) {
  if (!getCapabilities2().hyperlinks || state.searchPathKind === void 0) return styledText;
  const url = pathToFileURL2(resolvedGrepFile(state, file));
  if (line !== void 0) url.searchParams.set("line", String(line));
  return hyperlink2(styledText, url.href);
}
function scopePart(theme, state) {
  if (!state.pathLabel) return "";
  const styledPath = theme.fg("dim", flattened(state.pathLabel));
  const scopePath = resolveAbsolutePath(state.rawPath || ".", state.cwd) || state.cwd;
  const linkedPath = getCapabilities2().hyperlinks && state.searchPathKind !== void 0 ? hyperlink2(styledPath, pathToFileURL2(scopePath).href) : styledPath;
  return `${theme.fg("dim", " \xB7 in ")}${linkedPath}`;
}
function formatGrepHeader(theme, state) {
  const searchGlyph = getToolsRenderConfig().nerdFonts ? SEARCH_ICON : SEARCH_ICON_UNICODE;
  const icon = theme.fg(state.isError ? "error" : "toolTitle", state.isError ? "\u2718" : searchGlyph);
  const label = theme.fg(state.isError ? "error" : "toolTitle", bold2(theme, "Grep:"));
  const pattern = flattened(state.pattern);
  const patternPart = pattern ? ` ${theme.fg(state.isError ? "error" : "muted", pattern)}` : "";
  const pathPart = scopePart(theme, state);
  if (state.isError) return `${icon} ${label}${patternPart}${pathPart}`;
  if (state.matches === void 0) return `${icon} ${label}${patternPart}${pathPart}`;
  const matchCount = state.matches.length;
  const fileCount = groupMatchesByFile(state.matches).length;
  const counts = theme.fg(
    "dim",
    ` ${matchCount} ${pluralForm("match", matchCount)} \xB7 ${fileCount} ${pluralForm("file", fileCount)}`
  );
  const truncated = state.truncationLabel ? theme.fg("warning", ` \xB7 ${state.truncationLabel}`) : "";
  return `${icon} ${label}${patternPart}${counts}${truncated}${pathPart}`;
}
function renderErrorLines2(theme, errorText, width) {
  const raw = stripAnsi(errorText).split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  if (raw.length === 0) return [];
  const prefix = `${TREE_INDENT}${dimLine("\u2514\u2500")} `;
  const out = raw.slice(0, GREP_ERROR_LINES).map((line) => safeTruncateToWidth(`${prefix}${theme.fg("error", line)}`, Math.max(1, width), "\u2026"));
  if (raw.length > GREP_ERROR_LINES)
    out.push(safeTruncateToWidth(`${prefix}${theme.fg("error", "\u2026")}`, Math.max(1, width), "\u2026"));
  return out;
}
function grepLineBudget(expanded) {
  const config = getToolsRenderConfig();
  const configured = expanded ? config.maxExpandedLines : config.maxCollapsedLines;
  const ompLimit = expanded ? GREP_EXPANDED_LINE_LIMIT : GREP_COLLAPSED_LINE_LIMIT;
  return Math.max(0, Math.min(configured, ompLimit));
}
function renderGrepPanelLines(theme, state, width, expanded) {
  const safeWidth = Math.max(1, width);
  const header = safeTruncateToWidth(formatGrepHeader(theme, state), safeWidth, "\u2026");
  if (state.isError) {
    return [header, ...state.errorText ? renderErrorLines2(theme, state.errorText, width) : []];
  }
  if (state.matches === void 0) return [header];
  const lineBudget = grepLineBudget(expanded);
  if (state.matches.length === 0) {
    if (lineBudget === 0) return [header];
    const empty = `${TREE_INDENT}${dimLine("\u2514\u2500")} ${theme.fg("muted", "No matches found")}`;
    return [header, safeTruncateToWidth(empty, safeWidth, "\u2026")];
  }
  return renderGrepTree(theme, header, state.matches, safeWidth, {
    lineBudget,
    expanded,
    ...state.displayLines ? { displayLines: state.displayLines } : {},
    withIcons: getToolsRenderConfig().nerdFonts,
    link: (styledText, file, line) => linkFile(state, styledText, file, line)
  });
}
function renderGrepPanel(theme, toolCallId, expanded) {
  const state = grepPanels.get(toolCallId);
  return {
    invalidate() {
    },
    render(width) {
      if (!state) return [safeTruncateToWidth(bold2(theme, "Grep:"), Math.max(1, width), "\u2026")];
      return renderGrepPanelLines(theme, state, width, expanded);
    }
  };
}
var EMPTY_GREP_RESULT = {
  invalidate() {
  },
  render() {
    return [];
  }
};
function truncationLabel(result, output) {
  const details = result.details;
  const reasons = [];
  if (typeof details?.matchLimitReached === "number") reasons.push(`${details.matchLimitReached}-match limit`);
  if (details?.truncation?.truncated) reasons.push("output limit");
  if (details?.linesTruncated) reasons.push("long lines");
  if (reasons.length > 0) return `truncated: ${reasons.join(", ")}`;
  return /\[(?:Truncated:|[^\]]*limit reached|Some lines truncated)/i.test(output) ? "truncated" : void 0;
}
var grepTool = {
  call(args, theme, context) {
    noteExecutionStart(context);
    const pattern = String(args?.pattern ?? "");
    const rawPath = String(args?.path ?? ".");
    registerGrepCall(context.toolCallId, pattern, pathLabel2(rawPath), rawPath, context.cwd);
    return renderGrepPanel(theme, context.toolCallId, context.expanded);
  },
  result(result, options, _theme, context) {
    const output = stripAnsi(getTextOutput(result)).trimEnd();
    const isError = Boolean(context.isError);
    const displayLines = isError ? [] : parseGrepDisplayOutput(output);
    const matches = isError ? [] : parseGrepOutput(output);
    registerGrepResult(context.toolCallId, {
      matches,
      displayLines,
      isError,
      errorText: isError ? output || void 0 : void 0,
      isPartial: Boolean(options.isPartial),
      truncationLabel: isError ? void 0 : truncationLabel(result, output)
    });
    return EMPTY_GREP_RESULT;
  }
};

// extension-src/omp-theme/features/tools/boxed/ls.ts
var LIST_META = Object.freeze({
  toolName: "ls",
  label: "List",
  headerLabel: "List"
});
function displayPath2(rawPath) {
  const path = String(rawPath ?? ".");
  if (path === "." || path === "") return "current directory";
  return shortenPath(path);
}
var lsTool = {
  call(args, theme, context) {
    noteExecutionStart(context);
    const rawPath = String(args?.path ?? ".");
    const detail = displayPath2(rawPath);
    const { isLeader, batch } = registerBatchCall(LIST_META, detail, context, { pathLabel: detail });
    if (!isLeader) return EMPTY_BATCH_COMPONENT;
    return renderBatchAwareCall(theme, batch);
  },
  result(result, options, _theme, context) {
    const output = stripAnsi(getTextOutput(result)).trimEnd();
    const entries = context.isError ? void 0 : parseLsOutput(output);
    registerBatchResult(
      LIST_META,
      {
        isPartial: Boolean(options.isPartial),
        isError: Boolean(context.isError),
        errorText: context.isError ? output || void 0 : void 0,
        ...entries !== void 0 ? { entries } : {}
      },
      context
    );
    return emptyBatchResult();
  }
};

// extension-src/omp-theme/features/tools/boxed/quick-edit.ts
import { getLanguageFromPath as getLanguageFromPath3 } from "@earendil-works/pi-coding-agent";
var MAX_HIGHLIGHT_DIFF_CHARS2 = 12e3;
var MAX_HIGHLIGHT_DIFF_ROWS2 = 120;
var EMPTY_QUICK_EDIT_RESULT = Object.freeze({
  invalidate() {
  },
  render() {
    return [];
  }
});
var QUICK_EDIT_TOOLS = {
  quick_edit: {
    toolLabel: "Quick Edit",
    applyingLabel: "quick-edit",
    fallbackLabel: "Quick edit applied"
  },
  substitute_edit: {
    toolLabel: "Substitute Edit",
    applyingLabel: "substitute-edit",
    fallbackLabel: "Substitute edit applied"
  },
  target_edit: {
    toolLabel: "Target Edit",
    applyingLabel: "target-edit",
    fallbackLabel: "Target edit applied"
  }
};
function getQuickEditToolConfig(toolName) {
  return typeof toolName === "string" ? QUICK_EDIT_TOOLS[toolName] : void 0;
}
function extractQuickEditDiff(text2) {
  const lines = stripAnsi(text2).replace(/\r/g, "").split("\n");
  const start = lines.indexOf("\u2500\u2500 diff \u2500\u2500");
  if (start < 0) return void 0;
  const diffLines = [];
  let cumulativeDelta = 0;
  let oldLine;
  let newLine;
  let chunkAdditions = 0;
  let chunkRemovals = 0;
  const finishChunk = () => {
    cumulativeDelta += chunkAdditions - chunkRemovals;
    oldLine = void 0;
    newLine = void 0;
    chunkAdditions = 0;
    chunkRemovals = 0;
  };
  for (const line of lines.slice(start + 1)) {
    if (line === "") {
      finishChunk();
      continue;
    }
    const headerMatch = line.match(/^:(\d+)(?:-\d+)?$/);
    if (headerMatch) {
      finishChunk();
      const startLine = Number.parseInt(headerMatch[1] ?? "", 10);
      oldLine = startLine;
      newLine = startLine + cumulativeDelta;
      continue;
    }
    const match = line.match(/^([+-]) (.*)$/);
    if (match) {
      const [, sign, content = ""] = match;
      let gutter = "";
      if (sign === "-" && oldLine !== void 0) gutter = String(oldLine++);
      if (sign === "+" && newLine !== void 0) gutter = String(newLine++);
      if (!gutter) continue;
      if (sign === "-") chunkRemovals++;
      if (sign === "+") chunkAdditions++;
      diffLines.push(`${sign} ${gutter} ${content}`);
      continue;
    }
    if (line === "---") break;
  }
  return diffLines.length > 0 ? diffLines.join("\n") : void 0;
}
function quickEditDiffFooter(theme, result, context, stats) {
  const elapsedMs = getElapsedMs(result) ?? getStateElapsedMs(context.state);
  const parts = [];
  if (elapsedMs !== void 0) parts.push(theme.fg("text", formatElapsedMs(elapsedMs)));
  const plus = stats.additions > 0 ? theme.fg("toolDiffAdded", `+${stats.additions}`) : theme.fg("dim", "+0");
  const minus = stats.removals > 0 ? theme.fg("toolDiffRemoved", `-${stats.removals}`) : theme.fg("dim", "-0");
  parts.push(theme.fg("dim", "1 file"), `${plus} ${minus}`);
  return parts.join(theme.fg("dim", " \xB7 "));
}
function renderQuickEditResult(_toolName, result, options, theme, context, config) {
  if (options.isPartial) {
    const firstResultPass = noteBoxedResultPhase(context, options.isPartial);
    if (firstResultPass) return EMPTY_QUICK_EDIT_RESULT;
    return renderBoxedToolResult(
      theme,
      () => [`${theme.fg("dim", "\u21B3")} ${theme.fg("muted", `Applying ${config.applyingLabel}...`)}`],
      { showDivider: false, footerLines: [formatBoxedRunningStatus(theme, stateElapsedMs(context))], isPartial: true }
    );
  }
  const output = getTextOutput(result);
  if (context.isError) {
    return renderBoxedToolResult(theme, () => [theme.fg("error", stripAnsi(output).trim() || "Error")], {
      footerLines: [quickEditFooter(theme, context)],
      isError: true
    });
  }
  const diff = extractQuickEditDiff(output);
  if (!diff) {
    const fallback = stripAnsi(output).trim() || config.fallbackLabel;
    return renderBoxedToolResult(theme, () => [`${theme.fg("dim", "\u21B3")} ${theme.fg("muted", fallback)}`], {
      footerLines: [quickEditFooter(theme, context)]
    });
  }
  const rows = buildSplitRows(diff);
  const expanded = options.expanded;
  const argPath = String(context?.args?.path ?? "");
  const language = argPath ? getLanguageFromPath3(argPath) : void 0;
  const shouldHighlight = Boolean(language) && diff.length <= MAX_HIGHLIGHT_DIFF_CHARS2 && rows.length <= MAX_HIGHLIGHT_DIFF_ROWS2;
  const stats = countDiffStats(diff);
  const maxRows = expanded ? 160 : 36;
  const diffView = new AdaptiveDiffComponent(theme, rows, maxRows, shouldHighlight ? language : void 0);
  const expandHint = !expanded && diffView.hasCollapsed() ? toolExpandHint() : "";
  return renderBoxedToolResult(
    theme,
    {
      render(width) {
        return diffView.render(width);
      },
      invalidate() {
        diffView.invalidate();
      }
    },
    {
      showDivider: false,
      ...expandHint ? { expandHint } : {},
      footerLines: [quickEditDiffFooter(theme, result, context, stats)]
    }
  );
}
function quickEditFooter(theme, context) {
  const elapsedMs = getStateElapsedMs(context.state);
  const parts = [];
  if (elapsedMs !== void 0) parts.push(theme.fg("text", formatElapsedMs(elapsedMs)));
  parts.push(theme.fg("dim", "1 file"));
  return parts.join(theme.fg("dim", " \xB7 "));
}
function quickEditTool(config) {
  return {
    call(args, theme, context) {
      noteExecutionStart(context);
      noteBoxedCallState(context);
      const detail = displayPath(String(args?.path ?? ""), context);
      return renderBoxedToolCall(theme, config.toolLabel, [], {
        headerDetail: detail,
        isError: Boolean(context.isError),
        isPartial: Boolean(context.isPartial),
        isPending: Boolean(context.isPartial),
        running: Boolean(context.executionStarted),
        resultSeen: () => isResultSeen(context.state)
      });
    },
    result(result, options, theme, context) {
      return renderQuickEditResult(config.toolLabel, result, options, theme, context, config);
    }
  };
}

// extension-src/omp-theme/features/tools/boxed/read.ts
var READ_META = Object.freeze({
  toolName: "read",
  label: "Read"
});
var readTool = {
  call(args, theme, context) {
    noteExecutionStart(context);
    const rawPath = String(args?.path ?? args?.file_path ?? "");
    const detail = pathRangeDetail(rawPath, args?.offset, args?.limit, context);
    const { isLeader, batch } = registerBatchCall(READ_META, detail, context);
    if (!isLeader) return EMPTY_BATCH_COMPONENT;
    return renderBatchAwareCall(theme, batch);
  },
  result(result, options, _theme, context) {
    const output = stripAnsi(getTextOutput(result)).trimEnd();
    registerBatchResult(
      READ_META,
      {
        isPartial: Boolean(options.isPartial),
        isError: Boolean(context.isError),
        errorText: context.isError ? output || void 0 : void 0
      },
      context
    );
    return emptyBatchResult();
  }
};

// extension-src/omp-theme/features/tools/boxed/write.ts
var EMPTY_WRITE_RESULT = Object.freeze({
  invalidate() {
  },
  render() {
    return [];
  }
});
function numberedPreviewLines(content) {
  const normalized = replaceTabs(String(content ?? "")).replace(/\r/g, "");
  if (!normalized) return [];
  const lines = normalized.split("\n");
  const gutterWidth = Math.max(1, String(lines.length).length);
  return lines.map((line, index) => ({
    number: String(index + 1).padStart(gutterWidth),
    content: line
  }));
}
function formatNumberedLine(theme, line) {
  return `${dimLine(`${line.number} `)}${theme.fg("toolOutput", line.content)}`;
}
function renderWritePreviewBox(theme, detailLine, content, options) {
  const preview = numberedPreviewLines(content);
  const config = getToolsRenderConfig();
  const budget = options.expanded ? config.maxExpandedLines : config.maxCollapsedLines;
  const truncated = preview.length > budget;
  const expandHint = !options.expanded && !options.isPending && truncated ? toolExpandHint() : "";
  return renderCompactBoxedToolCall(theme, "Write", detailLine, {
    ...options.state ? { state: options.state } : {},
    isError: options.isError,
    isPending: options.isPending,
    running: Boolean(options.running),
    bodyLines: () => {
      if (preview.length === 0) return [];
      const shown = preview.slice(0, budget).map((line) => formatNumberedLine(theme, line));
      if (!truncated) return shown;
      const omitted = preview.length - budget;
      const note2 = options.expanded ? `\u2026 ${omitted} more lines omitted by render budget` : `\u2026 ${omitted} more lines`;
      return [...shown, theme.fg("muted", note2)];
    },
    ...expandHint ? { bottomRightLabel: expandHint } : {}
  });
}
var writeTool = {
  call(args, theme, context) {
    noteExecutionStart(context);
    const detail = displayPath(String(args?.path ?? args?.file_path ?? ""), context);
    const detailLine = detail;
    if (context.isError) {
      return compactCall(theme, "Write", detailLine, {
        detailKey: detail,
        context
      });
    }
    return renderWritePreviewBox(theme, detailLine, String(args?.content ?? ""), {
      state: context.state,
      isError: Boolean(context.isError),
      isPending: Boolean(context.isPartial),
      running: Boolean(context.executionStarted),
      expanded: Boolean(context.expanded)
    });
  },
  result(result, options, theme, context) {
    clearFooterState(context);
    const output = getTextOutput(result);
    const detail = displayPath(String(context?.args?.path ?? context?.args?.file_path ?? ""), context);
    const widthKey = boxedToolWidthKey("Write", detail);
    if (context.isError) {
      return renderBoxedToolResult(theme, () => [theme.fg("error", stripAnsi(output).trim() || "Error")], {
        widthKey,
        footerLines: resultFooterLines(theme, result, context),
        isError: true
      });
    }
    if (options.isPartial) return EMPTY_WRITE_RESULT;
    return compactFooterWithState(theme, result, context);
  }
};

// extension-src/omp-theme/features/tools/boxed/index.ts
function quickEditToolFor(toolName) {
  const config = getQuickEditToolConfig(toolName);
  if (!config) throw new Error(`missing quick-edit config for ${toolName}`);
  return quickEditTool(config);
}
var REGISTRY = {
  read: readTool,
  write: writeTool,
  edit: editTool,
  bash: bashTool,
  ls: lsTool,
  find: findTool,
  grep: grepTool,
  quick_edit: quickEditToolFor("quick_edit"),
  substitute_edit: quickEditToolFor("substitute_edit"),
  target_edit: quickEditToolFor("target_edit")
};
function collapsedTurnFor(toolCallId, expanded) {
  const config = getToolsRenderConfig();
  if (expanded || !config.collapseAfterTurn) return void 0;
  const entry = getTurnEntry(toolCallId);
  if (!entry?.turn.ended || entry.member.isError) return void 0;
  if (!isTurnCollapsibleTool(entry.member.toolName)) return void 0;
  return entry.turn;
}
var CALL_OWNED_SETTLED_RESULTS = /* @__PURE__ */ new Set(["read", "write", "ls", "find", "grep"]);
function settledResultLivesInCall(toolName, toolCallId) {
  if (typeof toolName !== "string") return false;
  if (CALL_OWNED_SETTLED_RESULTS.has(toolName)) return true;
  return toolName === "bash" && bashSettledResultLivesInCall(toolCallId);
}
function viewportStableCall(toolName, context, component) {
  return {
    invalidate() {
      component.invalidate?.();
    },
    render(width) {
      const phase = !context.isPartial && settledResultLivesInCall(toolName, context.toolCallId) ? "settled" : "stable";
      const frame = context.isPartial && !isResultSeen(context.state) ? "pending" : "open";
      const variant = `${phase}:${frame}:${context.expanded ? "expanded" : "collapsed"}`;
      return panelLines(context.toolCallId, variant, width, () => component.render(width));
    }
  };
}
function renderBoxedToolCall2(toolName, args, theme, context) {
  if (!isBatchableTool(toolName)) closeActiveBatch();
  const turn = collapsedTurnFor(context.toolCallId, context.expanded);
  if (turn) {
    if (turn.leaderId === context.toolCallId) return renderTurnSummaryCall(theme, turn);
    return EMPTY_BATCH_COMPONENT;
  }
  noteToolRowHint(context.toolCallId);
  noteTurnMemberRender(context.toolCallId, context.invalidate);
  const tool = typeof toolName === "string" ? REGISTRY[toolName] : void 0;
  const component = tool ? tool.call(args, theme, context) : renderFallbackCall(toolName, args, theme, context);
  if (component === EMPTY_BATCH_COMPONENT) return component;
  return viewportStableCall(toolName, context, component);
}
function renderBoxedToolResult2(toolName, result, options, theme, context) {
  const turn = collapsedTurnFor(context.toolCallId, options.expanded);
  if (turn) {
    if (!options.isPartial) noteTurnMemberElapsed(context.toolCallId, getStateElapsedMs(context.state));
    if (turn.leaderId === context.toolCallId) return emptyTurnResult();
    return EMPTY_BATCH_COMPONENT;
  }
  noteTurnMemberRender(context.toolCallId, context.invalidate);
  const tool = typeof toolName === "string" ? REGISTRY[toolName] : void 0;
  if (tool) return tool.result(result, options, theme, context);
  return renderFallbackResult(toolName, result, options, theme, context);
}

// extension-src/omp-theme/features/tools/index.ts
function hideBatchMember(instance) {
  instance.hideComponent = true;
}
function neutralizeToolContainerBackground(instance) {
  const host = instance;
  const container = typeof host.getRenderShell === "function" && host.getRenderShell() === "self" ? host.selfRenderContainer : host.contentBox;
  if (!container) return;
  container.paddingX = 0;
  container.paddingY = 0;
  if (typeof container.setBgFn === "function") container.setBgFn((text2) => text2);
}
var DEFAULT_SNAPSHOT = Object.freeze({
  callMarker: "[tool] ",
  resultMarker: "[tool:result] ",
  style: "marker"
});
var ownerGeneration = 0;
var piOmpThemeWrappers = /* @__PURE__ */ new WeakSet();
var capturedToolUi;
function requestToolPresentationRender() {
  capturedToolUi?.requestRender?.();
}
var toolTestHooks = {};
function note(state, reason, transaction = "never-written") {
  state.diagnostics.set(reason, (state.diagnostics.get(reason) ?? 0) + 1);
  if (state.failures.length < 32) state.failures.push(Object.freeze({ reason, transaction }));
}
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function ownData(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor && "value" in descriptor ? descriptor.value : void 0;
}
function hasOwnData(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor !== void 0 && "value" in descriptor;
}
function validContext(value) {
  if (!isObject(value)) return false;
  const booleans = ["isPartial", "expanded", "isError", "executionStarted", "argsComplete", "showImages"];
  return isObject(ownData(value, "args")) && typeof ownData(value, "toolCallId") === "string" && typeof ownData(value, "invalidate") === "function" && isObject(ownData(value, "state")) && typeof ownData(value, "cwd") === "string" && booleans.every((key) => typeof ownData(value, key) === "boolean") && hasOwnData(value, "lastComponent") && (ownData(value, "lastComponent") === void 0 || isObject(ownData(value, "lastComponent")));
}
function validCallArgs(args) {
  return args.length === 3 && isObject(args[0]) && isObject(args[1]) && validContext(args[2]);
}
function validResultArgs(args) {
  const [result, options, theme, context] = args;
  return isObject(result) && hasOwnData(result, "content") && Array.isArray(ownData(result, "content")) && hasOwnData(result, "details") && isObject(options) && typeof ownData(options, "expanded") === "boolean" && typeof ownData(options, "isPartial") === "boolean" && isObject(theme) && validContext(context);
}
function descriptorView(descriptor) {
  if (!descriptor) return void 0;
  if ("value" in descriptor)
    return Object.freeze({
      kind: "data",
      value: descriptor.value,
      writable: descriptor.writable === true,
      enumerable: descriptor.enumerable === true,
      configurable: descriptor.configurable === true
    });
  return Object.freeze({
    kind: "accessor",
    get: descriptor.get,
    set: descriptor.set,
    enumerable: descriptor.enumerable === true,
    configurable: descriptor.configurable === true
  });
}
function descriptorEqual(actual, expected) {
  const a = descriptorView(actual), e = descriptorView(expected);
  return a?.kind === e?.kind && a?.value === e?.value && a?.get === e?.get && a?.set === e?.set && a?.writable === e?.writable && a?.enumerable === e?.enumerable && a?.configurable === e?.configurable;
}
function renderDescriptor(component) {
  const own = Object.getOwnPropertyDescriptor(component, "render");
  if (own && !("value" in own && typeof own.value === "function" && own.writable === true && own.configurable === true))
    return false;
  let cursor = Object.getPrototypeOf(component);
  let inherited;
  while (cursor && !inherited) {
    const descriptor = Object.getOwnPropertyDescriptor(cursor, "render");
    if (descriptor) inherited = descriptor;
    cursor = Object.getPrototypeOf(cursor);
  }
  if (!own && inherited && !("value" in inherited && typeof inherited.value === "function")) return false;
  const native = own?.value ?? (inherited && "value" in inherited ? inherited.value : void 0);
  return typeof native === "function" ? { ...own ? { own } : {}, ...inherited ? { inherited } : {}, native } : false;
}
function marker(state, context, kind) {
  if (context.isError) return "[tool:error] ";
  if (context.isPartial) return context.executionStarted ? "[tool:running] " : "[tool:pending] ";
  return kind === "call" ? state.snapshot.callMarker : state.snapshot.resultMarker;
}
function decorateLines(state, value, width, prefix) {
  if (!Array.isArray(value) || !value.every((line) => typeof line === "string")) {
    note(state, "malformed-render");
    return value;
  }
  if (typeof width !== "number" || !Number.isFinite(width) || width < 0) {
    note(state, "invalid-width");
    return value;
  }
  const lines = value, prefixWidth = safeVisibleWidth(prefix), bodyWidth = width - prefixWidth;
  if (width <= prefixWidth || !lines.every((line) => safeVisibleWidth(line) <= bodyWidth)) {
    note(state, "reduced-native-fallback");
    return value;
  }
  const output = lines.length === 0 ? [prefix.trimEnd()] : lines.map((line, index) => index === 0 ? `${prefix}${line}` : line);
  if (output.every((line) => safeVisibleWidth(line) <= width)) return output;
  note(state, "overwide-decoration");
  return value;
}
function createRecord(state, component, nativeRender, context, kind, descriptors) {
  const attemptedDescriptor = descriptors.own ? { ...descriptors.own, value: void 0 } : { value: void 0, writable: true, enumerable: false, configurable: true };
  const record3 = {
    component,
    nativeRender,
    wrappedRender: void 0,
    attemptedDescriptor,
    ...descriptors.own ? { originalOwnDescriptor: descriptors.own } : {},
    ...descriptors.inherited ? { inheritedDescriptor: descriptors.inherited } : {},
    context,
    transaction: "never-written"
  };
  record3.wrappedRender = function(...renderArgs) {
    const width = renderArgs[0], prefix = marker(state, record3.context, kind);
    const nativeArgs = typeof width === "number" && width > safeVisibleWidth(prefix) ? [width - safeVisibleWidth(prefix), ...renderArgs.slice(1)] : renderArgs;
    return decorateLines(state, Reflect.apply(record3.nativeRender, this, nativeArgs), width, prefix);
  };
  piOmpThemeWrappers.add(record3.wrappedRender);
  return record3;
}
function installDecoration(state, record3) {
  record3.attemptedDescriptor.value = record3.wrappedRender;
  let wrote = false;
  try {
    wrote = Reflect.defineProperty(record3.component, "render", record3.attemptedDescriptor);
  } catch (error) {
    note(state, `render-install-threw: ${error instanceof Error ? error.message : String(error)}`, "never-written");
    return;
  }
  if (!wrote) {
    note(state, "render-install-rejected", "never-written");
    return;
  }
  const current = Object.getOwnPropertyDescriptor(record3.component, "render");
  if (!descriptorEqual(current, record3.attemptedDescriptor)) {
    if (current?.value === record3.wrappedRender) {
      const restored = record3.originalOwnDescriptor ? (toolTestHooks.defineProperty ?? Reflect.defineProperty)(
        record3.component,
        "render",
        record3.originalOwnDescriptor
      ) : (toolTestHooks.deleteProperty ?? Reflect.deleteProperty)(record3.component, "render");
      const after = Object.getOwnPropertyDescriptor(record3.component, "render");
      if (restored && (record3.originalOwnDescriptor ? descriptorEqual(after, record3.originalOwnDescriptor) : after === void 0)) {
        record3.transaction = "rollback-restored";
        note(state, "render-install-flags-mismatch-rolled-back", record3.transaction);
        return;
      }
      record3.transaction = "rollback-failed";
      state.decorated.set(record3.component, record3);
      state.active.add(record3);
      note(state, "render-install-rollback-failed", record3.transaction);
      return;
    }
    record3.transaction = "owner-changed";
    note(state, "render-owner-changed-during-install", record3.transaction);
    return;
  }
  record3.transaction = "installed-owned";
  state.decorated.set(record3.component, record3);
  state.active.add(record3);
}
function restoreDecoration(state, record3) {
  const current = Object.getOwnPropertyDescriptor(record3.component, "render");
  if (!descriptorEqual(current, record3.attemptedDescriptor)) {
    record3.transaction = "owner-changed";
    state.laterOwner++;
    note(state, "render-owner-changed", record3.transaction);
    return "later-owner";
  }
  const restored = record3.originalOwnDescriptor ? (toolTestHooks.defineProperty ?? Reflect.defineProperty)(record3.component, "render", record3.originalOwnDescriptor) : (toolTestHooks.deleteProperty ?? Reflect.deleteProperty)(record3.component, "render");
  const after = Object.getOwnPropertyDescriptor(record3.component, "render");
  const ok = record3.originalOwnDescriptor ? descriptorEqual(after, record3.originalOwnDescriptor) : after === void 0;
  if (!restored || !ok) {
    record3.transaction = "rollback-failed";
    const signature = JSON.stringify(descriptorView(after));
    if (record3.lastFailureSignature !== signature) {
      record3.lastFailureSignature = signature;
      note(state, "render-restore-failed", record3.transaction);
    }
    return "retry";
  }
  record3.transaction = "rollback-restored";
  return "restored";
}
function finalize(state) {
  if (state.archive) return state.archive;
  const reasons = Object.freeze(Object.fromEntries(state.diagnostics));
  state.archive = Object.freeze({
    owner: `tool-owner-${state.generation}`,
    generation: state.generation,
    reasons,
    restored: state.restored,
    failed: state.failed,
    laterOwner: state.laterOwner,
    failures: Object.freeze(state.failures.slice(0, 32))
  });
  return state.archive;
}
function createToolDecorationOwner(snapshot = {}) {
  const state = {
    snapshot: Object.freeze({ ...DEFAULT_SNAPSHOT, ...snapshot }),
    decorated: /* @__PURE__ */ new WeakMap(),
    active: /* @__PURE__ */ new Set(),
    diagnostics: /* @__PURE__ */ new Map(),
    failures: [],
    restored: 0,
    failed: 0,
    laterOwner: 0,
    generation: ++ownerGeneration
  };
  const dispose = () => {
    if (state.archive)
      return {
        restored: state.restored,
        failed: state.failed,
        diagnostics: new Map(state.diagnostics),
        archive: state.archive
      };
    for (const record3 of [...state.active]) {
      const outcome = restoreDecoration(state, record3);
      if (outcome === "restored") {
        state.restored++;
        state.active.delete(record3);
      } else if (outcome === "later-owner") state.active.delete(record3);
      else state.failed++;
    }
    capturedToolUi = void 0;
    clearPresentationTui2();
    const archive = state.active.size === 0 ? finalize(state) : void 0;
    return { restored: state.restored, failed: state.failed, diagnostics: new Map(state.diagnostics), archive };
  };
  return Object.freeze({
    decorateToolRendererSelection(subtype, original, instance, args) {
      if (typeof original !== "function") return void 0;
      capturedToolUi = instance.ui ?? capturedToolUi;
      notePresentationTui2(capturedToolUi);
      const renderer = Reflect.apply(original, instance, args);
      if (state.snapshot.style === "compact-box") {
        const toolName = instance.toolName;
        if (typeof renderer !== "function") {
          neutralizeToolContainerBackground(instance);
          if (subtype === "tool-call-renderer")
            return (callArgs, theme, context) => {
              const component = renderBoxedToolCall2(
                toolName,
                callArgs,
                theme,
                context
              );
              if (component === EMPTY_BATCH_COMPONENT) hideBatchMember(instance);
              return component;
            };
          return (result, options, theme, context) => {
            const component = renderBoxedToolResult2(
              toolName,
              result,
              options,
              theme,
              context
            );
            if (component === EMPTY_BATCH_COMPONENT) hideBatchMember(instance);
            return component;
          };
        }
        return function(...rendererArgs) {
          const valid = subtype === "tool-call-renderer" ? validCallArgs(rendererArgs) : validResultArgs(rendererArgs);
          if (!valid) {
            note(state, `${subtype}-malformed-context`);
            return Reflect.apply(renderer, this, rendererArgs);
          }
          const component = subtype === "tool-call-renderer" ? (() => {
            const [args2, theme, context] = rendererArgs;
            return renderBoxedToolCall2(
              toolName,
              args2,
              theme,
              context
            );
          })() : (() => {
            const [result, options, theme, context] = rendererArgs;
            return renderBoxedToolResult2(
              toolName,
              result,
              options,
              theme,
              context
            );
          })();
          neutralizeToolContainerBackground(instance);
          if (component === EMPTY_BATCH_COMPONENT) hideBatchMember(instance);
          return component;
        };
      }
      if (typeof renderer !== "function") return renderer;
      return function(...rendererArgs) {
        const valid = subtype === "tool-call-renderer" ? validCallArgs(rendererArgs) : validResultArgs(rendererArgs);
        if (!valid) {
          note(state, `${subtype}-malformed-context`);
          return Reflect.apply(renderer, this, rendererArgs);
        }
        const component = Reflect.apply(renderer, this, rendererArgs);
        if (!isObject(component)) return component;
        const descriptors = renderDescriptor(component);
        if (descriptors !== false && descriptors.native && piOmpThemeWrappers.has(descriptors.native)) {
          note(state, `${subtype}-owner-conflict`);
          return component;
        }
        if (!descriptors) {
          note(state, `${subtype}-unsafe-render-descriptor`);
          return component;
        }
        const record3 = state.decorated.get(component);
        if (record3) {
          record3.context = rendererArgs.at(-1);
          return component;
        }
        const next = createRecord(
          state,
          component,
          descriptors.native,
          rendererArgs.at(-1),
          subtype === "tool-call-renderer" ? "call" : "result",
          descriptors
        );
        installDecoration(state, next);
        return component;
      };
    },
    getDiagnostics: () => new Map(state.diagnostics),
    getFinalArchive: () => state.archive,
    getActiveRecordCount: () => state.active.size,
    dispose
  });
}

// extension-src/omp-theme/shared/shimmer.ts
var SPEED_CELLS_PER_S = 30;
var CLASSIC_PADDING = 10;
var CLASSIC_BAND_HALF_WIDTH = 6;
var KITT_HEAD_HALF = 0.6;
var KITT_TRAIL_LEN = 7;
var TIER_HIGH = 0.65;
var TIER_MID = 0.22;
var FG_RESET = "\x1B[39m";
var BOLD_OPEN = "\x1B[1m";
var BOLD_CLOSE = "\x1B[22m";
function compile(palette) {
  const highOpen = palette.bold ? `${BOLD_OPEN}${palette.high}` : palette.high;
  return {
    low: { open: palette.low, close: palette.low ? FG_RESET : "" },
    mid: { open: palette.mid, close: palette.mid ? FG_RESET : "" },
    high: {
      open: highOpen,
      close: palette.bold ? `${BOLD_CLOSE}${palette.high ? FG_RESET : ""}` : palette.high ? FG_RESET : ""
    }
  };
}
function classicIntensity(time, index, length) {
  const period = length + CLASSIC_PADDING * 2;
  const pos = time / 1e3 * SPEED_CELLS_PER_S % period;
  const dist = Math.abs(index + CLASSIC_PADDING - pos);
  if (dist >= CLASSIC_BAND_HALF_WIDTH) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * dist / CLASSIC_BAND_HALF_WIDTH));
}
function kittIntensity(time, index, length) {
  const range = length - 1;
  if (range <= 0) return 1;
  const cycleCells = 2 * range;
  const sweep2 = time / 1e3 * SPEED_CELLS_PER_S % cycleCells;
  const goingRight = sweep2 < range;
  const head = goingRight ? sweep2 : cycleCells - sweep2;
  const delta = index - head;
  const abs = delta < 0 ? -delta : delta;
  if (abs <= KITT_HEAD_HALF) return 1;
  const behind = goingRight ? -delta : delta;
  if (behind <= KITT_HEAD_HALF) return 0;
  const t = (behind - KITT_HEAD_HALF) / KITT_TRAIL_LEN;
  if (t >= 1) return 0;
  const f = 1 - t;
  return f * f;
}
function activeBand(mode, time, total) {
  if (mode === "classic") {
    const period = total + CLASSIC_PADDING * 2;
    const pos = time / 1e3 * SPEED_CELLS_PER_S % period;
    return { lo: pos - CLASSIC_PADDING - CLASSIC_BAND_HALF_WIDTH, hi: pos - CLASSIC_PADDING + CLASSIC_BAND_HALF_WIDTH };
  }
  const range = total - 1;
  if (range <= 0) return { lo: 0, hi: total };
  const cycleCells = 2 * range;
  const sweep2 = time / 1e3 * SPEED_CELLS_PER_S % cycleCells;
  const goingRight = sweep2 < range;
  const head = goingRight ? sweep2 : cycleCells - sweep2;
  return goingRight ? { lo: head - KITT_HEAD_HALF - KITT_TRAIL_LEN, hi: head + KITT_HEAD_HALF } : { lo: head - KITT_HEAD_HALF, hi: head + KITT_HEAD_HALF + KITT_TRAIL_LEN };
}
function tierFor(intensity) {
  if (intensity >= TIER_HIGH) return "high";
  if (intensity >= TIER_MID) return "mid";
  return "low";
}
function countCodePoints(text2) {
  let count = 0;
  for (let i = 0; i < text2.length; i++) {
    const code = text2.charCodeAt(i);
    if (code >= 55296 && code <= 56319 && i + 1 < text2.length) {
      const next = text2.charCodeAt(i + 1);
      if (next >= 56320 && next <= 57343) i++;
    }
    count++;
  }
  return count;
}
function sweep(text2, compiled, intensityFn, time, band, offset, total) {
  let out = "";
  let runTier;
  let runStart = 0;
  let runEnd = 0;
  let index = offset;
  let i = 0;
  while (i < text2.length) {
    const code = text2.charCodeAt(i);
    let step = 1;
    if (code >= 55296 && code <= 56319 && i + 1 < text2.length) {
      const next = text2.charCodeAt(i + 1);
      if (next >= 56320 && next <= 57343) step = 2;
    }
    const tier = index < band.lo || index > band.hi ? "low" : tierFor(intensityFn(time, index, total));
    if (tier !== runTier) {
      if (runTier !== void 0 && runEnd > runStart) {
        const seq = compiled[runTier];
        out += `${seq.open}${text2.slice(runStart, runEnd)}${seq.close}`;
      }
      runTier = tier;
      runStart = i;
    }
    runEnd = i + step;
    index++;
    i += step;
  }
  if (runTier !== void 0 && runEnd > runStart) {
    const seq = compiled[runTier];
    out += `${seq.open}${text2.slice(runStart, runEnd)}${seq.close}`;
  }
  return out;
}
function createSegmentedShimmer(segments, mode) {
  const compiled = segments.map((segment2) => ({ text: segment2.text, compiled: compile(segment2.palette) }));
  const lengths = compiled.map((entry) => countCodePoints(entry.text));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (mode === "off" || total === 0) {
    const still = compiled.map((entry) => entry.text ? `${entry.compiled.mid.open}${entry.text}${entry.compiled.mid.close}` : "").join("");
    return () => still;
  }
  const intensityFn = mode === "kitt" ? kittIntensity : classicIntensity;
  return (time) => {
    const band = activeBand(mode, time, total);
    let out = "";
    let offset = 0;
    for (let index = 0; index < compiled.length; index++) {
      const entry = compiled[index];
      if (!entry) continue;
      out += sweep(entry.text, entry.compiled, intensityFn, time, band, offset, total);
      offset += lengths[index] ?? 0;
    }
    return out;
  };
}

// extension-src/omp-theme/features/working-indicator/index.ts
var STATUS_FRAMES = ["\u28FE", "\u28FD", "\u28FB", "\u28BF", "\u287F", "\u28DF", "\u28EF", "\u28F7"];
var FRAME_INTERVAL_MS = 80;
var ASCII_FRAMES = ["|", "/", "-", "\\"];
var SHIMMER_INTERVAL_MS = Math.round(1e3 / 30);
var WORKING_TEXT = "Working...";
function interruptHint() {
  const hint = displayKeyHint("app.interrupt", "to interrupt");
  return hint ? ` (${hint})` : "";
}
function installWorkingIndicator(ui, ascii = false) {
  if (typeof ui?.setWorkingIndicator !== "function") return false;
  const frames2 = (ascii ? ASCII_FRAMES : STATUS_FRAMES).map((frame) => {
    try {
      return ui.theme?.fg?.("accent", frame) ?? frame;
    } catch {
      return frame;
    }
  });
  try {
    ui.setWorkingIndicator({ frames: frames2, intervalMs: FRAME_INTERVAL_MS });
    return true;
  } catch {
    return false;
  }
}
function restoreWorkingIndicator(ui) {
  if (typeof ui?.setWorkingIndicator !== "function") return;
  try {
    ui.setWorkingIndicator(void 0);
  } catch {
  }
}
function buildRowRenderer(state) {
  const hint = interruptHint();
  const palette = state.palette();
  const hintPalette = { low: palette.low, mid: palette.low, high: palette.mid };
  const segments = hint ? [
    { text: WORKING_TEXT, palette },
    { text: hint, palette: hintPalette }
  ] : [{ text: WORKING_TEXT, palette }];
  return createSegmentedShimmer(segments, state.mode);
}
var shimmer;
function configureWorkingShimmer(ui, mode, palette) {
  disposeWorkingShimmer();
  if (!ui || typeof ui.setWorkingMessage !== "function") return;
  shimmer = { host: ui, mode, palette, animated: mode !== "off" };
}
function startWorkingShimmer() {
  const state = shimmer;
  if (!state || state.timer) return;
  const render = buildRowRenderer(state);
  state.render = render;
  const paint = () => {
    try {
      state.host.setWorkingMessage?.(render(Date.now()));
    } catch {
      stopWorkingShimmer();
    }
  };
  paint();
  if (!state.animated) return;
  state.timer = setInterval(paint, SHIMMER_INTERVAL_MS);
  state.timer.unref?.();
}
function stopWorkingShimmer() {
  const state = shimmer;
  if (!state) return;
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = void 0;
  }
  try {
    state.host.setWorkingMessage?.(void 0);
  } catch {
  }
}
function disposeWorkingShimmer() {
  stopWorkingShimmer();
  shimmer = void 0;
}

// extension-src/omp-theme/domain/config-diagnostics.ts
function boundedDiagnostics(items, limit = 32) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const item of items) {
    const key = `${item.level}:${item.code}:${item.path}:${item.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(Object.freeze(item));
    if (result.length >= limit) break;
  }
  return Object.freeze(result);
}

// extension-src/omp-theme/domain/config-presets.ts
var CONFIG_PRESETS = Object.freeze({
  default: Object.freeze({
    startup: { mode: "compact" }
  }),
  /**
   * omp's "Claude Code" composer: full-width rules, no side borders, status on them.
   *
   * fork: `startup.mode: "off"` keeps Pi's own `builtInHeader` (the `Pi vX.Y.Z`
   * line, the compact key hints, and the onboarding line) instead of the theme's
   * welcome card. `installStartup` bails out before it ever calls `setHeader`, so
   * the header container keeps the component Pi installed itself.
   */
  claude: Object.freeze({
    placement: "below",
    editor: { style: "dock", frame: "claude", showMetadata: false },
    statusLine: {
      separator: "|",
      layout: {
        // No `pi` segment: the π wordmark is omp's own branding, not Pi's.
        // fork: Pi's native usage cluster follows the model on the left; the
        // right edge carries the natively abbreviated working directory and
        // the `used / window` readout.
        left: ["model_effort", "native_usage"],
        right: ["path_plain", "context_used"],
        // No extension statuses: they are other packages' text and cost a whole row.
        secondary: []
      }
    },
    startup: { mode: "off" }
  }),
  /**
   * omp's default composer: a rounded box whose top border carries the status
   * segments and whose remaining span is a context gauge. Distinct from the
   * `claude` preset, which draws two bare rules and keeps the status on its own
   * row below them.
   */
  omp: Object.freeze({
    placement: "border",
    editor: { style: "dock", frame: "rounded", showMetadata: false },
    statusLine: {
      separator: "\u203A",
      layout: {
        left: ["model_effort", "path", "git"],
        // The gauge absorbs the window label, as omp's "embedded" context line
        // does; rendering the segment too would print 272K twice. The session
        // title closes the bar, so a long gauge is not the last thing on it.
        right: ["session_title"],
        secondary: []
      }
    },
    startup: { mode: "compact" }
  }),
  minimal: Object.freeze({
    statusLine: { layout: { left: ["path", "git"], right: ["context_pct"], secondary: [] } },
    editor: { style: "native", frame: "native", showMetadata: false },
    startup: { mode: "off" },
    messages: { enabled: false },
    tools: { enabled: false, collapseAfterTurn: false },
    theme: { terminalBackgroundSync: "off" }
  }),
  compact: Object.freeze({
    statusLine: {
      layout: { left: ["model", "thinking", "git"], right: ["context_pct"], secondary: ["extension_statuses"] }
    },
    editor: { style: "compact", frame: "auto", showMetadata: false },
    startup: { mode: "compact" }
  }),
  full: Object.freeze({
    statusLine: {
      layout: {
        left: ["hostname", "model", "thinking", "path", "git", "session"],
        right: ["token_in", "token_out", "cache_read", "cost", "context_pct", "time_spent", "time"],
        secondary: ["extension_statuses"]
      }
    },
    editor: { style: "boxed", frame: "outline", showMetadata: true },
    startup: { mode: "overlay", showResources: true }
  }),
  ascii: Object.freeze({
    editor: { style: "compact", frame: "auto" },
    startup: { mode: "compact" },
    theme: { nerdFonts: "off", terminalBackgroundSync: "off" }
  }),
  native: Object.freeze({
    statusLine: { layout: { left: ["model", "path"], right: ["context_pct"], secondary: [] } },
    editor: { style: "native", frame: "native", showMetadata: false },
    startup: { mode: "off" },
    messages: { enabled: false },
    tools: { enabled: false, collapseAfterTurn: false },
    theme: { terminalBackgroundSync: "off", autoApply: "off", shimmer: "off" }
  })
});
function presetConfig(name) {
  return CONFIG_PRESETS[typeof name === "string" && name in CONFIG_PRESETS ? name : "default"];
}

// extension-src/omp-theme/domain/config-types.ts
var PI_OMP_THEME_SCHEMA_VERSION = 1;

// extension-src/omp-theme/domain/status-presets.ts
var STATUS_PRESETS = Object.freeze({
  default: Object.freeze({
    left: ["path", "git", "context_bar", "cost"],
    right: ["model_effort"],
    secondary: ["extension_statuses"]
  }),
  minimal: Object.freeze({ left: ["path", "git"], right: ["context_pct"], secondary: [] }),
  compact: Object.freeze({
    left: ["model", "thinking", "git"],
    right: ["context_pct"],
    secondary: ["extension_statuses"]
  }),
  full: Object.freeze({
    left: ["hostname", "model", "thinking", "path", "git", "session"],
    right: ["token_in", "token_out", "cache_read", "cost", "context_pct", "time_spent", "time"],
    secondary: ["extension_statuses"]
  }),
  ascii: Object.freeze({
    left: ["path", "git", "context_bar", "cost"],
    right: ["model_effort"],
    secondary: ["extension_statuses"]
  }),
  native: Object.freeze({ left: ["model", "path"], right: ["context_pct"], secondary: [] }),
  // Mirrors the omp preset's own layout (config-presets.ts): the top border
  // carries identity and location, and the gauge spends the rest of the span.
  omp: Object.freeze({
    left: ["model_effort", "path", "git"],
    right: ["session_title"],
    secondary: []
  }),
  // Mirrors the claude preset's own layout (config-presets.ts). Without an entry
  // here a config that overrides just one group silently inherits `default`'s
  // other two, which is not the layout the preset promises.
  //
  // fork: the context gauge is replaced by Pi's native footer usage cluster on
  // the left; the right edge carries the working directory (native `~`
  // abbreviation, no icon) followed by the `used / window` readout.
  claude: Object.freeze({
    left: ["model_effort", "native_usage"],
    right: ["path_plain", "context_used"],
    secondary: []
  })
});
function unique(values) {
  const result = [];
  for (const value of values) {
    if (typeof value !== "string" || result.includes(value)) continue;
    result.push(value);
  }
  return result;
}
function normalizeStatusLayout(preset, input) {
  const base = STATUS_PRESETS[preset] ?? STATUS_PRESETS.default;
  const left = input?.left === void 0 ? base.left : unique(input.left);
  const right = input?.right === void 0 ? base.right : unique(input.right);
  const secondary = input?.secondary === void 0 ? base.secondary : unique(input.secondary);
  const seen = /* @__PURE__ */ new Set();
  const dedupe = (values) => values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
  return Object.freeze({ left: dedupe(left), right: dedupe(right), secondary: dedupe(secondary) });
}

// extension-src/omp-theme/domain/config-normalization.ts
var DEFAULT_CONFIG = Object.freeze({
  schemaVersion: PI_OMP_THEME_SCHEMA_VERSION,
  enabled: true,
  // omp's Claude Code composer is the shipped look.
  preset: "claude",
  placement: "below",
  startup: Object.freeze({ mode: "compact", showResources: false, alwaysExpanded: false }),
  statusLine: Object.freeze({
    enabled: true,
    separator: "powerline-thin",
    layout: Object.freeze({
      left: ["model_effort", "native_usage"],
      right: ["path_plain", "context_used"],
      secondary: []
    }),
    disabledSegments: [],
    customItems: [],
    // fork: 0 keeps the status row flush against the terminal's last line, the
    // way Pi's native footer sits. 1 reserved a blank row underneath it.
    bottomMargin: 0,
    contextBarWidth: 10
  }),
  editor: Object.freeze({ enabled: true, style: "dock", frame: "rounded", showMetadata: false, hint: "" }),
  messages: Object.freeze({
    enabled: true,
    // omp draws no gutter in front of assistant text or thinking lines.
    assistantPrefix: false,
    specialBlocks: true,
    hideThinkingLabel: true,
    // Text that shares a message with a tool call is not always narration: it is
    // routinely the answer itself, and hiding it loses content the run never
    // repeats. omp shows it (its transcripts carry prose between tool blocks),
    // so the destructive reading is opt-in rather than the shipped default.
    hideInterimText: false
  }),
  tools: Object.freeze({
    enabled: true,
    style: "compact-box",
    maxCollapsedLines: 10,
    maxExpandedLines: 50,
    dimOutput: false,
    showElapsed: true,
    collapseAfterTurn: true,
    batchQuietCalls: true,
    // omp keeps the frame but draws it quietly: no breathing rows, a dim border,
    // an inset section rule and the timing as content rather than border text.
    chrome: "boxed",
    collapseMutatingTools: false
  }),
  theme: Object.freeze({
    nerdFonts: "auto",
    shimmer: "classic",
    cacheHighlight: true,
    sessionAccent: true,
    terminalBackgroundSync: "auto",
    autoApply: "titanium",
    colors: {},
    glyphs: {}
  }),
  compatibility: Object.freeze({
    allowSafePatches: true,
    allowCorePatches: false,
    preferExistingEditor: true,
    preferExistingFooter: true
  }),
  debug: false
});
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function merge(base, source) {
  if (!isRecord(source)) return base;
  const result = { ...base };
  for (const [key, value] of Object.entries(source))
    result[key] = isRecord(value) && isRecord(result[key]) ? merge(result[key], value) : value;
  return result;
}
function bool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}
function boundedInt(value, fallback, min, max) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
}
function stringEnum(value, allowed, fallback) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}
function strings(value, fallback) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? [...value] : fallback;
}
function stringMap(value) {
  return isRecord(value) ? Object.fromEntries(
    Object.entries(value).filter((entry) => typeof entry[1] === "string")
  ) : {};
}
function customItems(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.statusKey !== "string") return false;
    return item.placement === void 0 || ["left", "right", "secondary"].includes(item.placement);
  });
}
var BORDER_STATUS_MIN_WIDTH = 44;
function editorHostsBorderStatusAt(config, width) {
  return editorHostsBorderStatus(config) && width >= BORDER_STATUS_MIN_WIDTH;
}
function editorHostsBorderStatus(config) {
  if (!config.enabled || !config.editor.enabled) return false;
  const { style, frame } = config.editor;
  if (style === "compact" || style === "boxed" || style === "native") return false;
  if (frame === "line" || frame === "solid" || frame === "native") return false;
  if (frame === "claude") return false;
  return true;
}
function normalizeConfig(input, defaults = DEFAULT_CONFIG) {
  const value = merge(defaults, acceptedInput(input));
  const inputRecord = isRecord(input) ? input : {};
  const inputStatus = isRecord(inputRecord.statusLine) ? inputRecord.statusLine : {};
  const inputLayout = isRecord(inputStatus.layout) ? inputStatus.layout : void 0;
  const startup = isRecord(value.startup) ? value.startup : {};
  const status = isRecord(value.statusLine) ? value.statusLine : {};
  const editor = isRecord(value.editor) ? value.editor : {};
  const messages = isRecord(value.messages) ? value.messages : {};
  const tools = isRecord(value.tools) ? value.tools : {};
  const theme = isRecord(value.theme) ? value.theme : {};
  const compatibility = isRecord(value.compatibility) ? value.compatibility : {};
  const max = typeof tools.maxCollapsedLines === "number" && Number.isFinite(tools.maxCollapsedLines) && tools.maxCollapsedLines >= 0 ? Math.floor(tools.maxCollapsedLines) : defaults.tools.maxCollapsedLines;
  const maxExpanded = typeof tools.maxExpandedLines === "number" && Number.isFinite(tools.maxExpandedLines) && tools.maxExpandedLines >= 0 ? Math.min(Math.floor(tools.maxExpandedLines), 1e3) : defaults.tools.maxExpandedLines;
  return Object.freeze({
    schemaVersion: PI_OMP_THEME_SCHEMA_VERSION,
    enabled: bool(value.enabled, defaults.enabled),
    preset: stringEnum(value.preset, PRESET_NAMES, defaults.preset),
    placement: stringEnum(value.placement, ["above", "below", "border"], defaults.placement),
    startup: Object.freeze({
      mode: stringEnum(startup.mode, ["off", "compact", "overlay"], defaults.startup.mode),
      showResources: bool(startup.showResources, defaults.startup.showResources),
      alwaysExpanded: bool(startup.alwaysExpanded, defaults.startup.alwaysExpanded)
    }),
    statusLine: Object.freeze({
      enabled: bool(status.enabled, defaults.statusLine.enabled),
      separator: typeof status.separator === "string" ? status.separator : defaults.statusLine.separator,
      layout: normalizeStatusLayout(
        stringEnum(value.preset, PRESET_NAMES, defaults.preset),
        inputLayout ? {
          left: inputLayout.left === void 0 ? void 0 : strings(inputLayout.left, defaults.statusLine.layout.left),
          right: inputLayout.right === void 0 ? void 0 : strings(inputLayout.right, defaults.statusLine.layout.right),
          secondary: inputLayout.secondary === void 0 ? void 0 : strings(inputLayout.secondary, defaults.statusLine.layout.secondary)
        } : void 0
      ),
      disabledSegments: strings(status.disabledSegments, defaults.statusLine.disabledSegments),
      customItems: customItems(status.customItems),
      bottomMargin: boundedInt(status.bottomMargin, defaults.statusLine.bottomMargin, 0, 4),
      contextBarWidth: boundedInt(status.contextBarWidth, defaults.statusLine.contextBarWidth, 4, 40)
    }),
    editor: Object.freeze({
      enabled: bool(editor.enabled, defaults.editor.enabled),
      style: stringEnum(editor.style, ["compact", "boxed", "dock", "native"], defaults.editor.style),
      frame: stringEnum(
        editor.frame,
        ["auto", "halfblock", "line", "solid", "outline", "rounded", "claude", "native"],
        defaults.editor.frame
      ),
      showMetadata: bool(editor.showMetadata, defaults.editor.showMetadata),
      hint: typeof editor.hint === "string" ? editor.hint : defaults.editor.hint
    }),
    messages: Object.freeze({
      enabled: bool(messages.enabled, defaults.messages.enabled),
      assistantPrefix: bool(messages.assistantPrefix, defaults.messages.assistantPrefix),
      specialBlocks: bool(messages.specialBlocks, defaults.messages.specialBlocks),
      hideThinkingLabel: bool(messages.hideThinkingLabel, defaults.messages.hideThinkingLabel),
      hideInterimText: bool(messages.hideInterimText, defaults.messages.hideInterimText)
    }),
    tools: Object.freeze({
      enabled: bool(tools.enabled, defaults.tools.enabled),
      style: typeof tools.style === "string" ? tools.style : defaults.tools.style,
      maxCollapsedLines: max,
      maxExpandedLines: maxExpanded,
      dimOutput: bool(tools.dimOutput, defaults.tools.dimOutput),
      showElapsed: bool(tools.showElapsed, defaults.tools.showElapsed),
      collapseAfterTurn: bool(tools.collapseAfterTurn, defaults.tools.collapseAfterTurn),
      batchQuietCalls: bool(tools.batchQuietCalls, defaults.tools.batchQuietCalls),
      chrome: stringEnum(tools.chrome, ["boxed", "light"], defaults.tools.chrome),
      collapseMutatingTools: bool(tools.collapseMutatingTools, defaults.tools.collapseMutatingTools)
    }),
    theme: Object.freeze({
      nerdFonts: stringEnum(theme.nerdFonts, ["auto", "on", "off"], defaults.theme.nerdFonts),
      shimmer: stringEnum(theme.shimmer, ["classic", "kitt", "off"], defaults.theme.shimmer),
      cacheHighlight: bool(theme.cacheHighlight, defaults.theme.cacheHighlight),
      sessionAccent: bool(theme.sessionAccent, defaults.theme.sessionAccent),
      terminalBackgroundSync: stringEnum(
        theme.terminalBackgroundSync,
        ["auto", "on", "off"],
        defaults.theme.terminalBackgroundSync
      ),
      autoApply: typeof theme.autoApply === "string" && theme.autoApply.trim() !== "" ? theme.autoApply : defaults.theme.autoApply,
      colors: stringMap(theme.colors),
      glyphs: stringMap(theme.glyphs)
    }),
    compatibility: Object.freeze({
      allowSafePatches: bool(compatibility.allowSafePatches, defaults.compatibility.allowSafePatches),
      allowCorePatches: bool(compatibility.allowCorePatches, defaults.compatibility.allowCorePatches),
      preferExistingEditor: bool(compatibility.preferExistingEditor, defaults.compatibility.preferExistingEditor),
      preferExistingFooter: bool(compatibility.preferExistingFooter, defaults.compatibility.preferExistingFooter)
    }),
    debug: bool(value.debug, defaults.debug)
  });
}
var PRESET_NAMES = ["default", "minimal", "compact", "full", "ascii", "native", "claude", "omp"];
var ENUMS = {
  preset: PRESET_NAMES,
  placement: ["above", "below", "border"],
  "startup.mode": ["off", "compact", "overlay"],
  "editor.style": ["compact", "boxed", "dock", "native"],
  "editor.frame": ["auto", "halfblock", "line", "solid", "outline", "rounded", "claude", "native"],
  "theme.nerdFonts": ["auto", "on", "off"],
  "theme.shimmer": ["classic", "kitt", "off"],
  "tools.chrome": ["boxed", "light"],
  "theme.terminalBackgroundSync": ["auto", "on", "off"]
};
var BOOL_PATHS = /* @__PURE__ */ new Set([
  "enabled",
  "theme.cacheHighlight",
  "theme.sessionAccent",
  "startup.showResources",
  "startup.alwaysExpanded",
  "statusLine.enabled",
  "editor.enabled",
  "editor.showMetadata",
  "messages.enabled",
  "messages.assistantPrefix",
  "messages.specialBlocks",
  "messages.hideThinkingLabel",
  "messages.hideInterimText",
  "tools.enabled",
  "tools.showElapsed",
  "tools.dimOutput",
  "tools.collapseAfterTurn",
  "tools.batchQuietCalls",
  "tools.collapseMutatingTools",
  "compatibility.allowSafePatches",
  "compatibility.allowCorePatches",
  "compatibility.preferExistingEditor",
  "compatibility.preferExistingFooter",
  "debug"
]);
var STRING_ARRAY_PATHS = /* @__PURE__ */ new Set([
  "statusLine.layout.left",
  "statusLine.layout.right",
  "statusLine.layout.secondary",
  "statusLine.disabledSegments"
]);
var MAP_PATHS = /* @__PURE__ */ new Set(["theme.colors", "theme.glyphs"]);
var CONTAINER_PATHS = /* @__PURE__ */ new Set([
  "startup",
  "statusLine",
  "statusLine.layout",
  "editor",
  "messages",
  "tools",
  "theme",
  "compatibility"
]);
function validCustomItem(item) {
  if (!isRecord(item) || typeof item.id !== "string" || typeof item.statusKey !== "string") return false;
  if (Object.keys(item).some((key) => !["id", "statusKey", "label", "priority", "placement"].includes(key)))
    return false;
  if (item.label !== void 0 && typeof item.label !== "string") return false;
  if (item.priority !== void 0 && (typeof item.priority !== "number" || !Number.isFinite(item.priority)))
    return false;
  return item.placement === void 0 || item.placement === "left" || item.placement === "right" || item.placement === "secondary";
}
function validLeaf(path, value) {
  if (BOOL_PATHS.has(path)) return typeof value === "boolean";
  if (ENUMS[path]) return typeof value === "string" && ENUMS[path].includes(value);
  if (path === "theme.autoApply") return typeof value === "string" && value !== "";
  if (path === "statusLine.separator" || path === "tools.style" || path === "editor.hint")
    return typeof value === "string";
  if (path === "tools.maxCollapsedLines" || path === "tools.maxExpandedLines")
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  if (path === "statusLine.bottomMargin" || path === "statusLine.contextBarWidth")
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  if (STRING_ARRAY_PATHS.has(path)) return Array.isArray(value) && value.every((item) => typeof item === "string");
  if (MAP_PATHS.has(path)) return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
  if (path === "statusLine.customItems") return Array.isArray(value) && value.every(validCustomItem);
  return false;
}
function cloneLeaf(value) {
  return Array.isArray(value) ? value.map((item) => isRecord(item) ? { ...item } : item) : isRecord(value) ? { ...value } : value;
}
function validateConfigLayer(input) {
  const diagnostics = [];
  const paths = /* @__PURE__ */ new Set();
  const walk = (value, prefix) => {
    if (!isRecord(value)) return value;
    const result = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (path === "schemaVersion") {
        if (nestedValue === void 0 || nestedValue === PI_OMP_THEME_SCHEMA_VERSION) result[key] = nestedValue;
        else
          diagnostics.push({
            code: "CFG-SCHEMA",
            level: "warning",
            path,
            message: "unsupported schema version ignored"
          });
        continue;
      }
      if (path === "statusLine.customItems" && Array.isArray(nestedValue)) {
        const acceptedItems = [];
        for (const [index, item] of nestedValue.entries()) {
          if (!isRecord(item)) {
            diagnostics.push({
              code: "CFG-VALUE",
              level: "warning",
              path: `${path}[${index}]`,
              message: "custom item must be an object"
            });
            continue;
          }
          const allowed = ["id", "statusKey", "label", "priority", "placement"];
          let valid = typeof item.id === "string" && typeof item.statusKey === "string";
          if (typeof item.id !== "string")
            diagnostics.push({
              code: "CFG-VALUE",
              level: "warning",
              path: `${path}[${index}].id`,
              message: "required custom item field is invalid or missing"
            });
          if (typeof item.statusKey !== "string")
            diagnostics.push({
              code: "CFG-VALUE",
              level: "warning",
              path: `${path}[${index}].statusKey`,
              message: "required custom item field is invalid or missing"
            });
          for (const field of Object.keys(item)) {
            if (!allowed.includes(field)) {
              diagnostics.push({
                code: "CFG-VALUE",
                level: "warning",
                path: `${path}[${index}].${field}`,
                message: "unknown custom item field ignored"
              });
              valid = false;
            }
          }
          if (item.label !== void 0 && typeof item.label !== "string") {
            diagnostics.push({
              code: "CFG-VALUE",
              level: "warning",
              path: `${path}[${index}].label`,
              message: "invalid custom item field ignored"
            });
            valid = false;
          }
          if (item.priority !== void 0 && (typeof item.priority !== "number" || !Number.isFinite(item.priority))) {
            diagnostics.push({
              code: "CFG-VALUE",
              level: "warning",
              path: `${path}[${index}].priority`,
              message: "invalid custom item field ignored"
            });
            valid = false;
          }
          if (item.placement !== void 0 && !["left", "right", "secondary"].includes(item.placement)) {
            diagnostics.push({
              code: "CFG-VALUE",
              level: "warning",
              path: `${path}[${index}].placement`,
              message: "invalid custom item field ignored"
            });
            valid = false;
          }
          if (valid) {
            acceptedItems.push({ ...item });
            paths.add(`${path}[${index}].id`);
            paths.add(`${path}[${index}].statusKey`);
          }
        }
        result[key] = acceptedItems;
        paths.add(path);
        continue;
      }
      if (validLeaf(path, nestedValue)) {
        result[key] = cloneLeaf(nestedValue);
        paths.add(path);
        continue;
      }
      if (isRecord(nestedValue) && CONTAINER_PATHS.has(path) && !MAP_PATHS.has(path) && path !== "statusLine.customItems") {
        const child = walk(nestedValue, path);
        if (isRecord(child) && Object.keys(child).length > 0) result[key] = child;
        continue;
      }
      if (path !== "statusLine.customItems" || !Array.isArray(nestedValue))
        diagnostics.push({ code: "CFG-VALUE", level: "warning", path, message: "invalid or unknown field ignored" });
      if (path === "statusLine.customItems" && Array.isArray(nestedValue))
        for (const [index, item] of nestedValue.entries()) {
          if (!isRecord(item)) continue;
          for (const field of ["id", "statusKey", "label", "priority", "placement"]) {
            if (Object.hasOwn(item, field)) {
              const fieldValue = item[field];
              const valid = field === "id" || field === "statusKey" || field === "label" ? typeof fieldValue === "string" : field === "priority" ? typeof fieldValue === "number" && Number.isFinite(fieldValue) : fieldValue === "left" || fieldValue === "right" || fieldValue === "secondary";
              if (!valid)
                diagnostics.push({
                  code: "CFG-VALUE",
                  level: "warning",
                  path: `${path}[${index}].${field}`,
                  message: "invalid custom item field ignored"
                });
            }
          }
          for (const field of Object.keys(item))
            if (!["id", "statusKey", "label", "priority", "placement"].includes(field))
              diagnostics.push({
                code: "CFG-VALUE",
                level: "warning",
                path: `${path}[${index}].${field}`,
                message: "unknown custom item field ignored"
              });
        }
    }
    return result;
  };
  return { accepted: walk(input, ""), diagnostics: boundedDiagnostics(diagnostics), paths };
}
function acceptedInput(input) {
  return validateConfigLayer(input).accepted;
}
var COORDINATED_PRESET_PATHS = [
  "placement",
  "editor.style",
  "editor.frame",
  "statusLine.separator",
  "statusLine.layout.left",
  "statusLine.layout.right",
  "statusLine.layout.secondary"
];
function valueAtPath(value, path) {
  let current = value;
  for (const segment2 of path.split(".")) {
    if (!isRecord(current) || !Object.hasOwn(current, segment2)) return void 0;
    current = current[segment2];
  }
  return current;
}
function sameConfigValue(left, right) {
  if (Array.isArray(left) && Array.isArray(right))
    return left.length === right.length && left.every((value, index) => value === right[index]);
  return left === right;
}
function presetOverrideDiagnostic(config, sourceMap) {
  const coordinatedPreset = presetConfig(config.preset);
  const conflicts = COORDINATED_PRESET_PATHS.flatMap((path) => {
    const expected = valueAtPath(coordinatedPreset, path);
    const source = sourceMap[path];
    if (expected === void 0 || source === void 0 || source === "default" || source.startsWith("preset:") || sameConfigValue(valueAtPath(config, path), expected))
      return [];
    return [`${path} (${source})`];
  });
  if (conflicts.length === 0) return void 0;
  return {
    code: "CFG-PRESET-OVERRIDE",
    level: "warning",
    path: "preset",
    message: `preset "${config.preset}" has coordinated UI overrides at ${conflicts.join(", ")}; remove them or expect a hybrid layout`
  };
}
function resolveConfigDetailed(sources) {
  const diagnostics = [];
  const layerResults = /* @__PURE__ */ new Map();
  const layers = [
    ["global", sources.global],
    ["project", sources.projectTrusted === false ? void 0 : sources.project],
    ["session", sources.session]
  ];
  for (const [name, value] of layers) {
    const result = validateConfigLayer(value);
    layerResults.set(name, result);
    diagnostics.push(...result.diagnostics);
  }
  const defaults = sources.defaults ?? DEFAULT_CONFIG;
  let merged = defaults;
  const presetCandidates = [
    ["session", sources.session],
    ["project", sources.projectTrusted === false ? void 0 : sources.project],
    ["global", sources.global],
    ["default", defaults]
  ];
  let selectedPreset;
  for (const [, source] of presetCandidates) {
    const candidate = isRecord(source) ? source.preset : void 0;
    if (candidate === void 0) continue;
    if (typeof candidate === "string" && PRESET_NAMES.includes(candidate)) {
      selectedPreset = candidate;
      break;
    }
    diagnostics.push({
      code: "CFG-ENUM",
      level: "warning",
      path: "preset",
      message: "unsupported value; lower-precedence preset used"
    });
  }
  merged = merge(isRecord(merged) ? merged : {}, presetConfig(selectedPreset));
  for (const name of ["global", "project"])
    merged = merge(isRecord(merged) ? merged : {}, layerResults.get(name)?.accepted);
  const env = sources.environment ?? {};
  const envPatch = {};
  if (env.PI_OMP_THEME_DISABLED === "1") envPatch.enabled = false;
  if (env.PI_OMP_THEME_NERD_FONTS === "1" || env.PI_OMP_THEME_NERD_FONTS === "0")
    envPatch.theme = { nerdFonts: env.PI_OMP_THEME_NERD_FONTS === "1" ? "on" : "off" };
  if (env.PI_OMP_THEME_EDITOR && ["native", "compact", "boxed", "dock"].includes(env.PI_OMP_THEME_EDITOR))
    envPatch.editor = { style: env.PI_OMP_THEME_EDITOR };
  if (env.PI_OMP_THEME_THEME !== void 0 && env.PI_OMP_THEME_THEME !== "")
    envPatch.theme = { ...envPatch.theme ?? {}, autoApply: env.PI_OMP_THEME_THEME };
  if (env.PI_OMP_THEME_OSC11 === "1" || env.PI_OMP_THEME_OSC11 === "0")
    envPatch.theme = { ...envPatch.theme ?? {}, terminalBackgroundSync: env.PI_OMP_THEME_OSC11 === "1" ? "on" : "off" };
  if (env.PI_OMP_THEME_DEBUG === "1") envPatch.debug = true;
  if (env.PI_OMP_THEME_STATUS === "above" || env.PI_OMP_THEME_STATUS === "below") envPatch.placement = env.PI_OMP_THEME_STATUS;
  if (env.PI_OMP_THEME_STATUS === "off") envPatch.statusLine = { enabled: false };
  if (env.PI_OMP_THEME_DISABLED !== void 0 && env.PI_OMP_THEME_DISABLED !== "1")
    diagnostics.push({
      code: "CFG-ENV",
      level: "warning",
      path: "PI_OMP_THEME_DISABLED",
      message: "expected 1; override ignored"
    });
  if (env.PI_OMP_THEME_NERD_FONTS !== void 0 && !["0", "1"].includes(env.PI_OMP_THEME_NERD_FONTS))
    diagnostics.push({
      code: "CFG-ENV",
      level: "warning",
      path: "PI_OMP_THEME_NERD_FONTS",
      message: "expected 0 or 1; override ignored"
    });
  if (env.PI_OMP_THEME_STATUS !== void 0 && !["above", "below", "off"].includes(env.PI_OMP_THEME_STATUS))
    diagnostics.push({
      code: "CFG-ENV",
      level: "warning",
      path: "PI_OMP_THEME_STATUS",
      message: "expected above, below, or off; override ignored"
    });
  if (env.PI_OMP_THEME_EDITOR !== void 0 && !["native", "compact", "boxed", "dock"].includes(env.PI_OMP_THEME_EDITOR))
    diagnostics.push({
      code: "CFG-ENV",
      level: "warning",
      path: "PI_OMP_THEME_EDITOR",
      message: "unknown editor style; override ignored"
    });
  for (const [key, value] of Object.entries(env))
    if (value !== void 0 && key.startsWith("PI_OMP_THEME_") && ![
      "PI_OMP_THEME_DISABLED",
      "PI_OMP_THEME_NERD_FONTS",
      "PI_OMP_THEME_EDITOR",
      "PI_OMP_THEME_OSC11",
      "PI_OMP_THEME_DEBUG",
      "PI_OMP_THEME_STATUS",
      "PI_OMP_THEME_THEME"
    ].includes(key))
      diagnostics.push({
        code: "CFG-ENV",
        level: "warning",
        path: key,
        message: "unsupported environment override ignored"
      });
  merged = merge(isRecord(merged) ? merged : {}, envPatch);
  merged = merge(isRecord(merged) ? merged : {}, layerResults.get("session")?.accepted);
  const sourceMap = {};
  const sourcePath = (value, prefix, sourceName) => {
    if (!isRecord(value)) return;
    for (const [key, nested] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (validLeaf(path, nested)) {
        sourceMap[path] = sourceName;
        if (path === "statusLine.customItems" && Array.isArray(nested)) {
          for (const [index, item] of nested.entries())
            if (isRecord(item)) {
              for (const field of ["id", "statusKey", "label", "priority", "placement"])
                if (Object.hasOwn(item, field)) sourceMap[`${path}[${index}].${field}`] = sourceName;
            }
        }
        continue;
      }
      if (isRecord(nested)) sourcePath(nested, path, sourceName);
    }
  };
  sourcePath(defaults, "", "default");
  sourcePath(
    presetConfig(selectedPreset),
    "",
    `preset:${typeof selectedPreset === "string" ? selectedPreset : "default"}`
  );
  sourcePath(layerResults.get("global")?.accepted, "", "global");
  if (sources.projectTrusted !== false) sourcePath(layerResults.get("project")?.accepted, "", "project");
  sourcePath(envPatch, "", "environment");
  sourcePath(layerResults.get("session")?.accepted, "", "session");
  const config = normalizeConfig(merged);
  const overrideDiagnostic = presetOverrideDiagnostic(config, sourceMap);
  if (overrideDiagnostic) diagnostics.unshift(overrideDiagnostic);
  return { config, diagnostics: boundedDiagnostics(diagnostics), sources: sourceMap };
}

// extension-src/omp-theme/domain/config-migrations.ts
function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function migrateConfig(input, source = "config") {
  if (!record(input))
    return {
      config: void 0,
      readOnly: false,
      diagnostics: boundedDiagnostics([
        { code: "CFG-001", level: "warning", path: source, message: "configuration must be an object; defaults used" }
      ])
    };
  const version = input.schemaVersion;
  if (version === void 0)
    return {
      config: { ...input, schemaVersion: PI_OMP_THEME_SCHEMA_VERSION },
      readOnly: false,
      diagnostics: boundedDiagnostics([
        {
          code: "CFG-002",
          level: "warning",
          path: `${source}.schemaVersion`,
          message: "missing schemaVersion accepted as v1-shaped input"
        }
      ])
    };
  if (version !== PI_OMP_THEME_SCHEMA_VERSION)
    return {
      config: void 0,
      readOnly: true,
      diagnostics: boundedDiagnostics([
        {
          code: "CFG-003",
          level: "error",
          path: `${source}.schemaVersion`,
          message: `unsupported schemaVersion ${String(version)}; ignored without rewrite`
        }
      ])
    };
  return { config: { ...input }, readOnly: false, diagnostics: [] };
}

// extension-src/omp-theme/app/config-storage.ts
async function readScopedConfig(port, path, selectedNamespace = "piOmpTheme") {
  try {
    const parsed = JSON.parse(await port.read(path));
    if (!record2(parsed))
      return {
        value: void 0,
        readOnly: true,
        diagnostics: [{ code: "CFG-001", level: "warning", path, message: "settings root must be an object" }]
      };
    if (!Object.hasOwn(parsed, selectedNamespace)) return { value: void 0, readOnly: false, diagnostics: [] };
    const result = migrateConfig(parsed[selectedNamespace], `${path}.${selectedNamespace}`);
    return { value: result.config, diagnostics: result.diagnostics, readOnly: result.readOnly };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : void 0;
    if (code === "ENOENT") return { value: void 0, readOnly: false, diagnostics: [] };
    return {
      value: void 0,
      readOnly: true,
      diagnostics: [
        {
          code: "CFG-IO",
          level: "warning",
          path,
          message: `settings unreadable; preserved without rewrite (${error instanceof Error ? error.message : "invalid JSON"})`
        }
      ]
    };
  }
}
function record2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function mergePatch(base, patch) {
  if (!record2(base) || !record2(patch)) return patch;
  const result = { ...base };
  for (const [key, value] of Object.entries(patch)) result[key] = mergePatch(result[key], value);
  return result;
}
var writeLocks = /* @__PURE__ */ new Map();
async function writeScopedConfig(port, path, value, selectedNamespace = "piOmpTheme") {
  const previous = writeLocks.get(path) ?? Promise.resolve();
  const operation = previous.then(async () => {
    let document = {};
    try {
      const parsed = JSON.parse(await port.read(path));
      if (!record2(parsed)) throw new Error("settings root must be an object");
      document = parsed;
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? error.code : void 0;
      if (code !== "ENOENT") throw new Error(`refusing to rewrite unreadable settings: ${path}`);
    }
    if (Object.hasOwn(document, selectedNamespace)) {
      const existing = migrateConfig(document[selectedNamespace], `${path}.${selectedNamespace}`);
      if (existing.readOnly || !record2(document[selectedNamespace]))
        throw new Error(`refusing to rewrite protected ${selectedNamespace} namespace: ${path}`);
    }
    const nextNamespace = mergePatch(document[selectedNamespace], value);
    await port.writeAtomic(path, `${JSON.stringify({ ...document, [selectedNamespace]: nextNamespace }, null, 2)}
`);
  });
  writeLocks.set(path, operation);
  try {
    await operation;
  } finally {
    if (writeLocks.get(path) === operation) writeLocks.delete(path);
  }
}

// extension-src/omp-theme/app/doctor.ts
function createDoctor(state) {
  return Object.freeze({
    config: Object.freeze({
      preset: state.config.preset,
      enabled: state.config.enabled,
      placement: state.config.placement,
      statusLine: state.config.statusLine.enabled ? "enabled" : "disabled",
      editor: state.config.editor.enabled ? "enabled" : "disabled",
      startup: state.config.startup.mode
    }),
    diagnostics: state.diagnostics,
    sources: state.sources ?? {},
    surfaces: state.surfaces,
    ...state.piVersion ? { piVersion: state.piVersion } : {},
    ...state.operational?.compatibility && typeof state.operational.compatibility.piVersion === "string" ? { piVersion: state.operational.compatibility.piVersion } : {},
    ...state.operational?.compatibility && typeof state.operational.compatibility.compatibilityBasis === "string" ? { compatibilityBasis: state.operational.compatibility.compatibilityBasis } : {},
    ...state.compatibility ? { compatibility: state.compatibility } : {},
    ...state.operational ? {
      operational: Object.freeze({
        ...state.operational.compatibility ? { compatibility: state.operational.compatibility } : {},
        ...state.operational.provider ? { provider: state.operational.provider } : {},
        ...state.operational.installations ? { installations: state.operational.installations } : {},
        ...state.operational.authorization ? { authorization: state.operational.authorization } : {}
      })
    } : {}
  });
}
var SURFACE_LABELS = [
  ["status", "Status line"],
  ["editor", "Editor"],
  ["startup", "Startup"],
  ["assistantMessage", "Assistant message"],
  ["specialBlocks", "Special blocks"],
  ["tools", "Tools"]
];
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function text(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function surfaceSummary(label, value) {
  if (typeof value === "string") {
    if (["installed", "active", "enabled"].includes(value)) return { label, state: "OK", detail: value, severity: 0 };
    if (["disabled", "off"].includes(value)) return { label, state: "OFF", detail: "disabled", severity: 0 };
    if (["failed", "error"].includes(value)) return { label, state: "ERROR", detail: value, severity: 2 };
    return { label, state: "CHECK", detail: value, severity: 1 };
  }
  const state = asRecord(value);
  if (state?.configured === false) return { label, state: "OFF", detail: "disabled by configuration", severity: 0 };
  if (state?.failed === true) return { label, state: "ERROR", detail: "patch installation failed", severity: 2 };
  if (state?.conflicted === true) return { label, state: "CONFLICT", detail: "existing renderer kept", severity: 1 };
  if (state?.authorized === false) return { label, state: "LOCKED", detail: "authorization required", severity: 1 };
  if (state?.nativeFallback === true) return { label, state: "NATIVE", detail: "using Pi renderer (fallback)", severity: 1 };
  if (state?.cleanupPending === true) return { label, state: "PENDING", detail: "cleanup pending", severity: 1 };
  if (state?.installed === true) return { label, state: "OK", detail: "installed", severity: 0 };
  return { label, state: "CHECK", detail: "not installed", severity: 1 };
}
function compactPath(path) {
  return path.replace(/^[A-Za-z]:\\Users\\[^\\]+(?=\\)/, "~").replace(/^\/(?:Users|home)\/[^/]+(?=\/)/, "~");
}
function formatDoctorSummary(report) {
  const config = asRecord(report.config) ?? {};
  const surfaces2 = asRecord(report.surfaces) ?? {};
  const operational = asRecord(report.operational);
  const compatibility = asRecord(operational?.compatibility);
  const binding = asRecord(compatibility?.hostBinding);
  const authorization = asRecord(operational?.authorization);
  const diagnostics = Array.isArray(report.diagnostics) ? report.diagnostics.map(asRecord).filter((item) => item !== void 0) : [];
  const surfaceRows = SURFACE_LABELS.filter(([key]) => key in surfaces2).map(
    ([key, label]) => surfaceSummary(label, surfaces2[key])
  );
  const diagnosticSeverity = diagnostics.some((item) => item.level === "error") ? 2 : diagnostics.length > 0 ? 1 : 0;
  const bindingStatus = text(binding?.status);
  const bindingSeverity = bindingStatus && bindingStatus !== "bound" ? 1 : 0;
  const coreAuthorized = authorization?.core;
  const authorizationSeverity = coreAuthorized === false ? 1 : 0;
  const severity = Math.max(
    diagnosticSeverity,
    bindingSeverity,
    authorizationSeverity,
    ...surfaceRows.map((row) => row.severity)
  );
  const enabled = config.enabled !== false;
  const overall = severity === 2 ? "ERROR" : !enabled ? "OFF" : severity === 1 ? "DEGRADED" : "HEALTHY";
  const type = severity === 2 ? "error" : severity === 1 ? "warning" : "info";
  const piVersion = text(report.piVersion) ?? text(compatibility?.piVersion) ?? "unknown";
  const basis = text(report.compatibilityBasis) ?? text(compatibility?.compatibilityBasis) ?? "unknown";
  const lines = [
    `pi-omp-theme doctor \xB7 ${overall}`,
    "",
    "Runtime",
    `  ${"Pi".padEnd(16)}${piVersion}`,
    `  ${"Preset".padEnd(16)}${text(config.preset) ?? "unknown"}`,
    `  ${"Placement".padEnd(16)}${text(config.placement) ?? "unknown"}`,
    `  ${"Compatibility".padEnd(16)}${basis}`,
    `  ${"Host binding".padEnd(16)}${bindingStatus ?? "unknown"}`,
    `  ${"Core patches".padEnd(16)}${coreAuthorized === true ? "authorized" : coreAuthorized === false ? "not authorized" : "unknown"}`,
    "",
    "Surfaces",
    ...surfaceRows.length > 0 ? surfaceRows.map((row) => `  ${row.state.padEnd(10)}${row.label.padEnd(20)}${row.detail}`) : ["  CHECK     No surface data"]
  ];
  if (diagnostics.length > 0) {
    lines.push("", `Diagnostics (${diagnostics.length})`);
    for (const diagnostic of diagnostics) {
      const level = text(diagnostic.level)?.toUpperCase() ?? "CHECK";
      lines.push(`  ${level.padEnd(10)}${text(diagnostic.code) ?? "unknown"}`);
      if (text(diagnostic.message)) lines.push(`    ${text(diagnostic.message)}`);
      if (text(diagnostic.path)) lines.push(`    at ${compactPath(text(diagnostic.path))}`);
    }
  }
  lines.push("", "Full report", "  /pi-omp-theme doctor json");
  return Object.freeze({ message: lines.join("\n"), type });
}

// extension-src/omp-theme/app/command-service.ts
var surfaces = /* @__PURE__ */ new Set(["status", "editor", "startup", "messages", "tools"]);
var presets = ENUMS.preset ?? [];
var styles = ENUMS["editor.style"] ?? [];
var frames = ENUMS["editor.frame"] ?? [];
var startupModes = ["off", "compact", "overlay"];
var allowedPaths = /* @__PURE__ */ new Set([
  "enabled",
  "preset",
  "placement",
  "startup.mode",
  "startup.showResources",
  "statusLine.enabled",
  "statusLine.separator",
  "statusLine.layout.left",
  "statusLine.layout.right",
  "statusLine.layout.secondary",
  "statusLine.disabledSegments",
  "statusLine.customItems",
  "statusLine.bottomMargin",
  "statusLine.contextBarWidth",
  "editor.enabled",
  "editor.style",
  "editor.frame",
  "editor.showMetadata",
  "messages.enabled",
  "messages.assistantPrefix",
  "messages.specialBlocks",
  "messages.hideThinkingLabel",
  "messages.hideInterimText",
  "tools.enabled",
  "tools.style",
  "tools.maxCollapsedLines",
  "tools.maxExpandedLines",
  "tools.dimOutput",
  "tools.showElapsed",
  "tools.collapseAfterTurn",
  "tools.collapseMutatingTools",
  "theme.nerdFonts",
  "theme.terminalBackgroundSync",
  "theme.autoApply",
  "theme.colors",
  "theme.glyphs",
  "compatibility.allowSafePatches",
  "compatibility.allowCorePatches",
  "compatibility.preferExistingEditor",
  "compatibility.preferExistingFooter",
  "debug"
]);
function validatePathValue(path, value) {
  if (!allowedPaths.has(path)) return false;
  if ([
    "enabled",
    "startup.showResources",
    "statusLine.enabled",
    "editor.enabled",
    "editor.showMetadata",
    "messages.enabled",
    "messages.assistantPrefix",
    "messages.specialBlocks",
    "messages.hideThinkingLabel",
    "messages.hideInterimText",
    "tools.enabled",
    "tools.showElapsed",
    "tools.dimOutput",
    "tools.collapseAfterTurn",
    "tools.collapseMutatingTools",
    "compatibility.allowSafePatches",
    "compatibility.allowCorePatches",
    "compatibility.preferExistingEditor",
    "compatibility.preferExistingFooter",
    "debug"
  ].includes(path))
    return typeof value === "boolean";
  if (path === "preset") return typeof value === "string" && presets.includes(value);
  if (path === "placement") return value === "above" || value === "below";
  if (path === "startup.mode") return typeof value === "string" && startupModes.includes(value);
  if (path === "editor.style") return typeof value === "string" && styles.includes(value);
  if (path === "editor.frame") return typeof value === "string" && frames.includes(value);
  if (path === "theme.autoApply") return typeof value === "string" && value !== "";
  if (["theme.nerdFonts", "theme.terminalBackgroundSync", "statusLine.separator", "tools.style"].includes(path))
    return typeof value === "string";
  if (path === "tools.maxCollapsedLines" || path === "tools.maxExpandedLines")
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  if (path === "statusLine.bottomMargin" || path === "statusLine.contextBarWidth")
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  if (path.endsWith(".colors") || path.endsWith(".glyphs"))
    return typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every((item) => typeof item === "string");
  if (path.includes("layout.") || path === "statusLine.disabledSegments")
    return Array.isArray(value) && value.every((item) => typeof item === "string");
  return path === "statusLine.customItems" && validateConfigLayer({ statusLine: { customItems: value } }).diagnostics.length === 0;
}
function validateMutation(patch, prefix = "") {
  return Object.entries(patch).every(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if ([
      "theme.colors",
      "theme.glyphs",
      "statusLine.layout.left",
      "statusLine.layout.right",
      "statusLine.layout.secondary",
      "statusLine.disabledSegments",
      "statusLine.customItems"
    ].includes(path))
      return validatePathValue(path, value);
    if (typeof value === "object" && value !== null && !Array.isArray(value))
      return Object.keys(value).length > 0 && validateMutation(value, path);
    return validatePathValue(path, value);
  });
}
function sanitizeMutation(patch) {
  return validateMutation(patch) ? patch : void 0;
}
function mutation(parts) {
  if (parts[0] === "set" && parts[1] && parts[2]) {
    try {
      const value2 = JSON.parse(parts.slice(2).join(" "));
      const patch = {};
      let cursor = patch;
      const keys = parts[1].split(".");
      for (const key of keys.slice(0, -1)) {
        const next = cursor[key];
        if (typeof next === "object" && next !== null && !Array.isArray(next)) cursor = next;
        else {
          cursor[key] = {};
          cursor = cursor[key];
        }
      }
      cursor[keys.at(-1)] = value2;
      return sanitizeMutation(patch);
    } catch {
      return void 0;
    }
  }
  const [action, value, extra] = parts;
  if (action === "on" || action === "off") return { enabled: action === "on" };
  if (action === "preset" && value && presets.includes(value)) return { preset: value };
  if (action === "placement" && (value === "above" || value === "below")) return { placement: value };
  if (action === "editor" && value && styles.includes(value) && (!extra || frames.includes(extra)))
    return { editor: { style: value, ...extra ? { frame: extra } : {} } };
  if (action === "startup" && value && startupModes.includes(value)) return { startup: { mode: value } };
  if (action === "surface" && value && surfaces.has(value) && (extra === "on" || extra === "off")) {
    if (value === "startup") return { startup: { mode: extra === "on" ? "compact" : "off" } };
    return { [value === "status" ? "statusLine" : value]: { enabled: extra === "on" } };
  }
  return void 0;
}
async function executePiOmpThemeCommand(args, host, app, storage) {
  const parts = args.trim().split(/\s+/).filter(Boolean);
  const [action, scope, ...rest] = parts;
  if (!action) {
    host.ui.notify(
      `pi-omp-theme preset ${app.config.preset}; status ${app.config.statusLine.enabled ? "on" : "off"}`,
      "info"
    );
    return;
  }
  if (action === "reload") {
    await app.reload();
    return;
  }
  if (action === "doctor") {
    const report = app.doctor();
    if (!scope) {
      const summary = formatDoctorSummary(report);
      host.ui.notify(summary.message, summary.type);
    } else if ((scope === "json" || scope === "--json") && rest.length === 0) {
      host.ui.notify(JSON.stringify(report), "info");
    } else {
      host.ui.notify("usage: /pi-omp-theme doctor [json]", "warning");
    }
    return;
  }
  if (action === "persist") {
    if (scope !== "global" && scope !== "project") {
      host.ui.notify("persistence requires explicit global or project scope", "warning");
      return;
    }
    if (scope === "project" && !host.isProjectTrusted()) {
      host.ui.notify("pi-omp-theme project persistence requires a trusted project", "warning");
      return;
    }
    const patch2 = mutation(rest);
    if (!patch2) {
      host.ui.notify("invalid pi-omp-theme mutation or value", "warning");
      return;
    }
    const sanitized = sanitizeMutation(patch2);
    if (!sanitized) {
      host.ui.notify("mutation contains fields that cannot be persisted", "warning");
      return;
    }
    try {
      await writeScopedConfig(
        storage.port,
        scope === "global" ? storage.paths.globalPath : storage.paths.projectPath,
        sanitized
      );
    } catch (error) {
      host.ui.notify(
        `pi-omp-theme settings write failed: ${error instanceof Error ? error.message : "unknown error"}`,
        "error"
      );
      return;
    }
    app.applySession(patch2);
    if (patch2.messages?.enabled === true || patch2.tools?.enabled === true)
      host.ui.notify("desired Tier C state stored; awaiting session authorization", "info");
    return;
  }
  const patch = mutation(parts);
  if (patch) app.applySession(patch);
  else if (action === "preset" && !scope) {
    const selected = await host.ui.select("pi-omp-theme preset", [...presets]);
    if (selected) app.applySession({ preset: selected });
  } else host.ui.notify("invalid pi-omp-theme command or value", "warning");
}

// extension-src/omp-theme/app/commands.ts
function runCommand(args, host, app, storage) {
  return executePiOmpThemeCommand(args, host, app, storage);
}

// extension-src/omp-theme/pi/config-host.ts
import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import { dirname as dirname2, join as join2 } from "path";
import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";
var locks = /* @__PURE__ */ new Map();
function serialize(path, operation) {
  const previous = locks.get(path) ?? Promise.resolve();
  const current = previous.catch(() => void 0).then(operation);
  locks.set(path, current);
  return current.finally(() => {
    if (locks.get(path) === current) locks.delete(path);
  });
}
function createPiConfigFilePort(fs = {}) {
  const fsMkdir = fs.mkdir ?? mkdir;
  const fsReadFile = fs.readFile ?? readFile;
  const fsRename = fs.rename ?? rename;
  const fsUnlink = fs.unlink ?? unlink;
  const fsWriteFile = fs.writeFile ?? writeFile;
  return {
    read: (path) => fsReadFile(path, "utf8"),
    writeAtomic: async (path, content) => serialize(path, async () => {
      await fsMkdir(dirname2(path), { recursive: true });
      const temporary = `${path}.pi-omp-theme-${process.pid}-${Date.now()}.tmp`;
      try {
        await fsWriteFile(temporary, content, { mode: 384 });
        await fsRename(temporary, path);
      } finally {
        await fsUnlink(temporary).catch(() => void 0);
      }
    })
  };
}
function defaultStoragePaths(cwd, overrides = {}) {
  return {
    globalPath: overrides.globalPath ?? join2(getAgentDir(), "settings.json"),
    projectPath: overrides.projectPath ?? join2(cwd, CONFIG_DIR_NAME, "settings.json")
  };
}

// extension-src/omp-theme/pi/commands.ts
function registerPiOmpThemeCommand(pi, app) {
  pi.registerCommand("pi-omp-theme", {
    description: "Configure pi-omp-theme for this session",
    handler: async (args, ctx) => {
      const cwd = ctx.cwd ?? process.cwd();
      await runCommand(args, { ui: ctx.ui, cwd, isProjectTrusted: ctx.isProjectTrusted }, app, {
        port: createPiConfigFilePort(),
        paths: defaultStoragePaths(cwd)
      });
    }
  });
}

// extension-src/omp-theme/domain/config-diff.ts
function diffConfig(previous, next) {
  const changed = [];
  const impacts = /* @__PURE__ */ new Set();
  const compare = (key, before, after, impact) => {
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    changed.push(key);
    impacts.add(impact);
  };
  compare("enabled", previous.enabled, next.enabled, "all");
  compare("statusLine", previous.statusLine, next.statusLine, "status");
  compare("placement", previous.placement, next.placement, "status");
  compare("editor", previous.editor, next.editor, "editor");
  compare("startup", previous.startup, next.startup, "startup");
  compare("messages", previous.messages, next.messages, "compatibility");
  compare("tools", previous.tools, next.tools, "compatibility");
  compare("theme", previous.theme, next.theme, "all");
  compare("compatibility", previous.compatibility, next.compatibility, "compatibility");
  if (impacts.has("all"))
    return Object.freeze({ changed: Object.freeze(changed), impacts: Object.freeze(["all"]) });
  return Object.freeze({ changed: Object.freeze(changed), impacts: Object.freeze([...impacts]) });
}

// extension-src/omp-theme/domain/status.ts
import { isAbsolute, relative as relative2, resolve as resolve5, sep } from "path";
function segment(id, priority, render, essential = false) {
  return { id, defaultPriority: priority, essential, overflow: essential ? "primary" : "secondary", render };
}
function createBuiltinSegments() {
  const segments = [
    segment("pi", 10, ({ theme }) => ({
      visible: true,
      // The glyph is the wordmark (omp renders it alone); the ascii set spells "pi".
      content: theme.apply("accent", theme.glyph("pi")),
      compactContent: theme.apply("accent", theme.glyph("pi"))
    })),
    segment(
      "model",
      100,
      ({ snapshot, theme }) => ({
        visible: Boolean(snapshot.model),
        content: theme.apply("model", `${theme.glyph("model")} ${snapshot.model ?? ""}`),
        compactContent: theme.apply("model", snapshot.model ?? ""),
        truncatable: true
      }),
      true
    ),
    segment(
      "model_effort",
      40,
      ({ snapshot, theme }) => {
        const model = snapshot.model;
        if (!model) return { visible: false, content: "" };
        const label = `${theme.glyph("model")} ${model}`;
        const styledLabel = theme.apply("model", label);
        const effort = effortLevel(snapshot);
        if (!effort) {
          return { visible: true, content: styledLabel, compactContent: theme.apply("model", model) };
        }
        return {
          visible: true,
          content: `${styledLabel} ${theme.apply("separator", "\xB7")} ${styleEffort(theme, effort)}`,
          compactContent: theme.apply("model", model)
        };
      },
      false
    ),
    segment(
      "thinking",
      95,
      ({ snapshot, theme }) => {
        const level = snapshot.thinkingLevel;
        if (!level) return { visible: false, content: "" };
        const label = thinkingLabel(level);
        const text2 = `think:${label}`;
        const compactText = `t:${label}`;
        const token = level === "minimal" ? "thinkingMinimal" : level === "low" ? "thinkingLow" : level === "medium" ? "thinkingMedium" : level === "high" ? "thinkingHigh" : level === "xhigh" ? "thinkingXhigh" : level === "max" ? "thinkingMax" : "thinking";
        return {
          visible: true,
          content: theme.apply(token, text2),
          compactContent: theme.apply(token, compactText)
        };
      },
      true
    ),
    segment("path", 80, ({ snapshot, theme }) => {
      const name = snapshot.cwd;
      return {
        visible: Boolean(snapshot.cwd),
        content: theme.apply("path", `${theme.glyph("path")} ${name ?? ""}`),
        compactContent: theme.apply("path", name ?? ""),
        truncatable: true
      };
    }),
    // The working directory the way Pi's native footer spells it: no icon, and
    // the home prefix collapsed to `~` (`~\Desktop\test\test7`). Pi reads the
    // platform home directory (`HOME || USERPROFILE`, note `||` not `??`) at
    // render time, so a session started with a different home still abbreviates
    // correctly. Painted `muted` to match the `used / window` readout it sits
    // next to on the right.
    segment("path_plain", 80, ({ snapshot, theme }) => {
      const name = snapshot.cwd;
      if (!name) return { visible: false, content: "" };
      return {
        visible: true,
        content: theme.apply("muted", formatCwdForFooter(name, process.env.HOME || process.env.USERPROFILE)),
        truncatable: true
      };
    }),
    segment("git", 75, ({ snapshot, theme }) => {
      const git = snapshot.git;
      if (!git?.available || !git.branch) return { visible: false, content: "" };
      const counts = `${git.staged ? ` +${git.staged}` : ""}${git.unstaged ? ` *${git.unstaged}` : ""}${git.untracked ? ` ?${git.untracked}` : ""}`;
      const token = git.staged || git.unstaged || git.untracked ? "gitDirty" : "gitClean";
      return {
        visible: true,
        content: theme.apply(token, `${theme.glyph("git")} ${git.branch}${counts}`),
        compactContent: theme.apply(token, `${theme.glyph("git")} ${git.branch}`)
      };
    }),
    segment(
      "context_pct",
      90,
      ({ snapshot, theme }) => {
        const percent = contextPercent(snapshot.context ?? {});
        const state = contextState(percent);
        const token = state === "critical" ? "contextCritical" : state === "high" ? "contextHigh" : state === "medium" ? "contextMedium" : "contextLow";
        return {
          visible: percent !== void 0,
          content: percent === void 0 ? "" : theme.apply(
            token,
            `${theme.glyph("context")} ${Math.round(percent)}%${snapshot.context?.windowTokens ? `/${formatTokens(snapshot.context.windowTokens)}` : ""}`
          ),
          compactContent: percent === void 0 ? "" : theme.apply(token, `${Math.round(percent)}%`)
        };
      },
      true
    ),
    segment("context_bar", 70, ({ snapshot, theme, options }) => {
      const percent = contextPercent(snapshot.context ?? {});
      if (percent === void 0) return { visible: false, content: "" };
      const token = contextBarToken(percent);
      const window = snapshot.context?.windowTokens;
      const label = `${theme.glyph("context")}${window !== void 0 ? ` ${formatTokens(window)}` : ""}`;
      const width = options.context_bar?.width ?? CONTEXT_BAR_WIDTH;
      return {
        visible: true,
        content: `${theme.apply("muted", label)} ${theme.apply(token, contextBar(percent, width))} ${theme.apply(token, `${Math.round(percent)}%`)}`,
        compactContent: theme.apply(token, `${Math.round(percent)}%`)
      };
    }),
    // Claude Code's compact progress cluster: [bar] | 7% used | 19.2K/272K.
    // It is a named preset-only segment so the default and omp status lines keep
    // their existing context presentation.
    segment(
      "claude_context",
      90,
      ({ snapshot, theme, options }) => {
        const percent = contextPercent(snapshot.context ?? {});
        if (percent === void 0) return { visible: false, content: "" };
        const token = claudeContextToken(percent);
        const current = snapshot.context?.currentTokens;
        const total = snapshot.context?.windowTokens;
        const width = options.claude_context?.width ?? CONTEXT_BAR_WIDTH;
        const separator = ` ${theme.apply("separator", "|")} `;
        const used = `${theme.apply(token, `${Math.round(percent)}%`)} ${theme.apply("muted", "used")}`;
        const tokens = current !== void 0 && total !== void 0 ? theme.apply("muted", `${formatTokens(current)}/${formatTokens(total)}`) : "";
        return {
          visible: true,
          content: [renderClaudeContextBar(theme, percent, width), used, tokens].filter(Boolean).join(separator),
          compactContent: theme.apply(token, `${Math.round(percent)}% used`)
        };
      },
      true
    ),
    // The `used` half of the claude cluster on its own: `11% used | 111.4K/1M`.
    // Same text and colors as `claude_context`, minus the bracket gauge — the
    // claude preset right-aligns this and spends the left side on the native
    // usage cluster instead of a bar.
    segment(
      "context_used",
      90,
      ({ snapshot, theme }) => {
        const percent = contextPercent(snapshot.context ?? {});
        if (percent === void 0) return { visible: false, content: "" };
        const token = claudeContextToken(percent);
        const current = snapshot.context?.currentTokens;
        const total = snapshot.context?.windowTokens;
        const separator = ` ${theme.apply("separator", "|")} `;
        const used = `${theme.apply(token, `${Math.round(percent)}%`)} ${theme.apply("contextUsed", "used")}`;
        const tokens = current !== void 0 && total !== void 0 ? theme.apply("contextTokens", `${formatTokens(current)}/${formatTokens(total)}`) : "";
        return {
          visible: true,
          content: [used, tokens].filter(Boolean).join(separator),
          compactContent: theme.apply(token, `${Math.round(percent)}% used`)
        };
      },
      false
    ),
    // The size of the window, compactly: `272K`. Raw digits (`21760/272000`)
    // read as noise on a status line, and the used-of-total pair is already
    // spelled out by the context gauge and the frame footer.
    segment("context_total", 60, ({ snapshot, theme }) => ({
      visible: snapshot.context?.windowTokens !== void 0,
      content: snapshot.context?.windowTokens !== void 0 ? theme.apply("muted", formatTokens(snapshot.context.windowTokens)) : ""
    })),
    segment("auto_compact", 55, ({ snapshot, theme }) => ({
      visible: Boolean(snapshot.context?.autoCompacting || snapshot.context?.customCompaction),
      content: theme.apply("warning", `${theme.glyph("auto")} ${snapshot.context?.customCompaction ?? "compacting"}`),
      compactContent: theme.apply("warning", "compact")
    })),
    segment("token_in", 50, ({ snapshot, theme }) => ({
      visible: snapshot.usage?.inputTokens !== void 0,
      content: theme.apply("tokens", `${theme.glyph("input")} ${snapshot.usage?.inputTokens ?? 0}`),
      compactContent: theme.apply("tokens", `i:${snapshot.usage?.inputTokens ?? 0}`)
    })),
    segment("token_out", 50, ({ snapshot, theme }) => ({
      visible: snapshot.usage?.outputTokens !== void 0,
      content: theme.apply("tokens", `${theme.glyph("output")} ${snapshot.usage?.outputTokens ?? 0}`),
      compactContent: theme.apply("tokens", `o:${snapshot.usage?.outputTokens ?? 0}`)
    })),
    segment("cache_read", 40, ({ snapshot, theme }) => ({
      visible: Boolean(snapshot.usage?.cacheReadTokens),
      content: theme.apply("cache", `${theme.glyph("cache")} ${snapshot.usage?.cacheReadTokens ?? 0}`),
      compactContent: theme.apply("cache", `cr:${snapshot.usage?.cacheReadTokens ?? 0}`)
    })),
    segment("cache_write", 35, ({ snapshot, theme }) => ({
      visible: Boolean(snapshot.usage?.cacheWriteTokens),
      content: theme.apply("cache", `${theme.glyph("cache")} w${snapshot.usage?.cacheWriteTokens ?? 0}`)
    })),
    // Pi's native footer usage cluster, spelled the way Pi spells it:
    // `↑13k ↓14k R225k CH98.8% $0.011`. Unlike the theme's other usage
    // segments this one prints the literal arrows rather than glyphs, because
    // the point is to be indistinguishable from the built-in footer.
    // Visibility rules and number formatting mirror pi's footer.js exactly.
    // Each figure carries its own token so the run can be color-coded.
    segment("native_usage", 85, ({ snapshot, theme }) => {
      const usage = snapshot.usage;
      if (!usage) return { visible: false, content: "" };
      const parts = [];
      if (usage.inputTokens) {
        parts.push(theme.apply("usageInput", `\u2191${formatUsageTokens(usage.inputTokens)}`));
      }
      if (usage.outputTokens) {
        parts.push(theme.apply("usageOutput", `\u2193${formatUsageTokens(usage.outputTokens)}`));
      }
      if (usage.cacheReadTokens) {
        parts.push(theme.apply("usageCacheRead", `R${formatUsageTokens(usage.cacheReadTokens)}`));
      }
      if (usage.cacheWriteTokens) {
        parts.push(theme.apply("usageCacheRead", `W${formatUsageTokens(usage.cacheWriteTokens)}`));
      }
      if ((usage.cacheReadTokens > 0 || usage.cacheWriteTokens > 0) && usage.cacheHitRate !== void 0) {
        parts.push(theme.apply("usageCacheHit", `CH${usage.cacheHitRate.toFixed(1)}%`));
      }
      const subscription = usage.subscriptionMode === "subscription";
      if (usage.cost !== void 0 && usage.cost !== 0 || subscription) {
        parts.push(theme.apply("usageCost", `$${(usage.cost ?? 0).toFixed(3)}${subscription ? " (sub)" : ""}`));
      }
      if (parts.length === 0) return { visible: false, content: "" };
      return { visible: true, content: parts.join(" "), truncatable: true };
    }),
    segment("cost", 65, ({ snapshot, theme }) => {
      const cost = snapshot.usage?.cost;
      const content = cost === void 0 || cost <= 0 ? "" : theme.apply("cost", `${theme.glyph("cost")}${cost.toFixed(3)}`);
      return { visible: Boolean(content), content, compactContent: content };
    }),
    segment("time_spent", 25, ({ snapshot, theme }) => ({
      visible: snapshot.sessionStartedAt !== void 0,
      content: snapshot.sessionStartedAt === void 0 ? "" : theme.apply("time", `${theme.glyph("time")} ${formatElapsed2(Date.now() - snapshot.sessionStartedAt)}`),
      compactContent: snapshot.sessionStartedAt === void 0 ? "" : theme.apply("time", formatElapsed2(Date.now() - snapshot.sessionStartedAt))
    })),
    segment("time", 20, ({ theme }) => ({
      visible: true,
      content: theme.apply(
        "time",
        `${theme.glyph("time")} ${(/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      ),
      compactContent: theme.apply("time", (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    })),
    segment("hostname", 20, ({ snapshot, theme }) => ({
      visible: Boolean(snapshot.hostname),
      content: theme.apply("muted", `${theme.glyph("host")} ${snapshot.hostname ?? ""}`)
    })),
    segment("session", 20, ({ snapshot, theme }) => ({
      visible: Boolean(snapshot.sessionName || snapshot.sessionId),
      content: theme.apply("muted", `${theme.glyph("session")} ${snapshot.sessionName ?? snapshot.sessionId ?? ""}`)
    })),
    segment("session_title", 18, ({ snapshot, theme }) => ({
      // Only a real name: the id is a UUID and says nothing about the work.
      visible: Boolean(snapshot.sessionName),
      content: theme.apply("muted", snapshot.sessionName ?? ""),
      truncatable: true
    })),
    segment("extension_statuses", 30, ({ snapshot, theme }) => {
      const statuses = snapshot.extensionStatuses;
      if (!statuses || statuses.length === 0) return { visible: false, content: "" };
      const text2 = [...statuses].sort((a, b) => a.key.localeCompare(b.key)).map((item) => item.value).join(" ");
      return { visible: true, content: theme.apply("muted", text2) };
    })
  ];
  return new Map(segments.map((item) => [item.id, item]));
}
var CONTEXT_BAR_WIDTH = 10;
function contextBar(percent, width = CONTEXT_BAR_WIDTH) {
  const filled = Math.max(0, Math.min(width, Math.round(percent / 100 * width)));
  return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
}
function claudeContextToken(percent) {
  return percent < 50 ? "success" : contextBarToken(percent);
}
function renderClaudeContextBar(theme, percent, width) {
  const filled = Math.max(0, Math.min(width, Math.round(percent / 100 * width)));
  const open = theme.apply("separator", "[");
  const progress = theme.apply(claudeContextToken(percent), "\u2588".repeat(filled));
  const track = theme.apply("dim", "\u2591".repeat(width - filled));
  const close = theme.apply("separator", "]");
  return `${open}${progress}${track}${close}`;
}
function contextBarToken(percent) {
  if (percent >= 90) return "contextCritical";
  if (percent >= 70) return "contextHigh";
  if (percent >= 50) return "contextMedium";
  return "contextLow";
}
function formatUsageTokens(count) {
  if (count < 1e3) return String(count);
  if (count < 1e4) return `${(count / 1e3).toFixed(1)}k`;
  if (count < 1e6) return `${Math.round(count / 1e3)}k`;
  if (count < 1e7) return `${(count / 1e6).toFixed(1)}M`;
  return `${Math.round(count / 1e6)}M`;
}
function formatTokens(value) {
  if (value >= 1e6) {
    const millions = value / 1e6;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (value >= 1e3) {
    const thousands = value / 1e3;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
  }
  return String(value);
}
function formatCwdForFooter(cwd, home) {
  if (!home) return cwd;
  const resolvedCwd = resolve5(cwd);
  const resolvedHome = resolve5(home);
  const relativeToHome = relative2(resolvedHome, resolvedCwd);
  const isInsideHome = relativeToHome === "" || relativeToHome !== ".." && !relativeToHome.startsWith(`..${sep}`) && !isAbsolute(relativeToHome);
  if (!isInsideHome) return cwd;
  return relativeToHome === "" ? "~" : `~${sep}${relativeToHome}`;
}
function effortLevel(snapshot) {
  const level = snapshot.thinkingLevel;
  if (!level) return void 0;
  if (snapshot.reasoning === true) return level;
  return level === "off" ? void 0 : level;
}
function styleEffort(theme, level) {
  const token = level === "minimal" ? "thinkingMinimal" : level === "low" ? "thinkingLow" : level === "medium" ? "thinkingMedium" : level === "high" ? "thinkingHigh" : level === "xhigh" ? "thinkingXhigh" : level === "max" ? "thinkingMax" : "thinking";
  return theme.apply(token, thinkingLabel(level));
}
function formatElapsed2(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1e3));
  return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
var THINKING_GLYPHS = {
  off: "\u25CB",
  minimal: "\u25CB",
  low: "\u25D4",
  medium: "\u25D1",
  high: "\u25D2",
  xhigh: "\u25D5",
  max: "\u25C9"
};
function thinkingLabel(level) {
  const word = level === "minimal" ? "min" : level === "medium" ? "med" : level;
  return `${THINKING_GLYPHS[level] ?? ""} ${word}`.trim();
}
function contextState(percent) {
  if (percent === void 0 || !Number.isFinite(percent)) return void 0;
  if (percent >= 90) return "critical";
  if (percent >= 70) return "high";
  if (percent >= 50) return "medium";
  return "low";
}
function normalizeThinkingLevel(value) {
  return ["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(value) ? value : "off";
}
function contextPercent(value) {
  const percent = value.percent ?? (value.currentTokens !== void 0 && value.windowTokens ? value.currentTokens / value.windowTokens * 100 : void 0);
  return percent === void 0 ? void 0 : Math.max(0, Math.min(100, percent));
}

// extension-src/omp-theme/features/editor/index.ts
import { CustomEditor } from "@earendil-works/pi-coding-agent";

// extension-src/omp-theme/domain/status-renderer.ts
function uniqueLayout(layout) {
  const seen = /* @__PURE__ */ new Set();
  const dedupe = (items) => items.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return { left: dedupe(layout.left), right: dedupe(layout.right), secondary: dedupe(layout.secondary) };
}
function renderGroup(items, separator, padding) {
  return items.map((item) => item.content).filter(Boolean).join(`${padding}${separator}${padding}`);
}
function widthOf(items, separator, padding) {
  return visibleWidth(renderGroup(items, separator, padding));
}
function renderStatus(layout, snapshot, width, options) {
  if (width <= 0) return { primary: "", left: "", right: "", lines: [], visibleSegments: [] };
  const separator = options.separator ?? "\u2502";
  const padding = options.padding ?? " ";
  const normalized = uniqueLayout(layout);
  const context = { snapshot, theme: options.theme, options: options.options ?? {}, width };
  const candidates = /* @__PURE__ */ new Map();
  for (const id of [...normalized.left, ...normalized.right, ...normalized.secondary]) {
    if (candidates.has(id)) continue;
    const segment2 = options.segments.get(id);
    if (!segment2 || options.options?.[id]?.disabled) continue;
    try {
      const result = segment2.render(context);
      if (!result.visible || !result.content) continue;
      candidates.set(id, { id, segment: segment2, result, content: result.content, compact: false, moved: false });
    } catch {
    }
  }
  const primary = [...normalized.left, ...normalized.right].map((id) => candidates.get(id)).filter((candidate) => candidate !== void 0).sort(
    (a, b) => (b.segment.essential ? 1 : 0) - (a.segment.essential ? 1 : 0) || b.segment.defaultPriority - a.segment.defaultPriority
  );
  const secondary = normalized.secondary.map((id) => candidates.get(id)).filter((candidate) => candidate !== void 0);
  const visible = [];
  const overflow = [];
  for (const candidate of primary) {
    visible.push(candidate);
    if (widthOf(visible, separator, padding) <= width) continue;
    if (candidate.result.compactContent && !candidate.compact) {
      candidate.content = candidate.result.compactContent;
      candidate.compact = true;
      if (widthOf(visible, separator, padding) <= width) continue;
    }
    visible.pop();
    if (candidate.segment.overflow !== "drop" && candidate.segment.overflow !== "primary") {
      candidate.moved = true;
      overflow.push(candidate);
    }
  }
  for (const candidate of [...overflow].sort((a, b) => b.segment.defaultPriority - a.segment.defaultPriority))
    secondary.push(candidate);
  const visibleIds = new Set(visible.map((candidate) => candidate.id));
  const groupOf = (group) => group.map((id) => candidates.get(id)).filter((candidate) => candidate !== void 0 && visibleIds.has(candidate.id));
  const leftVisible = groupOf(normalized.left);
  const rightVisible = groupOf(normalized.right);
  const leftText = renderGroup(leftVisible, separator, padding);
  const rightText = renderGroup(rightVisible, separator, padding);
  let primaryText;
  if (!rightText) {
    primaryText = leftText;
  } else {
    const core = leftText ? `${leftText}${padding}${padding}` : "";
    const gap = Math.max(2, width - visibleWidth(core) - visibleWidth(rightText));
    primaryText = `${core}${" ".repeat(gap)}${rightText}`;
  }
  if (visibleWidth(primaryText) > width) primaryText = truncateAnsi(primaryText, width);
  const secondaryVisible = [];
  for (const candidate of [...secondary].sort((a, b) => b.segment.defaultPriority - a.segment.defaultPriority)) {
    secondaryVisible.push(candidate);
    if (widthOf(secondaryVisible, separator, padding) > width) secondaryVisible.pop();
  }
  const secondaryText = renderGroup(secondaryVisible, separator, padding);
  const lines = secondaryText ? [primaryText, secondaryText] : primaryText ? [primaryText] : [];
  return {
    primary: primaryText,
    left: leftText,
    right: rightText,
    ...secondaryText ? { secondary: secondaryText } : {},
    lines,
    visibleSegments: [...visible, ...secondaryVisible].map((candidate) => candidate.id)
  };
}
function resolveStatusSeparator(style, theme) {
  if (style === "powerline") return theme.apply("separator", theme.glyph("powerlineLeft"));
  if (style === "powerline-thin" || style === "" || style === void 0) {
    return theme.apply("separator", theme.glyph("powerlineThinLeft"));
  }
  if (style === "none") return " ";
  return theme.apply("separator", style);
}

// extension-src/omp-theme/domain/theme.ts
var SEMANTIC_COLORS = {
  surface: "",
  surfaceRaised: "",
  surfaceMuted: "",
  text: "text",
  muted: "muted",
  dim: "dim",
  accent: "accent",
  accentStrong: "accent",
  border: "border",
  borderMuted: "borderMuted",
  borderActive: "borderAccent",
  success: "success",
  warning: "warning",
  error: "error",
  // fork: the model name (and its `⬢` glyph) is purple rather than the theme's
  // accent blue.
  model: "#b48ce0",
  thinking: "thinkingOff",
  thinkingMinimal: "thinkingMinimal",
  thinkingLow: "thinkingLow",
  thinkingMedium: "thinkingMedium",
  thinkingHigh: "thinkingHigh",
  thinkingXhigh: "thinkingXhigh",
  thinkingMax: "thinkingMax",
  path: "text",
  gitClean: "success",
  gitDirty: "warning",
  contextLow: "dim",
  contextMedium: "warning",
  contextHigh: "thinkingHigh",
  contextCritical: "error",
  tokens: "muted",
  cache: "muted",
  cost: "text",
  // fork: the native usage cluster is painted per part (input/output/cache/hit/
  // cost). Pi's own footer dims the whole run, so these have no theme-token
  // equivalent; only the cache hit rate rides a Pi theme color (`success`),
  // which keeps it green on every theme. Override any of them per token under
  // `theme.colors` if the fixed hexes clash with a light background.
  usageInput: "#ff5c57",
  usageOutput: "#ff9f43",
  usageCacheRead: "#e8c547",
  usageCacheHit: "success",
  usageCost: "#3ed6d6",
  // fork: the `current/window` half of the right-hand context readout. Its own
  // token rather than `muted` so it can be recolored without touching the
  // directory text next to it.
  contextTokens: "#3ed6d6",
  // fork: the word `used` in that same readout, painted orange.
  contextUsed: "#ff9f43",
  time: "muted",
  separator: "dim",
  hint: "#8a8a8a"
};
var GLYPHS = {
  nerd: {
    pi: "\uE22C",
    git: "\uF126",
    path: "\uF115",
    context: "\uE70F",
    separator: "\uE0B0",
    powerlineLeft: "\uE0B0",
    powerlineRight: "\uE0B2",
    powerlineThinLeft: "\uE0B1",
    powerlineThinRight: "\uE0B3",
    batchOpen: "\uF111",
    bashPrompt: "\uF12A",
    model: "\uEC19",
    cost: "\uF155",
    tokens: "\uE26B",
    input: "\uF090",
    output: "\uF08B",
    cache: "\uF1C0",
    time: "\uF017",
    host: "\uF109",
    session: "\u{F0051}",
    auto: "\u{F0068}"
  },
  // Font-independent set (the default). Values mirror omp's `unicode` symbol
  // preset so the look matches without requiring a Nerd Font.
  unicode: {
    pi: "\u03C0",
    git: "\u2442",
    path: "\u{1F4C1}",
    context: "\u25EB",
    separator: "\u2502",
    powerlineLeft: "\u25B6",
    powerlineRight: "\u25C0",
    powerlineThinLeft: "\u2506",
    powerlineThinRight: "\u2506",
    batchOpen: "\u25CF",
    bashPrompt: "$",
    model: "\u2B22",
    cost: "\u{1F4B2}",
    tokens: "\u{1FA99}",
    input: "\u2935",
    output: "\u2934",
    cache: "\u{1F4BE}",
    time: "\u23F1",
    host: "\u{1F5A5}",
    session: "\u{1F194}",
    auto: "\u27F2"
  },
  ascii: {
    pi: "pi",
    git: "git",
    path: "path",
    context: "ctx",
    separator: "|",
    powerlineLeft: ">",
    powerlineRight: "<",
    powerlineThinLeft: "|",
    powerlineThinRight: "|",
    batchOpen: "v",
    bashPrompt: "$",
    model: "m",
    cost: "$",
    tokens: "tok",
    input: "in",
    output: "out",
    cache: "cache",
    time: "t",
    host: "host",
    session: "sess",
    auto: "auto"
  }
};
function isHex(color) {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}
function hexToAnsiPrefix(hex) {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `\x1B[38;2;${r};${g};${b}m`;
}
var RAINBOW_COLORS = [
  "#b281d6",
  "#d787af",
  "#febc38",
  "#e4c00f",
  "#89d281",
  "#00afaf",
  "#178fb9",
  "#b281d6"
];
function rainbowAnsi(text2) {
  let result = "";
  let colorIndex = 0;
  for (const char of text2) {
    if (char === " " || char === ":") {
      result += char;
    } else {
      result += hexToAnsiPrefix(RAINBOW_COLORS[colorIndex % RAINBOW_COLORS.length] ?? "#b281d6") + char;
      colorIndex++;
    }
  }
  return `${result}\x1B[0m`;
}
function colorPrefixFor(active, config, noColor, token) {
  if (noColor) return "";
  const raw = config.theme.colors[token] ?? SEMANTIC_COLORS[token];
  if (!raw) return "";
  if (isHex(raw)) return hexToAnsiPrefix(raw);
  if (active?.fg) {
    try {
      const styled = active.fg(raw, "");
      return styled.endsWith("\x1B[39m") ? styled.slice(0, -5) : styled;
    } catch {
      return "";
    }
  }
  return "";
}
function detectGlyphMode(config, env = {}) {
  if (env.PI_OMP_THEME_NERD_FONTS === "1") return "nerd";
  if (env.PI_OMP_THEME_NERD_FONTS === "0") return "unicode";
  if (config.theme.nerdFonts === "on") return "nerd";
  if (config.theme.nerdFonts === "off") return "unicode";
  return config.preset === "ascii" ? "ascii" : "unicode";
}
function resolveTheme(active, config, env = {}) {
  const noColor = Object.hasOwn(env, "NO_COLOR") && env.NO_COLOR !== "" && config.theme.colors.colorOverride !== "on";
  const mode = config.preset === "ascii" ? "ascii" : detectGlyphMode(config, env);
  const color = (token) => colorPrefixFor(active, config, noColor, token);
  return {
    mode,
    noColor,
    color,
    apply: (token, text2) => {
      const prefix = color(token);
      return prefix ? `${prefix}${text2}\x1B[0m` : text2;
    },
    rainbow: (text2) => noColor ? text2 : rainbowAnsi(text2),
    glyph: (name) => config.theme.glyphs[name] ?? GLYPHS[mode][name]
  };
}

// extension-src/omp-theme/features/editor/index.ts
var widthOf2 = safeVisibleWidth;
function formatTokenCount(value) {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${Math.round(value / 1e3)}K`;
  return String(value);
}
var CONTEXT_SPECULATION_PERCENT = 70;
var CONTEXT_COMPACTION_PERCENT = 90;
var SESSION_ACCENT_TOKENS = ["accent", "success", "warning", "cost", "cache", "contextHigh", "gitClean"];
function contextGaugeToken(percent) {
  if (percent >= 90) return "contextCritical";
  if (percent >= 70) return "contextHigh";
  if (percent >= 50) return "contextMedium";
  return "contextLow";
}
function widthSafe(value, width) {
  if (width <= 0) return "";
  const fitted = widthOf2(value) > width ? truncateAnsi(value, width, "") : value;
  const current = widthOf2(fitted);
  return current < width ? fitted + " ".repeat(width - current) : fitted;
}
function stripSideBorders(line) {
  const plain = stripAnsi(line);
  if (!plain.startsWith("\u2502") || !plain.endsWith("\u2502")) return line;
  return line.replace(/^(\x1b\[[0-9;]*m)*│/, "").replace(/│((\x1b\[[0-9;]*m)*)$/, "$1");
}
function isNativeBorderLine(line) {
  const stripped = stripAnsi(line);
  return /^─{2,}$/.test(stripped) || /^─── [↑↓] \d+ more /.test(stripped);
}
function stripLeadingVisibleChars(line, count) {
  if (count <= 0 || line.length === 0) return line;
  let output = "";
  let stripped = 0;
  let index = 0;
  while (index < line.length) {
    const char = line[index] ?? "";
    if (char === "\x1B") {
      const start = index;
      index++;
      const intro = line[index];
      if (intro === "[") {
        index++;
        while (index < line.length) {
          const byte = line[index] ?? "";
          index++;
          if (byte >= "@" && byte <= "~") break;
        }
      } else if (intro === "]" || intro === "_" || intro === "^" || intro === "P") {
        index++;
        while (index < line.length) {
          const byte = line[index] ?? "";
          if (byte === "\x1B" && line[index + 1] === "\\") {
            index += 2;
            break;
          }
          index++;
          if (byte === "\x07") break;
        }
      } else if (intro !== void 0) {
        index++;
      }
      output += line.slice(start, index);
      continue;
    }
    if (stripped < count) {
      stripped++;
      index++;
      continue;
    }
    output += char;
    index++;
  }
  return output;
}
function statusLineTheme(full, config) {
  return resolveTheme(
    full?.fg || full?.colors ? {
      ...full.colors ? { colors: full.colors } : {},
      ...full.fg ? { fg: (color, text2) => full.fg?.(color, text2) ?? text2 } : {}
    } : void 0,
    config
  );
}
function semanticTheme(theme, config) {
  const editorTheme = theme;
  return resolveTheme(
    {
      fg: (token) => {
        if (token === "borderActive" || token.startsWith("thinking")) return editorTheme.borderColor("");
        return "";
      }
    },
    config
  );
}
var StyledEditor = class extends CustomEditor {
  config;
  snapshot;
  piTheme;
  fullTheme;
  onSnapshot;
  semantic;
  statusTheme;
  disposed = false;
  constructor(tui, theme, keybindings, options) {
    super(tui, theme, keybindings);
    this.config = options.config;
    this.snapshot = options.snapshot;
    this.piTheme = theme;
    this.fullTheme = options.fullTheme;
    this.onSnapshot = options.onSnapshot;
    this.semantic = semanticTheme(theme, options.config);
    this.statusTheme = statusLineTheme(options.fullTheme, options.config);
    this.setPaddingX(0);
  }
  update(snapshot) {
    if (this.disposed) return;
    this.snapshot = snapshot;
    this.invalidate();
  }
  configure(config) {
    if (this.disposed) return;
    this.config = config;
    this.semantic = semanticTheme(this.piTheme, config);
    this.statusTheme = statusLineTheme(this.fullTheme, config);
    this.invalidate();
  }
  handleInput(data) {
    if (this.disposed) return;
    super.handleInput(data);
    this.onSnapshot({ ...this.snapshot });
  }
  invalidate() {
    super.invalidate();
    this.semantic = semanticTheme(this.piTheme, this.config);
    this.statusTheme = statusLineTheme(this.fullTheme, this.config);
    this.tui.requestRender();
  }
  render(width) {
    if (width <= 0) return [];
    const style = this.styleFor(width);
    if (this.autocompleteState) {
      const nativeLines = super.render(width);
      const prompt2 = this.prompt(width);
      const padding2 = this.paddingFor(width, style);
      const promptWidth2 = widthOf2(prompt2) + 1;
      const prefix2 = `${" ".repeat(padding2)}${prompt2} `;
      const continuation2 = " ".repeat(padding2 + promptWidth2);
      const borderIndex = nativeLines.slice(1).findIndex((line) => isNativeBorderLine(line));
      const split = borderIndex >= 0 ? borderIndex + 1 : nativeLines.length;
      const body2 = nativeLines.slice(1, split);
      const dropdown = nativeLines.slice(split);
      const border = this.borderFor();
      const kind2 = this.frameKind(style);
      const renderWidth2 = width - (kind2 === "rounded" ? 2 : 0);
      const status = kind2 === "rounded" ? this.borderStatus(renderWidth2, width) : void 0;
      const sideColor = kind2 === "rounded" ? status && !this.isBashMode() ? (glyph) => this.statusTheme.apply("separator", glyph) : this.borderColorFor() : void 0;
      const wrap = (line) => kind2 === "rounded" && sideColor ? `${sideColor("\u2502")}${line}${sideColor("\u2502")}` : line;
      const bashHidden2 = this.bashHiddenCount();
      const renderedBody2 = body2.map((line, index) => {
        const source = index === 0 && bashHidden2 > 0 ? stripLeadingVisibleChars(line, bashHidden2) : line;
        return wrap(widthSafe(`${index === 0 ? prefix2 : continuation2}${source}`, renderWidth2));
      });
      const quietRule = (glyph) => this.statusTheme.apply("separator", glyph);
      const dropdownLines = dropdown.map(
        (line) => isNativeBorderLine(line) ? wrap(quietRule("\u2500".repeat(Math.max(0, renderWidth2)))) : wrap(widthSafe(line, renderWidth2))
      );
      if (kind2 === "rounded") {
        const inner = Math.max(0, width - 2);
        const quiet = (glyph) => this.statusTheme.apply("separator", glyph);
        const top = status ? `${quiet("\u256D")}${status}${quiet("\u256E")}` : border(`\u256D${"\u2500".repeat(inner)}\u256E`);
        const rows = [...renderedBody2, ...dropdownLines];
        if (!status) return [top, ...rows, border(`\u2570${"\u2500".repeat(inner)}\u256F`)];
        const closed = rows.map(
          (line, index) => index === rows.length - 1 ? `${quiet("\u2570")}${widthSafe(stripSideBorders(line), inner)}${quiet("\u256F")}` : line
        );
        return [top, ...closed];
      }
      return [border("\u2500".repeat(width)), ...renderedBody2, ...dropdownLines, border("\u2500".repeat(width))];
    }
    if (style === "native") return super.render(width).map((line) => widthSafe(line, width));
    const prompt = this.prompt(width);
    const promptWidth = widthOf2(prompt) + 1;
    const padding = this.paddingFor(width, style);
    const kind = this.frameKind(style);
    const sideReserve = kind === "rounded" ? 2 : 0;
    const renderWidth = Math.max(1, width - sideReserve);
    const innerWidth = Math.max(1, renderWidth - promptWidth - padding * 2);
    const innerLines = super.render(innerWidth);
    if (innerLines.length === 0) return [];
    const body = innerLines.slice(1, -1);
    const prefix = `${" ".repeat(padding)}${prompt} `;
    const continuation = " ".repeat(padding + promptWidth);
    const hint = this.config.editor.hint;
    const showHint = hint !== "" && this.getText() === "";
    const bashHidden = this.bashHiddenCount();
    const renderedBody = body.map((line, index) => {
      const lead = index === 0 ? prefix : continuation;
      const source = index === 0 && bashHidden > 0 ? stripLeadingVisibleChars(line, bashHidden) : line;
      let content = `${lead}${source}`;
      if (showHint && index === 0 && line) {
        let end = content.length;
        while (end > 0 && content[end - 1] === " ") end--;
        if (end < content.length) content = content.slice(0, end);
        content += this.semantic.apply("hint", hint);
      }
      return widthSafe(content, renderWidth);
    });
    const metadata = this.metadata(width, style);
    const framed = this.frame(width, style, renderedBody, metadata);
    return framed.map((line) => widthSafe(line, width));
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.invalidate();
  }
  prompt(width) {
    if (this.isBashMode()) {
      const glyph = this.semantic.glyph("bashPrompt");
      return this.borderColor(glyph);
    }
    const configured = this.config.theme.glyphs.prompt;
    if (configured) return configured;
    if (width !== void 0 && editorHostsBorderStatusAt(this.config, width)) return "";
    return this.semantic.mode === "ascii" ? ">" : "\u276F";
  }
  /** Pi's bash mode: the input starts with `!` after optional whitespace. */
  isBashMode() {
    return this.getText().trimStart().startsWith("!");
  }
  /**
   * Number of leading `!` characters to hide from the displayed input while
   * bash mode is active. Characters under the cursor are never hidden, so the
   * native cursor block stays visible when the cursor sits on a `!`.
   */
  bashHiddenCount() {
    const text2 = this.getText();
    let index = 0;
    while (index < text2.length && (text2[index] === " " || text2[index] === "	")) index++;
    const runStart = index;
    while (index < text2.length && text2[index] === "!") index++;
    const run = index - runStart;
    if (run === 0) return 0;
    const cursor = this.getCursor();
    const position = cursor.line === 0 ? cursor.col : Number.POSITIVE_INFINITY;
    return Math.min(run, Math.max(0, position - runStart));
  }
  styleFor(width) {
    if (width < 20) return "native";
    if (["compact", "boxed", "dock", "native"].includes(this.config.editor.style)) {
      if (this.config.editor.style === "native") return "native";
      if (width < 40 && this.config.editor.style !== "compact") return "compact";
      return this.config.editor.style;
    }
    return "compact";
  }
  /**
   * Resolve the frame treatment for a style: horizontal bars for compact,
   * full-width bars for boxed, an outlined box for dock, and a rounded box
   * with side borders (`╭─╮ │ │ ╰─╯`) for `frame: "rounded"`.
   */
  frameKind(style) {
    const frame = this.config.editor.frame;
    if (style === "compact" || frame === "line" || frame === "solid") return "compact";
    if (style === "boxed") return "boxed";
    if (frame === "native") return "native";
    if (frame === "claude") return "claude";
    if (frame === "rounded") return "rounded";
    return "outline";
  }
  paddingFor(width, style) {
    if (width < 50) return 0;
    return style === "boxed" ? 2 : style === "dock" ? 1 : 1;
  }
  borderFor() {
    return (line) => this.borderColorFor()(line);
  }
  /** Raw border color function (thinking-synced) WITHOUT full-width padding, for single glyphs. */
  /**
   * Colour a named session's frame from its own name, so two windows on the same
   * project are told apart at a glance. Drawn from the theme's own tokens rather
   * than a free hue, so it can never land off-palette, and only for sessions the
   * user actually named — an unnamed session keeps the thinking-level signal.
   */
  sessionAccentFor() {
    if (!this.config.theme.sessionAccent) return void 0;
    const name = this.snapshot.sessionName;
    if (!name) return void 0;
    let hash = 2166136261;
    for (const ch of name) {
      hash ^= ch.charCodeAt(0);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    const token = SESSION_ACCENT_TOKENS[hash % SESSION_ACCENT_TOKENS.length] ?? "accent";
    return (line) => this.statusTheme.apply(token, line);
  }
  /**
   * Right-aligned label closing the frame: the figures behind the gauge the top
   * border draws. Only shown when the border hosts the status, so a plain frame
   * stays plain.
   */
  borderFooter(span, terminalWidth) {
    if (!editorHostsBorderStatusAt(this.config, terminalWidth)) return void 0;
    const inner = span;
    const percent = contextPercent(this.snapshot.context ?? {});
    if (percent === void 0) return void 0;
    const theme = this.statusTheme;
    const window = this.snapshot.context?.windowTokens;
    const used = this.snapshot.context?.currentTokens;
    const label = `${theme.apply(contextGaugeToken(percent), `${Math.round(percent)}%`)}${window !== void 0 && used !== void 0 ? ` ${theme.apply("separator", "\xB7")} ${theme.apply("muted", `${formatTokenCount(used)}/${formatTokenCount(window)}`)}` : ""}`;
    const labelWidth = widthOf2(label);
    const dashes = inner - labelWidth - 4;
    if (dashes < 4) return void 0;
    return `${theme.apply("separator", "\u2500".repeat(dashes))} ${label} ${theme.apply("separator", "\u2500")}`;
  }
  borderColorFor() {
    if (this.isBashMode()) return this.borderColor;
    const accent = this.sessionAccentFor();
    if (accent) return accent;
    const level = this.snapshot.thinkingLevel;
    const thinking = this.fullTheme?.getThinkingBorderColor?.(level ?? "off");
    return thinking ?? this.piTheme.borderColor;
  }
  /**
   * Status line drawn into the rounded top border, omp-style: the left group sits
   * after the corner, the right group before it, and the run between them becomes
   * the context gauge (used portion tinted). Returns undefined when the border is
   * too narrow to hold anything useful, so the caller keeps a plain rule.
   */
  borderStatus(span, terminalWidth) {
    if (!editorHostsBorderStatusAt(this.config, terminalWidth)) return void 0;
    const inner = span;
    const theme = this.statusTheme;
    const result = renderStatus(this.config.statusLine.layout, this.snapshot, inner, {
      separator: resolveStatusSeparator(this.config.statusLine.separator, theme),
      segments: createBuiltinSegments(),
      theme,
      options: { context_bar: { disabled: true }, context_pct: { disabled: true } }
    });
    const left = result.left;
    const right = result.right;
    if (!left && !right) return void 0;
    const lead = left ? `${theme.apply("separator", "\u2500")} ${left} ` : theme.apply("separator", "\u2500");
    const tail = right ? ` ${right} ${theme.apply("separator", "\u2500")}` : theme.apply("separator", "\u2500");
    const gap = inner - widthOf2(lead) - widthOf2(tail);
    if (gap < 4) return void 0;
    const percent = contextPercent(this.snapshot.context ?? {});
    if (percent === void 0) return `${lead}${theme.apply("separator", "\u2500".repeat(gap))}${tail}`;
    return `${lead}${this.contextGauge(gap, percent)}${tail}`;
  }
  /**
   * The context gauge that spans the rest of the top border.
   *
   * Mirrors omp's `#buildContextGaugeFill` (status-line/component.ts): the used
   * portion is filled, the reading rides at the fill boundary, the window size
   * sits at the right end, and two ticks mark where compaction becomes
   * relevant — `╎` where speculative compaction starts and `┃` where auto
   * compaction fires. Labels and ticks are painted into the cells rather than
   * inserted, so the bar's width never changes with its content.
   */
  contextGauge(gap, percent) {
    const theme = this.statusTheme;
    const clamped = Math.max(0, Math.min(100, percent));
    const fillToken = contextGaugeToken(clamped);
    const window = this.snapshot.context?.windowTokens;
    const windowLabel = window === void 0 ? "" : formatTokenCount(window);
    const reading = `${Math.round(clamped)}%`;
    const canLabel = gap >= reading.length + windowLabel.length + 4;
    const windowStart = canLabel && windowLabel ? gap - windowLabel.length - 1 : -1;
    const scale = windowStart >= 0 ? windowStart : gap;
    const used = Math.min(scale, Math.max(1, Math.round(clamped / 100 * scale)));
    const cellFor = (value) => Math.min(scale - 1, Math.max(0, Math.round(value / 100 * scale)));
    const thresholdIndex = scale >= 8 ? cellFor(CONTEXT_COMPACTION_PERCENT) : -1;
    let speculationIndex = scale >= 8 ? cellFor(CONTEXT_SPECULATION_PERCENT) : -1;
    if (speculationIndex === thresholdIndex) speculationIndex = -1;
    let readingStart = -1;
    if (canLabel) {
      const maxStart = scale - reading.length - 1;
      const preferred = Math.min(maxStart, Math.max(1, used));
      const clashes = (start) => {
        const end = start + reading.length;
        return thresholdIndex >= start && thresholdIndex < end || speculationIndex >= start && speculationIndex < end;
      };
      for (let distance = 0; distance <= maxStart; distance++) {
        const left = preferred - distance;
        if (left >= 1 && !clashes(left)) {
          readingStart = left;
          break;
        }
        const right = preferred + distance;
        if (distance > 0 && right <= maxStart && !clashes(right)) {
          readingStart = right;
          break;
        }
      }
    }
    let out = "";
    for (let index = 0; index < gap; index++) {
      let token = index < used ? fillToken : "separator";
      let glyph = "\u2500";
      if (readingStart >= 0 && index >= readingStart && index < readingStart + reading.length) {
        token = fillToken;
        glyph = reading.charAt(index - readingStart);
      } else if (index === thresholdIndex) {
        token = fillToken;
        glyph = "\u2503";
      } else if (index === speculationIndex) {
        token = "muted";
        glyph = "\u254E";
      } else if (windowStart >= 0 && index >= windowStart && index < windowStart + windowLabel.length) {
        token = "muted";
        glyph = windowLabel.charAt(index - windowStart);
      }
      out += theme.apply(token, glyph);
    }
    return out;
  }
  frame(width, style, body, metadata) {
    const border = this.borderFor();
    const kind = this.frameKind(style);
    if (kind === "compact") {
      return [border("\u2500".repeat(width)), ...body, border("\u2500".repeat(width)), ...metadata];
    }
    if (kind === "boxed") {
      const glyph = this.config.editor.frame === "halfblock" ? "\u2580" : "\u2501";
      return [border(glyph.repeat(width)), ...body, border(glyph.repeat(width)), ...metadata];
    }
    if (kind === "claude") {
      return [border("\u2500".repeat(width)), ...body, border("\u2500".repeat(width)), ...metadata];
    }
    if (kind === "native") return body;
    const inner = Math.max(0, width - 2);
    if (kind === "rounded") {
      const hosting = this.borderStatus(inner, width) !== void 0;
      const sideColor = hosting && !this.isBashMode() ? (glyph) => this.statusTheme.apply("separator", glyph) : this.borderColorFor();
      const side = (line) => `${sideColor("\u2502")}${widthSafe(line, inner)}${sideColor("\u2502")}`;
      const status = this.borderStatus(inner, width);
      const quiet = (glyph) => this.statusTheme.apply("separator", glyph);
      const top = status ? `${quiet("\u256D")}${status}${quiet("\u256E")}` : border(`\u256D${"\u2500".repeat(inner)}\u256E`);
      if (status) {
        const rows = body.length > 0 ? body : [""];
        const framed = rows.map(
          (line, index) => index === rows.length - 1 ? `${quiet("\u2570")}${widthSafe(line, inner)}${quiet("\u256F")}` : `${sideColor("\u2502")}${widthSafe(line, inner)}${sideColor("\u2502")}`
        );
        return [top, ...framed, ...metadata];
      }
      const footer = this.borderFooter(inner, width);
      const bottom = footer ? `${quiet("\u2570")}${footer}${quiet("\u256F")}` : border(`\u2570${"\u2500".repeat(inner)}\u256F`);
      return [top, ...body.map(side), bottom, ...metadata];
    }
    const outlineStatus = this.borderStatus(inner, width);
    const quietOutline = (glyph) => this.statusTheme.apply("separator", glyph);
    const outlineTop = outlineStatus ? `${quietOutline("\u250C")}${outlineStatus}${quietOutline("\u2510")}` : border(`\u250C${"\u2500".repeat(inner)}\u2510`);
    const outlineFooter = this.borderFooter(inner, width);
    const outlineBottom = outlineFooter ? `${quietOutline("\u2514")}${outlineFooter}${quietOutline("\u2518")}` : border(`\u2514${"\u2500".repeat(inner)}\u2518`);
    return [outlineTop, ...body, outlineBottom, ...metadata];
  }
  metadata(width, style) {
    if (!this.config.editor.showMetadata || width < 60) return [];
    const percent = contextPercent(this.snapshot.context ?? {});
    if (percent === void 0) return [];
    const label = `ctx ${Math.round(percent)}%`;
    return [this.piTheme.borderColor(` ${style === "boxed" ? "\xB7 " : ""}${label}`)];
  }
};
function installEditor(options) {
  if (!options.host.setEditorComponent) return void 0;
  const previous = options.host.getEditorComponent?.();
  if (previous && options.config.compatibility.preferExistingEditor) {
    return {
      generation: options.generation,
      installedFactory: previous,
      previousFactory: previous,
      preservedPrevious: true,
      update() {
      },
      configure() {
      },
      dispose() {
      }
    };
  }
  let config = options.config;
  let snapshot = options.initialSnapshot;
  let disposed = false;
  const components = /* @__PURE__ */ new Set();
  const factory = ((tui, theme, keybindings) => {
    const editor = new StyledEditor(tui, theme, keybindings, {
      config,
      snapshot,
      theme,
      ...options.host.theme ? { fullTheme: options.host.theme } : {},
      onSnapshot: (next) => {
        if (!disposed && options.isCurrent?.() !== false) snapshot = next;
      }
    });
    components.add(editor);
    return editor;
  });
  try {
    options.host.setEditorComponent(factory);
  } catch {
    options.host.notify?.("pi-omp-theme editor unavailable; keeping the native editor", "warning");
    return void 0;
  }
  return {
    generation: options.generation,
    installedFactory: factory,
    previousFactory: previous,
    preservedPrevious: false,
    update(next) {
      if (disposed || options.isCurrent?.() === false) return;
      snapshot = next;
      for (const component of components) component.update(next);
    },
    configure(next) {
      if (disposed || options.isCurrent?.() === false) return;
      config = next;
      for (const component of components) component.configure(next);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const component of components) component.dispose();
      components.clear();
      if (options.host.getEditorComponent?.() === factory) {
        options.host.setEditorComponent(previous);
      }
    }
  };
}

// extension-src/omp-theme/features/startup/index.ts
import { VERSION as PI_VERSION } from "@earendil-works/pi-coding-agent";

// extension-src/omp-theme/features/startup/logo.ts
var PI_LOGO_LINES = [
  "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557",
  "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551",
  "\u2588\u2588\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2588\u2588\u2551",
  "\u2588\u2588\u2588\u2588\u2551   \u2588\u2588\u2588\u2588\u2551",
  "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u256C\u2550\u2550\u2550\u2588\u2588\u2588\u2588\u2557",
  "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551   \u2588\u2588\u2588\u2588\u2551 ",
  "\u2588\u2588\u2588\u2588\u2554\u2550\u2550\u2550\u255D   \u2588\u2588\u2588\u2588\u2551",
  "\u2588\u2588\u2588\u2588\u2551       \u2588\u2588\u2588\u2588\u2551",
  "\u255A\u2550\u2550\u2550\u255D       \u255A\u2550\u2550\u2550\u255D"
];
var LOGO_PALETTE_STEPS = 24;
var LOGO_MAX_DARKEN = 0.18;
var LOGO_MAX_LIGHTEN = 0.18;
var LOGO_ROW_PHASE_STEP = 0.12;
var LOGO_GAP = "   ";
var LOGO_SIDE_DETAIL_MIN_WIDTH = 12;
function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
function interpolateRgb(start, end, factor) {
  return {
    r: clampChannel(start.r + (end.r - start.r) * factor),
    g: clampChannel(start.g + (end.g - start.g) * factor),
    b: clampChannel(start.b + (end.b - start.b) * factor)
  };
}
function darkenRgb(rgb, amount) {
  return {
    r: clampChannel(rgb.r * (1 - amount)),
    g: clampChannel(rgb.g * (1 - amount)),
    b: clampChannel(rgb.b * (1 - amount))
  };
}
function lightenRgb(rgb, amount) {
  return {
    r: clampChannel(rgb.r + (255 - rgb.r) * amount),
    g: clampChannel(rgb.g + (255 - rgb.g) * amount),
    b: clampChannel(rgb.b + (255 - rgb.b) * amount)
  };
}
function buildLogoPalette(accent) {
  return Array.from({ length: LOGO_PALETTE_STEPS }, (_, index) => {
    const progress = index / LOGO_PALETTE_STEPS;
    const wave = -Math.cos(progress * Math.PI * 2);
    return wave < 0 ? darkenRgb(accent, LOGO_MAX_DARKEN * -wave) : lightenRgb(accent, LOGO_MAX_LIGHTEN * wave);
  });
}
function sampleLogoGradient(palette, position) {
  const wrapped = (position % 1 + 1) % 1;
  const scaled = wrapped * palette.length;
  const baseIndex = Math.floor(scaled) % palette.length;
  const nextIndex = (baseIndex + 1) % palette.length;
  const base = palette[baseIndex];
  const next = palette[nextIndex];
  if (!base || !next) return { r: 0, g: 0, b: 0 };
  return interpolateRgb(base, next, scaled - Math.floor(scaled));
}
function renderLogoGradientLine(line, palette, phase) {
  const characters = [...line];
  const span = Math.max(characters.length - 1, 1);
  return characters.map((character, index) => {
    if (character === " ") return character;
    const color = sampleLogoGradient(palette, index / span + phase);
    return `${hexToAnsiPrefix(rgbToHex(color))}${character}`;
  }).join("");
}
function rgbToHex(rgb) {
  return `#${[rgb.r, rgb.g, rgb.b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
var logoGradientCacheKey;
var logoGradientCacheLines;
function resolveAccentRgb(resolved) {
  const accentAnsi = resolved.color("accent");
  if (!accentAnsi) return void 0;
  return parseAnsiFgToRgb(accentAnsi);
}
function styledLogoLines(resolved) {
  const accent = resolveAccentRgb(resolved);
  if (!accent) return [...PI_LOGO_LINES];
  const cacheKey = `${resolved.color("accent")}|${resolved.mode}`;
  if (cacheKey === logoGradientCacheKey && logoGradientCacheLines) return logoGradientCacheLines;
  const palette = buildLogoPalette(accent);
  logoGradientCacheLines = PI_LOGO_LINES.map(
    (line, rowIndex) => renderLogoGradientLine(line, palette, rowIndex * LOGO_ROW_PHASE_STEP)
  );
  logoGradientCacheKey = cacheKey;
  return logoGradientCacheLines;
}
function compactLogoHeader(resolved, details, width) {
  const logoLines = styledLogoLines(resolved);
  const logoWidth = Math.max(...PI_LOGO_LINES.map((line) => visibleWidth(line)));
  const safeWidth = Math.max(1, width);
  const detailWidth = safeWidth - logoWidth - visibleWidth(LOGO_GAP);
  if (detailWidth >= LOGO_SIDE_DETAIL_MIN_WIDTH) {
    const detailStartRow = Math.max(0, Math.floor((PI_LOGO_LINES.length - details.length) / 2));
    return PI_LOGO_LINES.map((plainLine, index) => {
      const logoPadding = " ".repeat(Math.max(0, logoWidth - visibleWidth(plainLine)));
      const detailIndex = index - detailStartRow;
      const detailText = details[detailIndex];
      const detail = detailText ? fitAnsiWidth(detailText, detailWidth) : "";
      return `${logoLines[index]}${logoPadding}${detail ? `${LOGO_GAP}${detail}` : ""}`;
    });
  }
  if (safeWidth >= logoWidth) {
    return [...logoLines, ...details.map((detail) => fitAnsiWidth(detail, safeWidth))];
  }
  return [details[0], details[2]].map((detail) => fitAnsiWidth(detail, safeWidth));
}

// extension-src/omp-theme/features/startup/welcome.ts
var WELCOME_PROVIDER_SLOTS = 4;
var WELCOME_SESSION_SLOTS = 4;
var WELCOME_MIN_WIDTH = 64;
var PREFERRED_LEFT_COLUMN = 26;
var MIN_RIGHT_COLUMN = 30;
var TIPS = [
  ["/", "for commands"],
  ["!", "to run bash"],
  ["!!", "to run bash (no context)"]
];
function centre(text2, width) {
  const used = visibleWidth(text2);
  if (used >= width) return truncateAnsi(text2, width, "");
  const left = Math.floor((width - used) / 2);
  return `${" ".repeat(left)}${text2}${" ".repeat(width - used - left)}`;
}
function fit(text2, width) {
  const used = visibleWidth(text2);
  if (used > width) return truncateAnsi(text2, width, "\u2026");
  return `${text2}${" ".repeat(width - used)}`;
}
function panelHeading(theme, label) {
  return ` ${theme.apply("accent", label)}`;
}
function tipRows(theme) {
  const keyWidth = Math.max(...TIPS.map(([key]) => key.length));
  return TIPS.map(([key, meaning]) => ` ${theme.apply("dim", key.padEnd(keyWidth))} ${theme.apply("muted", meaning)}`);
}
function providerRows(theme, providers, width) {
  if (providers.length === 0) return [` ${theme.apply("dim", "No tool providers")}`];
  return providers.slice(0, WELCOME_PROVIDER_SLOTS).map((provider) => {
    const mark = theme.apply("success", "\u25CF");
    const name = theme.apply("muted", provider.name);
    const room = width - visibleWidth(`  ${provider.name} `) - 1;
    const detail = room > 3 ? theme.apply("dim", truncateAnsi(provider.detail, room, "\u2026")) : "";
    return ` ${mark} ${name}${detail ? ` ${detail}` : ""}`;
  });
}
function sessionRows(theme, sessions, width) {
  if (sessions.length === 0) return [` ${theme.apply("dim", "No recent sessions")}`];
  return sessions.slice(0, WELCOME_SESSION_SLOTS).map((session) => {
    const age = ` (${session.timeAgo})`;
    const budget = Math.max(1, width - 4 - visibleWidth(age));
    const name = truncateAnsi(session.name, budget, "\u2026");
    return ` ${theme.apply("dim", "\u2022")} ${theme.apply("muted", name)}${theme.apply("dim", age)}`;
  });
}
function pad(rows, slots) {
  const out = [...rows.slice(0, slots)];
  while (out.length < slots) out.push("");
  return out;
}
function renderWelcome(theme, data, width) {
  if (width < WELCOME_MIN_WIDTH) return [];
  const boxWidth2 = width;
  const contentWidth = boxWidth2 - 3;
  const logoWidth = Math.max(...PI_LOGO_LINES.map((line) => visibleWidth(line)));
  const leftColumn = Math.max(logoWidth, Math.min(PREFERRED_LEFT_COLUMN, contentWidth - MIN_RIGHT_COLUMN));
  const rightColumn = contentWidth - leftColumn;
  if (rightColumn < MIN_RIGHT_COLUMN) return [];
  const logoIndent = " ".repeat(Math.max(0, Math.floor((leftColumn - logoWidth) / 2)));
  const logo = styledLogoLines(theme).map((line) => `${logoIndent}${line}`);
  const left = [
    "",
    centre(theme.apply("text", data.title), leftColumn),
    "",
    ...logo,
    "",
    centre(theme.apply("muted", data.model ?? ""), leftColumn),
    centre(theme.apply("dim", data.provider ?? ""), leftColumn)
  ];
  const rule = ` ${theme.apply("dim", "\u2500".repeat(Math.max(0, rightColumn - 2)))}`;
  const right = [
    panelHeading(theme, "Tips"),
    ...tipRows(theme),
    rule,
    panelHeading(theme, "Tool providers"),
    ...pad(providerRows(theme, data.providers, rightColumn), WELCOME_PROVIDER_SLOTS),
    rule,
    panelHeading(theme, "Recent sessions"),
    ...pad(sessionRows(theme, data.sessions, rightColumn), WELCOME_SESSION_SLOTS),
    ""
  ];
  const dim = (glyph) => theme.apply("dim", glyph);
  const lines = [];
  const label = ` ${data.label} `;
  const lead = "\u2500".repeat(3);
  const fill = Math.max(0, boxWidth2 - 2 - visibleWidth(lead) - visibleWidth(label));
  lines.push(
    `${dim("\u256D")}${dim(lead)}${theme.apply("muted", label)}${dim("\u2500".repeat(fill))}${dim("\u256E")}`
  );
  const rows = Math.max(left.length, right.length);
  for (let index = 0; index < rows; index++) {
    const leftCell = fit(left[index] ?? "", leftColumn);
    const rightCell = fit(right[index] ?? "", rightColumn);
    lines.push(`${dim("\u2502")}${leftCell}${dim("\u2502")}${rightCell}${dim("\u2502")}`);
  }
  lines.push(`${dim("\u2570")}${dim("\u2500".repeat(boxWidth2 - 2))}${dim("\u256F")}`);
  return lines;
}

// extension-src/omp-theme/features/startup/index.ts
function activeThemeFromPi(theme) {
  if (!theme || typeof theme !== "object") return {};
  const candidate = theme;
  return {
    ...candidate.colors ? { colors: candidate.colors } : {},
    ...candidate.fg ? { fg: (color, text2) => candidate.fg?.(color, text2) ?? text2 } : {}
  };
}
var STARTUP_WIDGET_KEY = "pi-omp-theme.startup";
var owners = /* @__PURE__ */ new WeakMap();
function startupHeaderKey(snapshot) {
  return JSON.stringify({
    model: snapshot.model,
    provider: snapshot.startupProvider,
    resources: snapshot.resources
  });
}
function ownerMap(host) {
  let map = owners.get(host);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    owners.set(host, map);
  }
  return map;
}
function safeCall(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}
function shouldShow(reason, mode) {
  if (mode === "off") return false;
  return reason === "startup" || reason === "reload" || reason === "new" || reason === "resume" || reason === "fork";
}
function overlayAllowed(reason) {
  return reason === "startup";
}
function resourceChipRows(resources) {
  if (!resources) return [];
  const rows = [];
  if (resources.contextFiles !== void 0) rows.push({ label: "context", count: resources.contextFiles });
  if (resources.extensions !== void 0) rows.push({ label: "extensions", count: resources.extensions });
  if (resources.skills !== void 0) rows.push({ label: "skills", count: resources.skills });
  if (resources.prompts !== void 0) rows.push({ label: "prompts", count: resources.prompts });
  if (resources.tools !== void 0) rows.push({ label: "tools", count: resources.tools });
  if (resources.models !== void 0) rows.push({ label: "models", count: resources.models });
  return rows;
}
var PANEL_SIDE_PADDING = 2;
var PANEL_MIN_WIDTH = 64;
var PANEL_OUTER_WIDTH = PANEL_SIDE_PADDING * 2 + 2;
var MIN_PANELS_WIDTH = PANEL_MIN_WIDTH + PANEL_OUTER_WIDTH;
var RESOURCE_ROW_GAP = "  \xB7  ";
var CONTEXT_KIND_RANK = { system: 0, append: 1, context: 2 };
function renderResourceChips(resolved, resources) {
  const rows = resourceChipRows(resources);
  if (rows.length === 0) return "";
  const marker2 = resolved.apply("accent", "\u25C6 Resources");
  const chips = rows.map((row, index) => {
    const label = resolved.apply(index === 0 ? "text" : "muted", row.label);
    const count = resolved.apply("success", String(row.count));
    return `${label} ${count}`;
  });
  return [marker2, ...chips].join(resolved.apply("dim", RESOURCE_ROW_GAP));
}
function sortedContextItems(items) {
  return [...items].sort((a, b) => (CONTEXT_KIND_RANK[a.kind] ?? 9) - (CONTEXT_KIND_RANK[b.kind] ?? 9));
}
function renderPanelBorder(resolved, left, right, panelWidth) {
  return resolved.apply("dim", `${left}${"\u2500".repeat(panelWidth + PANEL_SIDE_PADDING * 2)}${right}`);
}
function renderPanelLine(resolved, content, panelWidth) {
  const sidePadding = " ".repeat(PANEL_SIDE_PADDING);
  const padding = " ".repeat(Math.max(0, panelWidth - visibleWidth(content)));
  return `${resolved.apply("dim", "\u2502")}${sidePadding}${content}${padding}${sidePadding}${resolved.apply("dim", "\u2502")}`;
}
function renderSystemContextPanel(resolved, items, minTotalWidth) {
  const sorted = sortedContextItems(items);
  const titleLine = resolved.apply("accent", "System & Context");
  if (sorted.length === 0) return [];
  const typeHeader = "Type";
  const pathHeader = "Path";
  const metricLabel = "Words/Lines";
  const typeWidth = Math.max(typeHeader.length, ...sorted.map((item) => visibleWidth(item.kind)));
  const divider = resolved.apply("muted", " | ");
  const dividerWidth = visibleWidth(divider);
  const metricWidth = Math.max(metricLabel.length, ...sorted.map((item) => `${item.words}/${item.lines}`.length));
  const fixedColumnsWidth = typeWidth + dividerWidth + dividerWidth + metricWidth;
  const panelWidth = Math.max(PANEL_MIN_WIDTH, minTotalWidth - PANEL_OUTER_WIDTH, visibleWidth(titleLine));
  const pathWidth = Math.max(pathHeader.length, panelWidth - fixedColumnsWidth);
  const header = `${resolved.apply("text", typeHeader.padEnd(typeWidth))}${divider}${resolved.apply(
    "text",
    pathHeader.padEnd(pathWidth)
  )}${divider}${resolved.apply("text", metricLabel.padStart(metricWidth))}`;
  const separator = `${resolved.apply("dim", "\u2500".repeat(typeWidth))}${divider}${resolved.apply(
    "dim",
    "\u2500".repeat(pathWidth)
  )}${divider}${resolved.apply("dim", "\u2500".repeat(metricWidth))}`;
  const lines = [
    renderPanelBorder(resolved, "\u256D", "\u256E", panelWidth),
    renderPanelLine(resolved, titleLine, panelWidth),
    renderPanelLine(resolved, header, panelWidth),
    renderPanelLine(resolved, separator, panelWidth)
  ];
  for (const item of sorted) {
    const metric = `${item.words}/${item.lines}`;
    const typePadding = " ".repeat(Math.max(0, typeWidth - visibleWidth(item.kind)));
    const path = fitAnsiWidth(item.path, pathWidth);
    const pathPadding = " ".repeat(Math.max(0, pathWidth - visibleWidth(path)));
    const metricPadding = " ".repeat(Math.max(0, metricWidth - visibleWidth(metric)));
    lines.push(
      renderPanelLine(
        resolved,
        `${resolved.apply("text", item.kind)}${typePadding}${divider}${resolved.apply(
          "text",
          path
        )}${pathPadding}${divider}${metricPadding}${resolved.apply("text", metric)}`,
        panelWidth
      )
    );
  }
  lines.push(renderPanelBorder(resolved, "\u2570", "\u256F", panelWidth));
  return lines;
}
function groupToolDetails(tools) {
  const groups = /* @__PURE__ */ new Map();
  for (const tool of tools) {
    const source = tool.source.trim() || "extension";
    const name = tool.name.trim();
    if (!name) continue;
    let names = groups.get(source);
    if (!names) {
      names = /* @__PURE__ */ new Set();
      groups.set(source, names);
    }
    names.add(name);
  }
  return [...groups.entries()].map(([source, names]) => ({ source, names: [...names].sort((a, b) => a.localeCompare(b)) })).sort((a, b) => {
    if (a.source === "core") return -1;
    if (b.source === "core") return 1;
    return a.source.localeCompare(b.source);
  });
}
function welcomeProviders(tools) {
  return groupToolDetails(tools).slice(0, WELCOME_PROVIDER_SLOTS).map((group) => ({
    name: group.source,
    detail: group.names.slice(0, 3).join("  ") + (group.names.length > 3 ? `  +${group.names.length - 3}` : "")
  }));
}
function renderToolsPanel(resolved, tools, minTotalWidth) {
  const groups = groupToolDetails(tools);
  if (groups.length === 0) return [];
  const titleLine = resolved.apply("accent", "Available Tools");
  const sourceHeader = "Source";
  const countHeader = "Count";
  const toolsHeader = "Tools";
  const countWidth = Math.max(countHeader.length, ...groups.map((group) => String(group.names.length).length));
  const divider = resolved.apply("muted", " | ");
  const dividerWidth = visibleWidth(divider);
  const panelWidth = Math.max(PANEL_MIN_WIDTH, minTotalWidth - PANEL_OUTER_WIDTH, visibleWidth(titleLine));
  const availableTextWidth = Math.max(
    sourceHeader.length + toolsHeader.length,
    panelWidth - countWidth - dividerWidth * 2
  );
  const maxSourceWidth = Math.max(sourceHeader.length, ...groups.map((group) => visibleWidth(group.source)));
  const sourceWidth = Math.min(maxSourceWidth, Math.max(sourceHeader.length, Math.floor(availableTextWidth * 0.28)));
  const toolsWidth = Math.max(toolsHeader.length, availableTextWidth - sourceWidth);
  const header = `${resolved.apply("text", sourceHeader.padEnd(sourceWidth))}${divider}${resolved.apply(
    "text",
    countHeader.padStart(countWidth)
  )}${divider}${resolved.apply("text", toolsHeader.padEnd(toolsWidth))}`;
  const separator = `${resolved.apply("dim", "\u2500".repeat(sourceWidth))}${divider}${resolved.apply(
    "dim",
    "\u2500".repeat(countWidth)
  )}${divider}${resolved.apply("dim", "\u2500".repeat(toolsWidth))}`;
  const lines = [
    renderPanelBorder(resolved, "\u256D", "\u256E", panelWidth),
    renderPanelLine(resolved, titleLine, panelWidth),
    renderPanelLine(resolved, header, panelWidth),
    renderPanelLine(resolved, separator, panelWidth)
  ];
  for (const group of groups) {
    const count = String(group.names.length);
    const toolList = fitAnsiWidth(group.names.join(", "), toolsWidth);
    const source = fitAnsiWidth(group.source, sourceWidth);
    const sourcePadding = " ".repeat(Math.max(0, sourceWidth - visibleWidth(source)));
    const countPadding = " ".repeat(Math.max(0, countWidth - count.length));
    lines.push(
      renderPanelLine(
        resolved,
        `${resolved.apply("text", source)}${sourcePadding}${divider}${countPadding}${resolved.apply(
          "success",
          count
        )}${divider}${resolved.apply("text", toolList)}`,
        panelWidth
      )
    );
  }
  lines.push(renderPanelBorder(resolved, "\u2570", "\u256F", panelWidth));
  return lines;
}
var STARTUP_INDENT = "    ";
var STARTUP_PADDING_TOP = 2;
var STARTUP_PADDING_BOTTOM = 2;
function styledLines(theme, config, snapshot, overlay, width) {
  if (width <= 0 || config.startup.mode === "off") return [];
  const resolved = resolveTheme(theme, config);
  const lines = [];
  const indentWidth = visibleWidth(STARTUP_INDENT);
  const bodyWidth = Math.max(1, width - indentWidth);
  const indent = (content) => `${STARTUP_INDENT}${content}`;
  lines.push(...Array.from({ length: STARTUP_PADDING_TOP }, () => ""));
  const card = renderWelcome(
    resolved,
    {
      label: `v${PI_VERSION}`,
      title: "Welcome back!",
      model: snapshot.model,
      provider: snapshot.startupProvider,
      providers: welcomeProviders(snapshot.resources?.toolDetails ?? []),
      sessions: snapshot.resources?.sessions ?? []
    },
    bodyWidth
  );
  if (card.length > 0) {
    lines.push(...card.map(indent));
  } else {
    const logoTitle = resolved.mode === "ascii" ? "pi-omp-theme" : `${resolved.glyph("pi")} pi-omp-theme`;
    lines.push(
      ...compactLogoHeader(
        resolved,
        [
          resolved.apply("accent", logoTitle),
          resolved.apply("muted", "/ commands \xB7 ! bash"),
          resolved.apply("success", "\u25CF ready")
        ],
        bodyWidth
      ).map(indent)
    );
  }
  const info = [];
  if (config.startup.showResources) {
    const chips = renderResourceChips(resolved, snapshot.resources);
    if (chips) info.push(chips);
    if (snapshot.resources?.error)
      info.push(resolved.apply("muted", `resources unavailable  \xB7  ${snapshot.resources.error}`));
  }
  if (info.length > 0) lines.push("", ...info.map(indent));
  const expanded = overlay || config.startup.alwaysExpanded;
  if (expanded && bodyWidth >= MIN_PANELS_WIDTH && config.startup.showResources) {
    const contextItems = snapshot.resources?.details ?? [];
    const toolItems = snapshot.resources?.toolDetails ?? [];
    if (contextItems.length > 0) {
      lines.push("");
      lines.push(...renderSystemContextPanel(resolved, contextItems, bodyWidth).map(indent));
    }
    if (toolItems.length > 0) {
      lines.push("");
      lines.push(...renderToolsPanel(resolved, toolItems, bodyWidth).map(indent));
    }
  }
  lines.push(...Array.from({ length: STARTUP_PADDING_BOTTOM }, () => ""));
  if (overlay) lines.push(indent(resolved.apply("dim", "enter prompt to continue  \xB7  esc dismiss")));
  return lines.map((line) => visibleWidth(line) <= width ? line : truncateAnsi(line, width, ""));
}
var StartupComponent = class {
  snapshot;
  config;
  theme;
  overlay;
  tui;
  requestRender;
  painted;
  constructor(theme, config, snapshot, overlay, tui, requestRender) {
    this.theme = theme;
    this.config = config;
    this.snapshot = snapshot;
    this.overlay = overlay;
    this.tui = tui;
    this.requestRender = requestRender;
  }
  setSnapshot(snapshot) {
    this.snapshot = snapshot;
    this.invalidate();
  }
  setConfig(config) {
    this.config = config;
    this.invalidate();
  }
  render(width) {
    notePresentationTui(this.tui);
    const painted = this.painted;
    if (!this.overlay && painted && painted.width === width && topRowScrolledAway()) return painted.lines;
    const lines = styledLines(this.theme, this.config, this.snapshot, this.overlay, width);
    this.painted = { width, lines };
    return lines;
  }
  invalidate() {
    this.requestRender();
  }
};
function installStartup(options) {
  const { host } = options;
  if (options.config.startup.mode === "off" || !shouldShow(options.snapshot.reason, options.config.startup.mode))
    return void 0;
  if (!host.hasUI || host.mode !== "tui") return void 0;
  const token = /* @__PURE__ */ Symbol("pi-omp-theme.startup");
  const map = ownerMap(host);
  let config = options.config;
  let snapshot = options.snapshot;
  let disposed = false;
  let dismissed = false;
  let headerInstalled = false;
  let installedHeaderFactory;
  let widgetInstalled = false;
  let overlayHandle;
  let removeInput;
  let timeout;
  let overlayDone;
  const components = [];
  const timeoutMs = options.timeoutMs;
  const component = (theme, isOverlay, tui) => {
    const result = new StartupComponent(activeThemeFromPi(theme), config, snapshot, isOverlay, tui, () => {
      tui.requestRender?.();
      options.requestRender?.();
    });
    components.push(result);
    return result;
  };
  const clearTimer = () => {
    if (timeout) clearTimeout(timeout);
    timeout = void 0;
  };
  const dismiss = () => {
    if (disposed || dismissed) return;
    dismissed = true;
    clearTimer();
    overlayHandle?.hide();
    overlayHandle = void 0;
    overlayDone?.(void 0);
    overlayDone = void 0;
  };
  const clearHeader = () => {
    if (!headerInstalled || map.get("header") !== token) return;
    const current = host.getHeaderFactory?.();
    if (host.getHeaderFactory && current !== installedHeaderFactory) return;
    if (host.setHeader) safeCall(() => host.setHeader?.(void 0));
    map.delete("header");
  };
  const clearWidget = () => {
    if (!widgetInstalled || map.get(STARTUP_WIDGET_KEY) !== token) return;
    if (host.setWidget) safeCall(() => host.setWidget?.(STARTUP_WIDGET_KEY, void 0));
    map.delete(STARTUP_WIDGET_KEY);
  };
  const mountCompact = () => {
    const factory = (tui, theme) => component(theme, false, tui);
    let currentHeader = /* @__PURE__ */ Symbol("unreadable");
    const observable = host.getHeaderFactory && safeCall(() => {
      currentHeader = host.getHeaderFactory?.();
    });
    const headerAvailable = host.setHeader !== void 0 && (!observable || currentHeader === void 0);
    if (headerAvailable && safeCall(() => host.setHeader?.(factory))) {
      installedHeaderFactory = factory;
      headerInstalled = true;
      map.set("header", token);
      return true;
    }
    if (host.setWidget && safeCall(() => host.setWidget?.(STARTUP_WIDGET_KEY, factory, { placement: "aboveEditor" }))) {
      widgetInstalled = true;
      map.set(STARTUP_WIDGET_KEY, token);
      return true;
    }
    return false;
  };
  const mountOverlay = () => {
    if (!host.custom || !overlayAllowed(snapshot.reason)) {
      mountCompact();
      return;
    }
    const overlayOptions = {
      anchor: "center",
      width: "80%",
      maxHeight: "60%",
      minWidth: 40,
      visible: (width, height) => width >= 40 && height >= 8
    };
    void host.custom(
      (tui, theme, _keybindings, done) => {
        overlayDone = done;
        return component(theme, true, tui);
      },
      { overlay: true, overlayOptions, onHandle: (handle) => overlayHandle = handle }
    ).catch(() => {
      if (!disposed && !dismissed) {
        clearTimer();
        mountCompact();
      }
    });
  };
  let headerKey = startupHeaderKey(snapshot);
  const installation = {
    generation: options.generation,
    update(next) {
      if (disposed || options.isCurrent?.() === false) return;
      snapshot = next;
      const nextKey = startupHeaderKey(next);
      if (nextKey === headerKey) return;
      headerKey = nextKey;
      for (const item of components) item.setSnapshot(next);
      options.requestRender?.();
    },
    dismiss,
    configure(next) {
      if (disposed || options.isCurrent?.() === false) return;
      config = next;
      for (const item of components) item.setConfig(next);
      if (next.startup.mode === "off") {
        dismiss();
        clearHeader();
        clearWidget();
      }
      options.requestRender?.();
    },
    dispose() {
      if (disposed) return;
      dismiss();
      disposed = true;
      removeInput?.();
      removeInput = void 0;
      clearHeader();
      clearWidget();
      map.delete("installation");
    }
  };
  map.set("installation", token);
  removeInput = host.onTerminalInput?.(() => dismiss());
  if (config.startup.mode === "compact" && !mountCompact()) {
    installation.dispose();
    return void 0;
  }
  if (config.startup.mode === "overlay") mountOverlay();
  if (config.startup.mode === "overlay" && timeoutMs !== void 0 && timeoutMs >= 0) {
    timeout = setTimeout(() => dismiss(), timeoutMs);
  }
  return installation;
}

// extension-src/omp-theme/features/status-line/index.ts
var PRIMARY_WIDGET_KEY = "pi-omp-theme.status.primary";
var SECONDARY_WIDGET_KEY = "pi-omp-theme.status.secondary";
var ownership = /* @__PURE__ */ new WeakMap();
var activeInstallations = /* @__PURE__ */ new WeakMap();
function ownerMap2(host) {
  let map = ownership.get(host);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    ownership.set(host, map);
  }
  return map;
}
function installationMap(host) {
  let map = activeInstallations.get(host);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    activeInstallations.set(host, map);
  }
  return map;
}
function safeWidget(host, key, content, placement) {
  try {
    host.setWidget(key, content, placement ? { placement } : void 0);
    return true;
  } catch {
    return false;
  }
}
function statusRowVisible(config, width) {
  return config.placement !== "border" || !editorHostsBorderStatusAt(config, width);
}
function placementFor(config) {
  return config.placement === "above" ? "aboveEditor" : "belowEditor";
}
function separatorsFor(config, theme) {
  return resolveStatusSeparator(config.statusLine.separator, theme);
}
function installStatusLine(options) {
  const existing = installationMap(options.host).get(options.generation);
  if (existing) return existing;
  const token = /* @__PURE__ */ Symbol("pi-omp-theme.status-line");
  const owners2 = ownerMap2(options.host);
  let config = options.config;
  let snapshot = options.initialSnapshot;
  let disposed = false;
  let primaryComponent;
  let secondaryComponent;
  let footerData;
  let footerOwner = false;
  let footerUnsubscribe;
  const segments = new Map(createBuiltinSegments());
  for (const item of config.statusLine.customItems) {
    if (!item.id || !item.statusKey) continue;
    segments.set(item.id, {
      id: item.id,
      defaultPriority: item.priority ?? 40,
      overflow: "secondary",
      render: ({ snapshot: snapshot2 }) => {
        const status = snapshot2.extensionStatuses?.find(
          (entry) => entry.key === item.statusKey
        );
        if (!status) return { visible: false, content: "" };
        return { visible: true, content: `${item.label ? `${item.label}:` : ""}${status.value}`, truncatable: true };
      }
    });
  }
  let themeCache;
  let themeVersion = 0;
  const lineCache = /* @__PURE__ */ new Map();
  const themeFor = (activeTheme) => {
    if (themeCache && themeCache.theme === activeTheme && themeCache.config === config) return themeCache;
    const resolved = resolveTheme(
      activeTheme.colors || activeTheme.fg ? {
        ...activeTheme.colors ? { colors: activeTheme.colors } : {},
        // Call through the theme instance so `this` binds correctly inside Pi's fg().
        ...activeTheme.fg ? { fg: (color, text2) => activeTheme.fg?.(color, text2) ?? text2 } : {}
      } : void 0,
      config
    );
    themeCache = { theme: activeTheme, config, resolved, separator: separatorsFor(config, resolved) };
    themeVersion++;
    return themeCache;
  };
  const render = (activeTheme, width, secondary) => {
    if (width <= 0 || !config.enabled || !config.statusLine.enabled) return [];
    if (!statusRowVisible(config, width)) return [];
    if (!statusRowVisible(config, width)) return [];
    const { resolved, separator } = themeFor(activeTheme);
    const effective = effectiveSnapshot(snapshot);
    const key = `${width}|${themeVersion}|${JSON.stringify(effective)}`;
    const cached = lineCache.get(secondary);
    if (cached && cached.key === key) return cached.lines;
    const result = renderStatus(config.statusLine.layout, effective, width, {
      separator,
      segments,
      theme: resolved,
      options: {
        ...Object.fromEntries(config.statusLine.disabledSegments.map((id) => [id, { disabled: true }])),
        context_bar: { width: config.statusLine.contextBarWidth },
        claude_context: { width: config.statusLine.contextBarWidth }
      }
    });
    const lines = secondary ? result.lines.slice(1) : result.lines.slice(0, 1);
    const truncated = lines.map((line) => fitAnsiWidth(line, width));
    const rendered = !secondary && truncated.length > 0 && config.statusLine.bottomMargin > 0 ? (
      // Blank rows below the primary row keep the status line off the terminal edge.
      [...truncated, ...Array.from({ length: config.statusLine.bottomMargin }, () => "")]
    ) : truncated;
    lineCache.set(secondary, { key, lines: rendered });
    return rendered;
  };
  const effectiveSnapshot = (input) => {
    if (!footerData) return input;
    const statuses = footerData.getExtensionStatuses();
    const extensionStatuses = statuses.size > 0 ? [...statuses].map(([key, value]) => ({ key, value })) : void 0;
    const branch = footerData.getGitBranch();
    const git = branch && input.git ? { ...input.git, branch } : input.git;
    return {
      ...input,
      ...extensionStatuses ? { extensionStatuses } : {},
      ...git ? { git } : {}
    };
  };
  const releaseFooterData = () => {
    footerUnsubscribe?.();
    footerUnsubscribe = void 0;
    footerData = void 0;
  };
  const footerFactory = (tui, _theme, data) => {
    footerData = data;
    footerUnsubscribe?.();
    footerUnsubscribe = data.onBranchChange(() => {
      primaryComponent?.invalidate();
      secondaryComponent?.invalidate();
      tui.requestRender?.();
    });
    return {
      // The native footer is replaced by an empty component; visible status lives in widgets.
      render() {
        return [];
      },
      invalidate() {
        tui.requestRender?.();
      },
      dispose() {
        releaseFooterData();
      }
    };
  };
  const mountFooter = () => {
    if (disposed || options.isCurrent?.() === false) return;
    if (!config.enabled || !config.statusLine.enabled) {
      clearFooter();
      return;
    }
    try {
      options.host.setFooter(footerFactory);
      footerOwner = true;
    } catch {
      footerOwner = false;
    }
  };
  const clearFooter = () => {
    if (!footerOwner) return;
    footerOwner = false;
    releaseFooterData();
    try {
      options.host.setFooter(void 0);
    } catch {
    }
  };
  const factory = (secondary) => (tui, theme) => {
    const currentTheme = theme;
    const component = {
      render(width) {
        const lines = render(currentTheme, width, secondary);
        return lines;
      },
      invalidate() {
        primaryComponent = secondary ? primaryComponent : component;
        secondaryComponent = secondary ? component : secondaryComponent;
        if (tui.requestRender) tui.requestRender();
      },
      dispose() {
      }
    };
    if (secondary) secondaryComponent = component;
    else primaryComponent = component;
    return component;
  };
  const claim = (key) => owners2.set(key, { token, generation: options.generation });
  const mount = () => {
    if (disposed || options.isCurrent?.() === false) return;
    if (!config.enabled || !config.statusLine.enabled) {
      clear(PRIMARY_WIDGET_KEY);
      clear(SECONDARY_WIDGET_KEY);
      clearFooter();
      return;
    }
    if (safeWidget(options.host, PRIMARY_WIDGET_KEY, factory(false), placementFor(config))) claim(PRIMARY_WIDGET_KEY);
    if (safeWidget(options.host, SECONDARY_WIDGET_KEY, factory(true), "belowEditor")) claim(SECONDARY_WIDGET_KEY);
    mountFooter();
  };
  function clear(key) {
    const current = owners2.get(key);
    if (current?.token !== token || current.generation !== options.generation) return;
    if (safeWidget(options.host, key, void 0)) owners2.delete(key);
  }
  const installation = {
    generation: options.generation,
    primaryKey: PRIMARY_WIDGET_KEY,
    secondaryKey: SECONDARY_WIDGET_KEY,
    update(next) {
      if (disposed || options.isCurrent?.() === false) return;
      snapshot = next;
      primaryComponent?.invalidate();
      secondaryComponent?.invalidate();
    },
    configure(next) {
      if (disposed || options.isCurrent?.() === false) return;
      const placementChanged = placementFor(next) !== placementFor(config);
      const enabledChanged = next.enabled !== config.enabled || next.statusLine.enabled !== config.statusLine.enabled;
      config = next;
      if (placementChanged || enabledChanged) {
        clear(PRIMARY_WIDGET_KEY);
        clear(SECONDARY_WIDGET_KEY);
        clearFooter();
        primaryComponent = void 0;
        secondaryComponent = void 0;
        mount();
      } else {
        primaryComponent?.invalidate();
        secondaryComponent?.invalidate();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clear(PRIMARY_WIDGET_KEY);
      clear(SECONDARY_WIDGET_KEY);
      clearFooter();
      installationMap(options.host).delete(options.generation);
    }
  };
  installationMap(options.host).set(options.generation, installation);
  mount();
  return installation;
}

// extension-src/omp-theme/shared/disposable-store.ts
var DisposableStore = class {
  items = [];
  disposed = false;
  add(item) {
    if (this.disposed) {
      void item.dispose();
      return item;
    }
    this.items.push(item);
    return item;
  }
  addCallback(callback) {
    this.add({ dispose: callback });
  }
  get size() {
    return this.items.length;
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (let i = this.items.length - 1; i >= 0; i--) await this.items[i]?.dispose();
    this.items.length = 0;
  }
};

// extension-src/omp-theme/app/providers.ts
import { execFile } from "child_process";
import { promisify } from "util";
var execFileAsync = promisify(execFile);
var EMPTY_USAGE = Object.freeze({
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  streaming: false,
  subscriptionMode: "unknown"
});
var NodeGitCommandRunner = class {
  async run(args, cwd, timeoutMs, signal) {
    if (signal?.aborted) return { stdout: "", stderr: "git command aborted", code: 1 };
    try {
      const result = await execFileAsync("git", [...args], {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
        signal
      });
      return { stdout: result.stdout, stderr: result.stderr, code: 0 };
    } catch (error) {
      const failure = error;
      return {
        stdout: failure.stdout ?? "",
        stderr: failure.stderr ?? (failure.signal ? `git terminated by ${failure.signal}` : "git command failed"),
        code: failure.code ?? 1
      };
    }
  }
};
var CachedGitProvider = class {
  constructor(runner = new NodeGitCommandRunner(), ttlMs = 1e3, timeoutMs = 800, maxBackoffMs = 5e3, clock = { now: () => Date.now() }) {
    this.runner = runner;
    this.ttlMs = ttlMs;
    this.timeoutMs = timeoutMs;
    this.maxBackoffMs = maxBackoffMs;
    this.clock = clock;
  }
  runner;
  ttlMs;
  timeoutMs;
  maxBackoffMs;
  clock;
  cache = /* @__PURE__ */ new Map();
  disposed = false;
  refreshCount = 0;
  get stats() {
    return {
      entries: this.cache.size,
      inFlight: [...this.cache.values()].filter((entry) => entry.promise).length,
      refreshes: this.refreshCount,
      disposed: this.disposed
    };
  }
  async get(cwd) {
    if (this.disposed) return unavailableGit("provider disposed");
    const now = this.clock.now();
    const current = this.cache.get(cwd);
    if (current && current.expiresAt > now && !current.needsRefresh) return current.value;
    if (current?.promise) return current.resultReady ? current.value : current.promise;
    if (current && current.retryAt > now) return current.value;
    const stale = current?.value;
    const entry = current ?? {
      value: refreshingGit(),
      expiresAt: 0,
      retryAt: 0,
      generation: 0,
      resultReady: false
    };
    entry.needsRefresh = false;
    entry.resultReady = Boolean(stale);
    entry.value = stale ? { ...stale, refreshing: true } : refreshingGit();
    entry.controller = new AbortController();
    entry.promise = this.refresh(cwd, entry, stale, entry.controller.signal);
    this.cache.set(cwd, entry);
    return stale ? entry.value : entry.promise;
  }
  invalidate(cwd) {
    const keys = cwd === void 0 ? [...this.cache.keys()] : [cwd];
    for (const key of keys) {
      const entry = this.cache.get(key);
      if (!entry) continue;
      entry.generation++;
      entry.expiresAt = 0;
      if (entry.promise) entry.needsRefresh = true;
      else this.cache.delete(key);
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.cache.values()) entry.controller?.abort();
    this.cache.clear();
  }
  async refresh(cwd, entry, stale, signal) {
    this.refreshCount++;
    const generation2 = entry.generation;
    let value;
    try {
      const result = await this.runner.run(["status", "--porcelain=v1", "--branch"], cwd, this.timeoutMs, signal);
      if (result.code !== 0) {
        value = stale ? { ...stale, refreshing: false, error: result.stderr.trim() || "git status failed" } : unavailableGit(result.stderr.trim() || "git status failed");
      } else value = parseGitStatus2(result.stdout);
    } catch (error) {
      value = stale ? { ...stale, refreshing: false, error: String(error) } : unavailableGit(String(error));
    }
    if (this.disposed || this.cache.get(cwd) !== entry) return value;
    const invalidated = entry.generation !== generation2 || entry.needsRefresh;
    delete entry.promise;
    delete entry.controller;
    entry.value = value;
    entry.resultReady = true;
    if (invalidated) {
      entry.needsRefresh = false;
      entry.expiresAt = 0;
      void this.get(cwd);
      return value;
    }
    entry.retryAt = value.error ? this.clock.now() + Math.min(this.maxBackoffMs, Math.max(this.ttlMs, 100)) : 0;
    entry.expiresAt = this.clock.now() + this.ttlMs;
    if (entry.needsRefresh) {
      entry.needsRefresh = false;
      void this.get(cwd);
    }
    return value;
  }
};
function refreshingGit() {
  return Object.freeze({ available: false, branch: null, staged: 0, unstaged: 0, untracked: 0, refreshing: true });
}
function unavailableGit(error) {
  return Object.freeze({
    available: false,
    branch: null,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    refreshing: false,
    error
  });
}
function parseGitStatus2(output) {
  const lines = output.split("\n").filter(Boolean);
  const header = lines.find((line) => line.startsWith("## "))?.slice(3) ?? "";
  if (!header) return unavailableGit("not a git repository");
  const branch = header.split("...")[0]?.replace(/^HEAD \(no branch\)$/, "detached") ?? null;
  let staged = 0;
  let unstaged = 0;
  let untracked = 0;
  for (const line of lines) {
    if (line.startsWith("## ")) continue;
    if (line.startsWith("??")) {
      untracked++;
      continue;
    }
    if (line.length < 2) continue;
    if (line[0] !== " ") staged++;
    if (line[1] !== " ") unstaged++;
  }
  const ahead = /\[ahead (\d+)\]/.exec(header)?.[1];
  const behind = /\[behind (\d+)\]/.exec(header)?.[1];
  return Object.freeze({
    available: true,
    branch: branch || null,
    staged,
    unstaged,
    untracked,
    ...ahead ? { ahead: Number(ahead) } : {},
    ...behind ? { behind: Number(behind) } : {},
    refreshing: false
  });
}
var InMemoryUsageProvider = class {
  values = /* @__PURE__ */ new Map();
  events = /* @__PURE__ */ new Map();
  finalized = /* @__PURE__ */ new Map();
  get(sessionId) {
    return this.values.get(sessionId) ?? EMPTY_USAGE;
  }
  record(sessionId, usage, options = {}) {
    if (options.eventId) {
      const ids = this.events.get(sessionId) ?? /* @__PURE__ */ new Set();
      const finalized = this.finalized.get(sessionId) ?? /* @__PURE__ */ new Set();
      if (finalized.has(options.eventId) || ids.has(options.eventId) && !options.finalized) return;
      ids.add(options.eventId);
      this.events.set(sessionId, ids);
      if (options.finalized) {
        finalized.add(options.eventId);
        this.finalized.set(sessionId, finalized);
      }
    }
    const current = this.get(sessionId);
    const next = {
      ...current,
      ...usage,
      streaming: options.finalized ? false : usage.streaming ?? current.streaming
    };
    this.values.set(sessionId, Object.freeze(next));
  }
  reset(sessionId) {
    if (sessionId === void 0) {
      this.values.clear();
      this.events.clear();
      this.finalized.clear();
      return;
    }
    this.values.delete(sessionId);
    this.events.delete(sessionId);
    this.finalized.delete(sessionId);
  }
};
var InMemoryContextProvider = class {
  values = /* @__PURE__ */ new Map();
  get(sessionId) {
    return this.values.get(sessionId);
  }
  set(sessionId, context) {
    this.values.set(sessionId, Object.freeze({ ...context }));
  }
  clear(sessionId) {
    if (sessionId === void 0) this.values.clear();
    else this.values.delete(sessionId);
  }
};

// extension-src/omp-theme/app/render-scheduler.ts
var RenderScheduler = class {
  constructor(host, generation2, isCurrent = (current) => current === this.generation) {
    this.host = host;
    this.generation = generation2;
    this.isCurrent = isCurrent;
  }
  host;
  generation;
  isCurrent;
  stopped = false;
  immediateQueued = false;
  coalescedTimer;
  deferredTimer;
  retryTimer;
  schedule(kind) {
    if (this.stopped || !this.isCurrent(this.generation)) return;
    if (kind === "immediate") {
      if (this.immediateQueued) return;
      this.immediateQueued = true;
      queueMicrotask(() => {
        this.immediateQueued = false;
        this.render();
      });
      return;
    }
    const target = kind === "coalesced" ? "coalescedTimer" : kind === "deferred" ? "deferredTimer" : "retryTimer";
    if (this[target] !== void 0) return;
    const delay = kind === "coalesced" ? 16 : kind === "deferred" ? 50 : 100;
    this[target] = setTimeout(() => {
      this[target] = void 0;
      this.render();
    }, delay);
  }
  render() {
    if (!this.stopped && this.isCurrent(this.generation)) this.host.requestRender();
  }
  cancel() {
    this.stopped = true;
    if (this.coalescedTimer !== void 0) clearTimeout(this.coalescedTimer);
    if (this.deferredTimer !== void 0) clearTimeout(this.deferredTimer);
    if (this.retryTimer !== void 0) clearTimeout(this.retryTimer);
    this.coalescedTimer = void 0;
    this.deferredTimer = void 0;
    this.retryTimer = void 0;
  }
};

// extension-src/omp-theme/app/snapshot.ts
function createSnapshot(generation2, revision = 0, values = {}) {
  return Object.freeze({ generation: generation2, revision, ...values });
}
function replaceSnapshot(current, generation2, values) {
  if (current.generation !== generation2) return current;
  return createSnapshot(generation2, current.revision + 1, values);
}

// extension-src/omp-theme/app/runtime.ts
function createPiOmpThemeRuntime(host, generation2, requestRender = () => {
}) {
  let disposed = false;
  const extensionStatuses = () => {
    if (!host.extensionStatusProvider) return void 0;
    try {
      return host.extensionStatusProvider();
    } catch {
      host.ui?.notify?.("pi-omp-theme extension statuses unavailable; provider recovery required", "warning");
      return [];
    }
  };
  let currentConfig = host.config;
  const disposables = new DisposableStore();
  const scheduler = new RenderScheduler({ requestRender }, generation2, () => !disposed);
  const git = new CachedGitProvider(host.gitRunner);
  const contextProvider = new InMemoryContextProvider();
  const usageProvider = new InMemoryUsageProvider();
  const usage = host.getContextUsage?.();
  const initialStatuses = extensionStatuses();
  const initialValues = {
    ...initialStatuses ? { extensionStatuses: initialStatuses } : {},
    ...host.model?.name || host.model?.id ? { model: host.model.name ?? host.model.id } : {},
    ...host.model?.provider ? { provider: host.model.provider } : {},
    ...host.model?.reasoning !== void 0 ? { reasoning: host.model.reasoning } : {},
    ...host.thinkingLevel ? { thinkingLevel: normalizeThinkingLevel(host.thinkingLevel) } : {},
    ...host.cwd ? { cwd: host.cwd } : {},
    ...usage ? {
      context: {
        ...usage.tokens !== null ? { currentTokens: usage.tokens } : {},
        windowTokens: usage.contextWindow,
        ...usage.percent !== null ? { percent: usage.percent } : {}
      }
    } : {}
  };
  let currentSnapshot = createSnapshot(generation2, 0, initialValues);
  let currentResources = host.resources;
  let statusLine;
  let editor;
  let startup;
  let installationState = {
    status: "disabled",
    editor: "disabled",
    startup: "disabled"
  };
  const startupSnapshot = (config) => ({
    ...currentSnapshot,
    reason: host.startupReason ?? "startup",
    ...host.provider ?? currentSnapshot.provider ? { startupProvider: host.provider ?? currentSnapshot.provider } : {},
    ...host.cwd ? { project: host.cwd.split(/[\\/]/).filter(Boolean).at(-1) } : {},
    preset: config.preset,
    ...currentResources ? { resources: currentResources } : {}
  });
  const installStatus = () => {
    if (!host.hasUI || host.mode !== "tui" || !host.ui || !currentConfig.enabled || !currentConfig.statusLine.enabled) {
      installationState = { ...installationState, status: "disabled" };
      return;
    }
    try {
      statusLine = installStatusLine({
        host: host.ui,
        config: currentConfig,
        generation: generation2,
        initialSnapshot: currentSnapshot,
        isCurrent: () => !disposed
      });
      if (statusLine) {
        disposables.add(statusLine);
        installationState = { ...installationState, status: "installed" };
      } else installationState = { ...installationState, status: "failed" };
    } catch (error) {
      host.ui.notify?.(
        `pi-omp-theme status unavailable: ${error instanceof Error ? error.message : "installation failed"}`,
        "warning"
      );
      statusLine = void 0;
      installationState = { ...installationState, status: "failed" };
    }
  };
  const installEditorFeature = () => {
    if (!host.hasUI || host.mode !== "tui" || !host.ui || !currentConfig.enabled || !currentConfig.editor.enabled) {
      installationState = { ...installationState, editor: "disabled" };
      return;
    }
    try {
      editor = installEditor({
        host: host.ui,
        config: currentConfig,
        generation: generation2,
        initialSnapshot: currentSnapshot,
        isCurrent: () => !disposed
      });
      if (editor) {
        disposables.add(editor);
        installationState = { ...installationState, editor: editor.preservedPrevious ? "preserved" : "installed" };
      } else installationState = { ...installationState, editor: "failed" };
    } catch (error) {
      host.ui.notify?.(
        `pi-omp-theme editor unavailable: ${error instanceof Error ? error.message : "installation failed"}`,
        "warning"
      );
      editor = void 0;
      installationState = { ...installationState, editor: "failed" };
    }
  };
  const installStartupFeature = () => {
    if (!host.hasUI || host.mode !== "tui" || !host.ui || !currentConfig.enabled || currentConfig.startup.mode === "off") {
      installationState = { ...installationState, startup: "disabled" };
      return;
    }
    try {
      startup = installStartup({
        host: { ...host.ui, mode: host.mode, hasUI: host.hasUI },
        config: currentConfig,
        snapshot: startupSnapshot(currentConfig),
        generation: generation2,
        requestRender,
        timeoutMs: 3e3,
        isCurrent: () => !disposed
      });
      if (startup) {
        disposables.add(startup);
        installationState = { ...installationState, startup: "installed" };
      } else installationState = { ...installationState, startup: "failed" };
    } catch (error) {
      host.ui.notify?.(
        `pi-omp-theme startup unavailable: ${error instanceof Error ? error.message : "installation failed"}`,
        "warning"
      );
      startup = void 0;
      installationState = { ...installationState, startup: "failed" };
    }
  };
  const disposeFeature = (label, dispose) => {
    if (!dispose) return;
    try {
      dispose();
    } catch (error) {
      host.ui?.notify?.(`pi-omp-theme ${label} cleanup failed; preserving the current owner`, "warning");
      void error;
    }
  };
  const disposeStatus = () => {
    disposeFeature("status", statusLine?.dispose);
    statusLine = void 0;
    installationState = { ...installationState, status: "disabled" };
  };
  const disposeEditor = () => {
    disposeFeature("editor", editor?.dispose);
    editor = void 0;
    installationState = { ...installationState, editor: "disabled" };
  };
  const disposeStartup = () => {
    disposeFeature("startup", startup?.dispose);
    startup = void 0;
    installationState = { ...installationState, startup: "disabled" };
  };
  installStatus();
  installEditorFeature();
  installStartupFeature();
  if (host.cwd && currentConfig.enabled && currentConfig.statusLine.enabled) {
    void git.get(host.cwd).then((value) => {
      if (disposed) return;
      currentSnapshot = replaceSnapshot(currentSnapshot, generation2, { ...currentSnapshot, git: value });
      statusLine?.update(currentSnapshot);
      editor?.update(currentSnapshot);
      startup?.update(startupSnapshot(currentConfig));
      requestRender();
    });
  }
  if (usage) {
    contextProvider.set("active", {
      ...usage.tokens !== null ? { currentTokens: usage.tokens } : {},
      windowTokens: usage.contextWindow,
      ...usage.percent !== null ? { percent: usage.percent } : {}
    });
  }
  return {
    generation: generation2,
    providerIdentity: { git, context: contextProvider, usage: usageProvider },
    get installationState() {
      return installationState;
    },
    mode: host.mode,
    hasUI: host.hasUI,
    snapshot: currentSnapshot,
    disposables,
    scheduler,
    updateStartupResources(resources) {
      if (disposed) return;
      currentResources = resources;
      startup?.update(startupSnapshot(currentConfig));
      requestRender();
    },
    dismissStartup() {
      startup?.dismiss();
    },
    update(values) {
      if (disposed) return;
      const liveUsage = host.getContextUsage?.();
      const context = liveUsage ? {
        ...liveUsage.tokens !== null ? { currentTokens: liveUsage.tokens } : {},
        windowTokens: liveUsage.contextWindow,
        ...liveUsage.percent !== null ? { percent: liveUsage.percent } : {}
      } : void 0;
      const statuses = extensionStatuses();
      currentSnapshot = replaceSnapshot(currentSnapshot, generation2, {
        ...currentSnapshot,
        ...values,
        ...context ? { context } : {},
        ...statuses ? { extensionStatuses: statuses } : {}
      });
      statusLine?.update(currentSnapshot);
      editor?.update(currentSnapshot);
      startup?.update(startupSnapshot(currentConfig));
    },
    configure(nextConfig) {
      if (disposed) return;
      const previous = currentConfig;
      const impactPlan = diffConfig(previous, nextConfig);
      if (impactPlan.impacts.length === 0) return;
      currentConfig = nextConfig;
      const statusChanged = JSON.stringify(previous.statusLine) !== JSON.stringify(nextConfig.statusLine) || previous.placement !== nextConfig.placement || previous.enabled !== nextConfig.enabled;
      const editorChanged = JSON.stringify(previous.editor) !== JSON.stringify(nextConfig.editor) || previous.enabled !== nextConfig.enabled;
      const startupChanged = JSON.stringify(previous.startup) !== JSON.stringify(nextConfig.startup) || previous.enabled !== nextConfig.enabled;
      if (statusChanged) {
        disposeStatus();
        currentConfig = nextConfig;
        installStatus();
      }
      if (editorChanged) {
        disposeEditor();
        currentConfig = nextConfig;
        installEditorFeature();
      }
      if (startupChanged) {
        disposeStartup();
        currentConfig = nextConfig;
        installStartupFeature();
      }
      statusLine?.configure(nextConfig);
      editor?.configure(nextConfig);
      startup?.configure(nextConfig);
    },
    invalidateGit() {
      if (disposed || !host.cwd || !currentConfig.enabled || !currentConfig.statusLine.enabled) return;
      git.invalidate(host.cwd);
      void git.get(host.cwd).then((value) => {
        if (disposed) return;
        currentSnapshot = replaceSnapshot(currentSnapshot, generation2, { ...currentSnapshot, git: value });
        statusLine?.update(currentSnapshot);
        editor?.update(currentSnapshot);
        startup?.update(startupSnapshot(currentConfig));
        requestRender();
      });
    },
    get disposed() {
      return disposed;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scheduler.cancel();
      disposeStatus();
      disposeEditor();
      disposeStartup();
      git.dispose();
      contextProvider.clear();
      usageProvider.reset();
      void disposables.dispose();
    }
  };
}
var PiOmpThemeRuntimeController = class {
  activeRuntime;
  nextGeneration = 0;
  start(ctx) {
    this.stop();
    this.activeRuntime = createPiOmpThemeRuntime(ctx, ++this.nextGeneration);
    return this.activeRuntime;
  }
  stop() {
    this.activeRuntime?.dispose();
    this.activeRuntime = void 0;
  }
  get current() {
    return this.activeRuntime;
  }
};

// extension-src/omp-theme/app/index.ts
function countWords2(text2) {
  return text2.match(/[\p{L}\p{N}_]+/gu)?.length ?? 0;
}
function countLines(text2) {
  if (text2.length === 0) return 0;
  const lines = text2.split(/\r\n|\r|\n/).length;
  return /\r\n$|\r$|\n$/.test(text2) ? lines - 1 : lines;
}
function toStartupResources(resources) {
  const details = [];
  if (resources.systemPrompt) {
    const words = countWords2(resources.systemPrompt);
    const lines = countLines(resources.systemPrompt);
    if (words > 0 && lines > 0) details.push({ kind: "system", path: "system prompt", words, lines });
  }
  for (const file of resources.contextDetails ?? []) {
    if (file.words > 0 && file.lines > 0) {
      details.push({ kind: "context", path: file.path, words: file.words, lines: file.lines });
    }
  }
  return {
    ...resources.promptPaths ? { contextFiles: resources.promptPaths.length } : {},
    ...resources.themePaths ? { extensions: resources.themePaths.length } : {},
    ...resources.skillPaths ? { skills: resources.skillPaths.length } : {},
    ...resources.models !== void 0 ? { models: resources.models } : {},
    ...resources.toolDetails && resources.toolDetails.length > 0 ? { tools: resources.toolDetails.length, toolDetails: resources.toolDetails } : {},
    ...resources.sessions && resources.sessions.length > 0 ? { sessions: resources.sessions } : {},
    ...details.length > 0 ? { details } : {}
  };
}
function submittedSessionPaths(value, prefix = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [path, ...submittedSessionPaths(nested, path)];
  });
}
function composeSources(durable, resolved, session) {
  const next = { ...durable, ...resolved };
  for (const path of submittedSessionPaths(session)) {
    const effectiveSource = resolved[path];
    if (effectiveSource === void 0) delete next[path];
    else next[path] = effectiveSource;
  }
  return next;
}
function mergePatch2(base, patch) {
  if (patch === void 0) return base;
  if (typeof base !== "object" || base === null || Array.isArray(base) || typeof patch !== "object" || patch === null || Array.isArray(patch))
    return patch;
  const result = { ...base };
  for (const [key, value] of Object.entries(patch))
    result[key] = mergePatch2(result[key], value);
  return result;
}
function createPiOmpThemeApp(initialConfig, reloadPort, onConfigChange) {
  const runtime = new PiOmpThemeRuntimeController();
  let config = initialConfig === void 0 ? DEFAULT_CONFIG : normalizeConfig(initialConfig);
  let diagnostics = [];
  let durableDiagnostics = [];
  let durableSources = {};
  let sources = {};
  let trusted = true;
  let resources;
  let operational = {};
  let sessionPatch;
  let rawSources = { defaults: initialConfig ?? DEFAULT_CONFIG };
  let productPolicy = { corePatchGate: "omitted" };
  const resolveAll = () => resolveConfigDetailed({ ...rawSources, session: sessionPatch, projectTrusted: trusted });
  const resolveProductPolicy = () => {
    const values = [rawSources.global, trusted ? rawSources.project : void 0, sessionPatch];
    for (const value of values) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const compatibility = value.compatibility;
      if (compatibility && typeof compatibility === "object" && !Array.isArray(compatibility) && Object.hasOwn(compatibility, "allowCorePatches") && compatibility.allowCorePatches === false)
        return { corePatchGate: "deny" };
    }
    return { corePatchGate: "omitted" };
  };
  return {
    runtime,
    get config() {
      return config;
    },
    get productPolicy() {
      return productPolicy;
    },
    sessionStart(ctx, reason = "startup", discoveredResources) {
      trusted = ctx.projectTrusted ?? true;
      resources = discoveredResources;
      operational = {
        ...operational,
        provider: ctx.extensionStatusProvider ? { status: "configured", recovery: "provider will be checked on first snapshot" } : { status: "unavailable", recovery: "inject a capability-safe provider" },
        installations: {
          status: config.enabled && config.statusLine.enabled ? "active" : "disabled",
          editor: config.enabled && config.editor.enabled ? "active" : "disabled",
          startup: config.enabled && config.startup.mode !== "off" ? "active" : "disabled"
        }
      };
      const statusProvider = ctx.extensionStatusProvider ? () => {
        try {
          const result = ctx.extensionStatusProvider?.();
          operational = { ...operational, provider: { status: "available" } };
          return result;
        } catch {
          operational = {
            ...operational,
            provider: { status: "unavailable", recovery: "provider threw; retry after recovery" }
          };
          ctx.ui?.notify?.("pi-omp-theme extension statuses unavailable; provider recovery required", "warning");
          return void 0;
        }
      } : void 0;
      runtime.start({
        mode: ctx.mode,
        hasUI: ctx.hasUI,
        ...ctx.ui ? { ui: ctx.ui } : {},
        ...ctx.cwd ? { cwd: ctx.cwd } : {},
        ...ctx.model ? { model: ctx.model } : {},
        ...ctx.thinkingLevel ? { thinkingLevel: ctx.thinkingLevel } : {},
        config,
        startupReason: reason,
        ...resources ? { resources: toStartupResources(resources) } : {},
        ...ctx.getContextUsage ? { getContextUsage: ctx.getContextUsage } : {},
        ...ctx.projectTrusted !== void 0 ? { projectTrusted: ctx.projectTrusted } : {},
        ...ctx.gitRunner ? { gitRunner: ctx.gitRunner } : {},
        ...statusProvider ? { extensionStatusProvider: statusProvider } : {}
      });
    },
    setResources(next) {
      resources = next;
      runtime.current?.updateStartupResources(toStartupResources(next));
    },
    applySession(patch) {
      sessionPatch = mergePatch2(sessionPatch, patch);
      const resolved = resolveAll();
      config = resolved.config;
      diagnostics = boundedDiagnostics([...durableDiagnostics, ...resolved.diagnostics]);
      sources = composeSources(durableSources, resolved.sources, sessionPatch);
      productPolicy = resolveProductPolicy();
      operational = {
        ...operational,
        authorization: { ...operational.authorization ?? {}, productCorePatchGate: productPolicy.corePatchGate }
      };
      runtime.current?.configure(config);
      operational = {
        ...operational,
        installations: { ...operational.installations ?? {}, configChange: "reconciled" }
      };
      onConfigChange?.(config);
    },
    setProjectTrusted(nextTrusted) {
      trusted = nextTrusted;
    },
    setOperationalState(state) {
      operational = { ...operational, ...state };
    },
    setProductPolicy(policy) {
      productPolicy = policy;
      operational = {
        ...operational,
        authorization: { ...operational.authorization ?? {}, productCorePatchGate: policy.corePatchGate }
      };
    },
    sessionShutdown() {
      runtime.stop();
    },
    update(values, kind = "coalesced") {
      const active = runtime.current;
      if (!active) return;
      active.update(values);
      active.scheduler.schedule(kind);
    },
    reload() {
      if (!reloadPort) {
        runtime.current?.configure(config);
        return Promise.resolve();
      }
      return reloadPort.load(trusted).then((result) => {
        durableDiagnostics = boundedDiagnostics(result.diagnostics ?? []);
        durableSources = result.sources ?? {};
        diagnostics = durableDiagnostics;
        sources = durableSources;
        if (result.config !== void 0) {
          rawSources = result.rawSources ?? { defaults: result.config };
          productPolicy = resolveProductPolicy();
          const resolved = resolveAll();
          config = resolved.config;
          diagnostics = boundedDiagnostics([...durableDiagnostics, ...resolved.diagnostics]);
          sources = composeSources(durableSources, resolved.sources, sessionPatch);
          onConfigChange?.(config);
          operational = {
            ...operational,
            authorization: { ...operational.authorization ?? {}, productCorePatchGate: productPolicy.corePatchGate }
          };
        }
        runtime.current?.configure(config);
        onConfigChange?.(config);
      });
    },
    doctor() {
      return createDoctor({
        config,
        operational,
        diagnostics,
        sources,
        surfaces: {
          status: operational.installations?.status ?? "unknown",
          editor: operational.installations?.editor ?? "unknown",
          startup: operational.installations?.startup ?? "unknown",
          assistantMessage: operational.compatibility?.assistantMessage ?? "unknown",
          specialBlocks: operational.compatibility?.specialBlocks ?? "unknown",
          tools: operational.compatibility?.tools ?? "unknown"
        }
      });
    }
  };
}

// extension-src/omp-theme/features/messages/special-blocks.ts
import { Markdown } from "@earendil-works/pi-tui";

// extension-src/omp-theme/features/messages/boxed-block.ts
function formatMessageBlockTitle(theme, kind, title, icon = "\u2794") {
  const rawTitle = title ? `${icon} ${kind} \xB7 ${title}` : `${icon} ${kind}`;
  const coloredTitle = theme.fg("accent", rawTitle);
  return typeof theme?.bold === "function" ? theme.bold(coloredTitle) : coloredTitle;
}
function renderBoxedMessageBlock(theme, options) {
  const { kind, title, right, body, icon = "\u2794", cache: shouldCache = true } = options;
  let cache2 = null;
  return {
    invalidate() {
      cache2 = null;
    },
    render(width) {
      if (shouldCache && cache2?.width === width) return cache2.lines;
      const renderedWidth = boxWidth(width);
      const contentWidth = boxInnerWidth(renderedWidth);
      const titleLine = formatMessageBlockTitle(theme, kind, title, icon);
      const bodyLines = body(contentWidth);
      const lines = [
        boxLabeledBorder(theme, "\u256D", "\u256E", titleLine, void 0, renderedWidth),
        boxBlankLine(theme, renderedWidth),
        ...bodyLines.map((line) => boxLine(theme, line, renderedWidth))
      ];
      if (bodyLines.length > 0) lines.push(boxBlankLine(theme, renderedWidth));
      if (right) {
        lines.push(boxLabeledBorder(theme, "\u2570", "\u256F", "", theme.fg("dim", right), renderedWidth));
      } else {
        lines.push(boxBorder(theme, "\u2570", "\u256F", renderedWidth));
      }
      const visible = dropOmittedLines(lines);
      if (shouldCache) cache2 = { width, lines: visible };
      return visible;
    }
  };
}

// extension-src/omp-theme/features/messages/special-blocks.ts
var cachedTheme;
function setSpecialBlockTheme(theme) {
  cachedTheme = theme;
  if (theme) setFullTheme(theme);
}
function compactTokens(value) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${Math.round(value / 1e3)}K`;
  return String(Math.round(value));
}
function compactionStat(theme, before, after) {
  if (after === void 0 || before <= 0) {
    return theme.fg("muted", `${before.toLocaleString()} tokens compacted`);
  }
  const percent = Math.round((before - after) / before * 100);
  const counts = theme.fg("muted", `${before.toLocaleString()} \u2192 ${after.toLocaleString()} tokens`);
  return `${counts}${theme.fg("dim", " \xB7 ")}${theme.fg("success", `${percent}% smaller`)}`;
}
function summaryLead(text2) {
  let heading = "";
  for (const raw of (text2 ?? "").split("\n")) {
    const line = raw.replace(/^\s*(?:[#>]+|[*\-+]|\d+\.)\s*/, "").replace(/[*_`]/g, "").trim();
    if (!line) continue;
    if (/^\s*#/.test(raw)) {
      if (!heading) heading = line;
      continue;
    }
    return line;
  }
  return heading;
}
function collapsedLines(theme, rows) {
  return (contentWidth) => rows.filter((row) => row.trim().length > 0).map((row, index) => truncateAnsi(index === 0 ? row : theme.fg("dim", row), contentWidth, "\u2026"));
}
function createMarkdownBody(text2, markdownTheme, theme) {
  const md = new Markdown(text2 || "", 0, 0, markdownTheme, {
    color: (t) => theme.fg("customMessageText", t)
  });
  return (contentWidth) => md.render(contentWidth);
}
function neutralizeMessageBlockBackground(target) {
  if (!target) return;
  if (typeof target.setBgFn === "function") target.setBgFn((text2) => text2);
}
function patchCompaction(instance, _original, theme) {
  const tokensBefore = instance.message?.tokensBefore;
  if (tokensBefore == null) return false;
  if (typeof instance.clear === "function") instance.clear();
  const expanded = Boolean(instance.expanded);
  const summary = typeof instance.message?.summary === "string" ? instance.message.summary : "";
  const markdownTheme = instance.markdownTheme;
  neutralizeMessageBlockBackground(instance);
  const body = expanded && summary && markdownTheme ? createMarkdownBody(summary, markdownTheme, theme) : () => [];
  const before = Number(tokensBefore);
  const tokensAfter = typeof instance.message?.tokensAfter === "number" ? instance.message.tokensAfter : void 0;
  const amount = tokensAfter !== void 0 && before > 0 ? `${compactTokens(before)}\u2192${compactTokens(tokensAfter)}` : `${compactTokens(before)} tokens`;
  const block = renderBoxedMessageBlock(theme, {
    kind: "Compaction",
    title: amount,
    ...expanded ? {} : { right: toolExpandHint() },
    body: expanded ? body : collapsedLines(theme, [compactionStat(theme, before, tokensAfter), summaryLead(summary)]),
    icon: "\u229F",
    hasDivider: expanded
  });
  instance.addChild(block);
  return true;
}
function patchSkill(instance, _original, theme) {
  const skillName = instance.skillBlock?.name;
  if (typeof skillName !== "string" || !skillName) return false;
  if (typeof instance.clear === "function") instance.clear();
  const expanded = Boolean(instance.expanded);
  const content = typeof instance.skillBlock?.content === "string" ? instance.skillBlock.content : "";
  const markdownTheme = instance.markdownTheme;
  neutralizeMessageBlockBackground(instance);
  const body = expanded && content && markdownTheme ? createMarkdownBody(content, markdownTheme, theme) : () => [];
  const block = renderBoxedMessageBlock(theme, {
    kind: "Skill",
    title: skillName,
    ...expanded ? {} : { right: toolExpandHint() },
    body: expanded ? body : collapsedLines(theme, [summaryLead(content)]),
    icon: "\u229F",
    hasDivider: expanded
  });
  instance.addChild(block);
  return true;
}
function patchBranch(instance, _original, theme) {
  if (instance.message == null) return false;
  if (typeof instance.clear === "function") instance.clear();
  const expanded = Boolean(instance.expanded);
  const summary = typeof instance.message?.summary === "string" ? instance.message.summary : "";
  const markdownTheme = instance.markdownTheme;
  neutralizeMessageBlockBackground(instance);
  const body = expanded && summary && markdownTheme ? createMarkdownBody(summary, markdownTheme, theme) : () => [];
  const block = renderBoxedMessageBlock(theme, {
    kind: "Branch",
    ...expanded ? {} : { right: toolExpandHint() },
    body: expanded ? body : collapsedLines(theme, [summaryLead(summary)]),
    icon: "\u2442",
    hasDivider: expanded
  });
  instance.addChild(block);
  return true;
}
function attachCustomMessageBlock(instance, block) {
  if (instance.box && typeof instance.box.clear === "function" && typeof instance.box.addChild === "function") {
    instance.addChild(instance.box);
    instance.box.clear();
    instance.box.addChild(block);
    return true;
  }
  instance.customComponent = block;
  instance.addChild(instance.customComponent);
  return true;
}
function patchCustomMessage(instance, _original, theme) {
  if (instance.customComponent) {
    instance.removeChild(instance.customComponent);
    instance.customComponent = void 0;
  }
  if (instance.box) instance.removeChild(instance.box);
  neutralizeMessageBlockBackground(instance.box);
  neutralizeMessageBlockBackground(instance);
  const rawCustomType = instance.message?.customType;
  const customType = typeof rawCustomType === "string" ? rawCustomType : "Custom";
  if (typeof instance.customRenderer === "function") {
    try {
      const component = instance.customRenderer(
        instance.message,
        { expanded: instance._expanded },
        theme
      );
      if (component && typeof component.render === "function") {
        const block2 = renderBoxedMessageBlock(theme, {
          kind: "Custom",
          title: customType,
          body: (contentWidth) => component.render(contentWidth),
          icon: "\u229F",
          hasDivider: "auto",
          cache: false
        });
        attachCustomMessageBlock(instance, block2);
        return true;
      }
    } catch {
    }
  }
  const rawContent = instance.message?.content;
  let text2;
  if (typeof rawContent === "string") {
    text2 = rawContent;
  } else if (Array.isArray(rawContent)) {
    text2 = rawContent.filter((c) => {
      if (!c || typeof c !== "object") return false;
      return c.type === "text";
    }).map((c) => String(c.text ?? "")).join("\n");
  } else {
    text2 = "";
  }
  const markdownTheme = instance.markdownTheme;
  const body = text2 && markdownTheme ? createMarkdownBody(text2, markdownTheme, theme) : () => [];
  const block = renderBoxedMessageBlock(theme, {
    kind: "Custom",
    title: customType,
    body,
    icon: "\u229F",
    hasDivider: Boolean(text2)
  });
  attachCustomMessageBlock(instance, block);
  return true;
}
function renderSpecialMessageBlock(subtype, original, thisArg, args) {
  const instance = thisArg;
  const base = original;
  const applyBase = () => base.apply(thisArg, args);
  const theme = cachedTheme;
  if (!theme) return applyBase();
  try {
    let handled = false;
    if (subtype === "native-compaction-message") handled = patchCompaction(instance, applyBase, theme);
    else if (subtype === "native-skill-message") handled = patchSkill(instance, applyBase, theme);
    else if (subtype === "native-branch-message") handled = patchBranch(instance, applyBase, theme);
    else if (subtype === "native-custom-message") handled = patchCustomMessage(instance, applyBase, theme);
    return handled ? void 0 : applyBase();
  } catch {
    return applyBase();
  }
}

// extension-src/omp-theme/pi/recent-sessions.ts
import { closeSync, openSync, readdirSync as readdirSync2, readSync, statSync as statSync2 } from "fs";
import { dirname as dirname3, join as join3 } from "path";
var SCAN_LIMIT = 6;
var HEAD_BYTES = 8192;
var MAX_NAME_LENGTH = 72;
function formatAge(fromMs, nowMs) {
  const seconds = Math.max(0, Math.round((nowMs - fromMs) / 1e3));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}
function readHead(path, bytes) {
  const fd = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    let length = 0;
    while (length < bytes) {
      const read = readSync(fd, buffer, length, bytes - length, length);
      if (read === 0) break;
      length += read;
    }
    return buffer.toString("utf8", 0, length);
  } finally {
    closeSync(fd);
  }
}
function titleFrom(head) {
  for (const line of head.split("\n")) {
    if (!line.startsWith("{")) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const message = entry.message;
    if (!message || message.role !== "user") continue;
    const content = message.content;
    const text2 = typeof content === "string" ? content : Array.isArray(content) ? content.filter((part) => part && typeof part === "object" && part.type === "text").map((part) => String(part.text ?? "")).join(" ") : "";
    const first = text2.split("\n").map((value) => value.trim()).find((value) => value.length > 0 && !value.startsWith("<") && !value.startsWith("/"));
    if (first) return first.length > MAX_NAME_LENGTH ? `${first.slice(0, MAX_NAME_LENGTH - 1)}\u2026` : first;
  }
  return void 0;
}
function readRecentSessions(sessionFile, limit, nowMs = Date.now()) {
  if (!sessionFile || limit <= 0) return [];
  try {
    const directory = dirname3(sessionFile);
    const candidates = readdirSync2(directory).filter((name) => name.endsWith(".jsonl") && !sessionFile.endsWith(name)).sort().reverse().slice(0, SCAN_LIMIT).map((name) => {
      const path = join3(directory, name);
      let modified = 0;
      try {
        modified = statSync2(path).mtimeMs;
      } catch {
      }
      return { path, modified };
    }).sort((a, b) => b.modified - a.modified);
    const sessions = [];
    for (const candidate of candidates) {
      if (sessions.length >= limit) break;
      let head = "";
      try {
        head = readHead(candidate.path, HEAD_BYTES);
      } catch {
        continue;
      }
      const title = titleFrom(head);
      if (!title) continue;
      sessions.push({ name: title, timeAgo: formatAge(candidate.modified || nowMs, nowMs) });
    }
    return sessions;
  } catch {
    return [];
  }
}

// extension-src/omp-theme/features/tools/bash-execution.ts
var cachedTheme2;
function setBashExecutionTheme(theme) {
  cachedTheme2 = theme;
}
var TOP_LEFT = "\u256D";
var TOP_RIGHT = "\u256E";
var BOTTOM_LEFT = "\u2570";
var BOTTOM_RIGHT = "\u256F";
function bashTitleColor(theme) {
  const extra = getThemeExtra(theme, "bashPromptColor");
  return extra || "bashMode";
}
function boldOf(theme) {
  return typeof theme?.bold === "function" ? theme.bold : (text2) => text2;
}
function bashBoxTitle(theme, host) {
  const name = "Bash";
  const bold3 = boldOf(theme);
  const prefix = theme.fg(bashTitleColor(theme), `\u276F ${name}`);
  if (host.status === "running") return bold3(`${prefix} ${theme.fg("text", "\u27F3")}`);
  if (host.status === "cancelled") return bold3(theme.fg("warning", `\u276F ${name} \u2718`));
  if (host.status === "error") return bold3(theme.fg("error", `\u276F ${name} \u2718`));
  return bold3(prefix);
}
function bashBoxFooter(theme, host) {
  if (host.status === "running") {
    const elapsed = typeof host.piOmpThemeStart === "number" ? (Date.now() - host.piOmpThemeStart) / 1e3 : void 0;
    return formatBoxedRunningStatus(theme, elapsed);
  }
  if (host.status === "cancelled") return theme.fg("warning", "Cancelled");
  if (host.status === "error") return theme.fg("error", `Exit ${host.exitCode ?? "?"}`);
  return theme.fg("text", "Exit 0");
}
function renderBashExecutionBox(instance, args) {
  const theme = cachedTheme2;
  const width = args[0];
  if (!theme || typeof width !== "number" || !Number.isFinite(width) || width <= 0) return void 0;
  const host = instance;
  const content = host.contentContainer;
  if (!content || typeof content.render !== "function") return void 0;
  try {
    if (host.piOmpThemeStart === void 0) host.piOmpThemeStart = Date.now();
    const renderedWidth = boxWidth(width);
    const inner = boxInnerWidth(renderedWidth);
    const wrapped = content.render(inner).map((line) => boxLine(theme, line.startsWith(" ") ? line.slice(1) : line, renderedWidth));
    return dropOmittedLines([
      "",
      boxLabeledBorder(theme, TOP_LEFT, TOP_RIGHT, bashBoxTitle(theme, host), void 0, renderedWidth),
      boxBlankLine(theme, renderedWidth),
      ...wrapped,
      boxBlankLine(theme, renderedWidth),
      boxLabeledBorder(theme, BOTTOM_LEFT, BOTTOM_RIGHT, bashBoxFooter(theme, host), void 0, renderedWidth)
    ]);
  } catch {
    return void 0;
  }
}

// extension-src/omp-theme/domain/config-authorization.ts
function isTierCAuthorized(input) {
  if (!input.coreFlag || !input.surfaceFlag || !input.config.enabled) return false;
  if (input.surface === "tools") return input.config.tools.enabled;
  if (input.surface === "assistantMessage")
    return input.config.messages.enabled && input.config.messages.assistantPrefix;
  if (input.surface === "specialBlocks") return input.config.messages.enabled && input.config.messages.specialBlocks;
  return input.config.messages.enabled;
}

// extension-src/omp-theme/pi/compatibility-probe.ts
import { readFileSync as readFileSync2 } from "fs";
import { dirname as dirname4, isAbsolute as isAbsolute2, join as join4, resolve as resolve6 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import {
  AssistantMessageComponent,
  BashExecutionComponent,
  BranchSummaryMessageComponent,
  CompactionSummaryMessageComponent,
  CustomMessageComponent,
  InteractiveMode,
  SkillInvocationMessageComponent,
  ToolExecutionComponent
} from "@earendil-works/pi-coding-agent";

// extension-src/omp-theme/features/messages/index.ts
var OSC133_ZONE_START = "\x1B]133;A\x07";
var OSC133_ZONE_END = "\x1B]133;B\x07";
var OSC133_ZONE_FINAL = "\x1B]133;C\x07";
function extractOscEnvelope(line) {
  if (!line.startsWith(OSC133_ZONE_START)) return void 0;
  const bodyEnd = line.indexOf(OSC133_ZONE_END, OSC133_ZONE_START.length);
  if (bodyEnd < 0 || !line.endsWith(OSC133_ZONE_FINAL)) return void 0;
  return { start: OSC133_ZONE_START, body: line.slice(OSC133_ZONE_START.length, bodyEnd), end: line.slice(bodyEnd) };
}
var BG_RESET = "\x1B[49m";
function splitLeadingMarkers(line) {
  let index = 0;
  while (line.startsWith("\x1B]", index)) {
    const bel = line.indexOf("\x07", index + 2);
    const st = line.indexOf("\x1B\\", index + 2);
    const end = bel === -1 ? st : st === -1 ? bel : Math.min(bel, st);
    if (end === -1) break;
    index = end + 1;
  }
  return { head: line.slice(0, index), rest: line.slice(index) };
}
function leadingSgr(line) {
  if (!line.startsWith("\x1B[")) return "";
  let index = 2;
  while (index < line.length) {
    const code = line.charCodeAt(index);
    if (code >= 64 && code <= 126) return line.slice(0, index + 1);
    index++;
  }
  return "";
}
function isBackgroundSgr(sequence) {
  if (!sequence.startsWith("\x1B[") || !sequence.endsWith("m")) return false;
  for (const code of sequence.slice(2, -1).split(";")) {
    const value = Number(code);
    if (value === 48 || value === 49) return true;
    if (value >= 40 && value <= 47) return true;
    if (value >= 100 && value <= 107) return true;
  }
  return false;
}
function rebuildAtWidth(line, width, lead) {
  const { head, rest } = splitLeadingMarkers(line);
  const bgAnsi = leadingSgr(rest);
  if (bgAnsi && isBackgroundSgr(bgAnsi) && rest.endsWith(BG_RESET)) {
    const body = rest.slice(bgAnsi.length, rest.length - BG_RESET.length);
    const pad2 = " ".repeat(Math.max(0, width - safeVisibleWidth(lead) - safeVisibleWidth(body)));
    return `${head}${bgAnsi}${lead}${body}${pad2}${BG_RESET}`;
  }
  const padded = `${lead}${line}`;
  return `${padded}${" ".repeat(Math.max(0, width - safeVisibleWidth(padded)))}`;
}
function decorateMessageLine(line, index, lastIndex, contentIndex, width, options) {
  const { firstEnvelope, firstHasStart, multilineEnvelope, prefix } = options;
  const prefixWidth = safeVisibleWidth(prefix);
  const lead = index === contentIndex ? prefix : index > contentIndex ? " ".repeat(prefixWidth) : "";
  if (index === contentIndex && firstEnvelope)
    return `${firstEnvelope.start}${rebuildAtWidth(firstEnvelope.body, width, prefix)}${firstEnvelope.end}`;
  if (index === contentIndex && firstHasStart)
    return `${OSC133_ZONE_START}${rebuildAtWidth(line.slice(OSC133_ZONE_START.length), width, prefix)}`;
  if (index === lastIndex && multilineEnvelope && index !== contentIndex)
    return `${OSC133_ZONE_END}${OSC133_ZONE_FINAL}${rebuildAtWidth(
      line.slice((OSC133_ZONE_END + OSC133_ZONE_FINAL).length),
      width,
      lead
    )}`;
  if (index === contentIndex && index === lastIndex && multilineEnvelope && line.startsWith(OSC133_ZONE_END + OSC133_ZONE_FINAL))
    return `${OSC133_ZONE_END}${OSC133_ZONE_FINAL}${rebuildAtWidth(
      line.slice((OSC133_ZONE_END + OSC133_ZONE_FINAL).length),
      width,
      prefix
    )}`;
  return rebuildAtWidth(line, width, lead);
}
function contentText(line) {
  let output = "";
  for (let index = 0; index < line.length; index++) {
    if (line.charCodeAt(index) !== 27) {
      output += line[index];
      continue;
    }
    const next = line[index + 1];
    if (next === "]") {
      index += 2;
      while (index < line.length && line.charCodeAt(index) !== 7) index++;
      continue;
    }
    if (next === "[") {
      index += 2;
      while (index < line.length && (line.charCodeAt(index) < 64 || line.charCodeAt(index) > 126)) index++;
    }
  }
  return output.replaceAll(OSC133_ZONE_START, "").replaceAll(OSC133_ZONE_END, "").replaceAll(OSC133_ZONE_FINAL, "");
}
function hasContent(line) {
  return [...contentText(line)].some((character) => !/\s/u.test(character));
}
function prefixNative(lines, width, prefix) {
  if (!Array.isArray(lines) || lines.length === 0 || !lines.every((line) => typeof line === "string")) return void 0;
  const nativeLines = lines;
  const prefixWidth = safeVisibleWidth(prefix);
  if (width <= prefixWidth) return void 0;
  const bodyWidth = width - prefixWidth;
  const first = nativeLines[0] ?? "";
  const last = nativeLines.at(-1) ?? "";
  const multilineEnvelope = nativeLines.length > 1 && last.startsWith(OSC133_ZONE_END + OSC133_ZONE_FINAL);
  const firstContentIndex = nativeLines.findIndex((line, index) => {
    if (index !== nativeLines.length - 1 || !multilineEnvelope) return hasContent(line);
    return !nativeLines.slice(0, index).some((earlier) => hasContent(earlier)) && hasContent(line);
  });
  if (firstContentIndex < 0) return nativeLines;
  const firstEnvelope = firstContentIndex === 0 ? extractOscEnvelope(first) : void 0;
  const firstHasStart = firstContentIndex === 0 && first.startsWith(OSC133_ZONE_START);
  const decorated = nativeLines.map(
    (line, index) => decorateMessageLine(line, index, nativeLines.length - 1, firstContentIndex, width, {
      firstEnvelope,
      firstHasStart,
      multilineEnvelope,
      prefix
    })
  );
  if (!decorated.every((line) => safeVisibleWidth(line) <= width)) return void 0;
  if (!nativeLines.every((line) => safeVisibleWidth(line) <= bodyWidth)) return void 0;
  return decorated;
}
function decorateMessageRender(original, instance, args, snapshot = {
  assistantPrefix: "\u2502 ",
  assistantEnabled: true,
  collapseHiddenThinking: false,
  hideInterimText: false
}) {
  if (typeof original !== "function") return void 0;
  const width = typeof args[0] === "number" ? args[0] : 0;
  const prefix = snapshot.assistantPrefix;
  if (!snapshot.assistantEnabled) return Reflect.apply(original, instance, args);
  if (width <= safeVisibleWidth(prefix)) return Reflect.apply(original, instance, args);
  const reducedWidth = width - safeVisibleWidth(prefix);
  const native = Reflect.apply(original, instance, [reducedWidth, ...args.slice(1)]);
  return prefixNative(native, width, prefix) ?? native;
}
function isSpacerChild(child) {
  return typeof child?.setLines === "function";
}
function isInterimTextChild(child) {
  const candidate = child;
  return typeof candidate?.setText === "function" && candidate.options !== void 0 && typeof candidate.options === "object" && candidate.defaultTextStyle === void 0;
}
function hasToolCallItems(message) {
  if (!message || typeof message !== "object") return false;
  const content = message.content;
  return Array.isArray(content) && content.some(
    (item) => item !== null && typeof item === "object" && item.type === "toolCall"
  );
}
function unwrapPresentationChild(child) {
  let current = child;
  for (let depth = 0; depth < 4; depth++) {
    if (!current || typeof current !== "object") break;
    const nested = current.child;
    if (nested === void 0 || nested === current) break;
    current = nested;
  }
  return current;
}
function isBlankTextChild(child) {
  const candidate = unwrapPresentationChild(child);
  if (typeof candidate?.setCustomBgFn !== "function" || typeof candidate.render !== "function") return false;
  return contentText(candidate.render(0).join("\n")).trim() === "";
}
function decorateMessageUpdate(original, instance, args, snapshot = {
  assistantPrefix: "\u2502 ",
  assistantEnabled: true,
  collapseHiddenThinking: false,
  hideInterimText: false
}) {
  if (typeof original !== "function") return void 0;
  const result = Reflect.apply(original, instance, args);
  const target = instance;
  if (snapshot.collapseHiddenThinking && target.hideThinkingBlock === true && target.hiddenThinkingLabel === "") {
    const children = target.contentContainer?.children;
    if (children) {
      for (let index = children.length - 1; index >= 0; index--) {
        if (!isBlankTextChild(children[index])) continue;
        children.splice(index, 1);
        if (isSpacerChild(children[index])) children.splice(index, 1);
      }
    }
  }
  if (snapshot.hideInterimText && hasToolCallItems(args[0])) {
    const children = target.contentContainer?.children;
    if (children) {
      for (let index = children.length - 1; index >= 0; index--) {
        if (isInterimTextChild(children[index])) children.splice(index, 1);
      }
      if (children.every((child) => isSpacerChild(child))) children.length = 0;
    }
  }
  return result;
}

// extension-src/omp-theme/features/messages/markdown-highlight-cache.ts
var MAX_ENTRIES = 256;
var cache = /* @__PURE__ */ new Map();
var cachedFor;
function memoize(native, owner) {
  return (code, lang) => {
    if (cachedFor !== owner) {
      cache.clear();
      cachedFor = owner;
    }
    const key = `${lang ?? ""}\0${code}`;
    const hit = cache.get(key);
    if (hit) {
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
    const value = native(code, lang);
    cache.set(key, value);
    if (cache.size > MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== void 0) cache.delete(oldest);
    }
    return value;
  };
}
function withCachedHighlight(theme) {
  if (!theme || typeof theme !== "object") return theme;
  const candidate = theme;
  const native = candidate.highlightCode;
  if (typeof native !== "function") return theme;
  return { ...candidate, highlightCode: memoize(native.bind(candidate), native) };
}

// extension-src/omp-theme/pi/compatibility-registry.ts
var recordsByOwner = /* @__PURE__ */ new WeakMap();
var generation = 0;
var registryTestHooks = {};
function ownerRecords(owner) {
  let records = recordsByOwner.get(owner);
  if (!records) {
    records = /* @__PURE__ */ new Map();
    recordsByOwner.set(owner, records);
  }
  return records;
}
function currentGeneration() {
  return generation;
}
function nextGeneration() {
  return ++generation;
}
function safeRead(target, method) {
  try {
    return Reflect.get(target, method);
  } catch {
    return void 0;
  }
}
function skippedRecord(options) {
  return {
    ...options,
    owner: options.target,
    originalIdentity: Object.hasOwn(options, "originalIdentity") ? options.originalIdentity : safeRead(options.target, options.method),
    disposed: true,
    disposer: () => {
    }
  };
}
function descriptorMatches(actual, expected) {
  if (!actual || !expected) return actual === expected;
  return actual.value === expected.value && actual.get === expected.get && actual.set === expected.set && actual.writable === expected.writable && actual.enumerable === expected.enumerable && actual.configurable === expected.configurable;
}
function restoreExact(record3) {
  try {
    const current = Object.getOwnPropertyDescriptor(record3.target, record3.method);
    const installed = current?.value === record3.installedIdentity;
    if (!installed) return { ok: false, diagnostic: "current owner changed; native/later owner preserved" };
    const defineProperty = registryTestHooks.defineProperty ?? Reflect.defineProperty;
    const wrote = record3.originalDescriptor ? defineProperty(record3.target, record3.method, record3.originalDescriptor) : Reflect.deleteProperty(record3.target, record3.method);
    if (!wrote) return { ok: false, diagnostic: "exact descriptor restoration was rejected" };
    if (!descriptorMatches(Object.getOwnPropertyDescriptor(record3.target, record3.method), record3.originalDescriptor))
      return { ok: false, diagnostic: "post-restore descriptor validation failed" };
    return { ok: true };
  } catch (error) {
    return { ok: false, diagnostic: `restore failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}
function inspectCurrent(target, method) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(target, method);
    return {
      current: descriptor && "value" in descriptor ? descriptor.value : void 0,
      ...descriptor ? { descriptor } : {}
    };
  } catch (error) {
    return { error: `cannot inspect target: ${error instanceof Error ? error.message : String(error)}` };
  }
}
function skippedResult(options, shape2, reason, originalIdentity) {
  return {
    status: "skipped",
    reason,
    record: skippedRecord({ ...options, shape: shape2, diagnostic: reason, originalIdentity })
  };
}
function expectedIdentityMatches(options, current) {
  const expected = options.hasExpectedIdentity === true || options.hasExpectedIdentity === void 0 && options.expectedIdentity !== void 0;
  return !expected || current === options.expectedIdentity;
}
function validateInstall(options, current, existing, ownDescriptor) {
  if (!options.shape) return skippedResult(options, "unsupported", options.diagnostic ?? "unsupported shape", current);
  const conflict = existing && activeConflict(existing, current, options.generation);
  if (conflict) return conflict;
  if (options.kind === "add-method") {
    if (current !== void 0 || ownDescriptor !== void 0)
      return skippedResult(options, "conflict", "target already owns the additive method", current);
    return void 0;
  }
  if (typeof current !== "function")
    return skippedResult(
      options,
      ownDescriptor ? "unsupported" : "skipped",
      "target property is not callable",
      current
    );
  if (!expectedIdentityMatches(options, current))
    return skippedResult(options, "conflict", "current owner is not the captured pristine native identity", current);
  return void 0;
}
function activeConflict(existing, current, generation2) {
  if (existing.disposed) return void 0;
  if (existing.installedIdentity === current && existing.generation === generation2)
    return { status: "already-installed", record: existing };
  const reason = existing.installedIdentity === current ? "active wrapper belongs to a different generation" : "owner changed after pi-omp-theme installation";
  return {
    status: "skipped",
    reason,
    record: skippedRecord({
      feature: existing.feature,
      subtype: existing.subtype,
      target: existing.target,
      method: existing.method,
      piVersion: existing.piVersion,
      compatibilityBasis: existing.compatibilityBasis,
      shape: "conflict",
      diagnostic: reason,
      generation: generation2,
      originalIdentity: current
    })
  };
}
function installDelegatingPatch(options) {
  const { target, method } = options;
  const inspection = inspectCurrent(target, method);
  if (inspection.error) return skippedResult(options, "skipped", inspection.error);
  const current = inspection.current;
  const records = ownerRecords(target);
  const validation = validateInstall(options, current, records.get(method), inspection.descriptor);
  if (validation) return validation;
  const originalDescriptor = Object.getOwnPropertyDescriptor(target, method);
  const originalIdentity = options.kind === "add-method" ? options.expectedIdentity : current;
  let active = true;
  const installed = function(...args) {
    if (!active) return Reflect.apply(originalIdentity, this, args);
    return options.delegate(originalIdentity, this, args);
  };
  const record3 = {
    feature: options.feature,
    subtype: options.subtype,
    target,
    owner: target,
    method,
    originalIdentity,
    ...originalDescriptor ? { originalDescriptor } : {},
    installedIdentity: installed,
    piVersion: options.piVersion,
    compatibilityBasis: options.compatibilityBasis,
    shape: "installed",
    diagnostic: options.diagnostic,
    generation: options.generation,
    disposed: false,
    disposer: () => {
    }
  };
  try {
    Object.defineProperty(installed, "__piOmpThemeCompatibilityRecord", { value: record3, configurable: false });
    const descriptor = originalDescriptor ? { ...originalDescriptor, value: installed } : { value: installed, writable: true, enumerable: false, configurable: true };
    const wrote = Reflect.defineProperty(target, method, descriptor);
    registryTestHooks.afterWrite?.();
    const currentDescriptor = Object.getOwnPropertyDescriptor(target, method);
    if (!wrote) return skippedResult(options, "skipped", "installation write was rejected");
    if (!descriptorMatches(currentDescriptor, descriptor)) {
      if (currentDescriptor?.value === installed) {
        const rollback = restoreExact({ ...record3, installedIdentity: installed });
        if (!rollback.ok) {
          record3.diagnostic = rollback.diagnostic;
          records.set(method, record3);
          return { status: "skipped", reason: rollback.diagnostic, record: record3 };
        }
      }
      const reason = currentDescriptor?.value === installed ? "wrapper-owned descriptor mismatch rolled back" : "later owner preserved after post-write mismatch";
      return {
        status: "skipped",
        reason,
        record: skippedRecord({
          ...options,
          shape: "conflict",
          diagnostic: reason,
          originalIdentity: currentDescriptor?.value
        })
      };
    }
    records.set(method, record3);
    record3.disposer = () => {
      if (record3.disposed) return;
      const restored = restoreExact(record3);
      if (!restored.ok) {
        record3.diagnostic = restored.diagnostic;
        return;
      }
      active = false;
      record3.disposed = true;
      records.delete(method);
    };
    return { status: "installed", record: record3 };
  } catch (error) {
    const currentDescriptor = Object.getOwnPropertyDescriptor(target, method);
    const rollback = currentDescriptor?.value === installed ? restoreExact({ ...record3, installedIdentity: installed }) : { ok: true };
    const reason = `installation rolled back (${rollback.diagnostic ?? "ok"}): ${error instanceof Error ? error.message : String(error)}`;
    if (currentDescriptor?.value === installed && !rollback.ok) {
      record3.diagnostic = reason;
      records.set(method, record3);
      record3.disposer = () => {
        if (record3.disposed) return;
        const retry = restoreExact(record3);
        if (!retry.ok) {
          record3.diagnostic = retry.diagnostic;
          return;
        }
        active = false;
        record3.disposed = true;
        records.delete(method);
      };
      return { status: "installed", reason, record: record3 };
    }
    return { status: "skipped", reason, record: skippedRecord({ ...options, shape: "skipped", diagnostic: reason }) };
  }
}

// extension-src/omp-theme/pi/compatibility-probe.ts
var COMPATIBILITY_BASIS = "runtime-identity";
var KNOWN_NATIVE_IDENTITIES = Object.freeze({
  "native-markdown-theme:getMarkdownThemeWithSettings": Object.freeze([
    Object.freeze({
      name: "getMarkdownThemeWithSettings",
      arity: 0,
      fingerprint: "5f63d168"
    }),
    Object.freeze({
      name: "getMarkdownThemeWithSettings",
      arity: 0,
      fingerprint: "e177a5a7",
      sourceMarkers: Object.freeze(["getMarkdownTheme()", "codeBlockIndent", "getCodeBlockIndent"])
    })
  ]),
  "native-assistant-message:render": Object.freeze([
    Object.freeze({
      name: "render",
      arity: 1,
      fingerprint: "2a39243f"
    }),
    Object.freeze({
      name: "render",
      arity: 1,
      fingerprint: "a9be09a3",
      sourceMarkers: Object.freeze(["hasToolCalls", "OSC133_ZONE_START", "OSC133_ZONE_END", "OSC133_ZONE_FINAL"])
    })
  ]),
  "native-assistant-message:updateContent": Object.freeze([
    Object.freeze({
      name: "updateContent",
      arity: 1,
      fingerprint: "4a2f15ff"
    }),
    // This identity records the later implementation shape; default parameters
    // do not count toward Function.length, so the arity remains 1.
    Object.freeze({
      name: "updateContent",
      arity: 1,
      fingerprint: "d2114491"
    }),
    Object.freeze({
      name: "updateContent",
      arity: 1,
      fingerprint: "356b7e83",
      sourceMarkers: Object.freeze([
        "isStreaming",
        "contentContainer",
        "createMarkdownTransform",
        "thinkingText",
        "hideThinkingBlock"
      ])
    }),
    // Pi 0.85.0 keeps the same streaming/thinking contract in its modular
    // runtime but wraps thinking blocks in MouseRegion for click-to-toggle.
    Object.freeze({
      name: "updateContent",
      arity: 1,
      fingerprint: "80e338d2"
    })
  ]),
  "native-compaction-message:updateDisplay": Object.freeze([
    Object.freeze({
      name: "updateDisplay",
      arity: 0,
      fingerprint: "f8c44e78"
    }),
    Object.freeze({
      name: "updateDisplay",
      arity: 0,
      fingerprint: "5118a51d",
      sourceMarkers: Object.freeze(["Compacted from", "customMessageLabel", "customMessageText"])
    })
  ]),
  "native-branch-message:updateDisplay": Object.freeze([
    Object.freeze({
      name: "updateDisplay",
      arity: 0,
      fingerprint: "415d57b7"
    }),
    Object.freeze({
      name: "updateDisplay",
      arity: 0,
      fingerprint: "2185274e",
      sourceMarkers: Object.freeze(["Branch Summary", "customMessageLabel", "customMessageText"])
    })
  ]),
  "native-skill-message:updateDisplay": Object.freeze([
    Object.freeze({
      name: "updateDisplay",
      arity: 0,
      fingerprint: "48099ea6"
    }),
    Object.freeze({
      name: "updateDisplay",
      arity: 0,
      fingerprint: "4051fd65",
      sourceMarkers: Object.freeze(["skillBlock", "customMessageLabel", "customMessageText"])
    })
  ]),
  "native-custom-message:rebuild": Object.freeze([
    Object.freeze({
      name: "rebuild",
      arity: 0,
      fingerprint: "76ae2e3a"
    }),
    Object.freeze({
      name: "rebuild",
      arity: 0,
      fingerprint: "b89987cc",
      sourceMarkers: Object.freeze(["customRenderer", "customComponent", "customMessageLabel", "customMessageText"])
    })
  ]),
  "tool-call-renderer:getCallRenderer": Object.freeze([
    Object.freeze({
      name: "getCallRenderer",
      arity: 0,
      fingerprint: "951ea0e0"
    }),
    Object.freeze({
      name: "getCallRenderer",
      arity: 0,
      fingerprint: "e50613b7",
      sourceMarkers: Object.freeze(["builtInToolDefinition", "renderCall", "toolDefinition"])
    }),
    // Pi 0.85.0 moved built-in renderer lookup to InteractiveMode and leaves
    // this selector responsible only for the definition passed by the host.
    Object.freeze({
      name: "getCallRenderer",
      arity: 0,
      fingerprint: "e0a9ed86"
    }),
    Object.freeze({
      name: "getCallRenderer",
      arity: 0,
      fingerprint: "73116365",
      sourceMarkers: Object.freeze(["toolDefinition", "renderCall"])
    })
  ]),
  "tool-result-renderer:getResultRenderer": Object.freeze([
    Object.freeze({
      name: "getResultRenderer",
      arity: 0,
      fingerprint: "8a25cd71"
    }),
    Object.freeze({
      name: "getResultRenderer",
      arity: 0,
      fingerprint: "28c4dc22",
      sourceMarkers: Object.freeze(["builtInToolDefinition", "renderResult", "toolDefinition"])
    }),
    // Pi 0.85.0 uses the same definition hand-off for result renderers.
    Object.freeze({
      name: "getResultRenderer",
      arity: 0,
      fingerprint: "1567dcf4"
    }),
    Object.freeze({
      name: "getResultRenderer",
      arity: 0,
      fingerprint: "d613a2a3",
      sourceMarkers: Object.freeze(["toolDefinition", "renderResult"])
    })
  ]),
  "native-bash-execution:render": Object.freeze([
    Object.freeze({
      // The additive render patch is certified by the class constructor identity
      // (name/arity/source fingerprint): the class defines no own `render`, so
      // the installed own method is the only one and the inherited Container
      // render is the native fallback.
      name: "BashExecutionComponent",
      arity: 2,
      fingerprint: "a5b5abca"
    }),
    Object.freeze({
      name: "BashExecutionComponent",
      arity: 2,
      fingerprint: "98d22d96",
      sourceMarkers: Object.freeze(["outputLines", "contentContainer", "Running...", "setComplete", "appendOutput"])
    })
  ])
});
var TRUSTED_NATIVE_FINGERPRINTS = Object.freeze(
  Object.fromEntries(
    Object.entries(KNOWN_NATIVE_IDENTITIES).map(([key, identities]) => [key, identities[0].fingerprint])
  )
);
function fingerprint(value) {
  if (typeof value !== "function") return void 0;
  let hash = 2166136261;
  for (const character of Function.prototype.toString.call(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
function isBundledPiRuntime() {
  if (process.env.PI_CODING_AGENT !== "true" && process.env.AI_AGENT !== "pi") return false;
  const argv1 = process.argv[1];
  return typeof argv1 === "string" && argv1.length > 0 && isAbsolute2(argv1) && /[\\/]dist[\\/]bundle[\\/]/i.test(resolve6(argv1));
}
function matchesSourceMarkers(value, markers) {
  if (!markers || markers.length === 0) return false;
  const source = Function.prototype.toString.call(value);
  return markers.every((marker2) => source.includes(marker2));
}
function matchKnownNativeIdentity(key, value, options = {}) {
  if (typeof value !== "function") return void 0;
  const hash = fingerprint(value);
  const bundledRuntime = options.bundledRuntime ?? isBundledPiRuntime();
  return (KNOWN_NATIVE_IDENTITIES[key] ?? []).find(
    (identity) => value.name === identity.name && value.length === identity.arity && (hash === identity.fingerprint || bundledRuntime && matchesSourceMarkers(value, identity.sourceMarkers))
  );
}
function knownIdentityMatches(spec, value) {
  return matchKnownNativeIdentity(`${spec.subtype}:${spec.method}`, value);
}
function matchedNativeIdentity(spec) {
  if (spec.kind === "add-method") {
    if (Object.getOwnPropertyDescriptor(spec.target, spec.method)) return void 0;
    const ctor = Object.getOwnPropertyDescriptor(spec.target, "constructor")?.value;
    return knownIdentityMatches(spec, ctor);
  }
  const descriptor = Object.getOwnPropertyDescriptor(spec.target, spec.method);
  if (descriptor?.writable !== true || descriptor.configurable !== true) return void 0;
  return knownIdentityMatches(spec, descriptor.value);
}
function trustedNativeIdentity(spec) {
  const identity = matchedNativeIdentity(spec);
  if (!identity) return void 0;
  if (spec.kind === "add-method") {
    const inherited = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(spec.target), spec.method)?.value;
    return typeof inherited === "function" ? inherited : void 0;
  }
  return Object.getOwnPropertyDescriptor(spec.target, spec.method)?.value;
}
function detectPiVersionFromHostProcess(readFile2) {
  if (process.env.PI_CODING_AGENT !== "true" && process.env.AI_AGENT !== "pi") return void 0;
  const argv1 = process.argv[1];
  if (typeof argv1 !== "string" || argv1.length === 0 || !isAbsolute2(argv1)) return void 0;
  let directory = dirname4(resolve6(argv1));
  for (; ; ) {
    try {
      const packageJson = JSON.parse(readFile2(join4(directory, "package.json")));
      if (packageJson.name === "@earendil-works/pi-coding-agent" && typeof packageJson.version === "string") {
        return packageJson.version;
      }
    } catch {
    }
    const parent = dirname4(directory);
    if (parent === directory) return void 0;
    directory = parent;
  }
}
function detectPiVersion(resolution = {}) {
  const readFile2 = resolution.readFile ?? ((path) => readFileSync2(path, "utf8"));
  const hostProcessVersion = detectPiVersionFromHostProcess(readFile2);
  if (hostProcessVersion) return { version: hostProcessVersion };
  const resolvePackageEntry = resolution.resolvePackageEntry ?? ((name) => {
    try {
      return fileURLToPath2(new URL(import.meta.resolve(name)));
    } catch (error) {
      throw new Error(
        `public package entry resolution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
  try {
    const entry = resolvePackageEntry("@earendil-works/pi-coding-agent");
    let directory = dirname4(entry);
    for (; ; ) {
      const packagePath = join4(directory, "package.json");
      try {
        const packageJson = JSON.parse(readFile2(packagePath));
        if (packageJson.name === "@earendil-works/pi-coding-agent" && typeof packageJson.version === "string")
          return { version: packageJson.version };
      } catch {
      }
      const parent = dirname4(directory);
      if (parent === directory) break;
      directory = parent;
    }
    return { version: void 0, diagnostic: "Pi package version was not found" };
  } catch (error) {
    return {
      version: void 0,
      diagnostic: `Pi package version detection failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
function descriptorSnapshot(descriptor) {
  if (!descriptor) return void 0;
  return Object.freeze(
    "value" in descriptor ? {
      kind: "data",
      value: descriptor.value,
      writable: descriptor.writable === true,
      enumerable: descriptor.enumerable === true,
      configurable: descriptor.configurable === true
    } : {
      kind: "accessor",
      get: descriptor.get,
      set: descriptor.set,
      enumerable: descriptor.enumerable === true,
      configurable: descriptor.configurable === true
    }
  );
}
function certificationRecord(spec, attemptedVersion, matchedIdentity, evidence = Object.getOwnPropertyDescriptor(spec.target, spec.method)) {
  const descriptor = evidence;
  const value = descriptor?.value;
  return {
    attemptedVersion: attemptedVersion ?? "unknown",
    matchedIdentity,
    knownIdentities: KNOWN_NATIVE_IDENTITIES[`${spec.subtype}:${spec.method}`] ?? [],
    feature: spec.feature,
    subtype: spec.subtype,
    target: spec.target,
    method: spec.method,
    descriptor: descriptorSnapshot(descriptor),
    name: typeof value === "function" ? value.name : void 0,
    arity: typeof value === "function" ? value.length : void 0,
    fingerprint: fingerprint(value),
    adapterId: spec.adapterId,
    status: spec.status,
    ...spec.fallbackReason ? { fallbackReason: spec.fallbackReason } : {}
  };
}
function shape(spec) {
  const descriptor = Object.getOwnPropertyDescriptor(spec.target, spec.method);
  if (spec.kind === "add-method") return descriptor === void 0;
  return typeof descriptor?.value === "function" && descriptor.writable === true && descriptor.configurable === true;
}
function isSpecialBlock(spec) {
  return spec.feature === "messages" && spec.status === "certified" && spec.adapterId === "message-block-boxed-v1";
}
function createFallbackRecord(spec, piVersion, generation2, reason) {
  return {
    feature: spec.feature,
    subtype: spec.subtype,
    target: spec.target,
    owner: spec.target,
    method: spec.method,
    originalIdentity: Reflect.get(spec.target, spec.method),
    piVersion: piVersion ?? "unknown",
    compatibilityBasis: COMPATIBILITY_BASIS,
    shape: "unsupported",
    diagnostic: reason,
    generation: generation2,
    disposed: true,
    disposer: () => {
    }
  };
}
function probeDiagnostic(spec, identity) {
  if (!shape(spec)) return "target method shape is not an own writable/configurable function";
  if (identity === void 0)
    return "runtime native identity (name, arity, fingerprint, or bundled source markers) matched no recorded Pi surface";
  return "recorded native identity verified; certified guarded decoration enabled";
}
function surfaceDisabled(spec, config) {
  if (!config) return false;
  if (spec.subtype === "native-markdown-theme") return config.theme?.cacheHighlight === false;
  if (spec.feature === "tools") return !config.tools.enabled;
  if (!config.messages.enabled) return true;
  if (spec.subtype === "native-assistant-message" && spec.method === "render") return !config.messages.assistantPrefix;
  if (spec.subtype === "native-assistant-message" && spec.method === "updateContent")
    return !config.messages.hideThinkingLabel && !config.messages.hideInterimText;
  if (isSpecialBlock(spec)) return !config.messages.specialBlocks;
  return true;
}
function probeSpec(options) {
  const { spec, piVersion, generation: generation2, markers, config, toolOwner, messageSnapshot } = options;
  const identity = trustedNativeIdentity(spec);
  const diagnostic = probeDiagnostic(spec, identity);
  const disabled = surfaceDisabled(spec, config);
  if (disabled) {
    const reason = "native fallback: surface disabled by normalized configuration";
    return {
      record: createFallbackRecord(spec, piVersion, generation2, reason),
      reason,
      fallback: true,
      fallbackCause: "disabled"
    };
  }
  const compatible = identity !== void 0 && shape(spec);
  const result = installDelegatingPatch({
    feature: spec.feature,
    subtype: spec.subtype,
    target: spec.target,
    method: spec.method,
    piVersion: piVersion ?? "unknown",
    compatibilityBasis: COMPATIBILITY_BASIS,
    shape: compatible,
    generation: generation2,
    expectedIdentity: identity,
    hasExpectedIdentity: true,
    diagnostic,
    ...spec.kind ? { kind: spec.kind } : {},
    delegate: (original, target, args) => {
      markers.add(`${spec.subtype}:delegated`);
      if (spec.subtype === "native-bash-execution")
        return renderBashExecutionBox(target, args) ?? Reflect.apply(original, target, args);
      if (spec.feature === "tools")
        return toolOwner?.decorateToolRendererSelection(
          spec.subtype,
          original,
          target,
          args
        ) ?? Reflect.apply(original, target, args);
      if (spec.subtype === "native-markdown-theme")
        return withCachedHighlight(Reflect.apply(original, target, args));
      if (spec.subtype === "native-assistant-message") {
        if (spec.method === "updateContent") return decorateMessageUpdate(original, target, args, messageSnapshot);
        return decorateMessageRender(original, target, args, messageSnapshot);
      }
      return renderSpecialMessageBlock(spec.subtype, original, target, args);
    }
  });
  const fallback = result.status === "skipped";
  const fallbackCause = fallback ? !compatible ? "incompatible" : result.record.shape === "conflict" ? "conflict" : "installation" : void 0;
  return {
    record: result.record,
    reason: result.reason ?? result.record.diagnostic ?? "skipped",
    fallback,
    ...fallbackCause ? { fallbackCause } : {}
  };
}
var targetSpecs = [
  {
    feature: "messages",
    subtype: "native-markdown-theme",
    target: InteractiveMode.prototype,
    method: "getMarkdownThemeWithSettings",
    adapterId: "markdown-highlight-cache-v1",
    status: "certified"
  },
  {
    feature: "messages",
    subtype: "native-assistant-message",
    target: AssistantMessageComponent.prototype,
    method: "render",
    adapterId: "message-prefix-osc133-v1",
    status: "certified"
  },
  {
    feature: "messages",
    subtype: "native-assistant-message",
    target: AssistantMessageComponent.prototype,
    method: "updateContent",
    adapterId: "message-thinking-collapse-v1",
    status: "certified"
  },
  {
    feature: "messages",
    subtype: "native-compaction-message",
    target: CompactionSummaryMessageComponent.prototype,
    method: "updateDisplay",
    adapterId: "message-block-boxed-v1",
    status: "certified"
  },
  {
    feature: "messages",
    subtype: "native-branch-message",
    target: BranchSummaryMessageComponent.prototype,
    method: "updateDisplay",
    adapterId: "message-block-boxed-v1",
    status: "certified"
  },
  {
    feature: "messages",
    subtype: "native-skill-message",
    target: SkillInvocationMessageComponent.prototype,
    method: "updateDisplay",
    adapterId: "message-block-boxed-v1",
    status: "certified"
  },
  {
    feature: "messages",
    subtype: "native-custom-message",
    target: CustomMessageComponent.prototype,
    method: "rebuild",
    adapterId: "message-block-boxed-v1",
    status: "certified"
  },
  {
    feature: "tools",
    subtype: "tool-call-renderer",
    target: ToolExecutionComponent.prototype,
    method: "getCallRenderer",
    adapterId: "tool-renderer-component-v1",
    status: "certified"
  },
  {
    feature: "tools",
    subtype: "tool-result-renderer",
    target: ToolExecutionComponent.prototype,
    method: "getResultRenderer",
    adapterId: "tool-renderer-component-v1",
    status: "certified"
  },
  {
    feature: "tools",
    subtype: "native-bash-execution",
    target: BashExecutionComponent.prototype,
    method: "render",
    kind: "add-method",
    identityName: "BashExecutionComponent",
    arity: 2,
    adapterId: "bash-execution-box-v1",
    status: "certified"
  }
];
var reportStates = /* @__PURE__ */ new WeakMap();
function probePiCompatibility(piVersion, options = /* @__PURE__ */ new Set()) {
  const markers = options instanceof Set ? options : options.markers ?? /* @__PURE__ */ new Set();
  const generation2 = nextGeneration();
  const toolSpecs = targetSpecs.filter((spec) => spec.feature === "tools");
  let toolOwner;
  if (toolSpecs.some((spec) => trustedNativeIdentity(spec) !== void 0) && (options instanceof Set || options.config?.tools.enabled !== false)) {
    toolOwner = createToolDecorationOwner(options instanceof Set ? {} : options.toolSnapshot);
  }
  const evidence = Object.freeze(
    targetSpecs.map(
      (spec) => Object.freeze({
        subtype: spec.subtype,
        method: spec.method,
        target: spec.target,
        descriptor: Object.getOwnPropertyDescriptor(spec.target, spec.method),
        value: Object.getOwnPropertyDescriptor(spec.target, spec.method)?.value
      })
    )
  );
  const evidenceByKey = new Map(evidence.map((item) => [`${item.subtype}:${String(item.method)}`, item]));
  const records = [];
  const unsupported = [];
  const certification = [];
  for (const spec of targetSpecs) {
    const captured = evidenceByKey.get(`${spec.subtype}:${String(spec.method)}`);
    const preinstallDescriptor = captured?.descriptor;
    const matchedIdentity = matchedNativeIdentity(spec);
    const result = probeSpec({
      messageSnapshot: options instanceof Set ? void 0 : options.messageSnapshot,
      spec,
      piVersion,
      generation: generation2,
      markers,
      config: options instanceof Set ? void 0 : options.config,
      toolOwner
    });
    records.push(result.record);
    const certificate = certificationRecord(spec, piVersion, matchedIdentity, preinstallDescriptor);
    certification.push({
      ...certificate,
      attemptedVersion: piVersion ?? "unknown",
      actualPreinstall: descriptorSnapshot(preinstallDescriptor),
      status: result.fallback ? "native-fallback" : "certified",
      ...result.fallback ? { fallbackReason: result.reason } : {}
    });
    if (result.fallback)
      unsupported.push({
        subtype: spec.subtype,
        method: spec.method,
        reason: result.reason,
        cause: result.fallbackCause ?? "installation"
      });
  }
  const report = {
    attemptedVersion: piVersion ?? "unknown",
    piVersion: piVersion ?? "unknown",
    compatibilityBasis: COMPATIBILITY_BASIS,
    generation: currentGeneration(),
    recordSnapshots: Object.freeze(
      records.map(
        (record3) => Object.freeze({
          feature: record3.feature,
          subtype: record3.subtype,
          method: record3.method,
          shape: record3.shape,
          piVersion: record3.piVersion,
          compatibilityBasis: record3.compatibilityBasis,
          generation: record3.generation,
          disposed: record3.disposed,
          diagnostic: record3.diagnostic
        })
      )
    ),
    unsupported: Object.freeze(unsupported.map((item) => Object.freeze({ ...item }))),
    delegationMarkers: Object.freeze([...markers]),
    certification: Object.freeze(certification.map((item) => Object.freeze({ ...item }))),
    getRuntimeDiagnostics: () => toolOwner?.getDiagnostics() ?? /* @__PURE__ */ new Map(),
    getFinalDiagnostics: () => toolOwner?.getFinalArchive(),
    getActiveToolRecordCount: () => toolOwner?.getActiveRecordCount() ?? 0,
    disposeOwner: () => {
      toolOwner?.dispose();
    }
  };
  Object.freeze(report);
  reportStates.set(report, { records, toolOwner });
  return report;
}
function disposePiCompatibilityProbe(report) {
  const state = reportStates.get(report);
  if (!state) return { complete: true, retryablePrototypeRecords: 0, retryableToolRecords: 0 };
  for (const record3 of state.records) record3.disposer();
  report.disposeOwner();
  const retryablePrototypeRecords = state.records.filter((record3) => !record3.disposed).length;
  const finalDiagnostics = report.getFinalDiagnostics();
  const retryableToolRecords = report.getActiveToolRecordCount();
  const toolOwnerWasCreated = report.recordSnapshots.some(
    (record3) => record3.feature === "tools" && record3.shape === "installed"
  );
  return {
    complete: retryablePrototypeRecords === 0 && retryableToolRecords === 0 && (!toolOwnerWasCreated || finalDiagnostics !== void 0),
    retryablePrototypeRecords,
    retryableToolRecords,
    ...finalDiagnostics ? { finalDiagnostics } : {}
  };
}

// extension-src/omp-theme/pi/compatibility-coordinator.ts
var ASSISTANT_MESSAGE_SUBTYPES = ["native-assistant-message"];
var SPECIAL_BLOCK_SUBTYPES = [
  "native-compaction-message",
  "native-branch-message",
  "native-skill-message",
  "native-custom-message"
];
var TOOL_SUBTYPES = [
  "tool-call-renderer",
  "tool-result-renderer",
  "native-bash-execution"
];
function createCompatibilityCoordinator(dispose = disposePiCompatibilityProbe) {
  let report;
  let cleanupPending = false;
  let authorization;
  let hostBinding;
  return {
    get report() {
      return report;
    },
    captureAuthorization(core, assistant, specialBlocks, tools, ascii) {
      authorization = { core, assistant, specialBlocks, tools, ascii };
    },
    state(config) {
      const version = detectPiVersion();
      const messagesConfigured = config.enabled && config.messages.enabled && (config.messages.assistantPrefix || config.messages.specialBlocks);
      const toolsConfigured = config.enabled && config.tools.enabled;
      const surface = (configured, surfaceAuthorized, subtypes) => {
        const records = report?.unsupported.filter((item) => subtypes.includes(item.subtype)) ?? [];
        const actionable = records.filter((item) => item.cause !== "disabled");
        const authorized = Boolean(authorization?.core && surfaceAuthorized);
        const installedRecord = report?.recordSnapshots.some(
          (item) => subtypes.includes(item.subtype) && !item.disposed
        );
        return {
          configured,
          authorized,
          installed: Boolean(installedRecord && authorized && configured),
          conflicted: actionable.some((item) => item.cause === "conflict"),
          failed: actionable.some((item) => item.cause === "installation"),
          cleanupPending,
          nativeFallback: actionable.length > 0,
          ...authorized ? {} : { awaitingAuthorization: true }
        };
      };
      return {
        configured: messagesConfigured || toolsConfigured,
        authorized: authorization?.core ?? false,
        installed: report !== void 0,
        conflicted: report?.unsupported.some((item) => item.cause === "conflict") ?? false,
        failed: report?.unsupported.some((item) => item.cause === "installation") ?? false,
        cleanupPending,
        nativeFallbacks: report?.unsupported.filter((item) => item.cause !== "disabled").length ?? 0,
        piVersion: version.version ?? report?.piVersion ?? "unknown",
        compatibilityBasis: report?.compatibilityBasis ?? COMPATIBILITY_BASIS,
        // Whether this extension shares the running Pi's modules. "foreign" means
        // every core patch is withheld: it would certify against a second copy of
        // Pi that never renders (see host-binding.ts).
        hostBinding: hostBinding ?? { status: "unknown", reason: "not probed yet" },
        assistantMessage: surface(
          config.enabled && config.messages.enabled && config.messages.assistantPrefix,
          Boolean(authorization?.assistant),
          ASSISTANT_MESSAGE_SUBTYPES
        ),
        tools: surface(
          config.enabled && config.tools.enabled,
          Boolean(authorization?.tools),
          TOOL_SUBTYPES
        ),
        specialBlocks: surface(
          config.enabled && config.messages.enabled && config.messages.specialBlocks,
          Boolean(authorization?.core),
          SPECIAL_BLOCK_SUBTYPES
        )
      };
    },
    install(config, tui, productGate = "omitted", binding) {
      hostBinding = binding ?? hostBinding;
      const productDenied = productGate === "deny";
      if (cleanupPending && !report) cleanupPending = false;
      if (cleanupPending || !tui || !config.enabled || !authorization?.core || productDenied) return void 0;
      if (hostBinding?.status === "foreign") return void 0;
      const assistantEnabled = authorization.assistant && isTierCAuthorized({
        coreFlag: authorization.core,
        surfaceFlag: true,
        surface: "assistantMessage",
        config
      });
      const specialBlocksEnabled = authorization.specialBlocks && isTierCAuthorized({
        coreFlag: authorization.core,
        surfaceFlag: true,
        surface: "specialBlocks",
        config
      });
      const messagesEnabled = (assistantEnabled || specialBlocksEnabled) && config.messages.enabled;
      const thinkingCollapseEnabled = Boolean(
        authorization.assistant && config.messages.enabled && config.messages.hideThinkingLabel && isTierCAuthorized({
          coreFlag: authorization.core,
          surfaceFlag: true,
          surface: "messages",
          config
        })
      );
      const toolsEnabled = authorization.tools && isTierCAuthorized({ coreFlag: authorization.core, surfaceFlag: true, surface: "tools", config });
      if (!messagesEnabled && !toolsEnabled) return void 0;
      const detected = detectPiVersion();
      report = probePiCompatibility(detected.version, {
        config: {
          ...config,
          messages: {
            ...config.messages,
            enabled: messagesEnabled,
            assistantPrefix: assistantEnabled,
            hideThinkingLabel: thinkingCollapseEnabled,
            specialBlocks: messagesEnabled && config.messages.specialBlocks && specialBlocksEnabled
          },
          tools: {
            ...config.tools,
            enabled: toolsEnabled
          }
        },
        messageSnapshot: {
          assistantPrefix: authorization.ascii ? "[assistant] " : "\u2502 ",
          assistantEnabled,
          collapseHiddenThinking: thinkingCollapseEnabled,
          hideInterimText: config.messages.hideInterimText && messagesEnabled
        },
        toolSnapshot: {
          callMarker: authorization.ascii ? "[tool] " : "[tool] ",
          resultMarker: authorization.ascii ? "[result] " : "[tool:result] ",
          style: config.tools.style === "compact-box" ? "compact-box" : "marker"
        }
      });
      return report;
    },
    dispose() {
      if (!report) {
        cleanupPending = false;
        return { complete: true, retryablePrototypeRecords: 0, retryableToolRecords: 0 };
      }
      const result = dispose(report);
      cleanupPending = !result.complete;
      if (result.complete) {
        report = void 0;
        cleanupPending = false;
      }
      return result;
    }
  };
}

// extension-src/omp-theme/pi/config-session.ts
function sessionOverrides(_pi) {
  return {};
}
function resolveProductGate(global, project, session, projectTrusted) {
  const values = [global, projectTrusted ? project : void 0, session];
  for (const value of values) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const compatibility = value.compatibility;
    if (!compatibility || typeof compatibility !== "object" || Array.isArray(compatibility)) continue;
    if (!Object.hasOwn(compatibility, "allowCorePatches")) continue;
    const leaf = compatibility.allowCorePatches;
    if (leaf === false) return { corePatchGate: "deny" };
  }
  return { corePatchGate: "omitted" };
}
function readSessionAuthorization(pi) {
  return {
    core: pi.getFlag("pi-omp-theme-core-patches") === true,
    assistant: pi.getFlag("pi-omp-theme-message-assistant") === true,
    specialBlocks: pi.getFlag("pi-omp-theme-message-special-blocks") === true,
    tools: pi.getFlag("pi-omp-theme-tools") === true,
    ascii: pi.getFlag("pi-omp-theme-ascii") === true
  };
}
function createConfigSourceAdapter(pi, port, paths) {
  let trusted = true;
  let currentCwd = process.cwd();
  let warmed;
  return {
    setSession(nextCwd, nextTrusted) {
      currentCwd = nextCwd;
      trusted = nextTrusted;
    },
    warm() {
      const { globalPath } = paths(currentCwd);
      if (warmed?.path === globalPath) return;
      warmed = { path: globalPath, read: readScopedConfig(port, globalPath).catch(() => void 0) };
    },
    async load() {
      const loadCwd = currentCwd;
      const loadTrusted = trusted;
      const storage = paths(loadCwd);
      const warmedRead = warmed?.path === storage.globalPath ? warmed.read : void 0;
      warmed = void 0;
      const global = await warmedRead ?? await readScopedConfig(port, storage.globalPath);
      const project = loadTrusted ? await readScopedConfig(port, storage.projectPath) : void 0;
      const resolved = resolveConfigDetailed({
        global: global.value,
        project: project?.value,
        projectTrusted: loadTrusted,
        environment: process.env,
        session: sessionOverrides(pi)
      });
      const productPolicy = resolveProductGate(global.value, project?.value, sessionOverrides(pi), loadTrusted);
      return {
        config: resolved.config,
        diagnostics: [...global.diagnostics, ...project?.diagnostics ?? [], ...resolved.diagnostics],
        sources: resolved.sources,
        rawSources: { global: global.value, project: project?.value, environment: process.env },
        productPolicy
      };
    }
  };
}

// extension-src/omp-theme/pi/host-binding.ts
import { readFileSync as readFileSync3 } from "fs";
import { dirname as dirname5, isAbsolute as isAbsolute3, join as join5, relative as relative3, resolve as resolve7 } from "path";
import { fileURLToPath as fileURLToPath3, pathToFileURL as pathToFileURL3 } from "url";
import { AssistantMessageComponent as AssistantMessageComponent2 } from "@earendil-works/pi-coding-agent";
var PI_PACKAGE_NAMES = /* @__PURE__ */ new Set([
  "@earendil-works/pi-coding-agent",
  "@mariozechner/pi-coding-agent"
]);
function findPiPackageRoot(start, readFile2) {
  let directory = start;
  for (; ; ) {
    try {
      const parsed = JSON.parse(readFile2(join5(directory, "package.json")));
      if (typeof parsed.name === "string" && PI_PACKAGE_NAMES.has(parsed.name)) return directory;
    } catch {
    }
    const parent = dirname5(directory);
    if (parent === directory) return void 0;
    directory = parent;
  }
}
function piPackageEntry(root, readFile2) {
  try {
    const parsed = JSON.parse(readFile2(join5(root, "package.json")));
    const dot = typeof parsed.exports === "object" && parsed.exports !== null ? parsed.exports["."] : void 0;
    const fromExports = typeof dot === "string" ? dot : dot && typeof dot === "object" ? dot.import ?? dot.default : void 0;
    const entry = typeof fromExports === "string" ? fromExports : parsed.main;
    return typeof entry === "string" ? resolve7(root, entry) : void 0;
  } catch {
    return void 0;
  }
}
function isBundledPiHostEntry(hostPackage, hostScript) {
  const segments = relative3(hostPackage, hostScript).split(/[\\/]+/).filter(Boolean);
  return segments[0]?.toLowerCase() === "dist" && segments[1]?.toLowerCase() === "bundle";
}
async function probeHostBinding(options = {}) {
  const readFile2 = options.readFile ?? ((path) => readFileSync3(path, "utf8"));
  const importModule = options.importModule ?? ((path) => import(pathToFileURL3(path).href));
  const ours = Object.hasOwn(options, "extensionAssistantMessageComponent") ? options.extensionAssistantMessageComponent : AssistantMessageComponent2;
  const extensionPackage = (() => {
    try {
      const entry = options.resolveExtensionEntry?.() ?? fileURLToPath3(new URL(import.meta.resolve("@earendil-works/pi-coding-agent")));
      return findPiPackageRoot(dirname5(entry), readFile2);
    } catch {
      return void 0;
    }
  })();
  const withExtension = extensionPackage ? { extensionPackage } : {};
  const argv1 = Object.hasOwn(options, "argv1") ? options.argv1 : process.argv[1];
  if (typeof argv1 !== "string" || argv1.length === 0 || !isAbsolute3(argv1)) {
    return { status: "unknown", ...withExtension, reason: "host entry script is not an absolute path" };
  }
  const hostScript = resolve7(argv1);
  const hostPackage = findPiPackageRoot(dirname5(hostScript), readFile2);
  if (!hostPackage) {
    return { status: "unknown", ...withExtension, reason: "host entry script is not inside a Pi package" };
  }
  const bundledHostRuntime = options.bundledHostRuntime ?? (process.env.PI_CODING_AGENT === "true" || process.env.AI_AGENT === "pi");
  if (bundledHostRuntime && typeof ours === "function" && isBundledPiHostEntry(hostPackage, hostScript)) {
    return {
      status: "bound",
      hostPackage,
      ...withExtension,
      reason: "extension shares Pi's bundled runtime modules through the loader"
    };
  }
  const hostEntry = piPackageEntry(hostPackage, readFile2);
  if (!hostEntry) {
    return { status: "unknown", hostPackage, ...withExtension, reason: "host package declares no entry" };
  }
  let host;
  try {
    host = await importModule(hostEntry);
  } catch (error) {
    return {
      status: "unknown",
      hostPackage,
      ...withExtension,
      reason: `host entry import failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
  const theirs = host.AssistantMessageComponent;
  if (typeof theirs !== "function" || typeof ours !== "function") {
    return { status: "unknown", hostPackage, ...withExtension, reason: "host entry exports no comparable surface" };
  }
  if (theirs === ours) {
    return { status: "bound", hostPackage, ...withExtension, reason: "extension shares the host's Pi modules" };
  }
  return {
    status: "foreign",
    hostPackage,
    ...withExtension,
    reason: "extension imported a second copy of @earendil-works/pi-coding-agent; Pi never renders through it"
  };
}
function describeForeignHostBinding(binding) {
  const where = binding.extensionPackage ? ` (${binding.extensionPackage})` : "";
  const host = binding.hostPackage ? ` while Pi runs ${binding.hostPackage}` : "";
  return `pi-omp-theme is bound to a second copy of @earendil-works/pi-coding-agent${where}${host}; message/tool decorations stay native. Load the extension through Pi's loader (the packaged .ts entry) or reinstall with \`pi install npm:@nguyenquangthai/pi-omp-theme\`.`;
}

// extension-src/omp-theme/pi/operational-state.ts
function buildOperationalState(config, authorization, compatibility, installationState, productCorePatchGate) {
  return {
    compatibility: {
      ...compatibility.state(config),
      configuredByProduct: config.messages.enabled || config.tools.enabled
    },
    installations: installationState ?? {
      status: config.enabled && config.statusLine.enabled ? "active" : "disabled",
      editor: config.enabled && config.editor.enabled ? "active" : "disabled",
      startup: config.enabled && config.startup.mode !== "off" ? "active" : "disabled"
    },
    provider: { status: "unavailable", recovery: "inject a capability-safe provider" },
    authorization: {
      core: authorization.core,
      ...authorization.productCorePatchGate ? { productCorePatchGate: authorization.productCorePatchGate } : {},
      ...productCorePatchGate ? { productCorePatchGate } : {}
    }
  };
}

// extension-src/omp-theme/pi/startup-resources.ts
var CORE_TOOL_SOURCE_LABEL = "core";
function stripKnownExtension(name) {
  return name.replace(/\.(?:mjs|cjs|js|jsx|ts|tsx)$/i, "");
}
function compactSourcePathLabel(path) {
  const trimmed = path.trim();
  if (!trimmed) return "";
  const synthetic = /^<([^:>]+)(?::[^>]*)?>$/.exec(trimmed);
  if (synthetic?.[1]) return synthetic[1];
  const segments = trimmed.replace(/\\/g, "/").split("/").filter((segment2) => segment2.length > 0 && segment2 !== "." && segment2 !== "~");
  const last = segments.at(-1) ?? trimmed;
  if (/^index\.(?:mjs|cjs|js|jsx|ts|tsx)$/i.test(last) && segments.length > 1) {
    return segments[segments.length - 2] ?? last;
  }
  return stripKnownExtension(last);
}
function compactPackageSourceLabel(source) {
  if (source.startsWith("npm:")) return source.slice("npm:".length) || source;
  if (source.startsWith("git:")) return compactSourcePathLabel(source.replace(/\.git(?:#.*)?$/i, "")) || source;
  return source;
}
function toolSourceLabel(sourceInfo) {
  if (!sourceInfo || typeof sourceInfo !== "object") return CORE_TOOL_SOURCE_LABEL;
  const source = typeof sourceInfo.source === "string" ? sourceInfo.source : "";
  if (source === "builtin") return CORE_TOOL_SOURCE_LABEL;
  if (source === "sdk") return "sdk";
  if (source.startsWith("npm:") || source.startsWith("git:")) return compactPackageSourceLabel(source);
  const baseDir = typeof sourceInfo.baseDir === "string" ? sourceInfo.baseDir : "";
  if (baseDir) return compactSourcePathLabel(baseDir) || source || "extension";
  const path = typeof sourceInfo.path === "string" ? sourceInfo.path : "";
  if (path) return compactSourcePathLabel(path) || source || "extension";
  return source || "extension";
}
function collectToolDetails(activeNames, tools) {
  if (!tools || tools.length === 0) return void 0;
  const activeSet = activeNames && activeNames.length > 0 ? new Set(activeNames) : void 0;
  const details = [];
  for (const tool of tools) {
    if (typeof tool?.name !== "string" || tool.name.trim().length === 0) continue;
    if (activeSet && !activeSet.has(tool.name)) continue;
    details.push({ source: toolSourceLabel(tool.sourceInfo), name: tool.name.trim() });
  }
  return details.length > 0 ? details : void 0;
}

// extension-src/omp-theme/pi/session-coordinator.ts
function createPiOmpThemeSessionCoordinator(pi, hooks = {}) {
  const filePort = hooks.filePort ?? createPiConfigFilePort();
  const gitRunner = hooks.gitRunner ?? {
    run: async (args, commandCwd, timeoutMs, signal) => {
      const result = await pi.exec("git", [...args], {
        cwd: commandCwd,
        timeout: timeoutMs,
        ...signal ? { signal } : {}
      });
      return { stdout: result.stdout, stderr: result.stderr, code: result.code };
    }
  };
  let cwd = process.cwd();
  let active = false;
  let tuiSession = false;
  let sessionTheme;
  let sessionUi;
  const source = createConfigSourceAdapter(
    pi,
    filePort,
    hooks.paths ?? ((sessionCwd) => defaultStoragePaths(sessionCwd))
  );
  const compatibility = createCompatibilityCoordinator(
    (report) => hooks.dispose?.(report) ?? disposePiCompatibilityProbe(report)
  );
  let authorization = readSessionAuthorization(pi);
  let productGate = "omitted";
  let hostBinding;
  const hostBindingProbe = probeHostBinding().catch((error) => ({
    status: "unknown",
    reason: `host binding probe failed: ${error instanceof Error ? error.message : String(error)}`
  }));
  let foreignBindingReported = false;
  source.warm();
  const syncOperational = (config) => {
    app.setOperationalState(
      buildOperationalState(
        config,
        authorization,
        compatibility,
        app.runtime.current?.installationState,
        app.productPolicy.corePatchGate
      )
    );
  };
  const applyToolsRenderConfig = (config) => {
    setBoxChrome(config.tools.chrome);
    setBoxTheme(sessionTheme);
    setToolsRenderConfig({
      ...config.tools,
      batchOpenGlyph: resolveTheme(sessionTheme, config, process.env).glyph("batchOpen"),
      nerdFonts: resolveTheme(sessionTheme, config, process.env).mode === "nerd"
    });
  };
  const applyMessagesConfig = (config) => {
    sessionUi?.setHiddenThinkingLabel?.(config.messages.hideThinkingLabel ? "" : void 0);
  };
  const applyAutoTheme = (config, ctx) => {
    const target = config.theme.autoApply;
    if (ctx.mode !== "tui" || !target || target === "off") return;
    const ui = ctx.ui;
    if (ui?.theme?.name === target) return;
    if (!ui?.getTheme?.(target)) return;
    ui.setTheme?.(target);
  };
  const app = createPiOmpThemeApp(
    void 0,
    {
      load: async (trusted) => {
        source.setSession(cwd, trusted);
        return source.load();
      }
    },
    (config) => {
      productGate = app.productPolicy.corePatchGate;
      if (!active) return;
      applyToolsRenderConfig(config);
      applyMessagesConfig(config);
      if (compatibility.report) {
        const cleanup = compatibility.dispose();
        if (!cleanup.complete) {
          syncOperational(config);
          return;
        }
      }
      compatibility.install(config, tuiSession, productGate, hostBinding);
      syncOperational(config);
    }
  );
  return {
    app,
    async start(event, ctx) {
      authorization = readSessionAuthorization(pi);
      compatibility.captureAuthorization(
        authorization.core,
        authorization.assistant,
        authorization.specialBlocks,
        authorization.tools,
        authorization.ascii
      );
      if (compatibility.report) {
        const cleanup = compatibility.dispose();
        if (!cleanup.complete) {
          syncOperational(app.config);
          return;
        }
      }
      if (app.runtime.current) app.sessionShutdown();
      cwd = ctx.cwd ?? process.cwd();
      tuiSession = ctx.mode === "tui";
      const projectTrusted = ctx.isProjectTrusted();
      app.setProjectTrusted(projectTrusted);
      source.setSession(cwd, projectTrusted);
      resetBatchRegistry();
      resetGrepRegistry();
      resetBashTreeRegistry();
      resetTurnRegistry();
      rebuildTurnRegistryFromEntries(ctx.sessionManager.getEntries());
      stopAllElapsedTickers();
      active = false;
      await app.reload();
      productGate = app.productPolicy.corePatchGate;
      hostBinding = await hostBindingProbe;
      if (hostBinding.status === "foreign" && !foreignBindingReported) {
        foreignBindingReported = true;
        ctx.ui?.notify?.(describeForeignHostBinding(hostBinding), "warning");
      }
      active = true;
      compatibility.install(app.config, ctx.mode === "tui", productGate, hostBinding);
      applyAutoTheme(app.config, ctx);
      sessionTheme = ctx.ui?.theme;
      sessionUi = ctx.ui;
      applyToolsRenderConfig(app.config);
      applyMessagesConfig(app.config);
      if (ctx.ui?.theme) setSpecialBlockTheme(ctx.ui.theme);
      if (ctx.ui?.theme) setBashExecutionTheme(ctx.ui.theme);
      if (app.config.enabled) {
        const resolveWorkingTheme = () => {
          const piTheme = ctx.ui?.theme;
          return resolveTheme(
            piTheme?.fg ? { fg: (color, text2) => piTheme.fg?.(color, text2) ?? text2 } : void 0,
            app.config
          );
        };
        installWorkingIndicator(ctx.ui, resolveWorkingTheme().mode === "ascii");
        configureWorkingShimmer(ctx.ui, app.config.theme.shimmer, () => {
          const resolved = resolveWorkingTheme();
          return {
            low: resolved.color("dim"),
            mid: resolved.color("muted"),
            high: resolved.color("accent"),
            bold: true
          };
        });
      } else restoreWorkingIndicator(ctx.ui);
      const toolDetails = collectToolDetails(pi.getActiveTools?.(), pi.getAllTools?.());
      const sessions = readRecentSessions(ctx.sessionManager?.getSessionFile?.(), WELCOME_SESSION_SLOTS);
      let sessionTitle;
      try {
        sessionTitle = ctx.sessionManager?.getSessionName?.() || void 0;
      } catch {
        sessionTitle = void 0;
      }
      app.sessionStart(
        {
          mode: ctx.mode,
          hasUI: ctx.hasUI,
          ...ctx.ui ? { ui: ctx.ui } : {},
          ...ctx.cwd ? { cwd: ctx.cwd } : {},
          ...ctx.model ? {
            model: {
              id: ctx.model.id,
              name: ctx.model.name,
              provider: ctx.model.provider,
              reasoning: ctx.model.reasoning
            }
          } : {},
          ...ctx.thinkingLevel ? { thinkingLevel: ctx.thinkingLevel } : {},
          // Seeded here as well as from session_info_changed: that event fires
          // only when the name changes, so a resumed session would show an
          // untitled bar until something renamed it.
          ...sessionTitle ? { sessionName: sessionTitle } : {},
          getContextUsage: ctx.getContextUsage,
          projectTrusted,
          gitRunner
        },
        event.reason,
        {
          ...typeof ctx.getSystemPrompt === "function" ? { systemPrompt: ctx.getSystemPrompt() } : {},
          ...toolDetails ? { toolDetails } : {},
          ...sessions.length > 0 ? { sessions } : {},
          ...ctx.scopedModels && ctx.scopedModels.length > 0 ? { models: ctx.scopedModels.length } : {}
        }
      );
      syncOperational(app.config);
    },
    shutdown() {
      active = false;
      tuiSession = false;
      resetBatchRegistry();
      resetGrepRegistry();
      resetBashTreeRegistry();
      resetTurnRegistry();
      stopAllElapsedTickers();
      app.sessionShutdown();
    }
  };
}

// extension-src/omp-theme/pi/session-usage.ts
function usageFromSession(session) {
  const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };
  let sawUsage = false;
  let cacheHitRate;
  for (const entry of session.getEntries()) {
    if (entry.type === "message") {
      if (entry.message.role !== "assistant" && entry.message.role !== "toolResult") continue;
      const usage = "usage" in entry.message ? entry.message.usage : void 0;
      if (!usage) continue;
      addUsage(totals, usage);
      sawUsage = true;
      if (entry.message.role === "assistant") {
        const promptTokens = usage.input + usage.cacheRead + usage.cacheWrite;
        cacheHitRate = promptTokens > 0 ? usage.cacheRead / promptTokens * 100 : void 0;
      }
    } else if ((entry.type === "branch_summary" || entry.type === "compaction") && entry.usage) {
      addUsage(totals, entry.usage);
      sawUsage = true;
    }
  }
  if (!sawUsage) return void 0;
  return {
    inputTokens: totals.input,
    outputTokens: totals.output,
    cacheReadTokens: totals.cacheRead,
    cacheWriteTokens: totals.cacheWrite,
    ...cacheHitRate !== void 0 ? { cacheHitRate } : {},
    cost: totals.cost,
    subscriptionMode: "unknown",
    streaming: false
  };
}
function addUsage(totals, usage) {
  totals.input += usage.input;
  totals.output += usage.output;
  totals.cacheRead += usage.cacheRead;
  totals.cacheWrite += usage.cacheWrite;
  totals.cost += usage.cost.total;
}

// extension-src/omp-theme/pi/index.ts
function usagePatch(ctx) {
  const usage = usageFromSession(ctx.sessionManager);
  return usage ? { usage } : {};
}
function activateReadOnlyTools(pi) {
  const available = new Set(pi.getAllTools().map((tool) => tool.name));
  const active = new Set(pi.getActiveTools());
  let changed = false;
  for (const name of ["grep", "find", "ls"]) {
    if (available.has(name) && !active.has(name)) {
      active.add(name);
      changed = true;
    }
  }
  if (changed) pi.setActiveTools([...active]);
}
var compatibilityTestHooks = {};
function __setCompatibilityTestHooks(hooks) {
  const previous = compatibilityTestHooks;
  compatibilityTestHooks = hooks;
  return () => {
    compatibilityTestHooks = previous;
  };
}
function piOmpThemeExtension(pi) {
  for (const [name, description] of [
    ["pi-omp-theme-core-patches", "Enable pi-omp-theme message/tool core patches"],
    ["pi-omp-theme-message-assistant", "Enable pi-omp-theme assistant message prefix"],
    ["pi-omp-theme-message-special-blocks", "Enable pi-omp-theme boxed compaction/skill/branch/custom message blocks"],
    ["pi-omp-theme-tools", "Enable pi-omp-theme tool renderer decoration"],
    ["pi-omp-theme-readonly-tools", "Enable grep/find/ls read-only tools in the active tool set"]
  ])
    pi.registerFlag(name, { type: "boolean", description, default: true });
  pi.registerFlag("pi-omp-theme-ascii", { type: "boolean", description: "Use ASCII pi-omp-theme markers" });
  const coordinator = createPiOmpThemeSessionCoordinator(pi, compatibilityTestHooks);
  registerPiOmpThemeCommand(pi, coordinator.app);
  pi.on("session_start", async (event, ctx) => {
    if (pi.getFlag("pi-omp-theme-readonly-tools") === true) {
      activateReadOnlyTools(pi);
    }
    await coordinator.start(event, ctx);
  });
  pi.on("agent_start", () => {
    coordinator.app.runtime.current?.dismissStartup();
    startWorkingShimmer();
    stopAllElapsedTickers();
    beginAgentRun();
  });
  pi.on("input", (event, _ctx) => {
    coordinator.app.runtime.current?.dismissStartup();
    if (event.source === "interactive") {
      const trimmed = event.text.trimStart();
      if (trimmed.startsWith("!")) {
        const bangLength = trimmed.startsWith("!!") ? 2 : 1;
        if (trimmed.slice(bangLength).trim() === "") return { action: "handled" };
      }
    }
    return void 0;
  });
  pi.on("tool_execution_start", () => coordinator.app.runtime.current?.dismissStartup());
  pi.on(
    "model_select",
    (event) => coordinator.app.update(
      {
        model: event.model.name || event.model.id,
        ...event.model.provider ? { provider: event.model.provider } : {},
        ...event.model.reasoning !== void 0 ? { reasoning: event.model.reasoning } : {}
      },
      "immediate"
    )
  );
  pi.on("thinking_level_select", (event) => coordinator.app.update({ thinkingLevel: event.level }, "immediate"));
  pi.on("session_info_changed", (event) => coordinator.app.update({ sessionName: event.name }, "coalesced"));
  pi.on("message_start", () => {
    closeActiveBatch();
  });
  pi.on("message_update", () => coordinator.app.update({}, "coalesced"));
  pi.on("message_end", (_event, ctx) => coordinator.app.update({ ...usagePatch(ctx) }, "coalesced"));
  pi.on("turn_end", (event, ctx) => {
    registerTurnFromMessage(event.message, event.toolResults);
    coordinator.app.update({ ...usagePatch(ctx) }, "deferred");
  });
  pi.on("agent_end", () => {
    stopWorkingShimmer();
    stopAllElapsedTickers();
    const run = finishAgentRun();
    if (run && invalidateTurnMembers(run)) requestToolPresentationRender();
  });
  pi.on("agent_settled", (_event, ctx) => coordinator.app.update({ ...usagePatch(ctx) }, "coalesced"));
  pi.on("session_tree", (_event, ctx) => {
    rebuildTurnRegistryFromEntries(ctx.sessionManager.getEntries());
    coordinator.app.update({ ...usagePatch(ctx) }, "deferred");
  });
  pi.on("session_compact", (_event, ctx) => coordinator.app.update({ ...usagePatch(ctx) }, "deferred"));
  pi.on("tool_result", (event, ctx) => {
    if (["write", "edit", "bash"].includes(event.toolName)) {
      coordinator.app.runtime.current?.invalidateGit();
      coordinator.app.update({ ...usagePatch(ctx) }, "delayed-retry");
    }
  });
  pi.on("user_bash", (_event, ctx) => {
    coordinator.app.runtime.current?.invalidateGit();
    coordinator.app.update({ ...usagePatch(ctx) }, "delayed-retry");
  });
  pi.on("session_shutdown", () => {
    disposeWorkingShimmer();
    coordinator.shutdown();
  });
}
export {
  __setCompatibilityTestHooks,
  piOmpThemeExtension as default
};
