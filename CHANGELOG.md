# Changelog

All notable changes to this project are documented here.

## [Unreleased]

## [1.1.0-fork.1] - 2026-09-19

Fork line. Everything below this entry is upstream history, kept verbatim. The fork
re-bases its own version on the upstream release it last merged (`1.0.12`), so a
`-fork.N` suffix marks every build this repository produces.

### Added

- `native_usage` status segment: Pi's own footer cluster (`↑13k ↓14k R225k CH98.8% $0.011`) with Pi's exact number formatting and visibility rules. `CH` reports the cache hit rate of the most recent assistant turn, not the session-wide ratio.
- `path_plain` status segment: the working directory the way Pi's footer prints it — no icon, home directory collapsed to `~`, platform separator preserved (`~\Desktop\test\test7`). A faithful port of Pi's `formatCwdForFooter`, verified case by case against the original.
- `context_used` status segment: `11% used | 111.4K/1M`, the context readout without the bracket gauge.
- `usageInput`, `usageOutput`, `usageCacheRead`, `usageCacheHit`, `usageCost`, `contextTokens` and `contextUsed` color tokens, each overridable under `theme.colors`.

### Changed

- The `claude` preset status line is now `[model_effort, native_usage]` on the left and `[path_plain, context_used]` on the right.
- `statusLine.bottomMargin` defaults to `0` (was `1`), so the status row sits flush against the terminal's last line instead of leaving a blank row underneath.
- The status renderer joins the left and right groups with padding alone; a separator there used to be left dangling in front of the gap.
- Per-figure colors for the usage cluster: `↑` red, `↓` orange, `R`/`W` yellow, `CH` Pi's `success` green, `$` cyan; the model name is purple and the directory matches the `used` readout.
- The `claude` preset keeps Pi's built-in startup header (`startup.mode: "off"`) instead of installing the theme's welcome card.
- Package metadata (`repository`, `homepage`, `bugs`) points at this fork.
- `dist/` is committed, so the repository installs as a git source without a build step.

### Removed

- The gallery screenshots under `media/` and the `pi.image` manifest field they fed.

## [1.0.12] - 2026-09-12

### Fixed

- Kept completed `ask_user_question` cards and their selected answers visible instead of collapsing the user's decision record into a generic `used 1 ask_user_question` turn summary.

## [1.0.11] - 2026-09-12

### Fixed

- Standardized user-facing shortcut hints on title-cased, configured keybindings (`Ctrl+O to expand` by default) across special-message blocks, tool previews, diffs, and the working indicator. Remapped and unbound actions now update or hide their hints instead of leaving hard-coded shortcuts behind.

## [1.0.10] - 2026-09-12

### Fixed

- Restored Pi's native, model-aware thinking-level cycle by removing the theme's hard-coded `Shift+Tab` interception. Custom keybindings and model-specific level maps now remain authoritative, non-reasoning models retain Pi's native feedback, and status updates continue through `thinking_level_select`.

## [1.0.9] - 2026-09-05

### Changed

- `/pi-omp-theme doctor` now shows a compact, human-readable health report; use `/pi-omp-theme doctor json` for the complete diagnostic payload.
- Updated the development and release-verification baseline to Pi 0.85.0 while retaining runtime-identity compatibility with unchanged older surfaces.

### Fixed

- Recognized Pi 0.85.0's relocated built-in tool renderer identities so boxed tool calls and results do not fall back to the native renderer; hidden-thinking cleanup also handles Pi's new `MouseRegion` wrapper.
- Scoped compatibility state to each TUI surface and classified fallback causes explicitly, so an intentionally disabled assistant decoration no longer makes configured special blocks look incompatible.

## [1.0.8] - 2026-09-01

### Reverted

- Reverted the v1.0.7 transcript geometry rollout after visual regressions made boxed Bash and error output feel heavier and less polished than the established renderer.
- Restored the complete v1.0.6 rendering behavior, including native custom-tool ownership, the native working indicator, prior box spacing and narrow-width handling, and the Pi 0.84.2 development baseline.

## [1.0.7] - 2026-09-01

### Fixed

- Unified transcript geometry around a shared column contract: top-level frames and markers start at column 0, primary content starts at column 2, and nested content starts at column 4.
- Made compact-box rendering own both call and result presentation for custom tools, preventing native renderer padding from shifting tools such as Web Fetch to the right of Read, List, and Grep.
- Replaced Pi's inset working loader with an aligned public widget while preserving the native working-message fallback on hosts without widget ownership APIs.
- Restored boxed breathing rows that were accidentally omitted in every chrome mode, while light chrome continues to omit frame-only padding.
- Kept boxed rows within narrow terminal budgets instead of forcing the preferred 12-column width when only 11 columns are available.

### Changed

- Updated the development/runtime verification baseline to Pi 0.84.4 and added geometry, custom-renderer, working-row, and real `ToolExecutionComponent` regression coverage.

## [1.0.6] - 2026-08-26

### Fixed

- Kept boxed tool calls open when streamed result output follows a pending call, including calls already above the viewport. Lazy result state and topology-aware viewport caching now prevent stale closing borders and disconnected `Output` dividers.

## [1.0.5] - 2026-08-24

### Fixed

- Recognized Pi 0.84.3's minified bundled-runtime method identities through stable source markers, so message and tool compatibility patches install instead of falling back to Pi's default TUI rendering.

## [1.0.4] - 2026-08-24

### Fixed

- Fixed the host-binding diagnostic for Pi 0.84.3's bundled Node/RPC runtime. The extension loader's virtual host modules are now recognized as the running Pi instead of being mistaken for a second modular package copy; Pi version detection also prefers the actual host entrypoint over a local development peer.
- Removed the hardcoded Pi version allowlist from compatibility reporting. Patches now report live per-surface identity certification and continue to support future versions automatically when their native identities are unchanged.

