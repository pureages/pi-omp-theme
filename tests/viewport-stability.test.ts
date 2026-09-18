// Surfaces that rewrite rows after they were drawn must stop doing so once
// those rows are out of pi-tui's reach: from there the only way to paint the
// change is `ESC[2J ESC[H ESC[3J` plus a replay of the whole transcript.

import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { TuiMainScreen, type Component, type Terminal } from "@earendil-works/pi-tui";
import { resolveConfigDetailed } from "../extension-src/omp-theme/domain/config-normalization.js";
import { installStartup, type StartupHost, type StartupSnapshot } from "../extension-src/omp-theme/features/startup/index.js";
import {
	renderBoxedToolCall,
	renderBoxedToolResult,
	settledResultLivesInCall,
} from "../extension-src/omp-theme/features/tools/boxed/index.js";
import {
	clearPresentationTui,
	frozenPanelCount,
	notePresentationTui,
	noteToolRowHint,
	panelLines,
	resetToolRowHints,
	toolRowPlacement,
} from "../extension-src/omp-theme/features/tools/boxed/render-viewport.js";
import {
	activeElapsedTickerCount,
	startElapsedTicker,
	stopAllElapsedTickers,
} from "../extension-src/omp-theme/features/tools/boxed/session-config.js";

const { config } = resolveConfigDetailed({ global: { preset: "claude" }, projectTrusted: true });

// The claude preset ships Pi's own startup header now (`startup.mode: "off"`),
// so these startup-card tests pin the card mode on explicitly.
const cardConfig = { ...config, startup: { ...config.startup, mode: "compact" as const } };
const uncolored = { fg: (_color: string, text: string) => text };

/** A frame of `rows` painted lines whose viewport starts at `viewportTop`. */
function paintedFrame(rows: number, viewportTop: number): void {
	notePresentationTui({ mode: "regular", previousLines: Array.from({ length: rows }), previousViewportTop: viewportTop });
}

afterEach(() => {
	stopAllElapsedTickers();
	resetToolRowHints();
	clearPresentationTui();
});

test("a live panel keeps its painted lines once its block scrolls out of reach", () => {
	let generation = 0;
	const render = () => [`Read (${++generation})`];

	// The block lands at row 20 of a 60-row frame whose viewport starts at 0.
	paintedFrame(20, 0);
	noteToolRowHint("call-1");
	assert.equal(toolRowPlacement("call-1"), "inside");
	assert.deepEqual(panelLines("call-1", "v", 80, render), ["Read (1)"]);
	// Still reachable: a member completing repaints the panel.
	assert.deepEqual(panelLines("call-1", "v", 80, render), ["Read (2)"]);

	// The transcript grew; the block is now above the tracked viewport.
	paintedFrame(200, 60);
	assert.equal(toolRowPlacement("call-1"), "above");
	assert.deepEqual(panelLines("call-1", "v", 80, render), ["Read (2)"], "the painted copy stands");
	assert.deepEqual(panelLines("call-1", "v", 80, render), ["Read (2)"]);
	assert.equal(generation, 2, "the renderer is not even run while frozen");

	// A width change repaints everything anyway, so the frozen copy is dropped.
	assert.deepEqual(panelLines("call-1", "v", 100, render), ["Read (3)"]);
});

test("long sessions retain off-screen painted copies until the session reset", () => {
	paintedFrame(20, 0);
	noteToolRowHint("call-0");
	assert.deepEqual(panelLines("call-0", "v", 80, () => ["original"]), ["original"]);
	paintedFrame(400, 120);
	for (let index = 1; index <= 80; index++) panelLines(`call-${index}`, "v", 80, () => [`row ${index}`]);
	assert.deepEqual(
		panelLines("call-0", "v", 80, () => ["rewritten"]),
		["original"],
		"a count limit must not evict an active off-screen copy",
	);
	assert.equal(frozenPanelCount(), 81);
	resetToolRowHints();
	assert.equal(frozenPanelCount(), 0);
});

