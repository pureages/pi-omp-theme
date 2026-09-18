import assert from "node:assert/strict";
import { test } from "node:test";
import { createDoctor } from "../extension-src/omp-theme/app/doctor.js";
import { resolveConfigDetailed } from "../extension-src/omp-theme/domain/config-normalization.js";
import { renderStatus } from "../extension-src/omp-theme/domain/status-renderer.js";
import { createBuiltinSegments, type StatusSnapshot, type UsageSnapshot } from "../extension-src/omp-theme/domain/status.js";
import type { ResolvedTheme } from "../extension-src/omp-theme/domain/theme.js";

const theme: ResolvedTheme = {
	color: () => "",
	apply: (_token, text) => text,
	rainbow: (text) => text,
	glyph: () => "",
	mode: "ascii",
	noColor: true,
};

test("claude preset resolves its coordinated editor and status composition", () => {
	const result = resolveConfigDetailed({ global: { preset: "claude" } });

	assert.equal(result.config.placement, "below");
	assert.equal(result.config.editor.style, "dock");
	assert.equal(result.config.editor.frame, "claude");
	assert.equal(result.config.statusLine.separator, "|");
	assert.deepEqual(result.config.statusLine.layout, {
		left: ["native_usage"],
		right: ["model_effort"],
		secondary: [],
	});
	assert.ok(!result.diagnostics.some((diagnostic) => diagnostic.code === "CFG-PRESET-OVERRIDE"));
});

test("doctor warns when explicit values turn a coordinated preset into a hybrid", () => {
	const result = resolveConfigDetailed({
		global: {
			preset: "claude",
			placement: "border",
			editor: { frame: "rounded" },
			statusLine: { layout: { left: ["path", "git", "context_bar", "cost"] } },
		},
	});
	const warning = result.diagnostics.find((diagnostic) => diagnostic.code === "CFG-PRESET-OVERRIDE");

	assert.ok(warning);
	assert.equal(warning.level, "warning");
	assert.match(warning.message, /preset "claude"/);
	assert.match(warning.message, /placement \(global\)/);
	assert.match(warning.message, /editor\.frame \(global\)/);
	assert.match(warning.message, /statusLine\.layout\.left \(global\)/);

	const doctor = createDoctor({ config: result.config, diagnostics: result.diagnostics, surfaces: {} });
	assert.deepEqual(doctor.diagnostics, result.diagnostics);
});

test("preset guardrails follow trusted project, environment, and session precedence", () => {
	const cases = [
		{
			label: "project",
			sources: { global: { preset: "claude" }, project: { placement: "border" } },
			source: "project",
		},
		{
			label: "environment",
			sources: { global: { preset: "claude" }, environment: { PI_OMP_THEME_STATUS: "above" } },
			source: "environment",
		},
		{
			label: "session",
			sources: { global: { preset: "claude" }, session: { placement: "border" } },
			source: "session",
		},
	] as const;

	for (const entry of cases) {
		const result = resolveConfigDetailed(entry.sources);
		const warning = result.diagnostics.find((diagnostic) => diagnostic.code === "CFG-PRESET-OVERRIDE");
		assert.ok(warning, `${entry.label} override was not diagnosed`);
		assert.match(warning.message, new RegExp(`placement \\(${entry.source}\\)`));
	}

	const untrusted = resolveConfigDetailed({
		global: { preset: "claude" },
		project: { placement: "border" },
		projectTrusted: false,
	});
	assert.ok(!untrusted.diagnostics.some((diagnostic) => diagnostic.code === "CFG-PRESET-OVERRIDE"));

	const repairedBySession = resolveConfigDetailed({
		global: { preset: "claude", placement: "border" },
		session: { placement: "below" },
	});
	assert.equal(repairedBySession.sources.placement, "session");
	assert.ok(!repairedBySession.diagnostics.some((diagnostic) => diagnostic.code === "CFG-PRESET-OVERRIDE"));
});