## [1.0.3] - 2026-08-24

### Added

- Added `CFG-PRESET-OVERRIDE` diagnostics when explicit placement, editor, separator, or status-layout values contradict a coordinated preset and produce a hybrid UI.
- Added regression coverage for host binding, elapsed-ticker cleanup, viewport-aware turn collapse, preset resolution, and narrow-terminal status rendering; `npm test` now runs every compiled `*.test.ts` suite.

### Changed

- Reworked the README configuration example around a preset-first setup and documented when explicit fields intentionally override preset-owned composition.
- The host-binding probe and the global configuration read now start when the extension loads instead of inside `session_start`, and the welcome card reads only the head of each recent session file, so the themed editor, status line, and header replace Pi's native startup frame sooner. Project settings are still read only after `isProjectTrusted()` answers.
- Moved the renderer-viewport facts to `shared/viewport.ts` so surfaces outside the tool renderers can ask whether their rows are still reachable.

### Fixed

- Fixed a full-screen repaint after every `write`, `edit`, and `bash` result. The git refresh handed the welcome card a snapshot without `resources`, flipping its "Tool providers" panel to "No tool providers" at the top of the transcript; once that row had scrolled out of view, pi-tui could only paint the change by clearing the screen and scrollback and replaying the whole transcript (`fullRender: firstChanged < viewportTop (9 < …)`). Every update path now builds the same startup snapshot, and the header only invalidates when the data it paints (model, provider, resources) changes.
- Stopped tool call cards from rewriting rows that have scrolled above pi-tui's viewport. Live elapsed labels and the batch, grep, and semantic-bash panels are rebuilt on every `updateDisplay`, so an out-of-reach card kept forcing the clear-and-replay redraw for the rest of the run; such a card now keeps its painted lines. An explicit `Ctrl+O` expansion still repaints on request. Settlement repaints only for tools whose final output lives in the call card (`read`/`find`/`ls` batches, `grep`, `write`, and parsed semantic-bash cards); tools with a dedicated result component keep the painted call card and settle at the visible result tail. Result bodies are never frozen and keep streaming.
- The per-second elapsed ticker now stops itself once its block leaves the viewport instead of rebuilding a block nobody can see.
- The welcome card stops repainting itself once the transcript has scrolled past it, so a mid-session model switch no longer wipes the scrollback.
- Captured project trust once at session start and reused that decision for configuration loading and runtime state, preventing the two paths from diverging within one session.

## [1.0.2] - 2026-08-24

### Added

- Added a host-binding diagnostic to `/pi-omp-theme doctor`. A foreign Pi module binding now emits one warning and safely withholds incompatible core patches instead of failing silently.
- Added 14 focused Grep renderer regression tests and included them in `npm run check`.

### Fixed

- Fixed blank message and tool surfaces for local-checkout installs by shipping the compiled extension as `dist/extensions/pi-omp-theme.ts`. Pi's jiti loader now consistently applies host aliases so the extension patches the running Pi instance instead of a second local module copy.
- Removed the forced full redraw during initial status-line mounting, preventing startup flashes, scrollback clearing, and terminal-position loss.
- Stopped leaked per-tool elapsed timers at agent and session boundaries; interrupted durations now freeze instead of invalidating the TUI every second.
- Made completed-turn collapsing viewport-aware. Visible tool blocks collapse immediately, while off-screen blocks wait for a natural repaint instead of forcing a full transcript redraw.
- Reworked native Grep and semantic bash `grep`/`rg` previews with strict 6/24-row budgets, breadth-first collapsed selection, expanded context, overlap deduplication, robust path/content parsing, truthful truncation status, explicit empty states, quiet grouped gutters, and OSC-8 file/line links.

### Changed

- Updated the Claude preset context status to show a bracketed progress bar, percentage used, and used/total token counts with pipe separators.
- Updated `npm run package:smoke` to load the built entry through jiti with Pi's host aliases and assert the intentional `.ts` entry and exact npm artifact contents.
- Stopped tracking generated `dist/` bundles in Git; the prepack build still generates and includes the extension in the npm artifact.

## [1.0.1] - 2026-08-23

### Changed

- The welcome card now reports the active Pi coding agent version instead of the extension package version.
- Added Pi gallery preview metadata and a 16:9 package image for `pi.dev/packages`.
- Expanded installation verification, update, uninstall, security, and release documentation.
- Hardened package-smoke coverage for gallery metadata, engine compatibility, manifest integrity, and npm artifact contents.

## [1.0.0] - 2026-08-23

### Added

- Initial stable release of `@nguyenquangthai/pi-omp-theme`.
- Claude-style and OMP-style editor/status presets.
- Titanium dark and light themes.
- Responsive status presentation, compact startup UI, boxed tools, adaptive diffs, quiet-call batching, and completed-turn summaries.
- Deterministic typecheck, architecture, build, and package-smoke gates.

### Changed

- Public package metadata, compiled entry, commands, flags, environment variables, configuration namespace, and exported type identifiers use the `pi-omp-theme` identity; the internal source folder is `extension-src/omp-theme` to avoid shadowing the external repository name.
- The OMP rounded editor keeps autocomplete side borders in the same quiet separator color as the surrounding chrome instead of applying an unrelated primary accent.
- The welcome card top border shows the installed package version instead of repeating the extension name.
- The npm artifact ships only the compiled extension, themes, and release documentation.

### Compatibility

- Core compatibility patches remain opt-in.
- Identity mismatches fall back per surface to native Pi rendering.
