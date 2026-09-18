import assert from "node:assert/strict";
import { test } from "node:test";
import { createDoctor } from "../extension-src/omp-theme/app/doctor.js";
import { resolveConfigDetailed } from "../extension-src/omp-theme/domain/config-normalization.js";
import { renderStatus } from "../extension-src/omp-theme/domain/status-renderer.js";
import { createBuiltinSegments, formatCwdForFooter, type StatusSnapshot, type UsageSnapshot } from "../extension-src/omp-theme/domain/status.js";
import { hexToAnsiPrefix, resolveTheme, type ResolvedTheme } from "../extension-src/omp-theme/domain/theme.js";

const theme: ResolvedTheme = {
	color: () => "",
	apply: (_token, text) => text,
	rainbow: (text) => text,
	glyph: () => "",
	mode: "ascii",
	noColor: true,
};

/** Run `body` with `HOME`/`USERPROFILE` pinned, so the `~` abbreviation is deterministic. */
function withHome(home: string, body: () => void): void {
	const previousHome = process.env.HOME;
	const previousProfile = process.env.USERPROFILE;
	process.env.HOME = home;
	process.env.USERPROFILE = home;
	try {
		body();
	} finally {
		if (previousHome === undefined) delete process.env.HOME;
		else process.env.HOME = previousHome;
		if (previousProfile === undefined) delete process.env.USERPROFILE;
		else process.env.USERPROFILE = previousProfile;
	}
}

