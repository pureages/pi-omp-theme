import type { SessionEntry } from "@earendil-works/pi-coding-agent";
import type { UsageSnapshot } from "../domain/status.js";

/**
 * Minimal structural view of Pi's session manager: only the entry iteration
 * needed to aggregate cumulative usage. `ExtensionContext.sessionManager`
 * satisfies this shape.
 */
export interface SessionUsageSource {
	getEntries(): readonly SessionEntry[];
}

interface UsageTotals {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: number;
}

/**
 * Aggregate cumulative token/cost usage from all session entries, mirroring
 * Pi's native footer: assistant messages always carry usage, tool results and
 * compaction/branch summaries carry it when available.
 */
export function usageFromSession(session: SessionUsageSource): UsageSnapshot | undefined {
	const totals: UsageTotals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };
	let sawUsage = false;
	let cacheHitRate: number | undefined;
	for (const entry of session.getEntries()) {
		if (entry.type === "message") {
			if (entry.message.role !== "assistant" && entry.message.role !== "toolResult") continue;
			const usage = "usage" in entry.message ? entry.message.usage : undefined;
			if (!usage) continue;
			addUsage(totals, usage);
			sawUsage = true;
			if (entry.message.role === "assistant") {
				// Pi's footer reports the hit rate of the most recent assistant turn, not
				// the session-wide cacheRead/cacheWrite ratio.
				const promptTokens = usage.input + usage.cacheRead + usage.cacheWrite;
				cacheHitRate = promptTokens > 0 ? (usage.cacheRead / promptTokens) * 100 : undefined;
			}
		} else if ((entry.type === "branch_summary" || entry.type === "compaction") && entry.usage) {
			addUsage(totals, entry.usage);
			sawUsage = true;
		}
	}
	if (!sawUsage) return undefined;
	return {
		inputTokens: totals.input,
		outputTokens: totals.output,
		cacheReadTokens: totals.cacheRead,
		cacheWriteTokens: totals.cacheWrite,
		...(cacheHitRate !== undefined ? { cacheHitRate } : {}),
		cost: totals.cost,
		subscriptionMode: "unknown",
		streaming: false,
	};
}

function addUsage(
	totals: UsageTotals,
	usage: { input: number; output: number; cacheRead: number; cacheWrite: number; cost: { total: number } },
): void {
	totals.input += usage.input;
	totals.output += usage.output;
	totals.cacheRead += usage.cacheRead;
	totals.cacheWrite += usage.cacheWrite;
	totals.cost += usage.cost.total;
}