test("the elapsed ticker stops itself when its block scrolls out of reach", () => {
	mock.timers.enable({ apis: ["setInterval"] });
	try {
		const state: Record<string, unknown> = {};
		let ticks = 0;
		paintedFrame(20, 0);
		noteToolRowHint("running");
		startElapsedTicker(state, () => ticks++, "running");
		assert.equal(activeElapsedTickerCount(), 1);

		mock.timers.tick(1000);
		assert.equal(ticks, 1, "a visible block keeps ticking");

		paintedFrame(200, 60);
		mock.timers.tick(1000);
		assert.equal(ticks, 1, "no repaint is requested for a block that is out of reach");
		assert.equal(activeElapsedTickerCount(), 0, "and the ticker stops itself");

		mock.timers.tick(5000);
		assert.equal(ticks, 1);
	} finally {
		mock.timers.reset();
	}
});

test("an unidentified block keeps ticking (no hint recorded, no assumption made)", () => {
	mock.timers.enable({ apis: ["setInterval"] });
	try {
		const state: Record<string, unknown> = {};
		let ticks = 0;
		paintedFrame(200, 60);
		startElapsedTicker(state, () => ticks++, "never-rendered");
		assert.equal(toolRowPlacement("never-rendered"), "unknown");
		mock.timers.tick(1000);
		assert.equal(ticks, 1);
	} finally {
		mock.timers.reset();
	}
});

function mountedStartupCard(
	snapshot: StartupSnapshot,
	tui: { requestRender?: () => void; mode?: unknown; previousLines?: unknown; previousViewportTop?: unknown } = {
		requestRender: () => {},
	},
) {
	let factory: ((tui: unknown, theme: unknown) => { render(width: number): string[] }) | undefined;
	const host: StartupHost = {
		mode: "tui",
		hasUI: true,
		setHeader: (next) => {
			factory = next as typeof factory;
		},
	};
	const installation = installStartup({ host, config: cardConfig, snapshot, generation: 1, requestRender: () => {} });
	assert.ok(installation && factory);
	return { installation, component: factory(tui, uncolored) };
}

test("the startup card captures its renderer without waiting for a tool component", () => {
	const base: StartupSnapshot = { reason: "startup", project: "pi-omp-theme", preset: "claude", model: "first-model" };
	const tui = {
		mode: "regular",
		previousLines: Array.from({ length: 30 }),
		previousViewportTop: 0,
		requestRender() {},
	};
	const { installation, component } = mountedStartupCard(base, tui);
	const initial = component.render(120);
	tui.previousLines = Array.from({ length: 400 });
	tui.previousViewportTop = 120;
	installation.update({ ...base, model: "second-model" });

	assert.deepEqual(component.render(120), initial);
	assert.ok(!component.render(120).some((line) => line.includes("second-model")));
	installation.dispose();
});

test("the startup card stops rewriting itself once the transcript has scrolled", () => {
	const base: StartupSnapshot = { reason: "startup", project: "pi-omp-theme", preset: "claude", model: "first-model" };
	const { installation, component } = mountedStartupCard(base);

	// Nothing has scrolled yet: the card is still the top of the visible frame.
	paintedFrame(30, 0);
	const initial = component.render(120);
	assert.ok(initial.some((line) => line.includes("first-model")));
	installation.update({ ...base, model: "second-model" });
	assert.ok(
		component.render(120).some((line) => line.includes("second-model")),
		"a visible card follows the session",
	);

	// The transcript scrolled past it: its rows can no longer be repainted.
	paintedFrame(400, 120);
	const painted = component.render(120);
	installation.update({ ...base, model: "third-model" });
	assert.deepEqual(component.render(120), painted, "the painted card stands");
	assert.ok(!component.render(120).some((line) => line.includes("third-model")));

	// A width change repaints the frame anyway, so the card catches up there.
	assert.ok(component.render(100).some((line) => line.includes("third-model")));
	installation.dispose();
});

