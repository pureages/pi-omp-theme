/**
 * Hidden Thinking Token Label Extension
 *
 * Shows the number of thinking tokens in the label of hidden thinking blocks,
 * Claude Code style:
 *   - while the model is thinking:  "Thinking… 5.3k tokens 122 t/s" (live count + rate)
 *   - once it finishes:             "Thought 5.3k tokens" (final count)
 *
 * The tokens/second figure is computed over a sliding window and refreshed
 * once per second. The label text uses the default terminal color.
 *
 * The count prefers the provider-reported `usage.reasoning` (OpenAI
 * `reasoning_tokens`, Anthropic `thinking_tokens`, etc.) and falls back to a
 * character-based estimate while streaming, since most providers only report
 * usage in the final chunk.
 *
 * Why per-message labels need a workaround:
 * `ctx.ui.setHiddenThinkingLabel()` is a *session-global* label: pi applies it
 * to every hidden thinking block (all past messages plus the streaming one).
 * A naive "set the final count on message_end" implementation therefore makes
 * every message display the same (last) token count. To give each message its
 * own count this extension:
 *   1. imports the real `AssistantMessageComponent` (a public export) and
 *      patches its `setHiddenThinkingLabel` prototype method to *capture*
 *      live component instances (the original method still runs unchanged);
 *   2. remembers the final count of every assistant message, keyed by the
 *      message object (components expose the same object as `lastMessage`);
 *   3. after every global label update (live tick, message_start reset,
 *      message_end final count), re-applies each *older* message's own stored
 *      label to its own component — only the current message keeps the
 *      global/live label.
 *
 * If the patch cannot be installed (different runtime), the extension falls
 * back to the original global-label behavior.
 *
 * Usage:
 *   pi --extension examples/extensions/hidden-thinking-label.ts
 *
 * Test:
 *   1. Load this extension
 *   2. Hide thinking blocks with Ctrl+T
 *   3. Ask for something that produces reasoning output
 *   4. The collapsed thinking block label shows the live token count while
 *      thinking, then the final count when the reply completes
 *   5. Ask another reasoning question: the previous message keeps its own
 *      final count instead of inheriting the new message's count
 *
 * Commands:
 *   /thinking-label <text>   Set a fixed label (disables auto token display)
 *   /thinking-label          Re-enable automatic token labels
 */

