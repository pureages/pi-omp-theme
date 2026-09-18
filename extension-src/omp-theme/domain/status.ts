import { isAbsolute, relative, resolve, sep } from "node:path";
import type { ResolvedTheme, SemanticToken } from "./theme.js";

export const STATUS_SEGMENT_IDS = [
	"pi",
	"model",
	"thinking",
	"model_effort",
	"path",
	"path_plain",
	"git",
	"context_pct",
	"context_bar",
	"claude_context",
	"context_used",
	"context_total",
	"auto_compact",
	"token_in",
	"token_out",
	"cache_read",
	"cache_write",
	"native_usage",
	"cost",
	"time_spent",
	"time",
	"hostname",
	"session",
	"session_title",
	"extension_statuses",
] as const;
export type StatusSegmentId = (typeof STATUS_SEGMENT_IDS)[number] | (string & {});
export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
export type ContextState = "low" | "medium" | "high" | "critical";

export interface GitSnapshot {
	readonly available: boolean;
	readonly branch: string | null;
	readonly staged: number;
	readonly unstaged: number;
	readonly untracked: number;
	readonly ahead?: number;
	readonly behind?: number;
	readonly refreshing: boolean;
	readonly error?: string;
}

export interface ContextSnapshot {
	readonly currentTokens?: number;
	readonly windowTokens?: number;
	readonly percent?: number;
	readonly state?: ContextState;
	readonly autoCompacting?: boolean;
	readonly customCompaction?: string;
}

export interface UsageSnapshot {
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly cacheReadTokens: number;
	readonly cacheWriteTokens: number;
	/**
	 * Cache hit rate of the most recent assistant turn, in percent — the same
	 * figure Pi's native footer prints as `CH98.8%`.
	 */
	readonly cacheHitRate?: number;
	readonly cost?: number;
	readonly currency?: string;
	readonly subscriptionMode?: "api" | "subscription" | "unknown";
	readonly streaming: boolean;
}

export interface ExtensionStatus {
	readonly key: string;
	readonly value: string;
}

export interface StatusSnapshot {
	readonly model?: string;
	/** Provider name for the active model (e.g. `deepseek`), when known. */
	readonly provider?: string;
	/** Whether the active model supports reasoning/thinking levels, when known. */
	readonly reasoning?: boolean;
	readonly thinkingLevel?: ThinkingLevel;
	readonly cwd?: string;
	readonly git?: GitSnapshot;
	readonly context?: ContextSnapshot;
	readonly usage?: UsageSnapshot;
	readonly hostname?: string;
	readonly sessionName?: string | undefined;
	readonly sessionId?: string | undefined;
	readonly sessionStartedAt?: number;
	readonly extensionStatuses?: readonly ExtensionStatus[];
}

export interface StatusSegmentOptions {
	readonly disabled?: boolean;
	readonly label?: string;
	readonly [key: string]: unknown;
}

export interface StatusCustomItem {
	readonly id: string;
	readonly statusKey: string;
	readonly label?: string;
	readonly priority?: number;
	readonly placement?: "left" | "right" | "secondary";
}

export interface SegmentContext {
	readonly snapshot: StatusSnapshot;
	readonly theme: ResolvedTheme;
	readonly options: Readonly<Record<string, StatusSegmentOptions | undefined>>;
	readonly width: number;
}

export interface SegmentRenderResult {
	readonly visible: boolean;
	readonly content: string;
	readonly compactContent?: string;
	readonly minWidth?: number;
	readonly truncatable?: boolean;
}

export interface StatusSegment {
	readonly id: StatusSegmentId;
	readonly defaultPriority: number;
	readonly essential?: boolean;
	readonly overflow?: "primary" | "secondary" | "drop";
	render(context: SegmentContext): SegmentRenderResult;
}

export interface StatusLayout {
	readonly left: readonly StatusSegmentId[];
	readonly right: readonly StatusSegmentId[];
	readonly secondary: readonly StatusSegmentId[];
}

export interface StatusRenderResult {
	readonly primary: string;
	/** Left group on its own, for callers that place the groups themselves. */
	readonly left: string;
	/** Right group on its own. */
	readonly right: string;
	readonly secondary?: string;
	readonly lines: readonly string[];
	readonly visibleSegments: readonly StatusSegmentId[];
}

function segment(
	id: StatusSegmentId,
	priority: number,
	render: StatusSegment["render"],
	essential = false,
): StatusSegment {
	return { id, defaultPriority: priority, essential, overflow: essential ? "primary" : "secondary", render };
}