test("the boxed dispatcher wraps call cards, so a rebuilt card cannot rewrite unreachable rows", () => {
	const theme = { fg: (_color: string, text: string) => text, bold: (text: string) => text };
	const context = (marker: string) => ({
		args: { marker },
		toolCallId: "dispatch-1",
		invalidate() {},
		state: {},
		cwd: "D:\\Personal\\pi-omp-theme",
		executionStarted: true,
		argsComplete: true,
		isPartial: true,
		expanded: false,
		showImages: false,
		isError: false,
	});
	const cardFor = (marker: string, width = 80) =>
		renderBoxedToolCall("custom_tool", { marker }, theme, context(marker)).render(width).join("\n");

	paintedFrame(20, 0);
	const first = cardFor("alpha");
	assert.match(first, /alpha/);

	// Pi rebuilds the component on every updateDisplay; while the card is
	// reachable the rebuild is what keeps it live.
	assert.match(cardFor("beta"), /beta/);

	// Out of reach: the rebuilt card must not change the painted rows.
	paintedFrame(400, 120);
	const frozen = cardFor("gamma");
	assert.doesNotMatch(frozen, /gamma/);
	assert.match(frozen, /beta/);

	// A width change repaints the frame, so the card catches up.
	assert.match(cardFor("delta", 100), /delta/);
});

test("a tool that settles out of reach still shows what its call card owns", () => {
	// read, grep and write render their settled content in the CALL component —
	// their result renderers contribute nothing — so a freeze that spanned the
	// settle would strand a pending panel in the transcript, and for grep would
	// drop the matches entirely.
	const theme = { fg: (_color: string, text: string) => text, bold: (text: string) => text } as never;
	const context = (toolCallId: string, args: Record<string, unknown>, isPartial: boolean, state: object) =>
		({
			args,
			toolCallId,
			invalidate() {},
			state,
			cwd: "D:\\Personal\\pi-omp-theme",
			executionStarted: true,
			argsComplete: true,
			isPartial,
			expanded: false,
			showImages: false,
			isError: false,
		}) as never;
	/** One Pi frame: updateDisplay() builds both renderers, then the paint runs. */
	const paint = (
		toolName: string,
		args: Record<string, unknown>,
		toolCallId: string,
		state: object,
		text: string | undefined,
	) => {
		const isPartial = text === undefined;
		const ctx = context(toolCallId, args, isPartial, state);
		const call = renderBoxedToolCall(toolName, args, theme, ctx);
		const result =
			text === undefined
				? undefined
				: renderBoxedToolResult(toolName, { content: [{ type: "text", text }] }, { expanded: false, isPartial }, theme, ctx);
		return [...call.render(90), ...(result ? result.render(90) : [])].join("\n");
	};

	for (const scenario of [
		{ tool: "read", args: { path: "src/a.ts" }, output: "file contents", expected: /✓|src\/a\.ts/ },
		// Two files, so the panel keeps the paths (a lone match collapses to its line).
		{
			tool: "grep",
			args: { pattern: "needle", path: "." },
			output: "src/a.ts:1: needle\nsrc/b.ts:2: needle",
			expected: /src\/a\.ts/,
		},
		{ tool: "write", args: { path: "src/new.ts", content: "line one" }, output: "wrote 1 line", expected: /word/ },
	]) {
		resetToolRowHints();
		const state = {};
		const id = `settle-${scenario.tool}`;
		paintedFrame(20, 0);
		paint(scenario.tool, scenario.args, id, state, undefined);
		// The transcript grew past the block while the tool was still running.
		paintedFrame(400, 120);
		const settled = paint(scenario.tool, scenario.args, id, state, scenario.output);
		assert.match(settled, scenario.expected, `${scenario.tool}: settled content reaches the transcript`);
		assert.doesNotMatch(settled, /Running|Waiting for output/, `${scenario.tool}: no pending label survives`);
	}
});