test("claude preset resolves its coordinated editor and status composition", () => {
	const result = resolveConfigDetailed({ global: { preset: "claude" } });

	assert.equal(result.config.placement, "below");
	assert.equal(result.config.editor.style, "dock");
	assert.equal(result.config.editor.frame, "claude");
	assert.equal(result.config.statusLine.separator, "|");
	assert.deepEqual(result.config.statusLine.layout, {
		left: ["model_effort", "native_usage"],
		right: ["path_plain", "context_used"],
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

test("claude status puts the model and native usage cluster left, path and context right", () => {
	const { config } = resolveConfigDetailed({ global: { preset: "claude" } });
	const snapshot: StatusSnapshot = {
		model: "gpt-5.6-sol",
		thinkingLevel: "high",
		cwd: "C:\\Users\\example\\Desktop\\test\\test7",
		git: {
			available: true,
			branch: "feature/a-long-branch-name",
			staged: 0,
			unstaged: 1,
			untracked: 0,
			refreshing: false,
		},
		context: { currentTokens: 111_400, windowTokens: 1_000_000, percent: 11.14 },
		usage: {
			inputTokens: 3_100,
			outputTokens: 87,
			cacheReadTokens: 2_600,
			cacheWriteTokens: 0,
			cacheHitRate: 90.83,
			cost: 0.001,
			streaming: false,
		},
	};

	withHome("C:\\Users\\example", () => {
		const rendered = renderStatus(config.statusLine.layout, snapshot, 200, {
			separator: config.statusLine.separator,
			segments: createBuiltinSegments(),
			theme,
		});

		// Sorted by segment priority, not by layout position.
		assert.deepEqual(rendered.visibleSegments, ["context_used", "native_usage", "path_plain", "model_effort"]);
		// Left group: model first, then the native usage cluster, joined by `|`.
		// (The model glyph is empty in this stub theme, hence the leading space.)
		assert.equal(rendered.left.trim(), "gpt-5.6-sol · ◒ high | ↑3.1k ↓87 R2.6k CH90.8% $0.001");
		// Right group: the working directory first (native `~` abbreviation, no icon),
		// then the `used / window` readout.
		assert.equal(rendered.right.trim(), "~\\Desktop\\test\\test7 | 11% used | 111.4K/1M");
		assert.ok(!rendered.right.includes("📁"));
		assert.ok(!rendered.primary.includes("feature/a-long-branch-name"));
		assert.ok(!rendered.primary.includes("░"));
		// No separator is left dangling in front of the right-aligned group.
		assert.match(rendered.primary, /\$0\.001 {2,}~\\Desktop/);
	});
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

test("native usage paints each figure with its own token, path uses muted", () => {
	const { config } = resolveConfigDetailed({ global: { preset: "claude" } });
	const seen: string[] = [];
	const recording: ResolvedTheme = {
		...theme,
		color: (token) => token,
		apply: (token, text) => {
			seen.push(token);
			return `${token}<${text}>`;
		},
	};
	const previousHome = process.env.HOME;
	process.env.HOME = "C:\\Users\\example";
	try {
		const rendered = renderStatus(
			config.statusLine.layout,
			{
				cwd: "C:\\Users\\example\\dev",
				model: "m",
				context: { currentTokens: 2_900, windowTokens: 1_000_000, percent: 0.29 },
				usage: {
					inputTokens: 3_100,
					outputTokens: 131,
					cacheReadTokens: 2_600,
					cacheWriteTokens: 0,
					cacheHitRate: 90.83,
					cost: 0.001,
					streaming: false,
				},
			},
			200,
			{ separator: config.statusLine.separator, segments: createBuiltinSegments(), theme: recording },
		);

		assert.deepEqual(
			seen.filter((token) => token.startsWith("usage")),
			["usageInput", "usageOutput", "usageCacheRead", "usageCacheHit", "usageCost"],
		);
		assert.match(rendered.left, /usageInput<↑3\.1k> usageOutput<↓131> usageCacheRead<R2\.6k> usageCacheHit<CH90\.8%> usageCost<\$0\.001>/);
		// The directory is painted `muted`, the same token as `used` next to it; the
		// `current/window` figures carry their own `contextTokens` color.
		assert.match(
			rendered.right,
			/muted<~\\dev> \| success<0%> muted<used> separator<\|> contextTokens<2\.9K\/1M>/,
		);
	} finally {
		if (previousHome === undefined) delete process.env.HOME;
		else process.env.HOME = previousHome;
	}
});

test("the model name is painted green and the context figures cyan", () => {
	const { config } = resolveConfigDetailed({ global: { preset: "claude" } });
	const seen: string[] = [];
	const recording: ResolvedTheme = {
		...theme,
		color: (token) => token,
		apply: (token, text) => {
			seen.push(token);
			return `${token}<${text}>`;
		},
	};
	const rendered = renderStatus(
		config.statusLine.layout,
		{
			model: "deepseek-v4.1-flash",
			thinkingLevel: "high",
			context: { currentTokens: 3_300, windowTokens: 1_000_000, percent: 0.33 },
		},
		200,
		{ separator: config.statusLine.separator, segments: createBuiltinSegments(), theme: recording },
	);

	// `model` resolves to Pi's `success` (the theme's green).
	assert.match(rendered.left, /^\s*model< deepseek-v4\.1-flash> separator<·> thinkingHigh<◒ high>/);
	assert.match(rendered.right, /contextTokens<3\.3K\/1M>/);

	// The token really is green through Pi's own theme: `success` on titanium.
	const greenish = resolveTheme(
		{ colors: {}, fg: (color, text) => `${color}|${text}` },
		config,
		{},
	);
	assert.equal(greenish.color("model"), "success|");
	assert.equal(greenish.color("contextTokens"), hexToAnsiPrefix("#3ed6d6"));
	assert.ok(seen.length > 0);
});

test("path_plain abbreviates the home directory exactly like Pi's footer", () => {
	// Expected values are Pi's own `formatCwdForFooter` output for the same inputs.
	const cases = [
		["C:\\Users\\example\\Desktop\\test\\test7", "~\\Desktop\\test\\test7"],
		["C:\\Users\\example", "~"],
		["C:\\Users\\example\\", "~"],
		["C:\\Users\\example2\\dev", "C:\\Users\\example2\\dev"],
		["C:\\Users\\example\\..\\example\\dev", "~\\dev"],
		["D:\\projects\\app", "D:\\projects\\app"],
		["C:\\Users\\EXAMPLE\\dev", "~\\dev"],
		["C:\\Users\\example\\dev\\", "~\\dev"],
		["C:\\", "C:\\"],
	];
	withHome("C:\\Users\\example", () => {
		for (const [cwd, expected] of cases) {
			assert.equal(formatCwdForFooter(cwd as string, process.env.HOME), expected, cwd);
		}
		// No home directory known: the path is printed unchanged.
		assert.equal(formatCwdForFooter("C:\\Users\\example\\dev", undefined), "C:\\Users\\example\\dev");
	});
});
