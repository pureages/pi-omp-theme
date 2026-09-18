import type { NormalizedPiOmpThemeConfig } from "./config-types.js";

export type GlyphMode = "nerd" | "unicode" | "ascii";
export type SemanticToken =
	| "surface"
	| "surfaceRaised"
	| "surfaceMuted"
	| "text"
	| "muted"
	| "dim"
	| "accent"
	| "accentStrong"
	| "border"
	| "borderMuted"
	| "borderActive"
	| "success"
	| "warning"
	| "error"
	| "model"
	| "thinking"
	| "thinkingMinimal"
	| "thinkingLow"
	| "thinkingMedium"
	| "thinkingHigh"
	| "thinkingXhigh"
	| "thinkingMax"
	| "path"
	| "gitClean"
	| "gitDirty"
	| "contextLow"
	| "contextMedium"
	| "contextHigh"
	| "contextCritical"
	| "tokens"
	| "cache"
	| "cost"
	| "usageInput"
	| "usageOutput"
	| "usageCacheRead"
	| "usageCacheHit"
	| "usageCost"
	| "time"
	| "separator"
	| "hint";

/** Structural view of Pi's theme. fg/bg follow Pi's `(color, text) => string` shape. */
export interface ActiveTheme {
	fg?: (color: string, text: string) => string;
	bg?: (color: string, text: string) => string;
	colors?: Record<string, string>;
}

export interface ResolvedTheme {
	/** ANSI color prefix for a semantic token, or "" when uncolored. */
	readonly color: (token: SemanticToken) => string;
	/** Prefix + text + reset; returns plain text when the token is uncolored. */
	readonly apply: (token: SemanticToken, text: string) => string;
	/** Rainbow gradient text (used for high thinking levels); plain when uncolored. */
	readonly rainbow: (text: string) => string;
	readonly glyph: (name: keyof typeof GLYPHS.unicode) => string;
	readonly mode: GlyphMode;
	readonly noColor: boolean;
}

/**
 * Default semantic colors — hex values render without any Pi theme; theme names resolve through Pi's theme.
 */
const SEMANTIC_COLORS: Record<SemanticToken, string> = {
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
	model: "accent",
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
	// equivalent; override them per token under `theme.colors` if the defaults
	// clash with a light background.
	usageInput: "#ff5c57",
	usageOutput: "#ff9f43",
	usageCacheRead: "#e8c547",
	usageCacheHit: "#3ed6d6",
	usageCost: "#b48ce0",
	time: "muted",
	separator: "dim",
	hint: "#8a8a8a",
};

const GLYPHS = {
	nerd: {
		pi: "\ue22c",
		git: "\uf126",
		path: "\uf115",
		context: "\ue70f",
		separator: "\ue0b0",
		powerlineLeft: "\ue0b0",
		powerlineRight: "\ue0b2",
		powerlineThinLeft: "\ue0b1",
		powerlineThinRight: "\ue0b3",
		batchOpen: "\u{f111}",
		bashPrompt: "\u{f12a}",
		model: "\uec19",
		cost: "\uf155",
		tokens: "\ue26b",
		input: "\uf090",
		output: "\uf08b",
		cache: "\uf1c0",
		time: "\uf017",
		host: "\uf109",
		session: "\u{f0051}",
		auto: "\u{f0068}",
	},
	// Font-independent set (the default). Values mirror omp's `unicode` symbol
	// preset so the look matches without requiring a Nerd Font.
	unicode: {
		pi: "π",
		git: "⑂",
		path: "📁",
		context: "◫",
		separator: "│",
		powerlineLeft: "▶",
		powerlineRight: "◀",
		powerlineThinLeft: "┆",
		powerlineThinRight: "┆",
		batchOpen: "●",
		bashPrompt: "$",
		model: "⬢",
		cost: "💲",
		tokens: "🪙",
		input: "⤵",
		output: "⤴",
		cache: "💾",
		time: "⏱",
		host: "🖥",
		session: "🆔",
		auto: "⟲",
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
		auto: "auto",
	},
} as const;

function isHex(color: string): color is `#${string}` {
	return /^#[0-9a-fA-F]{6}$/.test(color);
}

export function hexToAnsiPrefix(hex: string): string {
	const value = hex.replace("#", "");
	const r = Number.parseInt(value.slice(0, 2), 16);
	const g = Number.parseInt(value.slice(2, 4), 16);
	const b = Number.parseInt(value.slice(4, 6), 16);
	return `\x1b[38;2;${r};${g};${b}m`;
}

/** Rainbow gradient for high thinking levels. */
const RAINBOW_COLORS = [
	"#b281d6",
	"#d787af",
	"#febc38",
	"#e4c00f",
	"#89d281",
	"#00afaf",
	"#178fb9",
	"#b281d6",
] as const;

function rainbowAnsi(text: string): string {
	let result = "";
	let colorIndex = 0;
	for (const char of text) {
		if (char === " " || char === ":") {
			result += char;
		} else {
			result += hexToAnsiPrefix(RAINBOW_COLORS[colorIndex % RAINBOW_COLORS.length] ?? "#b281d6") + char;
			colorIndex++;
		}
	}
	return `${result}\x1b[0m`;
}

function colorPrefixFor(
	active: ActiveTheme | undefined,
	config: NormalizedPiOmpThemeConfig,
	noColor: boolean,
	token: SemanticToken,
): string {
	if (noColor) return "";
	const raw = config.theme.colors[token] ?? SEMANTIC_COLORS[token];
	if (!raw) return "";
	if (isHex(raw)) return hexToAnsiPrefix(raw);
	if (active?.fg) {
		try {
			// Pi's fg returns `\x1b[38;5;Nm` + text + `\x1b[39m`; keep only the prefix.
			const styled = active.fg(raw, "");
			return styled.endsWith("\x1b[39m") ? styled.slice(0, -5) : styled;
		} catch {
			return "";
		}
	}
	return "";
}

export function detectGlyphMode(
	config: NormalizedPiOmpThemeConfig,
	env: Record<string, string | undefined> = {},
): GlyphMode {
	if (env.PI_OMP_THEME_NERD_FONTS === "1") return "nerd";
	if (env.PI_OMP_THEME_NERD_FONTS === "0") return "unicode";
	if (config.theme.nerdFonts === "on") return "nerd";
	if (config.theme.nerdFonts === "off") return "unicode";
	// Nerd glyphs are opt-in only. A terminal program does not imply a Nerd Font —
	// the font is whatever the user configured — so guessing from TERM_PROGRAM shows
	// tofu boxes to everyone running a plain font. The unicode set is font-independent
	// and carries the same icons.
	return config.preset === "ascii" ? "ascii" : "unicode";
}

export function resolveTheme(
	active: ActiveTheme | undefined,
	config: NormalizedPiOmpThemeConfig,
	env: Record<string, string | undefined> = {},
): ResolvedTheme {
	const noColor = Object.hasOwn(env, "NO_COLOR") && env.NO_COLOR !== "" && config.theme.colors.colorOverride !== "on";
	const mode = config.preset === "ascii" ? "ascii" : detectGlyphMode(config, env);
	const color = (token: SemanticToken) => colorPrefixFor(active, config, noColor, token);
	return {
		mode,
		noColor,
		color,
		apply: (token, text) => {
			const prefix = color(token);
			return prefix ? `${prefix}${text}\x1b[0m` : text;
		},
		rainbow: (text) => (noColor ? text : rainbowAnsi(text)),
		glyph: (name) => config.theme.glyphs[name] ?? GLYPHS[mode][name],
	};
}
export { GLYPHS };