test("a frozen pending bash call reopens before a streamed Output divider", () => {
	const theme = { fg: (_color: string, text: string) => text, bold: (text: string) => text };
	const state: Record<string, unknown> = {};
	const args = { command: "printf 'streamed'" };
	const context = () =>
		({
			args,
			toolCallId: "streaming-reopen",
			invalidate() {},
			state,
			cwd: "D:\\Personal\\pi-omp-theme",
			executionStarted: true,
			argsComplete: true,
			isPartial: true,
			expanded: false,
			showImages: false,
			isError: false,
		}) as never;
	const callOnly = () => {
		const ctx = context();
		return renderBoxedToolCall("bash", args, theme, ctx).render(80);
	};
	const frame = (output: string) => {
		const ctx = context();
		const call = renderBoxedToolCall("bash", args, theme, ctx);
		const result = renderBoxedToolResult(
			"bash",
			{ content: [{ type: "text", text: output }] },
			{ expanded: false, isPartial: true },
			theme,
			ctx,
		);
		return [...call.render(80), ...result.render(80)];
	};

	paintedFrame(20, 0);
	const pending = callOnly();
	assert.ok(pending.some((line) => line.includes("╰")), "a call with no result is a closed pending card");
	assert.equal(toolRowPlacement("streaming-reopen"), "inside");

	// Pi builds the call component before the result component, but paints both
	// only after the result renderer marks resultSeen. The lazy call shape must
	// therefore reopen even on this first partial-result pass.
	const firstResult = frame("");
	assert.equal(firstResult.some((line) => line.includes("╰")), false, "the first result pass leaves the call open");

	// The next update happens after the call has moved above the viewport.
	paintedFrame(400, 120);
	assert.equal(toolRowPlacement("streaming-reopen"), "above");
	const streamed = frame("  streamed output");
	const divider = streamed.findIndex((line) => line.includes("Output"));
	assert.ok(divider > 0, "the streamed result has an Output divider");
	assert.equal(
		streamed.slice(0, divider).some((line) => line.includes("╰")),
		false,
		"the frozen pending border must not remain before the streamed result",
	);
	assert.ok(streamed[divider - 1]?.includes("│"), "the call remains open immediately before Output");
	assert.ok(streamed[divider + 1]?.includes("streamed output"), "the streamed body follows the divider");
});

test("result-owned settlement repairs a pending envelope while expansion still repaints", () => {
	const theme = { fg: (_color: string, text: string) => text, bold: (text: string) => text };
	const card = (options: { marker: string; isPartial: boolean; expanded: boolean }) =>
		renderBoxedToolCall(
			"custom_tool",
			{ marker: options.marker },
			theme,
			{
				args: { marker: options.marker },
				toolCallId: "dispatch-2",
				invalidate() {},
				state: {},
				cwd: "D:\\Personal\\pi-omp-theme",
				executionStarted: true,
				argsComplete: true,
				isPartial: options.isPartial,
				expanded: options.expanded,
				showImages: false,
				isError: false,
			},
		)
			.render(80)
			.join("\n");

	paintedFrame(20, 0);
	card({ marker: "alpha", isPartial: true, expanded: false });
	paintedFrame(400, 120);

	// Frozen while it merely keeps running: this is the per-second tick and the
	// panel churn that used to force a redraw on every pass.
	assert.doesNotMatch(card({ marker: "beta", isPartial: true, expanded: false }), /beta/);
	assert.match(card({ marker: "beta", isPartial: true, expanded: false }), /alpha/);
	// A pending call has a closed envelope, so result-owned settlement must repair
	// that topology before the result component can continue it.
	assert.match(card({ marker: "settled", isPartial: false, expanded: false }), /settled/);
	assert.doesNotMatch(card({ marker: "settled", isPartial: false, expanded: false }), /alpha/);
	// Ctrl+O is an explicit request and is independently answered.
	assert.match(card({ marker: "opened", isPartial: false, expanded: true }), /opened/);
});

test("only tools whose call card owns final output receive a settlement variant", () => {
	for (const tool of ["read", "write", "ls", "find", "grep"]) {
		assert.equal(settledResultLivesInCall(tool, `call-${tool}`), true, tool);
	}
	for (const tool of ["edit", "quick_edit", "custom_tool", undefined]) {
		assert.equal(settledResultLivesInCall(tool, "result-owned"), false, String(tool));
	}
	assert.equal(settledResultLivesInCall("bash", "unparsed-bash"), false);
});