import { AssistantMessageComponent, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DEFAULT_LABEL = "Pondering...";

// --- Per-message label support -------------------------------------------------
// (see header comment for why this exists)

/** Live AssistantMessageComponent instances, captured by the prototype patch. */
const components = new Set<AssistantMessageComponent>();
/** Final label per finished assistant message, keyed by the message object. */
const finalLabels = new Map<object, string>();
/** Message whose component should keep the global/live label. */
let currentMessage: object | undefined;
/** Whether the component-capture patch is active. */
let captureInstalled = false;

/** Patch the prototype so every live component instance is captured. */
function installComponentCapture(): void {
	const proto = AssistantMessageComponent.prototype as unknown as {
		setHiddenThinkingLabel(label: string): void;
		__thinkingLabelCaptureInstalled?: boolean;
	};
	if (proto.__thinkingLabelCaptureInstalled) return;
	proto.__thinkingLabelCaptureInstalled = true;
	const original = proto.setHiddenThinkingLabel;
	proto.setHiddenThinkingLabel = function (this: AssistantMessageComponent, label: string) {
		components.add(this);
		return original.call(this, label);
	};
}

/** Re-apply each older message's stored label to its own component. */
function restoreStoredLabels(activeMessage: object | undefined): void {
	if (!captureInstalled) return;
	for (const comp of components) {
		const message = (comp as unknown as { lastMessage?: object }).lastMessage;
		if (!message || message === activeMessage) continue;
		const stored = finalLabels.get(message);
		if (!stored) continue;
		const label = (comp as unknown as { hiddenThinkingLabel?: string }).hiddenThinkingLabel;
		if (label === stored) continue;
		comp.setHiddenThinkingLabel(stored);
	}
}

/** Compute + store the final label for a finished assistant message. */
function rememberFinalLabel(message: HasThinkingContent): void {
	if (!getThinkingText(message)) return;
	finalLabels.set(message as unknown as object, `Thought ${formatTokens(getThinkingTokens(message))} tokens`);
}

// --- Label state ---------------------------------------------------------------

let rateTimer: ReturnType<typeof setInterval> | undefined;
let currentLabel = DEFAULT_LABEL;
let currentCtx: { ui: { setHiddenThinkingLabel(label?: string): void } } | null = null;

function startAnimation(ctx: { ui: { setHiddenThinkingLabel(label?: string): void } }, label: string) {
	currentCtx = ctx;
	currentLabel = label;
	ctx.ui.setHiddenThinkingLabel(label);
	if (!rateTimer) {
		// Refresh the label text (token count + t/s) once per second.
		rateTimer = setInterval(() => {
			currentLabel = buildThinkingLabel();
			currentCtx?.ui.setHiddenThinkingLabel(currentLabel);
			// The global label touched every block; put older messages' own
			// labels back so only the current message shows the live count.
			restoreStoredLabels(currentMessage);
		}, RATE_UPDATE_MS);
	}
}

function stopAnimation(): void {
	if (rateTimer) {
		clearInterval(rateTimer);
		rateTimer = undefined;
	}
	rateSamples = [];
	lastTokenCount = 0;
}

// --- Tokens-per-second rate ----------------------------------------------------

const RATE_UPDATE_MS = 1000; // refresh the t/s figure once per second
const RATE_WINDOW_MS = 5000; // sliding window used for the rate estimate

interface TokenSample {
	time: number;
	tokens: number;
}

let rateSamples: TokenSample[] = [];
let lastTokenCount = 0;

/** Record a cumulative token count sample, keeping only the last RATE_WINDOW_MS. */
function recordSample(tokens: number): void {
	const now = Date.now();
	rateSamples.push({ time: now, tokens });
	const cutoff = now - RATE_WINDOW_MS;
	while (rateSamples.length > 2 && rateSamples[0].time < cutoff) rateSamples.shift();
}

/** Average tokens/second over the sliding window, or null when not measurable yet. */
function tokensPerSecond(): number | null {
	if (rateSamples.length < 2) return null;
	const first = rateSamples[0];
	const last = rateSamples[rateSamples.length - 1];
	const dt = (last.time - first.time) / 1000;
	if (dt <= 0) return null;
	return Math.max(0, (last.tokens - first.tokens) / dt);
}

/** Current live label, including the t/s figure once a rate is measurable. */
function buildThinkingLabel(): string {
	const base = `Thinking… ${formatTokens(lastTokenCount)} tokens`;
	const rate = tokensPerSecond();
	return rate === null ? base : `${base} ${formatTokens(Math.round(rate))} t/s`;
}

// --- Token counting ------------------------------------------------------------

/** Rough token estimate from text: CJK chars ≈ 1 token, other chars ≈ 4 per token. */
function estimateTokens(text: string): number {
	let cjk = 0;
	let other = 0;
	for (const ch of text) {
		if (/[\u1100-\u11ff\u2e80-\ua4cf\uac00-\ud7af\u3040-\u30ff\u31f0-\u31ff\uf900-\ufaff\uff00-\uffef]/.test(ch)) {
			cjk++;
		} else {
			other++;
		}
	}
	return Math.ceil(cjk + other / 4);
}

/** Format like Claude Code: 342 -> "342", 1234 -> "1.2k", 15400 -> "15.4k". */
function formatTokens(n: number): string {
	if (n < 1000) return String(n);
	const k = n / 1000;
	return k >= 100 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, "")}k`;
}

interface HasThinkingContent {
	content: readonly { type: string; thinking?: string }[];
	usage?: { reasoning?: number };
}

function getThinkingText(message: HasThinkingContent): string {
	let text = "";
	for (const c of message.content) {
		if (c.type === "thinking" && c.thinking) text += c.thinking;
	}
	return text;
}

function getThinkingTokens(message: HasThinkingContent): number {
	const reasoning = message.usage?.reasoning;
	if (typeof reasoning === "number" && reasoning > 0) return reasoning;
	return estimateTokens(getThinkingText(message));
}

export default function (pi: ExtensionAPI) {
	let autoLabel = true; // false once the user sets a fixed label via /thinking-label

	// Capture every live component instance (best effort; falls back to the
	// global-label behavior if the class isn't the one pi is using).
	try {
		installComponentCapture();
		captureInstalled = true;
	} catch {
		captureInstalled = false;
	}

	pi.on("session_start", async (_event, ctx) => {
		stopAnimation();
		currentMessage = undefined;
		components.clear();
		finalLabels.clear();
		// Rebuild stored labels from the persisted session (resume/fork/switch).
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "message" || entry.message.role !== "assistant") continue;
			rememberFinalLabel(entry.message as HasThinkingContent);
		}
		ctx.ui.setHiddenThinkingLabel(DEFAULT_LABEL);
		// Past messages' components are created *after* session_start
		// (renderInitialMessages), so defer the capture+restore pass.
		setTimeout(() => {
			if (!autoLabel) return;
			ctx.ui.setHiddenThinkingLabel(DEFAULT_LABEL); // captures all components
			restoreStoredLabels(undefined);
		}, 250);
	});

	// A new assistant message starts: reset the (global) label so the new
	// message doesn't inherit the previous message's final count, then restore
	// the older messages' own labels.
	pi.on("message_start", async (event, ctx) => {
		if (event.message.role !== "assistant") return;
		currentMessage = event.message;
		stopAnimation();
		if (!autoLabel) return;
		ctx.ui.setHiddenThinkingLabel(DEFAULT_LABEL);
		restoreStoredLabels(event.message);
	});

	// While thinking streams, update the label live with the token count.
	pi.on("message_update", async (event, ctx) => {
		if (!autoLabel) return;
		const ev = event.assistantMessageEvent;
		if (ev.type !== "thinking_start" && ev.type !== "thinking_delta") return;

		const thinkingText = getThinkingText(event.message);
		if (!thinkingText) return;
		currentMessage = event.message;

		const tokens = getThinkingTokens(event.message);
		lastTokenCount = tokens;
		recordSample(tokens);
		startAnimation(ctx, buildThinkingLabel());
		restoreStoredLabels(currentMessage);
	});

	// When the assistant message finishes, pin the final count and store it so
	// this message keeps its own label even after later messages update the
	// global label.
	pi.on("message_end", async (event, ctx) => {
		if (!autoLabel) return;
		if (event.message.role !== "assistant") return;

		stopAnimation();
		const thinkingText = getThinkingText(event.message);
		if (!thinkingText) return;
		currentMessage = event.message;

		const tokens = getThinkingTokens(event.message);
		const label = `Thought ${formatTokens(tokens)} tokens`;
		finalLabels.set(event.message as unknown as object, label);
		ctx.ui.setHiddenThinkingLabel(label);
		restoreStoredLabels(event.message);
	});

	pi.registerCommand("thinking-label", {
		description: "Set a fixed hidden thinking label. Use without args to re-enable automatic token counts.",
		handler: async (args, ctx) => {
			if (!args.trim()) {
				autoLabel = true;
				stopAnimation();
				ctx.ui.setHiddenThinkingLabel(DEFAULT_LABEL);
				restoreStoredLabels(undefined);
				ctx.ui.notify("Auto token label enabled.");
				return;
			}
			autoLabel = false;
			stopAnimation();
			// The fixed label is user-chosen: leave it as-is, but keep it in sync.
			currentCtx = ctx;
			currentLabel = args.trim();
			ctx.ui.setHiddenThinkingLabel(args.trim());
			ctx.ui.notify(`Hidden thinking label set to: ${args.trim()}`);
		},
	});
}
