import { boundedDiagnostics, type ConfigDiagnostic } from "./config-diagnostics.js";
import { presetConfig } from "./config-presets.js";
import {
	type ConfigSources,
	type NormalizedPiOmpThemeConfig,
	PI_OMP_THEME_SCHEMA_VERSION,
	type PiOmpThemeConfig,
} from "./config-types.js";
import { normalizeStatusLayout } from "./status-presets.js";

export const DEFAULT_CONFIG: NormalizedPiOmpThemeConfig = Object.freeze({
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
			right: ["path", "context_used"],
			secondary: [],
		}),
		disabledSegments: [],
		customItems: [],
		// fork: 0 keeps the status row flush against the terminal's last line, the
		// way Pi's native footer sits. 1 reserved a blank row underneath it.
		bottomMargin: 0,
		contextBarWidth: 10,
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
		hideInterimText: false,
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
		collapseMutatingTools: false,
	}),
	theme: Object.freeze({
		nerdFonts: "auto",
		shimmer: "classic",
		cacheHighlight: true,
		sessionAccent: true,
		terminalBackgroundSync: "auto",
		autoApply: "titanium",
		colors: {},
		glyphs: {},
	}),
	compatibility: Object.freeze({
		allowSafePatches: true,
		allowCorePatches: false,
		preferExistingEditor: true,
		preferExistingFooter: true,
	}),
	debug: false,
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function merge(base: Record<string, unknown>, source: unknown): Record<string, unknown> {
	if (!isRecord(source)) return base;
	const result: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(source))
		result[key] =
			isRecord(value) && isRecord(result[key]) ? merge(result[key] as Record<string, unknown>, value) : value;
	return result;
}
function bool(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}
function boundedInt(value: unknown, fallback: number, min: number, max: number): number {
	return typeof value === "number" && Number.isFinite(value)
		? Math.min(max, Math.max(min, Math.floor(value)))
		: fallback;
}
function stringEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
	return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
function strings(value: unknown, fallback: readonly string[]): readonly string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string") ? [...value] : fallback;
}
function stringMap(value: unknown): Readonly<Record<string, string>> {
	return isRecord(value)
		? Object.fromEntries(
				Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
			)
		: {};
}
function customItems(value: unknown): readonly import("./config-types.js").StatusCustomItemConfig[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is import("./config-types.js").StatusCustomItemConfig => {
		if (!isRecord(item) || typeof item.id !== "string" || typeof item.statusKey !== "string") return false;
		return item.placement === undefined || ["left", "right", "secondary"].includes(item.placement as string);
	});
}

/**
 * Narrowest frame that can hold the status without crowding out the input. Below
 * this the editor degrades to a corner-less frame anyway (see styleFor), so the
 * status has nowhere to live and the row must come back.
 */
export const BORDER_STATUS_MIN_WIDTH = 44;

/** Width-aware form: the editor and the status row must agree per render. */
export function editorHostsBorderStatusAt(config: NormalizedPiOmpThemeConfig, width: number): boolean {
	return editorHostsBorderStatus(config) && width >= BORDER_STATUS_MIN_WIDTH;
}

/**
 * Whether the editor draws a corner frame able to host the status line. Both the
 * editor and the status line consult this, so "border" placement can never hide
 * the status behind a frame that has nowhere to put it.
 */
export function editorHostsBorderStatus(config: NormalizedPiOmpThemeConfig): boolean {
	if (!config.enabled || !config.editor.enabled) return false;
	const { style, frame } = config.editor;
	if (style === "compact" || style === "boxed" || style === "native") return false;
	if (frame === "line" || frame === "solid" || frame === "native") return false;
	// The Claude Code composer keeps the status on its own row below the rules.
	if (frame === "claude") return false;
	return true;
}