test("result-owned settlement repairs an off-screen pending envelope", () => {
	const writes: string[] = [];
	const terminal: Terminal = {
		columns: 80,
		rows: 20,
		kittyProtocolActive: false,
		start() {},
		stop() {},
		async drainInput() {},
		write(data) {
			writes.push(data);
		},
		moveBy() {},
		hideCursor() {},
		showCursor() {},
		clearLine() {},
		clearFromCursor() {},
		clearScreen() {},
		setTitle() {},
		setProgress() {},
	};
	const tui = new TuiMainScreen(terminal, false);
	const theme = { fg: (_color: string, text: string) => text, bold: (text: string) => text };
	const state = {};
	let marker = "running-call";
	let isPartial = true;
	let tail = "result tail: running";
	const root: Component = {
		invalidate() {},
		render(width) {
			const call = renderBoxedToolCall(
				"custom_tool",
				{ marker },
				theme,
				{
					args: { marker },
					toolCallId: "renderer-result-owned",
					invalidate() {},
					state,
					cwd: "D:\\Personal\\pi-omp-theme",
					executionStarted: true,
					argsComplete: true,
					isPartial,
					expanded: false,
					showImages: false,
					isError: false,
				},
			);
			return [
				...call.render(width),
				...Array.from({ length: 58 }, (_, index) => `streamed result row ${index}`),
				tail,
			];
		},
	};

	tui.addChild(root);
	notePresentationTui(tui);
	tui.start();
	try {
		tui.renderNow();
		assert.ok(tui.captureRenderState().previousViewportTop > 0, "the call card is above the viewport");
		const redraws = tui.fullRedraws;
		const writeCount = writes.length;

		marker = "settled-call";
		isPartial = false;
		tail = "result tail: done";
		tui.renderNow();

		const emitted = writes.slice(writeCount).join("");
		// The pending-to-open transition is structural. If the call is already
		// above scrollback, one full redraw is the only way to repair its old
		// closing border before the result component continues it.
		assert.equal(tui.fullRedraws, redraws + 1, "the structural transition gets one repair redraw");
		assert.ok(emitted.includes("\u001b[2J"), "the repair redraw clears the screen");
		assert.ok(emitted.includes("\u001b[3J"), "the repair redraw clears stale scrollback");
		const painted = tui.captureRenderState().previousLines.join("\n");
		assert.match(painted, /settled-call/, "the repaired call card reaches the transcript");
		assert.doesNotMatch(painted, /running-call/, "the stale pending call card is not retained");
		assert.match(painted, /result tail: done/, "the visible result tail still settles");
	} finally {
		tui.stop({ preserveScreen: true });
	}
});

test("result bodies remain live after their call card scrolls out of reach", () => {
	const theme = { fg: (_color: string, text: string) => text, bold: (text: string) => text };
	const context = {
		args: { marker: "call" },
		toolCallId: "result-live",
		invalidate() {},
		state: {},
		cwd: "D:\\Personal\\pi-omp-theme",
		executionStarted: true,
		argsComplete: true,
		isPartial: false,
		expanded: false,
		showImages: false,
		isError: false,
	};
	const result = (text: string) =>
		renderBoxedToolResult(
			"custom_tool",
			{ content: [{ type: "text", text }] },
			{ expanded: false, isPartial: false },
			theme,
			context,
		)
			.render(80)
			.join("\n");

	paintedFrame(20, 0);
	noteToolRowHint(context.toolCallId);
	assert.match(result("first result"), /first result/);
	paintedFrame(400, 120);
	assert.match(result("updated result"), /updated result/);
});

test("fullscreen mode never freezes: the alternate screen has no scrollback to lose", () => {
	notePresentationTui({ mode: "fullscreen", previousLines: [], previousViewportTop: 999 });
	noteToolRowHint("call-fs");
	assert.equal(toolRowPlacement("call-fs"), "inside");
	let generation = 0;
	assert.deepEqual(panelLines("call-fs", "v", 80, () => [`row ${++generation}`]), ["row 1"]);
	assert.deepEqual(panelLines("call-fs", "v", 80, () => [`row ${++generation}`]), ["row 2"]);
});
