import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const expected = {
  name: "@nguyenquangthai/pi-omp-theme",
  version: manifest.version,
  entry: "./dist/extensions/pi-omp-theme.ts",
  // fork: the metadata points at the fork, not at upstream.
  repository: "git+https://github.com/pureages/pi-omp-theme.git",
  homepage: "https://github.com/pureages/pi-omp-theme#readme",
  bugs: "https://github.com/pureages/pi-omp-theme/issues",
};
assert.equal(manifest.name, expected.name);
assert.equal(manifest.version, expected.version);
assert.equal(manifest.repository?.url, expected.repository);
assert.equal(manifest.homepage, expected.homepage);
assert.equal(manifest.bugs?.url, expected.bugs);
// The fork versions itself on its own line (`1.0.12` upstream -> `1.1.0-fork.N`),
// so the version must never silently fall back to a bare upstream release.
assert.ok(manifest.version.includes("-fork."), "the fork keeps its own version line");
assert.equal(manifest.publishConfig?.access, "public");
assert.equal(manifest.publishConfig?.registry, "https://registry.npmjs.org/");
assert.equal(manifest.engines?.node, ">=22.19.0");
assert.ok(manifest.keywords?.includes("pi-package"), "package must remain discoverable on pi.dev/packages");
assert.deepEqual(manifest.pi?.extensions, [expected.entry]);
assert.deepEqual(manifest.pi?.themes, ["./themes"]);
// fork: no gallery preview. The fork has no screenshots in-tree, and upstream's
// preview would advertise a status line and startup screen this fork no longer
// renders. Leaving the field out is better than showing the wrong UI.
assert.equal(manifest.pi?.image, undefined, "the fork declares no gallery image");
assert.ok(existsSync(expected.entry), `missing compiled extension: ${expected.entry}`);

// Pi loads extensions through jiti. For ESM `.js`/`.mjs` entries jiti tries a
// native import first and only falls back to its transpiling loader — the one
// that maps `@earendil-works/*` onto the running Pi's own modules — when the
// native import fails. A `.js` entry that can natively resolve a
// `node_modules/@earendil-works/pi-coding-agent` next to it (a local checkout
// installed with `pi install <dir>`) binds to a second copy of Pi and every
// prototype patch silently misses the TUI. jiti always transpiles `.ts`, so the
// `.ts` extension is what guarantees the host binding. Keep it.
assert.equal(extname(expected.entry), ".ts", "the compiled entry must keep its .ts extension (host binding)");

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
assert.equal(lock.version, expected.version);
assert.equal(lock.packages?.[""]?.version, expected.version);
assert.equal(lock.packages?.[""]?.engines?.node, manifest.engines.node);

// Load the entry the way Pi does: jiti with Pi's host aliases (built Node mode).
const piPackageJson = resolve("node_modules/@earendil-works/pi-coding-agent/package.json");
const piRequire = createRequire(piPackageJson);
const { createJiti } = piRequire("jiti");
const piEntry = resolve(dirname(piPackageJson), "dist/index.js");
const tuiEntry = fileURLToPath(import.meta.resolve("@earendil-works/pi-tui"));
const jiti = createJiti(pathToFileURL(piPackageJson).href, {
  moduleCache: false,
  alias: {
    "@earendil-works/pi-coding-agent": piEntry,
    "@earendil-works/pi-tui": tuiEntry,
  },
});
const factory = await jiti.import(resolve(expected.entry), { default: true });
assert.equal(typeof factory, "function", "compiled extension must export a default factory");

for (const file of ["themes/titanium.json", "themes/titanium-light.json"]) {
  const theme = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(typeof theme.name, "string", `${file}: missing name`);
  assert.ok(Object.keys(theme.colors ?? {}).length >= 51, `${file}: incomplete color map`);
}

const readme = readFileSync("README.md", "utf8");
for (const match of readme.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
  const target = match[1]?.trim();
  if (!target || target.startsWith("#") || /^[a-z]+:/i.test(target)) continue;
  assert.ok(existsSync(target.split("#")[0]), `README.md: broken local link ${target}`);
}

const npmExecutable = process.env.npm_execpath ? process.execPath : "npm";
const npmArguments = [
  ...(process.env.npm_execpath ? [process.env.npm_execpath] : []),
  "pack",
  "--dry-run",
  "--ignore-scripts",
  "--json",
];
const packed = JSON.parse(
  execFileSync(npmExecutable, npmArguments, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
)[0];
const actualFiles = packed.files.map(({ path }) => path).sort();
const expectedFiles = [
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "dist/extensions/pi-omp-theme.ts",
  "package.json",
  "themes/titanium-light.json",
  "themes/titanium.json",
].sort();
assert.deepEqual(actualFiles, expectedFiles, "npm artifact contains missing or unexpected files");

console.log(`package smoke: ${expected.name}@${expected.version}, ${actualFiles.length} files`);