export function normalizeConfig(
	input: unknown,
	defaults: NormalizedPiOmpThemeConfig = DEFAULT_CONFIG,
): NormalizedPiOmpThemeConfig {
	const value = merge(defaults as unknown as Record<string, unknown>, acceptedInput(input));
	const inputRecord = isRecord(input) ? input : {};
	const inputStatus = isRecord(inputRecord.statusLine) ? inputRecord.statusLine : {};
	const inputLayout = isRecord(inputStatus.layout) ? inputStatus.layout : undefined;
	const startup = isRecord(value.startup) ? value.startup : {};
	const status = isRecord(value.statusLine) ? value.statusLine : {};
	const editor = isRecord(value.editor) ? value.editor : {};
	const messages = isRecord(value.messages) ? value.messages : {};
	const tools = isRecord(value.tools) ? value.tools : {};
	const theme = isRecord(value.theme) ? value.theme : {};
	const compatibility = isRecord(value.compatibility) ? value.compatibility : {};
	const max =
		typeof tools.maxCollapsedLines === "number" &&
		Number.isFinite(tools.maxCollapsedLines) &&
		tools.maxCollapsedLines >= 0
			? Math.floor(tools.maxCollapsedLines)
			: defaults.tools.maxCollapsedLines;
	const maxExpanded =
		typeof tools.maxExpandedLines === "number" && Number.isFinite(tools.maxExpandedLines) && tools.maxExpandedLines >= 0
			? Math.min(Math.floor(tools.maxExpandedLines), 1000)
			: defaults.tools.maxExpandedLines;
	return Object.freeze({
		schemaVersion: PI_OMP_THEME_SCHEMA_VERSION,
		enabled: bool(value.enabled, defaults.enabled),
		preset: stringEnum(value.preset, PRESET_NAMES, defaults.preset),
		placement: stringEnum(value.placement, ["above", "below", "border"], defaults.placement),
		startup: Object.freeze({
			mode: stringEnum(startup.mode, ["off", "compact", "overlay"], defaults.startup.mode),
			showResources: bool(startup.showResources, defaults.startup.showResources),
			alwaysExpanded: bool(startup.alwaysExpanded, defaults.startup.alwaysExpanded),
		}),
		statusLine: Object.freeze({
			enabled: bool(status.enabled, defaults.statusLine.enabled),
			separator: typeof status.separator === "string" ? status.separator : defaults.statusLine.separator,
			layout: normalizeStatusLayout(
				stringEnum(value.preset, PRESET_NAMES, defaults.preset),
				inputLayout
					? {
							left:
								inputLayout.left === undefined ? undefined : strings(inputLayout.left, defaults.statusLine.layout.left),
							right:
								inputLayout.right === undefined
									? undefined
									: strings(inputLayout.right, defaults.statusLine.layout.right),
							secondary:
								inputLayout.secondary === undefined
									? undefined
									: strings(inputLayout.secondary, defaults.statusLine.layout.secondary),
						}
					: undefined,
			),
			disabledSegments: strings(status.disabledSegments, defaults.statusLine.disabledSegments),
			customItems: customItems(status.customItems),
			bottomMargin: boundedInt(status.bottomMargin, defaults.statusLine.bottomMargin, 0, 4),
			contextBarWidth: boundedInt(status.contextBarWidth, defaults.statusLine.contextBarWidth, 4, 40),
		}),
		editor: Object.freeze({
			enabled: bool(editor.enabled, defaults.editor.enabled),
			style: stringEnum(editor.style, ["compact", "boxed", "dock", "native"], defaults.editor.style),
			frame: stringEnum(
				editor.frame,
				["auto", "halfblock", "line", "solid", "outline", "rounded", "claude", "native"],
				defaults.editor.frame,
			),
			showMetadata: bool(editor.showMetadata, defaults.editor.showMetadata),
			hint: typeof editor.hint === "string" ? editor.hint : defaults.editor.hint,
		}),
		messages: Object.freeze({
			enabled: bool(messages.enabled, defaults.messages.enabled),
			assistantPrefix: bool(messages.assistantPrefix, defaults.messages.assistantPrefix),
			specialBlocks: bool(messages.specialBlocks, defaults.messages.specialBlocks),
			hideThinkingLabel: bool(messages.hideThinkingLabel, defaults.messages.hideThinkingLabel),
			hideInterimText: bool(messages.hideInterimText, defaults.messages.hideInterimText),
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
			collapseMutatingTools: bool(tools.collapseMutatingTools, defaults.tools.collapseMutatingTools),
		}),
		theme: Object.freeze({
			nerdFonts: stringEnum(theme.nerdFonts, ["auto", "on", "off"], defaults.theme.nerdFonts),
			shimmer: stringEnum(theme.shimmer, ["classic", "kitt", "off"], defaults.theme.shimmer),
			cacheHighlight: bool(theme.cacheHighlight, defaults.theme.cacheHighlight),
			sessionAccent: bool(theme.sessionAccent, defaults.theme.sessionAccent),
			terminalBackgroundSync: stringEnum(
				theme.terminalBackgroundSync,
				["auto", "on", "off"],
				defaults.theme.terminalBackgroundSync,
			),
			autoApply:
				typeof theme.autoApply === "string" && theme.autoApply.trim() !== ""
					? theme.autoApply
					: defaults.theme.autoApply,
			colors: stringMap(theme.colors),
			glyphs: stringMap(theme.glyphs),
		}),
		compatibility: Object.freeze({
			allowSafePatches: bool(compatibility.allowSafePatches, defaults.compatibility.allowSafePatches),
			allowCorePatches: bool(compatibility.allowCorePatches, defaults.compatibility.allowCorePatches),
			preferExistingEditor: bool(compatibility.preferExistingEditor, defaults.compatibility.preferExistingEditor),
			preferExistingFooter: bool(compatibility.preferExistingFooter, defaults.compatibility.preferExistingFooter),
		}),
		debug: bool(value.debug, defaults.debug),
	});
}

