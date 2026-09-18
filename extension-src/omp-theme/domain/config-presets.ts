import type { PiOmpThemeConfig, PresetName } from "./config-types.js";

/** Code-defined coordinated defaults. Explicit fields are merged after these values. */
export const CONFIG_PRESETS: Readonly<Record<PresetName, Readonly<PiOmpThemeConfig>>> = Object.freeze({
	default: Object.freeze({
		startup: { mode: "compact" },
	}),
	/** omp's "Claude Code" composer: full-width rules, no side borders, status on them. */
	claude: Object.freeze({
		placement: "below",
		editor: { style: "dock", frame: "claude", showMetadata: false },
		statusLine: {
			separator: "|",
			layout: {
				// No `pi` segment: the π wordmark is omp's own branding, not Pi's.
				// fork: Pi's native footer usage cluster replaces the path/git/context
				// cluster, and the model is right-aligned like Pi's own footer.
				left: ["native_usage"],
				right: ["model_effort"],
				// No extension statuses: they are other packages' text and cost a whole row.
				secondary: [],
			},
		},
		startup: { mode: "compact" },
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
			separator: "›",
			layout: {
				left: ["model_effort", "path", "git"],
				// The gauge absorbs the window label, as omp's "embedded" context line
				// does; rendering the segment too would print 272K twice. The session
				// title closes the bar, so a long gauge is not the last thing on it.
				right: ["session_title"],
				secondary: [],
			},
		},
		startup: { mode: "compact" },
	}),
	minimal: Object.freeze({
		statusLine: { layout: { left: ["path", "git"], right: ["context_pct"], secondary: [] } },
		editor: { style: "native", frame: "native", showMetadata: false },
		startup: { mode: "off" },
		messages: { enabled: false },
		tools: { enabled: false, collapseAfterTurn: false },
		theme: { terminalBackgroundSync: "off" },
	}),
	compact: Object.freeze({
		statusLine: {
			layout: { left: ["model", "thinking", "git"], right: ["context_pct"], secondary: ["extension_statuses"] },
		},
		editor: { style: "compact", frame: "auto", showMetadata: false },
		startup: { mode: "compact" },
	}),
	full: Object.freeze({
		statusLine: {
			layout: {
				left: ["hostname", "model", "thinking", "path", "git", "session"],
				right: ["token_in", "token_out", "cache_read", "cost", "context_pct", "time_spent", "time"],
				secondary: ["extension_statuses"],
			},
		},
		editor: { style: "boxed", frame: "outline", showMetadata: true },
		startup: { mode: "overlay", showResources: true },
	}),
	ascii: Object.freeze({
		editor: { style: "compact", frame: "auto" },
		startup: { mode: "compact" },
		theme: { nerdFonts: "off", terminalBackgroundSync: "off" },
	}),
	native: Object.freeze({
		statusLine: { layout: { left: ["model", "path"], right: ["context_pct"], secondary: [] } },
		editor: { style: "native", frame: "native", showMetadata: false },
		startup: { mode: "off" },
		messages: { enabled: false },
		tools: { enabled: false, collapseAfterTurn: false },
		theme: { terminalBackgroundSync: "off", autoApply: "off", shimmer: "off" },
	}),
});

export function presetConfig(name: unknown): Readonly<PiOmpThemeConfig> {
	return CONFIG_PRESETS[(typeof name === "string" && name in CONFIG_PRESETS ? name : "default") as PresetName];
}
