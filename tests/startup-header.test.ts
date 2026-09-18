import assert from "node:assert/strict";
import { test } from "node:test";
import { createPiOmpThemeRuntime, type RuntimeHost } from "../extension-src/omp-theme/app/runtime.js";
import { resolveConfigDetailed } from "../extension-src/omp-theme/domain/config-normalization.js";
import {
	installStartup,
	renderStartup,
	startupHeaderKey,
	type StartupHost,
	type StartupResources,
	type StartupSnapshot,
} from "../extension-src/omp-theme/features/startup/index.js";

const { config } = resolveConfigDetailed({ global: { preset: "claude" }, projectTrusted: true });

// The claude preset ships Pi's own startup header now (`startup.mode: "off"`),
// so these startup-card tests pin the card mode on explicitly.
const cardConfig = { ...config, startup: { ...config.startup, mode: "compact" as const } };
const uncolored = { fg: (_color: string, text: string) => text };
const resources: StartupResources = {
	tools: 6,
	toolDetails: [
		{ source: "core", name: "read" },
		{ source: "core", name: "bash" },
		{ source: "core", name: "edit" },
		{ source: "pi-todo", name: "todo_write" },
	],
	sessions: [{ name: "fix grep renderer", timeAgo: "2h ago" }],
};
const baseSnapshot: StartupSnapshot = {
	reason: "startup",
	project: "pi-omp-theme",
	preset: "claude",
	model: "gpt-5.6-sol",
	cwd: "D:\\Personal\\pi-omp-theme",
};

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("the startup card paints resources, so dropping them rewrites its top rows in place", () => {
	const withResources = renderStartup({ ...baseSnapshot, resources }, cardConfig, uncolored, 120);
	const without = renderStartup({ ...baseSnapshot }, cardConfig, uncolored, 120);

	assert.equal(withResources.length, without.length, "the card keeps a fixed height");
	const firstDifference = withResources.findIndex((line, index) => line !== without[index]);
	// Row 9 is the first "Tool providers" slot — the row the redraw log pointed at.
	assert.equal(firstDifference, 9);
	assert.notEqual(startupHeaderKey({ ...baseSnapshot, resources }), startupHeaderKey(baseSnapshot));
});

test("the header key covers every snapshot field the card paints", () => {
	// The guard below skips repaints when this key is unchanged, so a painted
	// field missing from the key would silently freeze on screen. Anything the
	// card does not paint must leave both the key and the output alone.
	const mounted: StartupSnapshot = { ...baseSnapshot, resources };
	const reference = renderStartup(mounted, cardConfig, uncolored, 120);
	const unpainted: StartupSnapshot[] = [
		{ ...mounted, git: { available: true, branch: "main", staged: 1, unstaged: 2, untracked: 0, refreshing: false } },
		{ ...mounted, context: { currentTokens: 1000, windowTokens: 200000, percent: 42 } },
		{
			...mounted,
			usage: { inputTokens: 9, outputTokens: 3, cacheReadTokens: 0, cacheWriteTokens: 0, streaming: true },
		},
		{ ...mounted, sessionName: "a renamed session" },
		{ ...mounted, thinkingLevel: "high" },
		{ ...mounted, extensionStatuses: [{ key: "todo", value: "3 open" }] },
	];
	for (const snapshot of unpainted) {
		assert.deepEqual(renderStartup(snapshot, cardConfig, uncolored, 120), reference);
		assert.equal(startupHeaderKey(snapshot), startupHeaderKey(mounted));
	}

	const painted: StartupSnapshot[] = [
		{ ...mounted, model: "claude-sonnet-5" },
		{ ...mounted, startupProvider: "anthropic" },
		{ ...mounted, resources: { ...resources, sessions: [{ name: "another", timeAgo: "1d ago" }] } },
	];
	for (const snapshot of painted) {
		assert.notDeepEqual(renderStartup(snapshot, cardConfig, uncolored, 120), reference);
		assert.notEqual(startupHeaderKey(snapshot), startupHeaderKey(mounted));
	}
});

test("status-only snapshot updates never invalidate the mounted header", () => {
	let headerRenders = 0;
	let headerFactory: ((tui: unknown, theme: unknown) => { render(width: number): string[] }) | undefined;
	const host: StartupHost = {
		mode: "tui",
		hasUI: true,
		setHeader: (factory) => {
			headerFactory = factory as typeof headerFactory;
		},
	};
	const installation = installStartup({
		host,
		config: cardConfig,
		snapshot: { ...baseSnapshot, resources },
		generation: 1,
		requestRender: () => headerRenders++,
	});
	assert.ok(installation);
	assert.ok(headerFactory);
	const component = headerFactory({ requestRender: () => headerRenders++ }, uncolored);
	const before = component.render(120);
	headerRenders = 0;

	// git / usage / context churn: the fields the status line reads, not the header.
	installation.update({
		...baseSnapshot,
		resources,
		git: { available: true, branch: "main", staged: 1, unstaged: 2, untracked: 0, refreshing: false },
	});
	installation.update({ ...baseSnapshot, resources, context: { percent: 42 } });
	assert.equal(headerRenders, 0);
	assert.deepEqual(component.render(120), before);

	// A model switch is header data and still repaints it.
	installation.update({ ...baseSnapshot, resources, model: "claude-sonnet-5" });
	assert.ok(headerRenders > 0, "a model change repaints the header");
	assert.notDeepEqual(component.render(120), before);
	installation.dispose();
});

test("runtime git invalidation hands the header the same snapshot as every other update path", async () => {
	let headerFactory: ((tui: unknown, theme: unknown) => { render(width: number): string[] }) | undefined;
	const ui = {
		setWidget() {},
		setFooter() {},
		setHeader(factory: unknown) {
			headerFactory = factory as typeof headerFactory;
		},
		setEditorComponent() {},
		notify() {},
	};
	let gitCalls = 0;
	const host: RuntimeHost = {
		mode: "tui",
		hasUI: true,
		ui: ui as unknown as NonNullable<RuntimeHost["ui"]>,
		cwd: "D:\\Personal\\pi-omp-theme",
		model: { id: "gpt-5.6-sol", name: "gpt-5.6-sol", provider: "openai-codex-2" },
		config: cardConfig,
		startupReason: "startup",
		resources,
		gitRunner: {
			run: async () => {
				gitCalls++;
				return { stdout: `## main\n M file-${gitCalls}.ts\n`, stderr: "", code: 0 };
			},
		},
	};
	const runtime = createPiOmpThemeRuntime(host, 1);
	assert.ok(headerFactory);
	let headerRenders = 0;
	const component = headerFactory({ requestRender: () => headerRenders++ }, uncolored);
	await settle();
	await settle();
	const mounted = component.render(120);
	assert.ok(mounted.some((line) => line.includes("core")), "the card lists tool providers once mounted");
	assert.ok(mounted.some((line) => line.includes("openai-codex-2")), "the card receives the model provider");
	headerRenders = 0;

	// The write/edit/bash tool_result path.
	runtime.invalidateGit();
	await settle();
	await settle();
	assert.ok(gitCalls >= 2, "git status was re-run");
	assert.deepEqual(component.render(120), mounted);
	assert.equal(headerRenders, 0);

	// message_update / turn_end path.
	runtime.update({
		usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, cost: 0, streaming: false },
	});
	assert.deepEqual(component.render(120), mounted);
	assert.equal(headerRenders, 0);
	runtime.dispose();
});