export function resolveConfig(sources: ConfigSources): NormalizedPiOmpThemeConfig {
	return resolveConfigDetailed(sources).config;
}

export const PRESET_NAMES = ["default", "minimal", "compact", "full", "ascii", "native", "claude", "omp"] as const;
export const ENUMS: Readonly<Record<string, readonly string[]>> = {
	preset: PRESET_NAMES,
	placement: ["above", "below", "border"],
	"startup.mode": ["off", "compact", "overlay"],
	"editor.style": ["compact", "boxed", "dock", "native"],
	"editor.frame": ["auto", "halfblock", "line", "solid", "outline", "rounded", "claude", "native"],
	"theme.nerdFonts": ["auto", "on", "off"],
	"theme.shimmer": ["classic", "kitt", "off"],
	"tools.chrome": ["boxed", "light"],
	"theme.terminalBackgroundSync": ["auto", "on", "off"],
};
const BOOL_PATHS = new Set([
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
	"debug",
]);
const STRING_ARRAY_PATHS = new Set([
	"statusLine.layout.left",
	"statusLine.layout.right",
	"statusLine.layout.secondary",
	"statusLine.disabledSegments",
]);
const MAP_PATHS = new Set(["theme.colors", "theme.glyphs"]);
const CONTAINER_PATHS = new Set([
	"startup",
	"statusLine",
	"statusLine.layout",
	"editor",
	"messages",
	"tools",
	"theme",
	"compatibility",
]);
function validCustomItem(item: unknown): boolean {
	if (!isRecord(item) || typeof item.id !== "string" || typeof item.statusKey !== "string") return false;
	if (Object.keys(item).some((key) => !["id", "statusKey", "label", "priority", "placement"].includes(key)))
		return false;
	if (item.label !== undefined && typeof item.label !== "string") return false;
	if (item.priority !== undefined && (typeof item.priority !== "number" || !Number.isFinite(item.priority)))
		return false;
	return (
		item.placement === undefined ||
		item.placement === "left" ||
		item.placement === "right" ||
		item.placement === "secondary"
	);
}
function validLeaf(path: string, value: unknown): boolean {
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
export interface ConfigLayerResult {
	readonly accepted: unknown;
	readonly diagnostics: readonly ConfigDiagnostic[];
	readonly paths: ReadonlySet<string>;
}
function cloneLeaf(value: unknown): unknown {
	return Array.isArray(value)
		? value.map((item) => (isRecord(item) ? { ...item } : item))
		: isRecord(value)
			? { ...value }
			: value;
}
export function validateConfigLayer(input: unknown): ConfigLayerResult {
	const diagnostics: ConfigDiagnostic[] = [];
	const paths = new Set<string>();
	const walk = (value: unknown, prefix: string): unknown => {
		if (!isRecord(value)) return value;
		const result: Record<string, unknown> = {};
		for (const [key, nestedValue] of Object.entries(value)) {
			const path = prefix ? `${prefix}.${key}` : key;
			if (path === "schemaVersion") {
				if (nestedValue === undefined || nestedValue === PI_OMP_THEME_SCHEMA_VERSION) result[key] = nestedValue;
				else
					diagnostics.push({
						code: "CFG-SCHEMA",
						level: "warning",
						path,
						message: "unsupported schema version ignored",
					});
				continue;
			}
			if (path === "statusLine.customItems" && Array.isArray(nestedValue)) {
				const acceptedItems: Record<string, unknown>[] = [];
				for (const [index, item] of nestedValue.entries()) {
					if (!isRecord(item)) {
						diagnostics.push({
							code: "CFG-VALUE",
							level: "warning",
							path: `${path}[${index}]`,
							message: "custom item must be an object",
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
							message: "required custom item field is invalid or missing",
						});
					if (typeof item.statusKey !== "string")
						diagnostics.push({
							code: "CFG-VALUE",
							level: "warning",
							path: `${path}[${index}].statusKey`,
							message: "required custom item field is invalid or missing",
						});
					for (const field of Object.keys(item)) {
						if (!allowed.includes(field)) {
							diagnostics.push({
								code: "CFG-VALUE",
								level: "warning",
								path: `${path}[${index}].${field}`,
								message: "unknown custom item field ignored",
							});
							valid = false;
						}
					}
					if (item.label !== undefined && typeof item.label !== "string") {
						diagnostics.push({
							code: "CFG-VALUE",
							level: "warning",
							path: `${path}[${index}].label`,
							message: "invalid custom item field ignored",
						});
						valid = false;
					}
					if (item.priority !== undefined && (typeof item.priority !== "number" || !Number.isFinite(item.priority))) {
						diagnostics.push({
							code: "CFG-VALUE",
							level: "warning",
							path: `${path}[${index}].priority`,
							message: "invalid custom item field ignored",
						});
						valid = false;
					}
					if (item.placement !== undefined && !["left", "right", "secondary"].includes(item.placement as string)) {
						diagnostics.push({
							code: "CFG-VALUE",
							level: "warning",
							path: `${path}[${index}].placement`,
							message: "invalid custom item field ignored",
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
			if (
				isRecord(nestedValue) &&
				CONTAINER_PATHS.has(path) &&
				!MAP_PATHS.has(path) &&
				path !== "statusLine.customItems"
			) {
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
							const valid =
								field === "id" || field === "statusKey" || field === "label"
									? typeof fieldValue === "string"
									: field === "priority"
										? typeof fieldValue === "number" && Number.isFinite(fieldValue)
										: fieldValue === "left" || fieldValue === "right" || fieldValue === "secondary";
							if (!valid)
								diagnostics.push({
									code: "CFG-VALUE",
									level: "warning",
									path: `${path}[${index}].${field}`,
									message: "invalid custom item field ignored",
								});
						}
					}
					for (const field of Object.keys(item))
						if (!["id", "statusKey", "label", "priority", "placement"].includes(field))
							diagnostics.push({
								code: "CFG-VALUE",
								level: "warning",
								path: `${path}[${index}].${field}`,
								message: "unknown custom item field ignored",
							});
				}
		}
		return result;
	};
	return { accepted: walk(input, ""), diagnostics: boundedDiagnostics(diagnostics), paths };
}
function acceptedInput(input: unknown): unknown {
	return validateConfigLayer(input).accepted;
}

const COORDINATED_PRESET_PATHS = [
	"placement",
	"editor.style",
	"editor.frame",
	"statusLine.separator",
	"statusLine.layout.left",
	"statusLine.layout.right",
	"statusLine.layout.secondary",
] as const;

function valueAtPath(value: unknown, path: string): unknown {
	let current = value;
	for (const segment of path.split(".")) {
		if (!isRecord(current) || !Object.hasOwn(current, segment)) return undefined;
		current = current[segment];
	}
	return current;
}

function sameConfigValue(left: unknown, right: unknown): boolean {
	if (Array.isArray(left) && Array.isArray(right))
		return left.length === right.length && left.every((value, index) => value === right[index]);
	return left === right;
}

function presetOverrideDiagnostic(
	config: NormalizedPiOmpThemeConfig,
	sourceMap: Readonly<Record<string, string>>,
): ConfigDiagnostic | undefined {
	const coordinatedPreset = presetConfig(config.preset);
	const conflicts = COORDINATED_PRESET_PATHS.flatMap((path) => {
		const expected = valueAtPath(coordinatedPreset, path);
		const source = sourceMap[path];
		if (
			expected === undefined ||
			source === undefined ||
			source === "default" ||
			source.startsWith("preset:") ||
			sameConfigValue(valueAtPath(config, path), expected)
		)
			return [];
		return [`${path} (${source})`];
	});
	if (conflicts.length === 0) return undefined;
	return {
		code: "CFG-PRESET-OVERRIDE",
		level: "warning",
		path: "preset",
		message: `preset "${config.preset}" has coordinated UI overrides at ${conflicts.join(", ")}; remove them or expect a hybrid layout`,
	};
}

export function resolveConfigDetailed(sources: ConfigSources): {
	readonly config: NormalizedPiOmpThemeConfig;
	readonly diagnostics: readonly ConfigDiagnostic[];
	readonly sources: Readonly<Record<string, string>>;
} {
	const diagnostics: ConfigDiagnostic[] = [];
	const layerResults = new Map<string, ConfigLayerResult>();
	const layers: readonly [string, unknown][] = [
		["global", sources.global],
		["project", sources.projectTrusted === false ? undefined : sources.project],
		["session", sources.session],
	];
	for (const [name, value] of layers) {
		const result = validateConfigLayer(value);
		layerResults.set(name, result);
		diagnostics.push(...result.diagnostics);
	}
	const defaults = sources.defaults ?? DEFAULT_CONFIG;
	let merged: unknown = defaults;
	const presetCandidates = [
		["session", sources.session],
		["project", sources.projectTrusted === false ? undefined : sources.project],
		["global", sources.global],
		["default", defaults],
	] as const;
	let selectedPreset: unknown;
	for (const [, source] of presetCandidates) {
		const candidate = isRecord(source) ? source.preset : undefined;
		if (candidate === undefined) continue;
		if (typeof candidate === "string" && (PRESET_NAMES as readonly string[]).includes(candidate)) {
			selectedPreset = candidate;
			break;
		}
		diagnostics.push({
			code: "CFG-ENUM",
			level: "warning",
			path: "preset",
			message: "unsupported value; lower-precedence preset used",
		});
	}
	merged = merge(isRecord(merged) ? merged : {}, presetConfig(selectedPreset));
	for (const name of ["global", "project"] as const)
		merged = merge(isRecord(merged) ? merged : {}, layerResults.get(name)?.accepted);
	const env = sources.environment ?? {};
	const envPatch: PiOmpThemeConfig = {};
	if (env.PI_OMP_THEME_DISABLED === "1") envPatch.enabled = false;
	if (env.PI_OMP_THEME_NERD_FONTS === "1" || env.PI_OMP_THEME_NERD_FONTS === "0")
		envPatch.theme = { nerdFonts: env.PI_OMP_THEME_NERD_FONTS === "1" ? "on" : "off" };
	if (env.PI_OMP_THEME_EDITOR && ["native", "compact", "boxed", "dock"].includes(env.PI_OMP_THEME_EDITOR))
		envPatch.editor = { style: env.PI_OMP_THEME_EDITOR };
	if (env.PI_OMP_THEME_THEME !== undefined && env.PI_OMP_THEME_THEME !== "")
		envPatch.theme = { ...(envPatch.theme ?? {}), autoApply: env.PI_OMP_THEME_THEME };
	if (env.PI_OMP_THEME_OSC11 === "1" || env.PI_OMP_THEME_OSC11 === "0")
		envPatch.theme = { ...(envPatch.theme ?? {}), terminalBackgroundSync: env.PI_OMP_THEME_OSC11 === "1" ? "on" : "off" };
	if (env.PI_OMP_THEME_DEBUG === "1") envPatch.debug = true;
	if (env.PI_OMP_THEME_STATUS === "above" || env.PI_OMP_THEME_STATUS === "below") envPatch.placement = env.PI_OMP_THEME_STATUS;
	if (env.PI_OMP_THEME_STATUS === "off") envPatch.statusLine = { enabled: false };
	if (env.PI_OMP_THEME_DISABLED !== undefined && env.PI_OMP_THEME_DISABLED !== "1")
		diagnostics.push({
			code: "CFG-ENV",
			level: "warning",
			path: "PI_OMP_THEME_DISABLED",
			message: "expected 1; override ignored",
		});
	if (env.PI_OMP_THEME_NERD_FONTS !== undefined && !["0", "1"].includes(env.PI_OMP_THEME_NERD_FONTS))
		diagnostics.push({
			code: "CFG-ENV",
			level: "warning",
			path: "PI_OMP_THEME_NERD_FONTS",
			message: "expected 0 or 1; override ignored",
		});
	if (env.PI_OMP_THEME_STATUS !== undefined && !["above", "below", "off"].includes(env.PI_OMP_THEME_STATUS))
		diagnostics.push({
			code: "CFG-ENV",
			level: "warning",
			path: "PI_OMP_THEME_STATUS",
			message: "expected above, below, or off; override ignored",
		});
	if (env.PI_OMP_THEME_EDITOR !== undefined && !["native", "compact", "boxed", "dock"].includes(env.PI_OMP_THEME_EDITOR))
		diagnostics.push({
			code: "CFG-ENV",
			level: "warning",
			path: "PI_OMP_THEME_EDITOR",
			message: "unknown editor style; override ignored",
		});
	for (const [key, value] of Object.entries(env))
		if (
			value !== undefined &&
			key.startsWith("PI_OMP_THEME_") &&
			![
				"PI_OMP_THEME_DISABLED",
				"PI_OMP_THEME_NERD_FONTS",
				"PI_OMP_THEME_EDITOR",
				"PI_OMP_THEME_OSC11",
				"PI_OMP_THEME_DEBUG",
				"PI_OMP_THEME_STATUS",
				"PI_OMP_THEME_THEME",
			].includes(key)
		)
			diagnostics.push({
				code: "CFG-ENV",
				level: "warning",
				path: key,
				message: "unsupported environment override ignored",
			});
	merged = merge(isRecord(merged) ? merged : {}, envPatch);
	merged = merge(isRecord(merged) ? merged : {}, layerResults.get("session")?.accepted);
	const sourceMap: Record<string, string> = {};
	const sourcePath = (value: unknown, prefix: string, sourceName: string) => {
		if (!isRecord(value)) return;
		for (const [key, nested] of Object.entries(value)) {
			const path = prefix ? `${prefix}.${key}` : key;
			if (validLeaf(path, nested)) {
				sourceMap[path] = sourceName;
				if (path === "statusLine.customItems" && Array.isArray(nested))
					for (const [index, item] of nested.entries())
						if (isRecord(item))
							for (const field of ["id", "statusKey", "label", "priority", "placement"])
								if (Object.hasOwn(item, field)) sourceMap[`${path}[${index}].${field}`] = sourceName;
				continue;
			}
			if (isRecord(nested)) sourcePath(nested, path, sourceName);
		}
	};
	sourcePath(defaults, "", "default");
	sourcePath(
		presetConfig(selectedPreset),
		"",
		`preset:${typeof selectedPreset === "string" ? selectedPreset : "default"}`,
	);
	sourcePath(layerResults.get("global")?.accepted, "", "global");
	if (sources.projectTrusted !== false) sourcePath(layerResults.get("project")?.accepted, "", "project");
	sourcePath(envPatch, "", "environment");
	sourcePath(layerResults.get("session")?.accepted, "", "session");
	const config = normalizeConfig(merged);
	const overrideDiagnostic = presetOverrideDiagnostic(config, sourceMap);
	// Keep the semantic preset warning visible even when malformed leaves have
	// already filled the bounded diagnostic budget.
	if (overrideDiagnostic) diagnostics.unshift(overrideDiagnostic);
	return { config, diagnostics: boundedDiagnostics(diagnostics), sources: sourceMap };
}