export function createBuiltinSegments(): ReadonlyMap<StatusSegmentId, StatusSegment> {
	const segments: StatusSegment[] = [
		segment("pi", 10, ({ theme }) => ({
			visible: true,
			// The glyph is the wordmark (omp renders it alone); the ascii set spells "pi".
			content: theme.apply("accent", theme.glyph("pi")),
			compactContent: theme.apply("accent", theme.glyph("pi")),
		})),
		segment(
			"model",
			100,
			({ snapshot, theme }) => ({
				visible: Boolean(snapshot.model),
				content: theme.apply("model", `${theme.glyph("model")} ${snapshot.model ?? ""}`),
				compactContent: theme.apply("model", snapshot.model ?? ""),
				truncatable: true,
			}),
			true,
		),
		segment(
			"model_effort",
			40,
			({ snapshot, theme }) => {
				const model = snapshot.model;
				if (!model) return { visible: false, content: "" };
				// omp names the model alone; the provider is fixed per session and only
				// costs width on the one row that has to fit everything else.
				const label = `${theme.glyph("model")} ${model}`;
				const styledLabel = theme.apply("model", label);
				const effort = effortLevel(snapshot);
				if (!effort) {
					return { visible: true, content: styledLabel, compactContent: theme.apply("model", model) };
				}
				return {
					visible: true,
					content: `${styledLabel} ${theme.apply("separator", "·")} ${styleEffort(theme, effort)}`,
					compactContent: theme.apply("model", model),
				};
			},
			false,
		),
		segment(
			"thinking",
			95,
			({ snapshot, theme }) => {
				const level = snapshot.thinkingLevel;
				if (!level) return { visible: false, content: "" };
				const label = thinkingLabel(level);
				const text = `think:${label}`;
				const compactText = `t:${label}`;
				const token =
					level === "minimal"
						? "thinkingMinimal"
						: level === "low"
							? "thinkingLow"
							: level === "medium"
								? "thinkingMedium"
								: level === "high"
									? "thinkingHigh"
									: level === "xhigh"
										? "thinkingXhigh"
										: level === "max"
											? "thinkingMax"
											: "thinking";
				return {
					visible: true,
					content: theme.apply(token, text),
					compactContent: theme.apply(token, compactText),
				};
			},
			true,
		),
		segment("path", 80, ({ snapshot, theme }) => {
			// omp prints the working directory in full; the basename alone loses which
			// checkout you are in when several share a name.
			const name = snapshot.cwd;
			return {
				visible: Boolean(snapshot.cwd),
				content: theme.apply("path", `${theme.glyph("path")} ${name ?? ""}`),
				compactContent: theme.apply("path", name ?? ""),
				truncatable: true,
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
				truncatable: true,
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
				compactContent: theme.apply(token, `${theme.glyph("git")} ${git.branch}`),
			};
		}),
		segment(
			"context_pct",
			90,
			({ snapshot, theme }) => {
				const percent = contextPercent(snapshot.context ?? {});
				const state = contextState(percent);
				const token =
					state === "critical"
						? "contextCritical"
						: state === "high"
							? "contextHigh"
							: state === "medium"
								? "contextMedium"
								: "contextLow";
				return {
					visible: percent !== undefined,
					content:
						percent === undefined
							? ""
							: theme.apply(
									token,
									`${theme.glyph("context")} ${Math.round(percent)}%${
										snapshot.context?.windowTokens ? `/${formatTokens(snapshot.context.windowTokens)}` : ""
									}`,
								),
					compactContent: percent === undefined ? "" : theme.apply(token, `${Math.round(percent)}%`),
				};
			},
			true,
		),
		segment("context_bar", 70, ({ snapshot, theme, options }) => {
			const percent = contextPercent(snapshot.context ?? {});
			if (percent === undefined) return { visible: false, content: "" };
			const token = contextBarToken(percent);
			const window = snapshot.context?.windowTokens;
			const label = `${theme.glyph("context")}${window !== undefined ? ` ${formatTokens(window)}` : ""}`;
			const width = (options.context_bar?.width as number | undefined) ?? CONTEXT_BAR_WIDTH;
			return {
				visible: true,
				content: `${theme.apply("muted", label)} ${theme.apply(token, contextBar(percent, width))} ${theme.apply(token, `${Math.round(percent)}%`)}`,
				compactContent: theme.apply(token, `${Math.round(percent)}%`),
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
				if (percent === undefined) return { visible: false, content: "" };
				const token = claudeContextToken(percent);
				const current = snapshot.context?.currentTokens;
				const total = snapshot.context?.windowTokens;
				const width = (options.claude_context?.width as number | undefined) ?? CONTEXT_BAR_WIDTH;
				const separator = ` ${theme.apply("separator", "|")} `;
				const used = `${theme.apply(token, `${Math.round(percent)}%`)} ${theme.apply("muted", "used")}`;
				const tokens =
					current !== undefined && total !== undefined
						? theme.apply("muted", `${formatTokens(current)}/${formatTokens(total)}`)
						: "";
				return {
					visible: true,
					content: [renderClaudeContextBar(theme, percent, width), used, tokens].filter(Boolean).join(separator),
					compactContent: theme.apply(token, `${Math.round(percent)}% used`),
				};
			},
			true,
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
				if (percent === undefined) return { visible: false, content: "" };
				const token = claudeContextToken(percent);
				const current = snapshot.context?.currentTokens;
				const total = snapshot.context?.windowTokens;
				const separator = ` ${theme.apply("separator", "|")} `;
				const used = `${theme.apply(token, `${Math.round(percent)}%`)} ${theme.apply("muted", "used")}`;
				const tokens =
					current !== undefined && total !== undefined
						? theme.apply("muted", `${formatTokens(current)}/${formatTokens(total)}`)
						: "";
				return {
					visible: true,
					content: [used, tokens].filter(Boolean).join(separator),
					compactContent: theme.apply(token, `${Math.round(percent)}% used`),
				};
			},
			false,
		),
		// The size of the window, compactly: `272K`. Raw digits (`21760/272000`)
		// read as noise on a status line, and the used-of-total pair is already
		// spelled out by the context gauge and the frame footer.
		segment("context_total", 60, ({ snapshot, theme }) => ({
			visible: snapshot.context?.windowTokens !== undefined,
			content:
				snapshot.context?.windowTokens !== undefined
					? theme.apply("muted", formatTokens(snapshot.context.windowTokens))
					: "",
		})),
		segment("auto_compact", 55, ({ snapshot, theme }) => ({
			visible: Boolean(snapshot.context?.autoCompacting || snapshot.context?.customCompaction),
			content: theme.apply("warning", `${theme.glyph("auto")} ${snapshot.context?.customCompaction ?? "compacting"}`),
			compactContent: theme.apply("warning", "compact"),
		})),
		segment("token_in", 50, ({ snapshot, theme }) => ({
			visible: snapshot.usage?.inputTokens !== undefined,
			content: theme.apply("tokens", `${theme.glyph("input")} ${snapshot.usage?.inputTokens ?? 0}`),
			compactContent: theme.apply("tokens", `i:${snapshot.usage?.inputTokens ?? 0}`),
		})),
		segment("token_out", 50, ({ snapshot, theme }) => ({
			visible: snapshot.usage?.outputTokens !== undefined,
			content: theme.apply("tokens", `${theme.glyph("output")} ${snapshot.usage?.outputTokens ?? 0}`),
			compactContent: theme.apply("tokens", `o:${snapshot.usage?.outputTokens ?? 0}`),
		})),
		segment("cache_read", 40, ({ snapshot, theme }) => ({
			visible: Boolean(snapshot.usage?.cacheReadTokens),
			content: theme.apply("cache", `${theme.glyph("cache")} ${snapshot.usage?.cacheReadTokens ?? 0}`),
			compactContent: theme.apply("cache", `cr:${snapshot.usage?.cacheReadTokens ?? 0}`),
		})),
		segment("cache_write", 35, ({ snapshot, theme }) => ({
			visible: Boolean(snapshot.usage?.cacheWriteTokens),
			content: theme.apply("cache", `${theme.glyph("cache")} w${snapshot.usage?.cacheWriteTokens ?? 0}`),
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
			const parts: string[] = [];
			if (usage.inputTokens) {
				parts.push(theme.apply("usageInput", `↑${formatUsageTokens(usage.inputTokens)}`));
			}
			if (usage.outputTokens) {
				parts.push(theme.apply("usageOutput", `↓${formatUsageTokens(usage.outputTokens)}`));
			}
			if (usage.cacheReadTokens) {
				parts.push(theme.apply("usageCacheRead", `R${formatUsageTokens(usage.cacheReadTokens)}`));
			}
			if (usage.cacheWriteTokens) {
				parts.push(theme.apply("usageCacheRead", `W${formatUsageTokens(usage.cacheWriteTokens)}`));
			}
			if ((usage.cacheReadTokens > 0 || usage.cacheWriteTokens > 0) && usage.cacheHitRate !== undefined) {
				parts.push(theme.apply("usageCacheHit", `CH${usage.cacheHitRate.toFixed(1)}%`));
			}
			const subscription = usage.subscriptionMode === "subscription";
			if ((usage.cost !== undefined && usage.cost !== 0) || subscription) {
				parts.push(theme.apply("usageCost", `$${(usage.cost ?? 0).toFixed(3)}${subscription ? " (sub)" : ""}`));
			}
			if (parts.length === 0) return { visible: false, content: "" };
			return { visible: true, content: parts.join(" "), truncatable: true };
		}),
		segment("cost", 65, ({ snapshot, theme }) => {
			const cost = snapshot.usage?.cost;
			const content =
				cost === undefined || cost <= 0 ? "" : theme.apply("cost", `${theme.glyph("cost")}${cost.toFixed(3)}`);
			return { visible: Boolean(content), content, compactContent: content };
		}),
		segment("time_spent", 25, ({ snapshot, theme }) => ({
			visible: snapshot.sessionStartedAt !== undefined,
			content:
				snapshot.sessionStartedAt === undefined
					? ""
					: theme.apply("time", `${theme.glyph("time")} ${formatElapsed(Date.now() - snapshot.sessionStartedAt)}`),
			compactContent:
				snapshot.sessionStartedAt === undefined
					? ""
					: theme.apply("time", formatElapsed(Date.now() - snapshot.sessionStartedAt)),
		})),
		segment("time", 20, ({ theme }) => ({
			visible: true,
			content: theme.apply(
				"time",
				`${theme.glyph("time")} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
			),
			compactContent: theme.apply("time", new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
		})),
		segment("hostname", 20, ({ snapshot, theme }) => ({
			visible: Boolean(snapshot.hostname),
			content: theme.apply("muted", `${theme.glyph("host")} ${snapshot.hostname ?? ""}`),
		})),
		segment("session", 20, ({ snapshot, theme }) => ({
			visible: Boolean(snapshot.sessionName || snapshot.sessionId),
			content: theme.apply("muted", `${theme.glyph("session")} ${snapshot.sessionName ?? snapshot.sessionId ?? ""}`),
		})),
		segment("session_title", 18, ({ snapshot, theme }) => ({
			// Only a real name: the id is a UUID and says nothing about the work.
			visible: Boolean(snapshot.sessionName),
			content: theme.apply("muted", snapshot.sessionName ?? ""),
			truncatable: true,
		})),
		segment("extension_statuses", 30, ({ snapshot, theme }) => {
			const statuses = snapshot.extensionStatuses;
			if (!statuses || statuses.length === 0) return { visible: false, content: "" };
			// Values already carry their display label (extensions publish via
			// `ctx.ui.setStatus(key, text)` where text is the visible string).
			// Mirror Pi's native footer: sort by key, join the values only.
			const text = [...statuses]
				.sort((a, b) => a.key.localeCompare(b.key))
				.map((item) => item.value)
				.join(" ");
			return { visible: true, content: theme.apply("muted", text) };
		}),
	];
	return new Map(segments.map((item) => [item.id, item]));
}

const CONTEXT_BAR_WIDTH = 10;

function contextBar(percent: number, width = CONTEXT_BAR_WIDTH): string {
	const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)));
	return "█".repeat(filled) + "░".repeat(width - filled);
}

function claudeContextToken(percent: number): SemanticToken {
	return percent < 50 ? "success" : contextBarToken(percent);
}

function renderClaudeContextBar(theme: ResolvedTheme, percent: number, width: number): string {
	const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)));
	const open = theme.apply("separator", "[");
	const progress = theme.apply(claudeContextToken(percent), "█".repeat(filled));
	const track = theme.apply("dim", "░".repeat(width - filled));
	const close = theme.apply("separator", "]");
	return `${open}${progress}${track}${close}`;
}

/** Bar colors: green under 50%, yellow from 50% to 70%, red above 70%. */
function contextBarToken(percent: number): SemanticToken {
	if (percent >= 90) return "contextCritical";
	if (percent >= 70) return "contextHigh";
	if (percent >= 50) return "contextMedium";
	return "contextLow";
}

/**
 * Pi's own footer formatter (`footer.js`): `999` → `999`, `1300` → `1.3k`,
 * `13000` → `13k`, `2250000` → `2.3M`. Kept separate from `formatTokens`, which
 * is the theme's uppercase-K spelling used by the context and token segments.
 */
function formatUsageTokens(count: number): string {
	if (count < 1_000) return String(count);
	if (count < 10_000) return `${(count / 1_000).toFixed(1)}k`;
	if (count < 1_000_000) return `${Math.round(count / 1_000)}k`;
	if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	return `${Math.round(count / 1_000_000)}M`;
}

function formatTokens(value: number): string {
	if (value >= 1_000_000) {
		const millions = value / 1_000_000;
		return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
	}
	if (value >= 1_000) {
		const thousands = value / 1_000;
		return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
	}
	return String(value);
}

/**
 * Pi's own working-directory abbreviation, copied from `formatCwdForFooter` in
 * Pi's `modes/interactive/components/footer.ts`: both paths are resolved, the
 * home-directory prefix is replaced by `~`, and the remainder keeps the
 * platform separator (`~\Desktop\test` on Windows, `~/src/app` on POSIX). A
 * directory outside home is printed unchanged.
 */
export function formatCwdForFooter(cwd: string, home: string | undefined): string {
	if (!home) return cwd;

	const resolvedCwd = resolve(cwd);
	const resolvedHome = resolve(home);
	const relativeToHome = relative(resolvedHome, resolvedCwd);
	const isInsideHome =
		relativeToHome === "" ||
		(relativeToHome !== ".." && !relativeToHome.startsWith(`..${sep}`) && !isAbsolute(relativeToHome));

	if (!isInsideHome) return cwd;
	return relativeToHome === "" ? "~" : `~${sep}${relativeToHome}`;
}

function effortLevel(snapshot: StatusSnapshot): ThinkingLevel | undefined {
	const level = snapshot.thinkingLevel;
	if (!level) return undefined;
	// Reasoning models always surface an effort level (defaulting to off); other
	// models only show a level when one is actively set.
	if (snapshot.reasoning === true) return level;
	return level === "off" ? undefined : level;
}

function styleEffort(theme: ResolvedTheme, level: ThinkingLevel): string {
	const token =
		level === "minimal"
			? "thinkingMinimal"
			: level === "low"
				? "thinkingLow"
				: level === "medium"
					? "thinkingMedium"
					: level === "high"
						? "thinkingHigh"
						: level === "xhigh"
							? "thinkingXhigh"
							: level === "max"
								? "thinkingMax"
								: "thinking";
	return theme.apply(token, thinkingLabel(level));
}

function formatElapsed(ms: number): string {
	const seconds = Math.max(0, Math.floor(ms / 1000));
	return `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const THINKING_GLYPHS: Record<ThinkingLevel, string> = {
	off: "○",
	minimal: "○",
	low: "◔",
	medium: "◑",
	high: "◒",
	xhigh: "◕",
	max: "◉",
};

/** omp pairs the level with a filling-circle glyph; the words stay abbreviated. */
function thinkingLabel(level: ThinkingLevel): string {
	const word = level === "minimal" ? "min" : level === "medium" ? "med" : level;
	return `${THINKING_GLYPHS[level] ?? ""} ${word}`.trim();
}

export function contextState(percent: number | undefined): ContextState | undefined {
	if (percent === undefined || !Number.isFinite(percent)) return undefined;
	if (percent >= 90) return "critical";
	if (percent >= 70) return "high";
	if (percent >= 50) return "medium";
	return "low";
}

export function normalizeThinkingLevel(value: unknown): ThinkingLevel {
	return ["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(value as string)
		? (value as ThinkingLevel)
		: "off";
}

export function contextPercent(
	value: Pick<ContextSnapshot, "currentTokens" | "windowTokens" | "percent">,
): number | undefined {
	const percent =
		value.percent ??
		(value.currentTokens !== undefined && value.windowTokens
			? (value.currentTokens / value.windowTokens) * 100
			: undefined);
	return percent === undefined ? undefined : Math.max(0, Math.min(100, percent));
}

export function contextSemanticToken(state: ContextState): SemanticToken {
	return state === "critical"
		? "contextCritical"
		: state === "high"
			? "contextHigh"
			: state === "medium"
				? "contextMedium"
				: "contextLow";
}