test("preset warning remains visible when invalid leaves fill the diagnostic budget", () => {
	const invalidLeaves = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [`unknown${index}`, true]));
	const result = resolveConfigDetailed({
		global: { preset: "claude", placement: "border", ...invalidLeaves },
	});

	assert.equal(result.diagnostics.length, 32);
	assert.equal(result.diagnostics[0]?.code, "CFG-PRESET-OVERRIDE");
});

test("matching explicit values and unrelated customization do not trigger preset warnings", () => {
	const result = resolveConfigDetailed({
		global: {
			preset: "omp",
			placement: "border",
			editor: { style: "dock", frame: "rounded" },
			theme: { autoApply: "titanium-light" },
		},
	});

	assert.ok(!result.diagnostics.some((diagnostic) => diagnostic.code === "CFG-PRESET-OVERRIDE"));
});

test("claude status mirrors Pi's native usage footer and drops path/git/context", () => {
	const { config } = resolveConfigDetailed({ global: { preset: "claude" } });
	const snapshot: StatusSnapshot = {
		model: "gpt-5.6-sol",
		thinkingLevel: "high",
		cwd: "D:/Personal/a-very-long-project-name",
		git: {
			available: true,
			branch: "feature/a-long-branch-name",
			staged: 0,
			unstaged: 1,
			untracked: 0,
			refreshing: false,
		},
		context: { currentTokens: 19_200, windowTokens: 272_000 },
		usage: {
			inputTokens: 13_400,
			outputTokens: 14_200,
			cacheReadTokens: 225_000,
			cacheWriteTokens: 0,
			cacheHitRate: 98.83,
			cost: 0.011,
			streaming: false,
		},
	};

	const rendered = renderStatus(config.statusLine.layout, snapshot, 80, {
		separator: config.statusLine.separator,
		segments: createBuiltinSegments(),
		theme,
	});

	assert.deepEqual(rendered.visibleSegments, ["native_usage", "model_effort"]);
	assert.match(rendered.primary, /↑13k ↓14k R225k CH98\.8% \$0\.011/);
	assert.ok(!rendered.primary.includes("📁"));
	assert.ok(!rendered.primary.includes("used"));
});

test("native usage keeps the native number formatting and drops empty parts", () => {
	const { config } = resolveConfigDetailed({ global: { preset: "claude" } });
	const render = (usage: UsageSnapshot): string =>
		renderStatus(config.statusLine.layout, { usage }, 80, {
			separator: config.statusLine.separator,
			segments: createBuiltinSegments(),
			theme,
		}).primary;

	// `999` stays raw, `1300` gets a decimal, `13000` rounds, `2250000` uses M.
	assert.match(render({ inputTokens: 999, outputTokens: 1_300, cacheReadTokens: 0, cacheWriteTokens: 0, streaming: false }), /↑999 ↓1\.3k/);
	assert.match(render({ inputTokens: 2_250_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, streaming: false }), /↑2\.3M/);
	// No cost line at zero spend, no CH without cache traffic.
	assert.ok(!render({ inputTokens: 1_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, cost: 0, streaming: false }).includes("$"));
	assert.ok(!render({ inputTokens: 1_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, cacheHitRate: 99, streaming: false }).includes("CH"));
	// `W` and `CH` appear once cache writes/reads are reported.
	assert.match(
		render({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 10, cacheWriteTokens: 5, cacheHitRate: 66.67, streaming: false }),
		/R10 W5 CH66\.7%/,
	);
});

test("omp and claude presets do not inherit default secondary status items", () => {
	for (const preset of ["omp", "claude"] as const) {
		const { config } = resolveConfigDetailed({ global: { preset } });
		assert.deepEqual(config.statusLine.layout.secondary, []);
		assert.ok(!config.statusLine.layout.left.includes("extension_statuses"));
		assert.ok(!config.statusLine.layout.right.includes("extension_statuses"));
	}
});
