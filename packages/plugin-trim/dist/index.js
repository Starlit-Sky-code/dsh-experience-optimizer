import { createRequire } from "node:module";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, appendFile, chmod, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { parse } from "yaml";
import { satisfies, valid } from "semver";
import { scopeOf } from "@deepseek-ai/dsh-scope";
// src/config.ts
/** Defaults used when the loader starts the plugin without an explicit config. */
const DEFAULT_CONFIG = {
	mode: "advise",
	protect: [],
	pinned: [],
	trackUsage: true,
	usageRetentionDays: 30,
	maxDrafts: 20,
	enableDedupe: true,
	persistExcerpts: false,
	tokenRatio: 3.5,
	toolOwners: {},
	compatEnabled: true,
	compatScanAllProfiles: true,
	compatMaxProfiles: 20,
	compatIncludeInfo: false,
	compatMaxFindings: 100,
	compatReadLockfile: true,
	compatReadWorkspace: true,
	compatStrictOfficialOverrides: false,
	compatCacheTtlMs: 3e4
};
/** Merge a partial/undefined loader config over the defaults. */
function normalizeConfig(config) {
	return {
		...DEFAULT_CONFIG,
		...config ?? {}
	};
}
/** Schemastery configuration for the trim plugin. */
const Config = z.object({
	mode: z.union(["advise", "auto-safe"]).default("advise"),
	protect: z.array(z.string()).default([]),
	pinned: z.array(z.string()).default([]),
	trackUsage: z.boolean().default(true),
	usageRetentionDays: z.natural().min(1).max(365).default(30),
	maxDrafts: z.natural().min(1).max(200).default(20),
	enableDedupe: z.boolean().default(true),
	persistExcerpts: z.boolean().default(false),
	tokenRatio: z.number().min(1).max(10).default(3.5),
	toolOwners: z.dict(z.string()).default({}),
	compatEnabled: z.boolean().default(true),
	compatScanAllProfiles: z.boolean().default(true),
	compatMaxProfiles: z.natural().min(1).max(100).default(20),
	compatIncludeInfo: z.boolean().default(false),
	compatMaxFindings: z.natural().min(1).max(500).default(100),
	compatReadLockfile: z.boolean().default(true),
	compatReadWorkspace: z.boolean().default(true),
	compatStrictOfficialOverrides: z.boolean().default(false),
	compatCacheTtlMs: z.natural().min(0).max(6e5).default(3e4)
});
// ../shared-meta/src/ids.ts
/** Create a sortable, readable id such as `trim-20261108-091500-ab12cd34`. */
function newId(prefix, date = /* @__PURE__ */ new Date()) {
	const pad = (n, width = 2) => String(n).padStart(width, "0");
	return `${prefix}-${`${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`}-${randomUUID().slice(0, 8)}`;
}
/** Opaque rollback/snapshot token. */
function randomToken() {
	return randomUUID();
}
/** Stable 12-character content hash used for findings and fingerprints. */
function shortHash(input) {
	return createHash("sha256").update(input).digest("hex").slice(0, 12);
}
// ../shared-meta/src/text.ts
const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
const PUNCT_RE = /[^\p{L}\p{N}\s]/gu;
const SPACE_RE = /\s+/g;
/** Extract visible text from model content blocks without importing DSH types. */
function flattenTextBlocks(blocks) {
	if (!Array.isArray(blocks)) return "";
	const parts = [];
	for (const block of blocks) if (isRecord(block) && block.type === "text" && typeof block.text === "string") parts.push(block.text);
	return parts.join("\n");
}
/** Lowercase, collapse whitespace, and strip punctuation for stable comparison. */
function normalizeLine(text) {
	return text.toLowerCase().replace(SPACE_RE, " ").replace(PUNCT_RE, " ").replace(SPACE_RE, " ").trim();
}
/** Split on blank lines, falling back to non-empty lines. */
function splitParagraphs(text) {
	const paragraphs = text.split(/\n\s*\n/g).map((part) => part.trim()).filter(Boolean);
	if (paragraphs.length > 1) return paragraphs;
	return text.split(/\n/g).map((line) => line.trim()).filter(Boolean);
}
/** CJK-aware token estimate. CJK characters count as one token; other text uses 3.5 chars/token. */
function estimateTokens(text) {
	if (text.length === 0) return 0;
	const cjk = (text.match(CJK_RE) ?? []).length;
	const other = text.length - cjk;
	return cjk + Math.ceil(other / 3.5);
}
/** Truncate without splitting surrogate pairs. */
function truncate(text, max) {
	if (text.length <= max) return text;
	if (max <= 1) return text.slice(0, max);
	return `${text.slice(0, max - 1)}…`;
}
/** Word/CJK bigram-ish tokens used for shingling. CJK runs become single-character tokens. */
function wordTokens(text) {
	const normalized = normalizeLine(text);
	if (!normalized) return [];
	const tokens = [];
	for (const part of normalized.split(" ")) {
		if (!part) continue;
		if (CJK_RE.test(part)) {
			CJK_RE.lastIndex = 0;
			for (const char of part) tokens.push(char);
		} else tokens.push(part);
	}
	return tokens;
}
/** Contiguous n-gram shingles; short inputs produce one shingle. */
function shingles(tokens, n = 3) {
	if (tokens.length === 0) return /* @__PURE__ */ new Set();
	if (tokens.length <= n) return /* @__PURE__ */ new Set([tokens.join(" ")]);
	const result = /* @__PURE__ */ new Set();
	for (let i = 0; i <= tokens.length - n; i++) result.add(tokens.slice(i, i + n).join(" "));
	return result;
}
/** Jaccard similarity of two shingle sets. Empty sets compare as 0. */
function jaccard(a, b) {
	if (a.size === 0 || b.size === 0) return 0;
	let intersection = 0;
	const [small, large] = a.size <= b.size ? [a, b] : [b, a];
	for (const item of small) if (large.has(item)) intersection++;
	return intersection / (a.size + b.size - intersection);
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function uniq(values) {
	return [...new Set(values)];
}
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
function round(value, digits = 2) {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}
/** JSON stringify with sorted object keys, for stable comparisons. */
function stableStringify(value) {
	return JSON.stringify(sortJson(value));
}
function sortJson(value) {
	if (value === null || typeof value === "string" || typeof value === "boolean") return value;
	if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
	if (Array.isArray(value)) return value.map((item) => sortJson(item));
	if (isRecord(value)) {
		const out = {};
		for (const key of Object.keys(value).sort()) out[key] = sortJson(value[key]);
		return out;
	}
	return String(value);
}
/** Structural JSON equality with sorted keys. */
function deepEqualJson(a, b) {
	return stableStringify(a) === stableStringify(b);
}
/** Escape text for one Markdown table cell. */
function escapeMarkdownCell(text) {
	return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}
/** Render a bounded fenced JSON block. */
function jsonBlock(value, maxChars = 12e3) {
	return `\`\`\`json\n${truncate(JSON.stringify(value, null, 2), maxChars)}\n\`\`\``;
}
// ../shared-meta/src/store.ts
/** Local store failure with a stable code. */
var StoreError = class extends Error {
	code;
	constructor(code, message, options) {
		super(message, options);
		this.name = "StoreError";
		this.code = code;
	}
};
/** Resolve the DSH home: `$DSH_HOME`, else `~/.dsh`. */
function resolveDshHome(env = process.env) {
	const configured = env.DSH_HOME?.trim();
	return configured ? resolve(configured) : join(homedir(), ".dsh");
}
/** Join a path under `<dshHome>/experience-optimizer`. */
function dataDir(...segments) {
	return join(resolveDshHome(), "experience-optimizer", ...segments);
}
/** Create a directory with owner-only permissions. */
async function ensureDir(path) {
	await mkdir(path, {
		recursive: true,
		mode: 448
	});
	await chmod(path, 448).catch(() => void 0);
}
async function fileExists(path) {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}
/** Read a UTF-8 text file with an optional byte cap. */
async function readTextFile(path, maxBytes = 5242880) {
	try {
		const info = await stat(path);
		if (info.size > maxBytes) throw new StoreError("too-large", `${path} is ${info.size} bytes (limit ${maxBytes})`);
		return await readFile(path, "utf8");
	} catch (error) {
		if (isNotFound(error)) return void 0;
		throw error;
	}
}
/** Read and parse JSON; missing files return undefined. */
async function readJson(path) {
	const text = await readTextFile(path);
	if (text === void 0) return void 0;
	try {
		return JSON.parse(text);
	} catch (error) {
		throw new StoreError("parse", `invalid JSON at ${path}`, { cause: error });
	}
}
/** Atomically replace a JSON file. */
async function writeJsonAtomic(path, value, mode = 384) {
	const directory = dirname(path);
	await ensureDir(directory);
	const temporary = join(directory, `.${randomUUID()}.tmp`);
	try {
		await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
			encoding: "utf8",
			mode
		});
		await chmod(temporary, mode).catch(() => void 0);
		await rename(temporary, path);
	} catch (error) {
		await unlink(temporary).catch(() => void 0);
		throw new StoreError("write", `cannot write ${path}`, { cause: error });
	}
}
/** Append JSON lines in one batch. */
async function appendJsonl(path, lines) {
	if (lines.length === 0) return;
	await ensureDir(dirname(path));
	const text = lines.map((line) => `${JSON.stringify(line)}\n`).join("");
	try {
		await appendFile(path, text, {
			encoding: "utf8",
			mode: 384
		});
	} catch (error) {
		throw new StoreError("write", `cannot append ${path}`, { cause: error });
	}
}
/** Read JSON lines, skipping malformed records. */
async function readJsonl(path, limit) {
	const text = await readTextFile(path);
	if (text === void 0) return [];
	const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
	const selected = limit === void 0 ? lines : lines.slice(-limit);
	const result = [];
	for (const line of selected) try {
		result.push(JSON.parse(line));
	} catch {}
	return result;
}
/** List JSON files by newest mtime first. */
async function listJsonFiles(directory) {
	let names;
	try {
		names = await readdir(directory);
	} catch (error) {
		if (isNotFound(error)) return [];
		throw error;
	}
	const files = names.filter((name) => name.endsWith(".json")).map((name) => join(directory, name));
	return (await Promise.all(files.map(async (path) => ({
		path,
		mtime: (await stat(path)).mtimeMs
	})))).sort((a, b) => b.mtime - a.mtime).map((item) => item.path);
}
/** Delete oldest files beyond `max`. */
async function pruneToCount(directory, max) {
	const files = await listJsonFiles(directory);
	for (const path of files.slice(Math.max(0, max))) await unlink(path).catch(() => void 0);
}
/** Replace a file atomically with arbitrary text. */
async function writeTextAtomic(path, text, mode = 384) {
	const directory = dirname(path);
	await ensureDir(directory);
	const temporary = join(directory, `.${randomUUID()}.tmp`);
	try {
		await writeFile(temporary, text, {
			encoding: "utf8",
			mode
		});
		await chmod(temporary, mode).catch(() => void 0);
		await rename(temporary, path);
	} catch (error) {
		await unlink(temporary).catch(() => void 0);
		throw new StoreError("write", `cannot write ${path}`, { cause: error });
	}
}
function isNotFound(error) {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
// ../shared-meta/src/audit.ts
const DEFAULT_MAX_BYTES = 2097152;
/** Append-only audit log with one-size rotation. */
var AuditLog = class {
	path;
	rotatedPath;
	maxBytes;
	writes = 0;
	constructor(path = dataDir("audit.jsonl"), maxBytes = DEFAULT_MAX_BYTES) {
		this.path = path;
		this.rotatedPath = path.replace(/\.jsonl$/, ".1.jsonl");
		this.maxBytes = maxBytes;
	}
	/** Append one record; failures are the caller's to report. */
	async append(record) {
		await appendJsonl(this.path, [record]);
		this.writes++;
		if (this.writes % 25 === 0) await this.rotateIfNeeded();
	}
	/** Read the most recent records, oldest first. */
	async read(limit = 50) {
		return readJsonl(this.path, limit);
	}
	async rotateIfNeeded() {
		try {
			if ((await stat(this.path)).size <= this.maxBytes) return;
			await unlink(this.rotatedPath).catch(() => void 0);
			const { rename } = await import("node:fs/promises");
			await rename(this.path, this.rotatedPath);
		} catch {}
	}
};
// src/compat/loader-graph.ts
/** Normalize Cordis `inject` declarations (array or object) to service names. */
function normalizeInject(value) {
	if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
	if (isRecord(value)) return Object.keys(value);
	return [];
}
/** Normalize Cordis `provide` declarations (string, array, or object) to service names. */
function normalizeProvide(value) {
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
	if (isRecord(value)) return Object.keys(value);
	return [];
}
function readModuleExports(namespace) {
	if (!isRecord(namespace)) return {};
	const direct = {
		name: typeof namespace.name === "string" ? namespace.name : void 0,
		inject: namespace.inject,
		provide: namespace.provide,
		default: namespace.default
	};
	if (isRecord(namespace.default)) {
		const fallback = namespace.default;
		direct.name ??= typeof fallback.name === "string" ? fallback.name : void 0;
		direct.inject ??= fallback.inject;
		direct.provide ??= fallback.provide;
	}
	return direct;
}
/** Map Cordis FiberState numbers to the inventory vocabulary. */
function mapFiberState(state) {
	switch (state) {
		case 0: return "pending";
		case 1: return "loading";
		case 2: return "active";
		case 3: return "failed";
		case 5: return "unloading";
		default: return null;
	}
}
function buildInventoryMaps(inventory) {
	const byEntryId = /* @__PURE__ */ new Map();
	const byModule = /* @__PURE__ */ new Map();
	for (const entry of inventory?.entries ?? []) {
		byEntryId.set(entry.entryId, entry);
		if (!byModule.has(entry.moduleName)) byModule.set(entry.moduleName, entry);
	}
	return {
		byEntryId,
		byModule
	};
}
function findInventoryEntry(entry, maps) {
	const id = entry.id;
	return maps.byEntryId.get(id) ?? maps.byEntryId.get(`include:${id}`) ?? maps.byModule.get(entry.options.name);
}
function snapshotFromEntry(entry, maps) {
	const inventory = findInventoryEntry(entry, maps);
	const exports = readModuleExports(entry.moduleNamespace);
	const provide = uniq([...[...entry.fiber?.provisions ?? []].map((impl) => impl.name).filter((name) => typeof name === "string"), ...normalizeProvide(exports.provide)]);
	const inject = uniq([
		...Object.keys(entry.fiber?.inject ?? {}),
		...normalizeInject(entry.options.inject),
		...normalizeInject(exports.inject)
	]);
	return {
		id: entry.id,
		parentId: entry.id.includes(":") ? entry.id.slice(0, entry.id.lastIndexOf(":")) : null,
		depth: entry.id.split(":").length - 1,
		moduleName: entry.options.name,
		pluginName: exports.name,
		enabled: !entry.disabled,
		group: false,
		fiberState: inventory?.fiberPhase ?? mapFiberState(entry.fiber?.state),
		diagnostic: inventory?.diagnostic,
		provide,
		inject,
		config: entry.options.config,
		source: entry.options.name === "@deepseek-ai/dsh-mcp-client" ? "mcp" : "loader",
		mcpServerName: entry.options.name === "@deepseek-ai/dsh-mcp-client" && isRecord(entry.options.config) && typeof entry.options.config.name === "string" ? entry.options.config.name : void 0
	};
}
function flattenPresetRows(rows, presetId, depth, out) {
	if (!Array.isArray(rows)) return;
	for (const raw of rows) {
		if (!isRecord(raw)) continue;
		const row = raw;
		if (typeof row.name !== "string") continue;
		if (row.group === true) {
			flattenPresetRows(row.config, presetId, depth + 1, out);
			continue;
		}
		out.push({
			id: `${presetId}:${row.id ?? row.name}`,
			parentId: presetId,
			depth,
			moduleName: row.name,
			enabled: row.disabled !== true,
			group: false,
			fiberState: null,
			provide: [],
			inject: normalizeInject(row.inject),
			config: row.config,
			source: "preset",
			presetId
		});
	}
}
/** Collect loader, preset, and MCP rows from one Loader tree. */
function collectLoaderGraph(loader, inventory) {
	const entries = [];
	const diagnostics = [];
	if (loader === void 0) {
		diagnostics.push("loader service unavailable; compatibility analysis is degraded");
		return {
			entries,
			diagnostics
		};
	}
	const maps = buildInventoryMaps(inventory);
	try {
		for (const entry of loader.entries()) {
			if (entry.options.group) continue;
			try {
				const snapshot = snapshotFromEntry(entry, maps);
				entries.push(snapshot);
				if (snapshot.moduleName.includes("agent-preset")) {
					const config = entry.options.config;
					if (isRecord(config) && Array.isArray(config.plugins)) {
						const presetId = typeof config.id === "string" ? `preset:${config.id}` : `preset:${entry.id}`;
						const presetRows = [];
						flattenPresetRows(config.plugins, presetId, snapshot.depth + 1, presetRows);
						entries.push(...presetRows);
					}
				}
			} catch (error) {
				diagnostics.push(`loader entry ${entry.id} could not be inspected: ${errorText$1(error)}`);
			}
		}
	} catch (error) {
		diagnostics.push(`loader traversal failed: ${errorText$1(error)}`);
	}
	return {
		entries,
		diagnostics
	};
}
function errorText$1(error) {
	return error instanceof Error ? error.message : String(error);
}
// src/compat/manifests.ts
/** Strip a package subpath to its installable package name. */
function rootPackageName(spec) {
	if (spec.startsWith("@")) {
		const parts = spec.split("/");
		return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
	}
	return spec.split("/")[0] ?? spec;
}
/** True for Node built-ins and Cordis pseudo-specifiers that have no package.json. */
function isResolvablePackage(spec) {
	return spec.length > 0 && !spec.startsWith("cordis:") && !spec.startsWith("node:") && !spec.startsWith(".") && !spec.startsWith("/");
}
/** Resolve package manifests from the profile, the DSH installation, and this module. */
var ManifestResolver = class {
	cache = /* @__PURE__ */ new Map();
	ttlMs;
	profileDir;
	constructor(profileDir, ttlMs = 6e4) {
		this.profileDir = profileDir;
		this.ttlMs = ttlMs;
	}
	async resolve(spec) {
		if (!isResolvablePackage(spec)) return void 0;
		const name = rootPackageName(spec);
		const cached = this.cache.get(name);
		if (cached !== void 0 && Date.now() - cached.at < this.ttlMs) return cached.value;
		const value = await this.resolveFresh(name);
		this.cache.set(name, {
			at: Date.now(),
			value
		});
		return value;
	}
	async resolveFresh(name) {
		for (const candidate of this.candidatePaths(name)) try {
			const path = candidate();
			if (path === void 0) continue;
			const manifest = await readJson(path);
			if (manifest !== void 0 && typeof manifest === "object") return {
				path,
				manifest
			};
		} catch {}
	}
	candidatePaths(name) {
		const spec = `${name}/package.json`;
		const profileRequire = createRequire(join(this.profileDir, "package.json"));
		const argvBase = process.argv[1];
		const installRequire = argvBase !== void 0 && isAbsolute(argvBase) ? createRequire(argvBase) : void 0;
		const here = createRequire(import.meta.url);
		const candidates = [() => profileRequire.resolve(spec), () => here.resolve(spec)];
		if (installRequire !== void 0) candidates.splice(1, 0, () => installRequire.resolve(spec, { paths: [dirname(argvBase), process.cwd()] }));
		return candidates;
	}
};
/** Read a version string from a manifest without trusting its type. */
function manifestVersion(manifest) {
	return typeof manifest?.version === "string" ? manifest.version : void 0;
}
/** Supported platforms from `dsh.bundle.platforms`; empty means all platforms. */
function manifestPlatforms(manifest) {
	const platforms = manifest?.dsh?.bundle?.platforms;
	return Array.isArray(platforms) ? platforms.filter((item) => typeof item === "string") : [];
}
/** Engine ranges, keeping only string values. */
function manifestEngines(manifest) {
	const engines = manifest?.engines;
	if (engines === void 0 || engines === null || typeof engines !== "object") return {};
	const out = {};
	for (const [key, value] of Object.entries(engines)) if (typeof value === "string") out[key] = value;
	return out;
}
/** Peer dependency ranges, keeping only string values. */
function manifestPeers(manifest) {
	const peers = manifest?.peerDependencies;
	if (peers === void 0 || peers === null || typeof peers !== "object") return {};
	const out = {};
	for (const [key, value] of Object.entries(peers)) if (typeof value === "string") out[key] = value;
	return out;
}
/** Read `dsh.bundle.patch` paths. */
function manifestPatchPaths(manifest) {
	const patch = manifest?.dsh?.bundle?.patch;
	if (typeof patch === "string") return [patch];
	if (Array.isArray(patch)) return patch.filter((item) => typeof item === "string");
	return [];
}
/** Resolve a bundle directory from its manifest path. */
function manifestDir(resolved) {
	return resolved === void 0 ? void 0 : dirname(resolved.path);
}
// src/compat/patches.ts
const jsSentinelTag = {
	tag: "tag:yaml.org,2002:js",
	resolve: (value) => ({ __js: value })
};
/** True when a value is the non-executed `!!js` placeholder. */
function isJsSentinel(value) {
	return isRecord(value) && typeof value.__js === "string";
}
/** Parse one patch file without executing `!!js` expressions. */
function parsePatchText(text, layer, sourceFile) {
	let parsed;
	try {
		parsed = parse(text, { customTags: [jsSentinelTag] });
	} catch (error) {
		return {
			rows: scanPatchFallback(text, layer, sourceFile),
			error: errorText$1(error)
		};
	}
	const rows = [];
	flattenPatch(parsed, layer, sourceFile, rows);
	return { rows };
}
function flattenPatch(value, layer, sourceFile, out) {
	if (Array.isArray(value)) {
		for (const item of value) flattenPatch(item, layer, sourceFile, out);
		return;
	}
	if (!isRecord(value)) return;
	if (Array.isArray(value.insert)) flattenPatch(value.insert, layer, sourceFile, out);
	else if (isRecord(value.insert)) flattenPatch(value.insert, layer, sourceFile, out);
	if (typeof value.id === "string") out.push({
		layer,
		id: value.id,
		name: typeof value.name === "string" ? value.name : void 0,
		disabled: typeof value.disabled === "boolean" || isJsSentinel(value.disabled) ? value.disabled : void 0,
		config: value.config,
		sourceFile
	});
}
/** Last-resort line scanner; only extracts ids and names. */
function scanPatchFallback(text, layer, sourceFile) {
	const rows = [];
	let current;
	for (const line of text.split(/\r?\n/)) {
		const id = /^\s*-\s*id:\s*['"]?([^'"\s]+)['"]?\s*$/.exec(line);
		if (id?.[1] !== void 0) {
			current = {
				layer,
				id: id[1],
				sourceFile
			};
			rows.push(current);
			continue;
		}
		const name = /^\s*name:\s*['"]?([^'"\s]+)['"]?\s*$/.exec(line);
		if (name?.[1] !== void 0 && current !== void 0) current.name = name[1];
	}
	return rows;
}
/** Read all patch layers for a profile without evaluating expressions. */
async function readProfilePatchLayers(options) {
	const rows = [];
	const diagnostics = [];
	const resolver = new ManifestResolver(options.profileDir);
	for (const bundle of options.bundles) {
		const resolved = await resolver.resolve(bundle);
		const manifest = options.manifests.get(bundle) ?? resolved?.manifest;
		const dir = manifestDir(resolved);
		for (const relative of manifestPatchPaths(manifest)) {
			const path = dir === void 0 ? relative : join(dir, relative);
			const text = await readTextFile(path).catch(() => void 0);
			if (text === void 0) {
				diagnostics.push(`patch unreadable: ${path}`);
				continue;
			}
			const result = parsePatchText(text, bundle, path);
			rows.push(...result.rows);
			if (result.error !== void 0) diagnostics.push(`patch parse fallback (${path}): ${result.error}`);
		}
	}
	for (const [layer, path] of [["profile", join(options.profileDir, "cordis.patch.yml")], ["home", join(options.dshHome, "cordis.patch.yml")]]) {
		const text = await readTextFile(path).catch(() => void 0);
		if (text === void 0) continue;
		const result = parsePatchText(text, layer, path);
		rows.push(...result.rows);
		if (result.error !== void 0) diagnostics.push(`patch parse fallback (${path}): ${result.error}`);
	}
	return {
		rows,
		diagnostics
	};
}
/** Find the same row id configured with different values across layers. */
function findConfigConflicts(rows, options = {}) {
	const byId = /* @__PURE__ */ new Map();
	for (const row of rows) {
		if (options.skipLayer?.(row.layer) === true) continue;
		const list = byId.get(row.id) ?? [];
		list.push(row);
		byId.set(row.id, list);
	}
	const conflicts = [];
	for (const [id, list] of byId) {
		const withConfig = list.filter((row) => row.config !== void 0);
		if (withConfig.length < 2) continue;
		const first = withConfig[0]?.config;
		if (first === void 0) continue;
		if (withConfig.some((row) => !deepEqualJson(first, row.config))) conflicts.push({
			id,
			layers: withConfig.map((row) => row.layer),
			values: withConfig.map((row) => row.config)
		});
	}
	return conflicts;
}
// src/compat/lockfile.ts
/** Parse a pnpm lockfile package key, dropping peer suffixes and protocols. */
function parsePackageKey(key) {
	const clean = key.replace(/\(.*\)$/, "").trim();
	const at = clean.lastIndexOf("@");
	if (at <= 0) return void 0;
	const name = clean.slice(0, at);
	let version = clean.slice(at + 1);
	version = version.replace(/^npm:/, "");
	if (version.length === 0 || version.includes("/")) return void 0;
	if (valid(version) === null) return void 0;
	return {
		name,
		version
	};
}
/** Group lockfile package keys by package name. */
function summarizeLockfile(path, text) {
	const summary = {
		path,
		packageVersions: {},
		dshVersions: {}
	};
	let parsed;
	try {
		parsed = parse(text);
	} catch (error) {
		summary.parseError = errorText$1(error);
		return summary;
	}
	if (parsed === null || typeof parsed !== "object") return summary;
	const packages = parsed.packages;
	if (packages === null || typeof packages !== "object") return summary;
	for (const key of Object.keys(packages)) {
		const parsedKey = parsePackageKey(key);
		if (parsedKey === void 0) continue;
		const versions = summary.packageVersions[parsedKey.name] ?? [];
		if (!versions.includes(parsedKey.version)) versions.push(parsedKey.version);
		summary.packageVersions[parsedKey.name] = versions;
		if (parsedKey.name.startsWith("@deepseek-ai/dsh")) {
			const dshVersions = summary.dshVersions[parsedKey.name] ?? [];
			if (!dshVersions.includes(parsedKey.version)) dshVersions.push(parsedKey.version);
			summary.dshVersions[parsedKey.name] = dshVersions;
		}
	}
	return summary;
}
/** Read and summarize a profile's pnpm lockfile. */
async function readLockfile(path) {
	const text = await readTextFile(path, 5242880).catch(() => void 0);
	if (text === void 0) return void 0;
	return summarizeLockfile(path, text);
}
/** Package names with more than one resolved version. */
function duplicateVersions(summary) {
	return Object.entries(summary.packageVersions).filter(([, versions]) => versions.length > 1).map(([name, versions]) => ({
		name,
		versions
	}));
}
// src/compat/profiles.ts
const PACKAGE_NAME_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
/** Read `<profile>/compatibility.json` with the same validation rules as DSH app-boot. */
async function readCompatibilityFile(profileDir) {
	const path = join(profileDir, "compatibility.json");
	const text = await readTextFile(path, 1048576).catch(() => void 0);
	if (text === void 0) return {
		exemptions: {},
		warnings: [],
		rewritable: true
	};
	let value;
	try {
		value = JSON.parse(text);
	} catch (error) {
		return {
			exemptions: {},
			warnings: [`${path} is not valid JSON (${errorText$1(error)}); treating the profile as having no exemptions`],
			rewritable: false
		};
	}
	if (value === null || typeof value !== "object" || Array.isArray(value)) return {
		exemptions: {},
		warnings: [`${path} must map exact package@version keys to DSH version lists`],
		rewritable: false
	};
	const exemptions = {};
	const warnings = [];
	for (const [key, versions] of Object.entries(value)) {
		const separator = key.lastIndexOf("@");
		if (separator <= 0 || !PACKAGE_NAME_RE.test(key.slice(0, separator)) || valid(key.slice(separator + 1)) === null) {
			warnings.push(`${path}: ${JSON.stringify(key)} is not an exact package-name@version key; ignored`);
			continue;
		}
		if (!Array.isArray(versions) || versions.some((item) => typeof item !== "string" || valid(item) === null)) {
			warnings.push(`${path}: ${key} must contain a list of exact DSH versions; ignored`);
			continue;
		}
		exemptions[key] = versions;
	}
	return {
		exemptions,
		warnings,
		rewritable: warnings.length === 0
	};
}
/** Read one profile directory's manifest facts. */
async function readProfileRaw(profileDir, name) {
	const pkg = await readJson(join(profileDir, "package.json")).catch(() => void 0);
	const bundles = Array.isArray(pkg?.dsh?.profile?.bundles) ? pkg.dsh.profile.bundles.filter((item) => typeof item === "string") : [];
	const dependencies = pkg?.dependencies !== void 0 && pkg.dependencies !== null && typeof pkg.dependencies === "object" ? Object.fromEntries(Object.entries(pkg.dependencies).filter((entry) => typeof entry[1] === "string")) : {};
	const patchRows = [];
	const patchPath = join(profileDir, "cordis.patch.yml");
	const patchText = await readTextFile(patchPath).catch(() => void 0);
	if (patchText !== void 0) {
		const result = parsePatchText(patchText, "profile", patchPath);
		patchRows.push(...result.rows);
	}
	const compatibility = await readCompatibilityFile(profileDir);
	const resolver = new ManifestResolver(profileDir);
	const manifestVersions = {};
	for (const bundle of bundles.slice(0, 100)) manifestVersions[bundle] = manifestVersion((await resolver.resolve(bundle))?.manifest);
	return {
		name,
		dir: profileDir,
		bundles,
		dependencies,
		patchRows,
		exemptions: compatibility.exemptions,
		compatibilityWarnings: compatibility.warnings,
		compatibilityRewritable: compatibility.rewritable,
		manifestVersions
	};
}
/** Scan profile directories under `<dshHome>/profiles`. */
async function scanProfiles(profilesDir, maxProfiles) {
	const diagnostics = [];
	let names;
	try {
		names = (await readdir(profilesDir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
	} catch {
		return {
			profiles: [],
			diagnostics: [`profiles directory unavailable: ${profilesDir}`]
		};
	}
	const selected = names.slice(0, maxProfiles);
	if (names.length > selected.length) diagnostics.push(`profile scan truncated to ${selected.length} of ${names.length}`);
	const profiles = [];
	for (const name of selected) {
		const dir = join(profilesDir, name);
		try {
			profiles.push(await readProfileRaw(dir, name));
		} catch (error) {
			diagnostics.push(`profile ${name} unreadable: ${errorText$1(error)}`);
		}
	}
	return {
		profiles,
		diagnostics
	};
}
/** Collect workspace instruction files without scanning the whole project. */
async function readWorkspace(cwd, dshHome, agentsHome = process.env.DSH_AGENTS_HOME?.trim() || join(homedir(), ".agents")) {
	const candidates = [];
	const seen = /* @__PURE__ */ new Set();
	const add = (path) => {
		if (seen.has(path)) return;
		seen.add(path);
		candidates.push(path);
	};
	let directory = resolve(cwd);
	for (let depth = 0; depth < 8; depth++) {
		add(join(directory, "AGENTS.md"));
		add(join(directory, "CLAUDE.md"));
		add(join(directory, "AGENTS.local.md"));
		add(join(directory, "CLAUDE.local.md"));
		const parent = dirname(directory);
		if (parent === directory) break;
		try {
			await stat(join(directory, ".git"));
			break;
		} catch {
			directory = parent;
		}
	}
	add(join(dshHome, "AGENTS.md"));
	add(join(agentsHome, "AGENTS.md"));
	const instructionFiles = [];
	const instructions = [];
	for (const file of candidates) {
		const text = await readTextFile(file, 2097152).catch(() => void 0);
		if (text === void 0 || text.trim().length === 0) continue;
		instructionFiles.push(file);
		instructions.push({
			file,
			text
		});
	}
	return {
		cwd: resolve(cwd),
		instructionFiles,
		instructions
	};
}
// src/compat/runtime-check.ts
function safeSatisfies(version, range) {
	try {
		return satisfies(version, range, { includePrerelease: true });
	} catch {
		return false;
	}
}
let appBootPromise;
/** Load app-boot lazily; compatibility analysis degrades if its peers are unavailable. */
async function loadAppBoot() {
	appBootPromise ??= import("@deepseek-ai/dsh-app-boot").then((module) => module).catch(() => void 0);
	return appBootPromise;
}
/** Runtime version, preferring the official helper. */
async function getRuntimeVersion() {
	const appBoot = await loadAppBoot();
	try {
		const version = appBoot?.getDshRuntimeVersion?.();
		if (typeof version === "string" && version.length > 0) return version;
	} catch {}
	try {
		const argvBase = process.argv[1] ?? process.cwd();
		const require = createRequire(argvBase);
		const pkg = require(require.resolve("@deepseek-ai/dsh/package.json", { paths: [dirname(argvBase), process.cwd()] }));
		if (typeof pkg.version === "string") return pkg.version;
	} catch {}
	return process.env.DSH_VERSION ?? "0.0.0";
}
/** Check one manifest against the DSH runtime, using app-boot when available. */
async function evaluateCompatibility(manifest, exemptions, runtimeVersion, fallbackName, fallbackVersion) {
	const appBoot = await loadAppBoot();
	if (typeof appBoot?.evaluatePluginCompatibility === "function") try {
		const result = appBoot.evaluatePluginCompatibility(manifest, exemptions, runtimeVersion);
		if (result !== void 0) return result;
	} catch {}
	return evaluateCompatibilityLocal(manifest, exemptions, runtimeVersion, fallbackName, fallbackVersion);
}
/** Local mirror of app-boot's requirement evaluation, used when app-boot is unavailable. */
function evaluateCompatibilityLocal(manifest, exemptions, runtimeVersion, fallbackName, fallbackVersion) {
	const requirements = {};
	const engines = manifestEngines(manifest);
	if (typeof engines.dsh === "string") {
		if (!safeSatisfies(runtimeVersion, engines.dsh)) requirements["engines.dsh"] = engines.dsh;
	} else for (const [name, range] of Object.entries(manifestPeers(manifest))) {
		if (name !== "@deepseek-ai/dsh" && !name.startsWith("@deepseek-ai/dsh-")) continue;
		if (!safeSatisfies(runtimeVersion, [
			"workspace:^",
			"workspace:~",
			"workspace:*"
		].includes(range) ? runtimeVersion : range)) requirements[name] = range;
	}
	if (Object.keys(requirements).length === 0) return void 0;
	const name = typeof manifest.name === "string" ? manifest.name : fallbackName ?? "unknown";
	const version = typeof manifest.version === "string" ? manifest.version : fallbackVersion ?? "0.0.0";
	return {
		name,
		version,
		runtimeVersion,
		requirements,
		exempted: exemptions[`${name}@${version}`]?.includes(runtimeVersion) === true
	};
}
/** Check `engines.node` against the running Node. */
function checkNodeEngine(manifest, nodeVersion) {
	const range = manifestEngines(manifest).node;
	if (typeof range !== "string") return void 0;
	return safeSatisfies(nodeVersion, range) ? void 0 : range;
}
/** Unsupported platform list, or undefined when the bundle supports the current platform. */
function checkPlatform(manifest, platform) {
	const platforms = manifestPlatforms(manifest);
	if (platforms.length === 0) return void 0;
	return platforms.includes(platform) ? void 0 : platforms;
}
// src/compat/context.ts
/** Read the profile manifest facts without failing the whole scan. */
async function readProfileManifestFacts(profileDir) {
	const pkg = await readJson(join(profileDir, "package.json")).catch(() => void 0);
	return {
		bundles: Array.isArray(pkg?.dsh?.profile?.bundles) ? pkg.dsh.profile.bundles.filter((item) => typeof item === "string") : [],
		dependencies: pkg?.dependencies !== void 0 && pkg.dependencies !== null ? Object.fromEntries(Object.entries(pkg.dependencies).filter((entry) => typeof entry[1] === "string")) : {}
	};
}
/** Collect loader, plugin-manager, prompt, profile, lockfile, and workspace facts. */
async function collectCompatContext(options) {
	const diagnostics = [];
	const facts = options.bundleNames === void 0 ? await readProfileManifestFacts(options.profileDir) : {
		bundles: [...options.bundleNames],
		dependencies: options.dependencies ?? (await readProfileManifestFacts(options.profileDir)).dependencies
	};
	const runtime = {
		dshVersion: options.runtime?.dshVersion ?? await getRuntimeVersion(),
		nodeVersion: options.runtime?.nodeVersion ?? process.versions.node,
		platform: options.runtime?.platform ?? process.platform,
		arch: options.runtime?.arch ?? process.arch
	};
	let inventorySnapshot;
	if (options.inventory !== void 0) try {
		inventorySnapshot = await options.inventory.list();
	} catch (error) {
		diagnostics.push(`plugin inventory unavailable: ${errorText$1(error)}`);
	}
	const graph = collectLoaderGraph(options.loader, inventorySnapshot);
	diagnostics.push(...graph.diagnostics);
	let bundles = [];
	let entriesInfo = [];
	let exemptions = {};
	if (options.pluginManager !== void 0) {
		try {
			bundles = await options.pluginManager.listBundles();
		} catch (error) {
			diagnostics.push(`listBundles failed: ${errorText$1(error)}`);
		}
		try {
			entriesInfo = await options.pluginManager.listPlugins();
		} catch (error) {
			diagnostics.push(`listPlugins failed: ${errorText$1(error)}`);
		}
		try {
			exemptions = options.pluginManager.listVersionExemptions().exemptions;
		} catch (error) {
			diagnostics.push(`listVersionExemptions failed: ${errorText$1(error)}`);
		}
	} else diagnostics.push("pluginManager unavailable; compatibility analysis is read-only static mode");
	const profileRaw = await readProfileRaw(options.profileDir, options.profileName).catch((error) => {
		diagnostics.push(`current profile unreadable: ${errorText$1(error)}`);
	});
	const allBundleNames = [.../* @__PURE__ */ new Set([
		...facts.bundles,
		...profileRaw?.bundles ?? [],
		...bundles.map((bundle) => bundle.name),
		...graph.entries.filter((entry) => entry.source === "loader").map((entry) => rootPackageName(entry.moduleName))
	])].slice(0, 200);
	const manifestResolver = new ManifestResolver(options.profileDir, 6e4);
	const manifests = /* @__PURE__ */ new Map();
	for (const name of allBundleNames) {
		const resolved = await manifestResolver.resolve(name);
		manifests.set(rootPackageName(name), resolved?.manifest);
	}
	let patchRows = profileRaw?.patchRows ?? [];
	if (facts.bundles.length > 0) try {
		const patchResult = await readProfilePatchLayers({
			profileDir: options.profileDir,
			dshHome: options.dshHome,
			bundles: facts.bundles,
			manifests
		});
		patchRows = patchResult.rows;
		diagnostics.push(...patchResult.diagnostics);
	} catch (error) {
		diagnostics.push(`patch layer read failed: ${errorText$1(error)}`);
	}
	let lockfile;
	if (options.config.compatReadLockfile) {
		lockfile = await readLockfile(join(options.profileDir, "pnpm-lock.yaml"));
		if (lockfile?.parseError !== void 0) diagnostics.push(`lockfile parse failed: ${lockfile.parseError}`);
	}
	let profiles = profileRaw === void 0 ? [] : [profileRaw];
	if (options.config.compatScanAllProfiles) {
		const scanned = await scanProfiles(join(options.dshHome, "profiles"), options.config.compatMaxProfiles);
		diagnostics.push(...scanned.diagnostics);
		profiles = scanned.profiles.map((profile) => profile.name === options.profileName && profileRaw !== void 0 ? {
			...profile,
			patchRows,
			exemptions: {
				...profile.exemptions,
				...exemptions
			}
		} : profile);
		if (profiles.length === 0 && profileRaw !== void 0) profiles = [profileRaw];
	}
	const workspace = options.config.compatReadWorkspace ? await readWorkspace(options.cwd, options.dshHome) : {
		cwd: options.cwd,
		instructionFiles: [],
		instructions: []
	};
	let prompt;
	if (options.prompt !== void 0) try {
		prompt = await options.prompt.assemble(options.agent, options.toolSet);
	} catch (error) {
		diagnostics.push(`prompt assembly unavailable: ${errorText$1(error)}`);
	}
	return {
		runtime,
		config: options.config,
		profile: {
			name: options.profileName,
			dir: options.profileDir,
			bundles: facts.bundles.length > 0 ? facts.bundles : profileRaw?.bundles ?? [],
			dependencies: facts.dependencies,
			patchRows,
			exemptions: {
				...profileRaw?.exemptions ?? {},
				...exemptions
			},
			compatibilityWarnings: profileRaw?.compatibilityWarnings ?? [],
			compatibilityRewritable: profileRaw?.compatibilityRewritable ?? true
		},
		loaderEntries: graph.entries,
		bundles,
		entriesInfo,
		inventory: inventorySnapshot,
		manifests,
		lockfile,
		profiles,
		workspace,
		prompt,
		diagnostics
	};
}
// src/compat/adapters.ts
/** Resolve the current profile facts from Cordis, falling back to environment/defaults. */
function resolveProfileFacts(ctx, agent) {
	const profileContext = safeGet(ctx, "profileContext");
	const name = typeof profileContext?.name === "string" ? profileContext.name : process.env.DSH_PROFILE?.trim() || "web";
	const dshHome = typeof profileContext?.home === "string" && profileContext.home.length > 0 ? profileContext.home : resolveDshHome();
	return {
		name,
		dir: typeof profileContext?.dir === "string" && profileContext.dir.length > 0 ? profileContext.dir : join(dshHome, "profiles", name),
		dshHome,
		cwd: typeof profileContext?.cwd === "string" && profileContext.cwd.length > 0 ? profileContext.cwd : sessionCwd(agent) ?? process.cwd(),
		bundles: Array.isArray(profileContext?.startedBundles) ? profileContext.startedBundles.filter((item) => typeof item === "string") : void 0
	};
}
function sessionCwd(agent) {
	if (!isObject(agent)) return void 0;
	const session = agent.session;
	if (!isObject(session)) return void 0;
	const header = session.header;
	if (!isObject(header)) return void 0;
	return typeof header.cwd === "string" ? header.cwd : void 0;
}
function getPluginManager(ctx) {
	return safeGet(ctx, "pluginManager");
}
function getInventory(ctx) {
	return safeGet(ctx, "pluginInventory");
}
function getLoader(ctx) {
	return safeGet(ctx, "loader");
}
/** Build a prompt adapter that preserves the agent scope and step tool set. */
function getPromptAdapter(ctx, agent) {
	const systemPrompt = safeGet(ctx, "systemPrompt");
	if (typeof systemPrompt?.assemble !== "function") return void 0;
	let scope;
	if (isObject(agent) && isObject(agent.ctx)) try {
		scope = scopeOf(agent.ctx);
	} catch {
		scope = void 0;
	}
	return { async assemble(agentArg, toolSet) {
		const assembly = await systemPrompt.assemble({
			agent: agentArg,
			scope,
			toolSet
		});
		return isObject(assembly) ? assembly : void 0;
	} };
}
/** Narrow a config-like object for the compat collector. */
function toCompatConfig(config) {
	return {
		compatEnabled: config.compatEnabled,
		compatScanAllProfiles: config.compatScanAllProfiles,
		compatMaxProfiles: config.compatMaxProfiles,
		compatIncludeInfo: config.compatIncludeInfo,
		compatMaxFindings: config.compatMaxFindings,
		compatReadLockfile: config.compatReadLockfile,
		compatReadWorkspace: config.compatReadWorkspace,
		compatStrictOfficialOverrides: config.compatStrictOfficialOverrides,
		compatCacheTtlMs: config.compatCacheTtlMs,
		toolOwners: config.toolOwners
	};
}
function safeGet(ctx, key) {
	try {
		return ctx.get(key);
	} catch {
		return;
	}
}
function isObject(value) {
	return typeof value === "object" && value !== null;
}
// src/compat/finding.ts
/** Build a finding with a deterministic id and deduplicated subjects/evidence. */
function makeFinding(input) {
	const subjects = uniq(input.subjects.filter((subject) => subject.length > 0)).sort();
	const evidence = dedupeEvidence(input.evidence);
	return {
		id: shortHash(`${input.code}|${subjects.join("|")}`),
		domain: input.domain,
		code: input.code,
		severity: input.severity,
		title: input.title,
		subjects,
		evidence,
		confidence: input.confidence ?? "high",
		fix: input.fix,
		autoApplicable: input.autoApplicable ?? false
	};
}
function dedupeEvidence(evidence) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const item of evidence) {
		const key = `${item.source}|${item.ref ?? ""}|${item.summary}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(item);
	}
	return out;
}
const SEVERITY_RANK = {
	error: 0,
	warn: 1,
	info: 2
};
/** Sort findings by severity, domain, code, and subjects. */
function sortFindings(findings) {
	return [...findings].sort((a, b) => {
		const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
		if (severity !== 0) return severity;
		const domain = a.domain.localeCompare(b.domain);
		if (domain !== 0) return domain;
		const code = a.code.localeCompare(b.code);
		if (code !== 0) return code;
		return a.subjects.join("|").localeCompare(b.subjects.join("|"));
	});
}
/** Merge duplicate findings with the same id, unioning evidence. */
function dedupeFindings(findings) {
	const byId = /* @__PURE__ */ new Map();
	for (const finding of findings) {
		const existing = byId.get(finding.id);
		if (existing === void 0) {
			byId.set(finding.id, finding);
			continue;
		}
		const subjects = uniq([...existing.subjects, ...finding.subjects]).sort();
		byId.set(finding.id, {
			...existing,
			subjects,
			evidence: dedupeEvidence([...existing.evidence, ...finding.evidence]),
			fix: existing.fix ?? finding.fix,
			autoApplicable: existing.autoApplicable || finding.autoApplicable,
			severity: SEVERITY_RANK[finding.severity] < SEVERITY_RANK[existing.severity] ? finding.severity : existing.severity
		});
	}
	return [...byId.values()];
}
/** Group findings by subject for trim integration. */
function findingsBySubject(findings) {
	const map = /* @__PURE__ */ new Map();
	for (const finding of findings) for (const subject of finding.subjects) {
		const list = map.get(subject) ?? [];
		list.push(finding);
		map.set(subject, list);
	}
	return map;
}
// src/compat/rules-runtime.ts
const INCOMPATIBLE_DIAGNOSTIC_RE = /incompatib|version requirement|peer dependenc/i;
/** Plugin ↔ DSH runtime, Node, platform, exemptions, and duplicate DSH copies. */
async function runRuntimeRules(context) {
	const findings = [];
	const selected = new Set(context.profile.bundles.map((name) => rootPackageName(name)));
	for (const bundle of context.bundles) {
		const name = rootPackageName(bundle.name);
		const manifest = context.manifests.get(name);
		const subjects = [name];
		if (manifest === void 0) {
			if (bundle.error?.incompatible !== void 0 && bundle.error.incompatible.length > 0) for (const incompatible of bundle.error.incompatible) findings.push(makeFinding({
				domain: "plugin-runtime",
				code: "RT_PREFLIGHT_DENIED",
				severity: "error",
				title: `${incompatible.name} was denied by the DSH compatibility preflight`,
				subjects: [incompatible.name],
				confidence: "high",
				evidence: [{
					source: "plugin-manager",
					ref: `${incompatible.name}@${incompatible.version}`,
					summary: `requires ${JSON.stringify(incompatible.requirements)} on dsh ${incompatible.runtimeVersion}`
				}],
				fix: {
					kind: "update",
					summary: "update the plugin or DSH, or grant an exact-version exemption after accepting the risk",
					safe: false,
					requiresConsent: true
				}
			}));
			if (bundle.error?.code === "unsupported-platform") findings.push(makeFinding({
				domain: "plugin-runtime",
				code: "RT_PLATFORM_UNSUPPORTED",
				severity: "error",
				title: `${name} does not support this platform`,
				subjects,
				confidence: "high",
				evidence: [{
					source: "plugin-manager",
					ref: name,
					summary: `bundle reports unsupported-platform for ${context.runtime.platform}`
				}],
				fix: {
					kind: "disable",
					summary: "disable the optional bundle on this platform",
					safe: true,
					target: name,
					requiresConsent: true
				}
			}));
			if ((bundle.enabled || bundle.installed) && bundle.error?.code !== "unsupported-platform" && !bundle.error?.incompatible?.length) findings.push(makeFinding({
				domain: "plugin-runtime",
				code: "RT_MANIFEST_UNAVAILABLE",
				severity: "info",
				title: `${name} manifest could not be resolved`,
				subjects,
				confidence: "low",
				evidence: [{
					source: "manifest",
					ref: name,
					summary: "runtime manifest checks were skipped for this bundle"
				}],
				fix: {
					kind: "none",
					summary: "no action; manifest resolution is best-effort",
					safe: true,
					requiresConsent: false
				}
			}));
			continue;
		}
		const issue = await evaluateCompatibility(manifest, context.profile.exemptions, context.runtime.dshVersion, name, bundle.version);
		if (issue !== void 0) for (const [requirement, range] of Object.entries(issue.requirements)) {
			const isEngine = requirement === "engines.dsh";
			if (issue.exempted) findings.push(makeFinding({
				domain: "plugin-runtime",
				code: "RT_EXEMPTION_ACTIVE",
				severity: "warn",
				title: `${issue.name}@${issue.version} runs under an exact-version exemption`,
				subjects: [issue.name],
				confidence: "high",
				evidence: [{
					source: "plugin-manager",
					ref: `${issue.name}@${issue.version}`,
					summary: `${requirement} ${range} does not match dsh ${issue.runtimeVersion}; exemption is active`
				}],
				fix: {
					kind: "update",
					summary: "prefer updating the plugin; keep the exemption only as an informed risk",
					safe: false,
					requiresConsent: true
				}
			}));
			else findings.push(makeFinding({
				domain: "plugin-runtime",
				code: isEngine ? "RT_ENGINE_UNMET" : "RT_PEER_UNMET",
				severity: "error",
				title: `${issue.name}@${issue.version} is incompatible with dsh ${issue.runtimeVersion}`,
				subjects: [issue.name],
				confidence: "high",
				evidence: [{
					source: "manifest",
					ref: `${issue.name}@${issue.version}`,
					summary: `${requirement} ${range} does not match dsh ${issue.runtimeVersion}`
				}],
				fix: {
					kind: "update",
					summary: "update the plugin or DSH; an exact-version exemption requires explicit risk acceptance",
					safe: false,
					requiresConsent: true
				}
			}));
		}
		const nodeRange = checkNodeEngine(manifest, context.runtime.nodeVersion);
		if (nodeRange !== void 0) findings.push(makeFinding({
			domain: "plugin-runtime",
			code: "RT_NODE_UNMET",
			severity: "error",
			title: `${name} does not support Node ${context.runtime.nodeVersion}`,
			subjects,
			confidence: "high",
			evidence: [{
				source: "manifest",
				ref: name,
				summary: `engines.node ${nodeRange} does not match Node ${context.runtime.nodeVersion}`
			}],
			fix: {
				kind: "update",
				summary: "switch Node or update the plugin",
				safe: false,
				requiresConsent: true
			}
		}));
		const platforms = checkPlatform(manifest, context.runtime.platform);
		if (platforms !== void 0) findings.push(makeFinding({
			domain: "plugin-runtime",
			code: "RT_PLATFORM_UNSUPPORTED",
			severity: "error",
			title: `${name} does not support ${context.runtime.platform}`,
			subjects,
			confidence: "high",
			evidence: [{
				source: "manifest",
				ref: name,
				summary: `dsh.bundle.platforms ${JSON.stringify(platforms)} excludes ${context.runtime.platform}`
			}],
			fix: {
				kind: "disable",
				summary: "disable the optional bundle on this platform",
				safe: true,
				target: name,
				requiresConsent: true
			}
		}));
	}
	for (const entry of context.entriesInfo) {
		if (typeof entry.diagnostic !== "string") continue;
		if (!INCOMPATIBLE_DIAGNOSTIC_RE.test(entry.diagnostic)) continue;
		if (!/incompatible/i.test(entry.diagnostic)) continue;
		findings.push(makeFinding({
			domain: "plugin-runtime",
			code: "RT_PREFLIGHT_DENIED",
			severity: "error",
			title: `${entry.moduleName} was denied by the compatibility preflight`,
			subjects: [entry.moduleName],
			confidence: "medium",
			evidence: [{
				source: "plugin-manager",
				ref: entry.entryId,
				summary: entry.diagnostic
			}],
			fix: {
				kind: "update",
				summary: "update the plugin/DSH or grant an exact-version exemption after accepting the risk",
				safe: false,
				requiresConsent: true
			}
		}));
	}
	for (const [key, versions] of Object.entries(context.profile.exemptions)) {
		const separator = key.lastIndexOf("@");
		if (separator <= 0) continue;
		const name = key.slice(0, separator);
		if (!selected.has(name)) continue;
		findings.push(makeFinding({
			domain: "plugin-runtime",
			code: "RT_EXEMPTION_ACTIVE",
			severity: "warn",
			title: `${key} has an exact-version exemption`,
			subjects: [name],
			confidence: "high",
			evidence: [{
				source: "profile-file",
				ref: "compatibility.json",
				summary: `exemption allows dsh ${versions.join(", ")}`
			}],
			fix: {
				kind: "update",
				summary: "prefer a compatible plugin version; the exemption is an informed risk",
				safe: false,
				requiresConsent: true
			}
		}));
	}
	if (context.config.compatReadLockfile) {
		if (context.lockfile === void 0) findings.push(makeFinding({
			domain: "plugin-runtime",
			code: "RT_LOCKFILE_UNAVAILABLE",
			severity: "info",
			title: "pnpm-lock.yaml is unavailable",
			subjects: [context.profile.name],
			confidence: "high",
			evidence: [{
				source: "lockfile",
				ref: context.profile.dir,
				summary: "duplicate package version analysis was skipped"
			}],
			fix: {
				kind: "none",
				summary: "no action",
				safe: true,
				requiresConsent: false
			}
		}));
		else for (const [name, versions] of Object.entries(context.lockfile.dshVersions)) {
			if (versions.length <= 1) continue;
			findings.push(makeFinding({
				domain: "plugin-runtime",
				code: "RT_DUPLICATE_DSH_COPIES",
				severity: "warn",
				title: `multiple DSH copies of ${name} are installed`,
				subjects: [name],
				confidence: "high",
				evidence: [{
					source: "lockfile",
					ref: context.lockfile.path,
					summary: `versions ${versions.join(", ")}`
				}],
				fix: {
					kind: "update",
					summary: "deduplicate with pnpm overrides or align the affected plugins",
					safe: false,
					requiresConsent: true
				}
			}));
		}
	}
	return findings;
}
// src/compat/rules-plugin.ts
const CORE_SERVICES = /* @__PURE__ */ new Set([
	"tools",
	"sessions",
	"agents",
	"systemPrompt",
	"loader",
	"llm",
	"schedule",
	"pluginManager",
	"workingDirectory",
	"sandboxPolicy",
	"approval",
	"storage",
	"userQuestions",
	"jobs",
	"web",
	"mcp",
	"skills",
	"commands",
	"settings",
	"credentials",
	"authorization",
	"profileContext",
	"pluginInventory",
	"subagent",
	"workflow",
	"goal",
	"tokenMeter",
	"sessionProjections",
	"attachments",
	"spill",
	"terminal",
	"timeContext"
]);
const REGISTRATION_FAILURE_RE = /duplicate|already registered|already provided|conflict|UNKNOWN_TOOL|tool .* exists/i;
/** Plugin ↔ plugin conflicts: services, rows, configs, MCP, registration, overlap, versions. */
async function runPluginRules(context) {
	const findings = [];
	const entries = context.loaderEntries.filter((entry) => entry.enabled);
	const scopeOf = (entry) => entry.source === "preset" ? entry.presetId ?? "preset" : entry.parentId ?? "root";
	const providers = /* @__PURE__ */ new Map();
	for (const entry of entries) for (const service of entry.provide) {
		const list = providers.get(service) ?? [];
		list.push(entry);
		providers.set(service, list);
	}
	for (const [service, list] of providers) {
		const byScope = /* @__PURE__ */ new Map();
		for (const entry of list) {
			const scope = scopeOf(entry);
			const scoped = byScope.get(scope) ?? [];
			scoped.push(entry);
			byScope.set(scope, scoped);
		}
		for (const [scope, scoped] of byScope) {
			if (scoped.length <= 1) continue;
			findings.push(makeFinding({
				domain: "plugin-plugin",
				code: "PP_SERVICE_DUPLICATE",
				severity: "error",
				title: `service "${service}" is provided by multiple plugins`,
				subjects: scoped.map((entry) => entry.moduleName),
				confidence: "high",
				evidence: [{
					source: "loader",
					ref: scope,
					summary: scoped.map((entry) => entry.moduleName).join(", ")
				}],
				fix: {
					kind: "disable",
					summary: "disable one provider; keep the service owner that the deployment depends on",
					safe: false,
					requiresConsent: true,
					target: scoped[0]?.moduleName
				}
			}));
		}
	}
	const providedAnywhere = new Set(providers.keys());
	for (const entry of entries) {
		if (entry.inject.length === 0) continue;
		if (entry.fiberState !== "pending" && entry.fiberState !== "failed") continue;
		const missing = entry.inject.filter((service) => !providedAnywhere.has(service) && !CORE_SERVICES.has(service));
		if (missing.length === 0) continue;
		findings.push(makeFinding({
			domain: "plugin-plugin",
			code: "PP_SERVICE_MISSING",
			severity: entry.fiberState === "failed" ? "error" : "warn",
			title: `${entry.moduleName} is waiting for missing services`,
			subjects: [entry.moduleName],
			confidence: "medium",
			evidence: [{
				source: "loader",
				ref: entry.id,
				summary: `required ${missing.join(", ")}; fiber ${entry.fiberState}${entry.diagnostic === void 0 ? "" : ` (${entry.diagnostic})`}`
			}],
			fix: {
				kind: "enable",
				summary: "enable or install a provider for the missing service, or disable the consumer",
				safe: false,
				requiresConsent: true
			}
		}));
	}
	for (const finding of detectServiceCycles(entries, providers)) findings.push(finding);
	const enabledBundles = context.bundles.filter((bundle) => bundle.enabled && bundle.error === void 0);
	const rows = /* @__PURE__ */ new Map();
	for (const bundle of enabledBundles) for (const row of bundle.rows) {
		const list = rows.get(row.rowId) ?? [];
		list.push(bundle.name);
		rows.set(row.rowId, list);
	}
	for (const [rowId, names] of rows) {
		const unique = [...new Set(names)];
		if (unique.length <= 1) continue;
		findings.push(makeFinding({
			domain: "plugin-plugin",
			code: "PP_ROW_DUPLICATE",
			severity: "error",
			title: `row "${rowId}" is declared by multiple enabled bundles`,
			subjects: unique,
			confidence: "high",
			evidence: [{
				source: "plugin-manager",
				ref: rowId,
				summary: `declared by ${unique.join(", ")}`
			}],
			fix: {
				kind: "disable",
				summary: "disable one of the bundles declaring this row",
				safe: false,
				requiresConsent: true,
				target: unique[0]
			}
		}));
	}
	const officialLayers = new Set(enabledBundles.filter((bundle) => bundle.official || bundle.name.startsWith("@deepseek-ai/dsh-")).map((bundle) => bundle.name));
	const conflicts = findConfigConflicts(context.profile.patchRows, { skipLayer: (layer) => !context.config.compatStrictOfficialOverrides && (officialLayers.has(layer) || layer === "root") }).filter((conflict) => {
		return conflict.layers.filter((layer) => layer !== "profile" && layer !== "home").length >= 2;
	});
	for (const conflict of conflicts) findings.push(makeFinding({
		domain: "plugin-plugin",
		code: "PP_CONFIG_CONFLICT",
		severity: "warn",
		title: `row "${conflict.id}" has conflicting configuration across bundles`,
		subjects: conflict.layers,
		confidence: "medium",
		evidence: [{
			source: "profile-file",
			ref: conflict.id,
			summary: `layers ${conflict.layers.join(", ")} set different config values`
		}],
		fix: {
			kind: "edit-patch",
			summary: "keep one layer authoritative and remove or align the other configuration",
			safe: false,
			requiresConsent: true
		}
	}));
	const mcp = context.loaderEntries.filter((entry) => entry.source === "mcp" && typeof entry.mcpServerName === "string");
	const byServer = /* @__PURE__ */ new Map();
	for (const entry of mcp) {
		const name = entry.mcpServerName ?? "";
		const list = byServer.get(name) ?? [];
		list.push(entry);
		byServer.set(name, list);
	}
	for (const [serverName, list] of byServer) {
		if (list.length <= 1) continue;
		findings.push(makeFinding({
			domain: "plugin-plugin",
			code: "PP_MCP_SERVER_DUPLICATE",
			severity: "error",
			title: `MCP server name "${serverName}" is used more than once`,
			subjects: list.map((entry) => entry.moduleName),
			confidence: "high",
			evidence: [{
				source: "loader",
				ref: serverName,
				summary: "MCP tool names are mcp__<serverName>__<tool>; duplicate names collide"
			}],
			fix: {
				kind: "rename",
				summary: "give each MCP server a unique name or disable one entry",
				safe: false,
				requiresConsent: true
			}
		}));
	}
	for (const entry of mcp) {
		if (entry.fiberState !== "failed") continue;
		findings.push(makeFinding({
			domain: "plugin-plugin",
			code: "PP_MCP_STARTUP_FAILED",
			severity: "warn",
			title: `MCP server "${entry.mcpServerName ?? entry.id}" failed to start`,
			subjects: [entry.moduleName],
			confidence: "medium",
			evidence: [{
				source: "plugin-manager",
				ref: entry.id,
				summary: entry.diagnostic ?? "MCP fiber is in failed state"
			}],
			fix: {
				kind: "edit-patch",
				summary: "fix the MCP transport/command/network configuration",
				safe: false,
				requiresConsent: true
			}
		}));
	}
	for (const entry of context.loaderEntries) {
		if (entry.fiberState !== "failed" || entry.diagnostic === void 0) continue;
		if (!REGISTRATION_FAILURE_RE.test(entry.diagnostic)) continue;
		findings.push(makeFinding({
			domain: "plugin-plugin",
			code: "PP_RUNTIME_REGISTRATION_FAILED",
			severity: "error",
			title: `${entry.moduleName} failed while registering a tool, service, or prompt section`,
			subjects: [entry.moduleName],
			confidence: "high",
			evidence: [{
				source: "plugin-manager",
				ref: entry.id,
				summary: entry.diagnostic
			}],
			fix: {
				kind: "disable",
				summary: "inspect the diagnostic; disable one side of the registration conflict",
				safe: false,
				requiresConsent: true,
				target: entry.moduleName
			}
		}));
	}
	if (context.lockfile !== void 0) for (const duplicate of duplicateVersions(context.lockfile)) {
		if (duplicate.name.startsWith("@deepseek-ai/dsh")) continue;
		findings.push(makeFinding({
			domain: "plugin-plugin",
			code: "PP_PACKAGE_VERSION_DUPLICATE",
			severity: "warn",
			title: `multiple versions of ${duplicate.name} are installed`,
			subjects: [duplicate.name],
			confidence: "high",
			evidence: [{
				source: "lockfile",
				ref: context.lockfile.path,
				summary: duplicate.versions.join(", ")
			}],
			fix: {
				kind: "update",
				summary: "deduplicate with pnpm overrides or align the dependent plugins",
				safe: false,
				requiresConsent: true
			}
		}));
	}
	findings.push(...capabilityOverlap(enabledBundles));
	if (context.prompt !== void 0) findings.push(...promptOverlap(context));
	const knownModules = /* @__PURE__ */ new Set([
		...context.bundles.flatMap((bundle) => bundle.rows.map((row) => rootPackageName(row.moduleName))),
		...context.entriesInfo.map((entry) => rootPackageName(entry.moduleName)),
		...context.manifests.keys()
	]);
	for (const bundle of enabledBundles) {
		if (bundle.availability !== "profile") continue;
		const manifest = context.manifests.get(rootPackageName(bundle.name));
		if (manifest === void 0) continue;
		const bundleNames = new Set(context.bundles.map((item) => rootPackageName(item.name)));
		for (const [peer, range] of Object.entries(manifestPeers(manifest))) {
			if (peer === "@deepseek-ai/dsh") continue;
			if (!peer.startsWith("@deepseek-ai/dsh-")) continue;
			if (bundleNames.has(peer)) continue;
			if (knownModules.has(peer)) continue;
			findings.push(makeFinding({
				domain: "plugin-plugin",
				code: "PP_MISSING_PEER_BUNDLE",
				severity: "warn",
				title: `${bundle.name} expects peer ${peer} which is not in this profile`,
				subjects: [bundle.name, peer],
				confidence: "medium",
				evidence: [{
					source: "manifest",
					ref: `${bundle.name}@${bundle.version ?? "unknown"}`,
					summary: `peerDependencies ${peer}: ${range}`
				}],
				fix: {
					kind: "enable",
					summary: "install or select the peer bundle if the plugin needs it",
					safe: false,
					requiresConsent: true
				}
			}));
		}
	}
	return findings;
}
function detectServiceCycles(entries, providers) {
	const findings = [];
	const byId = /* @__PURE__ */ new Map();
	for (const entry of entries) byId.set(entry.id, entry);
	const edges = /* @__PURE__ */ new Map();
	for (const entry of entries) for (const service of entry.inject) for (const provider of providers.get(service) ?? []) {
		if (provider.id === entry.id) continue;
		const targets = edges.get(entry.id) ?? /* @__PURE__ */ new Set();
		targets.add(provider.id);
		edges.set(entry.id, targets);
	}
	const state = /* @__PURE__ */ new Map();
	const path = [];
	const seenCycles = /* @__PURE__ */ new Set();
	const visit = (id) => {
		if (findings.length > 20) return;
		const current = state.get(id);
		if (current === "visiting") {
			const start = path.indexOf(id);
			if (start < 0) return;
			const cycle = path.slice(start);
			if (cycle.length > 5) return;
			const key = [...cycle].sort().join("|");
			if (seenCycles.has(key)) return;
			seenCycles.add(key);
			const subjects = cycle.map((entryId) => byId.get(entryId)?.moduleName ?? entryId);
			findings.push(makeFinding({
				domain: "plugin-plugin",
				code: "PP_SERVICE_CYCLE",
				severity: "warn",
				title: "possible service dependency cycle detected",
				subjects,
				confidence: "low",
				evidence: [{
					source: "loader",
					ref: cycle.join(" -> "),
					summary: "plugins depend on services provided by each other"
				}],
				fix: {
					kind: "reorder",
					summary: "break the dependency cycle by reordering or disabling one plugin",
					safe: false,
					requiresConsent: true
				}
			}));
			return;
		}
		if (current === "done") return;
		state.set(id, "visiting");
		path.push(id);
		for (const target of edges.get(id) ?? []) visit(target);
		path.pop();
		state.set(id, "done");
	};
	for (const entry of entries) visit(entry.id);
	return findings;
}
function capabilityOverlap(bundles) {
	const findings = [];
	const withText = bundles.filter((bundle) => typeof bundle.description === "string" && bundle.description.length > 20).slice(0, 50);
	for (let i = 0; i < withText.length; i++) {
		const left = withText[i];
		if (left === void 0 || left.description === void 0) continue;
		const leftShingles = shingles(wordTokens(left.description), 3);
		for (let j = i + 1; j < withText.length; j++) {
			const right = withText[j];
			if (right === void 0 || right.description === void 0) continue;
			const similarity = jaccard(leftShingles, shingles(wordTokens(right.description), 3));
			if (similarity < .55) continue;
			findings.push(makeFinding({
				domain: "plugin-plugin",
				code: "PP_CAPABILITY_OVERLAP",
				severity: "info",
				title: `${left.name} and ${right.name} describe overlapping capabilities`,
				subjects: [left.name, right.name],
				confidence: "medium",
				evidence: [{
					source: "plugin-manager",
					ref: left.name,
					summary: `description similarity ${similarity.toFixed(2)}`
				}],
				fix: {
					kind: "none",
					summary: "review whether both bundles are needed for this task",
					safe: true,
					requiresConsent: false
				}
			}));
		}
	}
	return findings;
}
function promptOverlap(context) {
	const sections = [...context.prompt?.sections ?? [], ...context.prompt?.contexts ?? []];
	const paragraphs = [];
	for (const section of sections.slice(0, 200)) for (const text of splitParagraphs(section.text).slice(0, 20)) {
		const normalized = normalizeLine(text);
		if (normalized.length < 20) continue;
		paragraphs.push({
			section: section.name,
			text,
			normalized
		});
	}
	if (paragraphs.length === 0) return [];
	const findings = [];
	const byNormalized = /* @__PURE__ */ new Map();
	for (const paragraph of paragraphs) {
		const list = byNormalized.get(paragraph.normalized) ?? [];
		list.push(paragraph);
		byNormalized.set(paragraph.normalized, list);
	}
	for (const [, list] of byNormalized) {
		const sectionsInGroup = [...new Set(list.map((item) => item.section))];
		if (sectionsInGroup.length <= 1) continue;
		const conflict = hasConflictingNumbersOrNegation(list.map((item) => item.text));
		findings.push(makeFinding({
			domain: "plugin-plugin",
			code: "PP_PROMPT_OVERLAP",
			severity: conflict ? "warn" : "info",
			title: conflict ? "overlapping prompt rules contain conflicting values" : "duplicate prompt text appears in multiple sections",
			subjects: sectionsInGroup,
			confidence: "medium",
			evidence: [{
				source: "prompt",
				ref: sectionsInGroup.join(", "),
				summary: list[0]?.text.slice(0, 120) ?? ""
			}],
			fix: {
				kind: "none",
				summary: conflict ? "resolve the semantic conflict manually; do not auto-merge" : "keep one authoritative section and remove or reference the duplicate",
				safe: !conflict,
				requiresConsent: false
			}
		}));
		if (findings.length >= 20) break;
	}
	return findings;
}
function hasConflictingNumbersOrNegation(texts) {
	const negations = /\b(not|never|no|禁止|不得|不要|必须|always|must)\b/i;
	const numbers = /\d+/g;
	const first = texts[0] ?? "";
	const firstNumbers = new Set(first.match(numbers) ?? []);
	for (const text of texts.slice(1)) {
		const current = new Set(text.match(numbers) ?? []);
		if (firstNumbers.size !== current.size) return true;
		for (const value of firstNumbers) if (!current.has(value)) return true;
		if (negations.test(first) !== negations.test(text)) return true;
	}
	return false;
}
// src/compat/rules-profile.ts
/** Profile/workspace consistency rules. */
async function runProfileRules(context) {
	const findings = [];
	const profile = context.profile;
	const bundleCounts = /* @__PURE__ */ new Map();
	for (const bundle of profile.bundles) bundleCounts.set(bundle, (bundleCounts.get(bundle) ?? 0) + 1);
	for (const [bundle, count] of bundleCounts) {
		if (count <= 1) continue;
		findings.push(makeFinding({
			domain: "profile",
			code: "PW_DUPLICATE_BUNDLE",
			severity: "error",
			title: `bundle "${bundle}" is listed ${count} times in the profile`,
			subjects: [bundle, profile.name],
			confidence: "high",
			evidence: [{
				source: "profile-file",
				ref: `${profile.dir}/package.json`,
				summary: "dsh.profile.bundles contains a duplicate entry"
			}],
			fix: {
				kind: "edit-patch",
				summary: "remove the duplicate entry from dsh.profile.bundles",
				safe: false,
				requiresConsent: true
			}
		}));
	}
	const selected = new Set(profile.bundles);
	const declared = new Set(Object.keys(profile.dependencies));
	const installedNames = new Set(context.bundles.filter((bundle) => bundle.availability === "profile" || bundle.installed).map((bundle) => bundle.name));
	for (const name of declared) {
		if (selected.has(name)) continue;
		if (!installedNames.has(name)) continue;
		findings.push(makeFinding({
			domain: "profile",
			code: "PW_ORPHAN_BUNDLE",
			severity: "warn",
			title: `${name} is installed but not selected in this profile`,
			subjects: [name, profile.name],
			confidence: "high",
			evidence: [{
				source: "profile-file",
				ref: `${profile.dir}/package.json`,
				summary: "dependency exists but dsh.profile.bundles does not select it"
			}],
			fix: {
				kind: "enable",
				summary: "select the bundle if it is wanted, or remove the unused dependency",
				safe: false,
				requiresConsent: true
			}
		}));
	}
	for (const name of selected) {
		if (declared.has(name)) continue;
		if (name.startsWith("@deepseek-ai/dsh-")) continue;
		const info = context.bundles.find((bundle) => bundle.name === name);
		if (info?.official === true || info?.availability === "installation") continue;
		findings.push(makeFinding({
			domain: "profile",
			code: "PW_ORPHAN_BUNDLE",
			severity: "warn",
			title: `${name} is selected but not declared as a profile dependency`,
			subjects: [name, profile.name],
			confidence: "medium",
			evidence: [{
				source: "profile-file",
				ref: `${profile.dir}/package.json`,
				summary: "bundle is selected but absent from dependencies"
			}],
			fix: {
				kind: "edit-patch",
				summary: "declare the dependency or remove the selection",
				safe: false,
				requiresConsent: true
			}
		}));
	}
	const officialLayers = new Set(context.bundles.filter((bundle) => bundle.official || bundle.name.startsWith("@deepseek-ai/dsh-")).map((bundle) => bundle.name));
	const conflicts = findConfigConflicts(profile.patchRows, { skipLayer: (layer) => !context.config.compatStrictOfficialOverrides && officialLayers.has(layer) }).filter((conflict) => conflict.layers.includes("profile") && conflict.layers.some((layer) => layer !== "profile" && layer !== "home"));
	for (const conflict of conflicts) findings.push(makeFinding({
		domain: "profile",
		code: "PW_PATCH_CONFLICT",
		severity: "warn",
		title: `profile patch overrides row "${conflict.id}" with a different configuration`,
		subjects: [conflict.id, profile.name],
		confidence: "medium",
		evidence: [{
			source: "profile-file",
			ref: `${profile.dir}/cordis.patch.yml`,
			summary: `layers ${conflict.layers.join(", ")} set different config values`
		}],
		fix: {
			kind: "edit-patch",
			summary: "confirm the override is intentional; align or remove one configuration",
			safe: false,
			requiresConsent: true
		}
	}));
	findings.push(...profileDrift(context));
	for (const warning of profile.compatibilityWarnings) findings.push(makeFinding({
		domain: "profile",
		code: "PW_COMPAT_FILE_INVALID",
		severity: "warn",
		title: "compatibility.json contains records the reader rejected",
		subjects: [profile.name],
		confidence: "high",
		evidence: [{
			source: "profile-file",
			ref: "compatibility.json",
			summary: warning
		}],
		fix: {
			kind: "edit-patch",
			summary: "repair or remove the rejected records before changing exemptions",
			safe: false,
			requiresConsent: true
		}
	}));
	if (context.config.compatReadWorkspace && context.prompt !== void 0) findings.push(...workspaceOverlap(context));
	return findings;
}
function profileDrift(context) {
	const findings = [];
	const profiles = context.profiles;
	if (profiles.length <= 1) return findings;
	const allBundles = /* @__PURE__ */ new Set();
	for (const profile of profiles) for (const bundle of profile.bundles) allBundles.add(bundle);
	for (const bundle of allBundles) {
		const present = profiles.filter((profile) => profile.bundles.includes(bundle)).map((profile) => profile.name);
		if (present.length === profiles.length) continue;
		findings.push(makeFinding({
			domain: "profile",
			code: "PW_BUNDLE_DRIFT",
			severity: "info",
			title: `${bundle} is selected in only some profiles`,
			subjects: [bundle, ...present],
			confidence: "high",
			evidence: [{
				source: "profile-file",
				ref: bundle,
				summary: `present in ${present.join(", ") || "none"}; missing elsewhere`
			}],
			fix: {
				kind: "none",
				summary: "align the profiles only if the difference is unintended",
				safe: true,
				requiresConsent: false
			}
		}));
	}
	const versions = /* @__PURE__ */ new Map();
	for (const profile of profiles) for (const [bundle, version] of Object.entries(profile.manifestVersions)) {
		if (version === void 0) continue;
		const set = versions.get(bundle) ?? /* @__PURE__ */ new Set();
		set.add(version);
		versions.set(bundle, set);
	}
	for (const [bundle, set] of versions) {
		if (set.size <= 1) continue;
		findings.push(makeFinding({
			domain: "profile",
			code: "PW_VERSION_DRIFT",
			severity: "warn",
			title: `${bundle} has different versions across profiles`,
			subjects: [bundle, ...profiles.map((profile) => profile.name)],
			confidence: "medium",
			evidence: [{
				source: "manifest",
				ref: bundle,
				summary: [...set].join(", ")
			}],
			fix: {
				kind: "update",
				summary: "align the versions if the profiles should behave the same",
				safe: false,
				requiresConsent: true
			}
		}));
	}
	const exemptionKeys = /* @__PURE__ */ new Set();
	for (const profile of profiles) for (const key of Object.keys(profile.exemptions)) exemptionKeys.add(key);
	for (const key of exemptionKeys) {
		const values = /* @__PURE__ */ new Set();
		for (const profile of profiles) values.add(JSON.stringify(profile.exemptions[key] ?? []));
		if (values.size <= 1) continue;
		findings.push(makeFinding({
			domain: "profile",
			code: "PW_EXEMPTION_DRIFT",
			severity: "warn",
			title: `version exemption "${key}" differs across profiles`,
			subjects: [key, ...profiles.map((profile) => profile.name)],
			confidence: "medium",
			evidence: [{
				source: "profile-file",
				ref: "compatibility.json",
				summary: profiles.map((profile) => `${profile.name}: ${JSON.stringify(profile.exemptions[key] ?? [])}`).join("; ")
			}],
			fix: {
				kind: "edit-patch",
				summary: "align or intentionally separate the exemption per profile",
				safe: false,
				requiresConsent: true
			}
		}));
	}
	return findings;
}
function workspaceOverlap(context) {
	const findings = [];
	const sections = [...context.prompt?.sections ?? [], ...context.prompt?.contexts ?? []];
	const pluginParagraphs = [];
	for (const section of sections.slice(0, 200)) for (const paragraph of splitParagraphs(section.text).slice(0, 10)) {
		const normalized = normalizeLine(paragraph);
		if (normalized.length < 30) continue;
		pluginParagraphs.push({
			section: section.name,
			normalized,
			shingles: shingles(wordTokens(paragraph), 3)
		});
	}
	if (pluginParagraphs.length === 0) return findings;
	for (const instruction of context.workspace.instructions.slice(0, 10)) for (const paragraph of splitParagraphs(instruction.text).slice(0, 40)) {
		const normalized = normalizeLine(paragraph);
		if (normalized.length < 30) continue;
		const instructionShingles = shingles(wordTokens(paragraph), 3);
		for (const pluginParagraph of pluginParagraphs) {
			const similarity = normalized === pluginParagraph.normalized ? 1 : jaccard(instructionShingles, pluginParagraph.shingles);
			if (similarity < .8) continue;
			findings.push(makeFinding({
				domain: "workspace",
				code: "PW_WORKSPACE_RULE_OVERLAP",
				severity: "info",
				title: "workspace instruction overlaps a plugin prompt section",
				subjects: [instruction.file, pluginParagraph.section],
				confidence: "low",
				evidence: [{
					source: "prompt",
					ref: `${instruction.file} ↔ ${pluginParagraph.section}`,
					summary: `similarity ${similarity.toFixed(2)}`
				}],
				fix: {
					kind: "none",
					summary: "keep one authoritative rule source if the overlap is intentional",
					safe: true,
					requiresConsent: false
				}
			}));
			if (findings.length >= 20) return findings;
		}
	}
	return findings;
}
// src/compat/report.ts
/** Run every compatibility rule against one collected context. */
async function runCompatibilityRules(context) {
	const [runtime, plugin, profile] = await Promise.all([
		runRuntimeRules(context),
		runPluginRules(context),
		runProfileRules(context)
	]);
	return sortFindings(dedupeFindings([
		...runtime,
		...plugin,
		...profile
	]));
}
/** Build the serializable report. */
function buildReport(context, findings, options) {
	const sorted = sortFindings(findings);
	const selected = sorted.slice(0, options.maxFindings);
	const byDomain = {
		"plugin-plugin": 0,
		"plugin-runtime": 0,
		profile: 0,
		workspace: 0
	};
	let error = 0;
	let warn = 0;
	let info = 0;
	for (const finding of sorted) {
		byDomain[finding.domain] += 1;
		if (finding.severity === "error") error++;
		else if (finding.severity === "warn") warn++;
		else info++;
	}
	return {
		schemaVersion: 1,
		generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		runtime: { ...context.runtime },
		profile: {
			name: context.profile.name,
			dir: context.profile.dir,
			bundles: [...context.profile.bundles]
		},
		findings: selected,
		summary: {
			error,
			warn,
			info,
			byDomain
		},
		profiles: context.profiles.map((profile) => ({
			name: profile.name,
			dir: profile.dir,
			bundles: [...profile.bundles],
			versions: { ...profile.manifestVersions },
			exemptions: { ...profile.exemptions },
			compatibilityWarnings: [...profile.compatibilityWarnings],
			findings: []
		})),
		workspaces: [{
			cwd: context.workspace.cwd,
			instructionFiles: [...context.workspace.instructionFiles],
			mcpEntries: context.loaderEntries.filter((entry) => entry.source === "mcp" && typeof entry.mcpServerName === "string").map((entry) => entry.mcpServerName),
			findings: []
		}],
		diagnostics: [...context.diagnostics],
		truncated: sorted.length > selected.length,
		totalFindings: sorted.length
	};
}
const SEVERITY_LABEL = {
	error: "E",
	warn: "W",
	info: "I"
};
/** Render a bounded Markdown matrix plus detailed findings. */
function renderReport(report, options) {
	const lines = [];
	lines.push("# 兼容性报告");
	lines.push("");
	lines.push(`- 运行时：DSH ${report.runtime.dshVersion} / Node ${report.runtime.nodeVersion} / ${report.runtime.platform}-${report.runtime.arch}`);
	lines.push(`- Profile：${report.profile.name}（${report.profile.bundles.length} 个 bundle）`);
	lines.push(`- 发现：${report.summary.error} error / ${report.summary.warn} warn / ${report.summary.info} info${report.truncated ? `（已截断，共 ${report.totalFindings ?? report.findings.length} 条）` : ""}`);
	lines.push("");
	const visible = report.findings.filter((finding) => options.includeInfo || finding.severity !== "info");
	if (visible.length === 0) lines.push("未发现需要处理的兼容性问题。");
	else {
		lines.push("## 兼容性矩阵");
		lines.push("");
		lines.push("| 主体 | 运行时 | 插件间 | Profile/工作区 |");
		lines.push("|---|---|---|---|");
		const subjects = [...new Set(visible.flatMap((finding) => finding.subjects))].sort((a, b) => a.localeCompare(b)).slice(0, 30);
		for (const subject of subjects) {
			const row = [escapeMarkdownCell(subject)];
			for (const domain of [
				"plugin-runtime",
				"plugin-plugin",
				"profile"
			]) {
				const matches = visible.filter((finding) => finding.domain === domain && finding.subjects.includes(subject));
				row.push(matches.length === 0 ? "—" : matches.slice(0, 2).map((finding) => `${SEVERITY_LABEL[finding.severity]}:${finding.code}`).join("<br>"));
			}
			lines.push(`| ${row.join(" | ")} |`);
		}
		lines.push("");
		lines.push("图例：E=error，W=warn，I=info，—=无发现。");
		lines.push("");
		lines.push("## 详细发现");
		lines.push("");
		for (const finding of visible) {
			lines.push(`### ${SEVERITY_LABEL[finding.severity]} ${finding.code} · ${finding.title}`);
			lines.push("");
			lines.push(`- 领域：${finding.domain}`);
			lines.push(`- 主体：${finding.subjects.join(", ")}`);
			lines.push(`- 置信度：${finding.confidence}`);
			for (const evidence of finding.evidence) lines.push(`- 证据（${evidence.source}${evidence.ref === void 0 ? "" : ` · ${evidence.ref}`}）：${evidence.summary}`);
			if (finding.fix !== void 0) lines.push(`- 修复建议：${finding.fix.summary}${finding.fix.requiresConsent ? "（需要用户确认）" : ""}`);
			lines.push("");
		}
	}
	const lowConfidence = [...new Set(report.findings.filter((finding) => finding.confidence === "low").flatMap((finding) => finding.subjects))];
	if (lowConfidence.length > 0) {
		lines.push("## 低置信度发现（需人工确认）");
		lines.push("");
		for (const item of lowConfidence.slice(0, 20)) lines.push(`- ${item}`);
		lines.push("");
	}
	if (report.diagnostics.length > 0) {
		lines.push("## 未完成的分析");
		lines.push("");
		for (const diagnostic of report.diagnostics.slice(0, 20)) lines.push(`- ${diagnostic}`);
		lines.push("");
	}
	lines.push("## 机器可读摘要");
	lines.push("");
	lines.push(jsonBlock({
		summary: report.summary,
		findings: visible.map((finding) => ({
			code: finding.code,
			severity: finding.severity,
			domain: finding.domain,
			subjects: finding.subjects,
			confidence: finding.confidence,
			fix: finding.fix
		}))
	}, 8e3));
	return lines.join("\n");
}
// src/compat/analyze.ts
const cache = /* @__PURE__ */ new Map();
/** Collect, analyze, render, and optionally persist a compatibility report. */
async function analyzeCompatibility(ctx, config, options = {}) {
	const facts = resolveProfileFacts(ctx, options.agent);
	const scope = options.scope ?? "current";
	const agentKey = agentId(options.agent);
	const includeInfo = options.includeInfo ?? config.compatIncludeInfo;
	const maxFindings = clampInteger(options.maxFindings ?? config.compatMaxFindings, 1, 500);
	const key = `${facts.dir}|${scope}|${agentKey}|${includeInfo ? 1 : 0}|${maxFindings}`;
	const ttl = Math.max(0, config.compatCacheTtlMs);
	const cached = cache.get(key);
	if (options.force !== true && cached !== void 0 && Date.now() - cached.at < ttl) {
		if (options.writeReport !== false && (cached.result.reportPath === void 0 || !await fileExists(cached.result.reportPath))) {
			const path = dataDir("compat", "report.json");
			await writeJsonAtomic(path, cached.result.report).catch(() => void 0);
			const updated = {
				...cached.result,
				reportPath: path
			};
			cache.set(key, {
				at: Date.now(),
				result: updated
			});
			return updated;
		}
		return cached.result;
	}
	const scopedConfig = {
		...toCompatConfig(config),
		compatScanAllProfiles: scope === "profiles" || scope === "all",
		compatReadWorkspace: scope !== "profiles"
	};
	const context = await collectCompatContext({
		profileName: facts.name,
		profileDir: facts.dir,
		dshHome: facts.dshHome,
		cwd: facts.cwd,
		loader: getLoader(ctx),
		pluginManager: getPluginManager(ctx),
		inventory: getInventory(ctx),
		prompt: getPromptAdapter(ctx, options.agent),
		agent: options.agent,
		toolSet: options.toolSet,
		config: scopedConfig
	});
	const findings = config.compatEnabled ? await runCompatibilityRules(context) : [];
	if (!config.compatEnabled) context.diagnostics.push("compatibility analysis is disabled by config");
	const report = buildReport(context, findings, {
		includeInfo,
		maxFindings
	});
	const markdown = renderReport(report, {
		includeInfo,
		maxFindings
	});
	let reportPath;
	if (options.writeReport !== false) {
		reportPath = dataDir("compat", "report.json");
		await writeJsonAtomic(reportPath, report).catch((error) => {
			context.diagnostics.push(`failed to write compatibility report: ${errorText(error)}`);
		});
	}
	await new AuditLog().append({
		t: (/* @__PURE__ */ new Date()).toISOString(),
		actor: "trim",
		action: "analyze_compatibility",
		subject: facts.name,
		result: report.summary.error > 0 ? "fail" : "ok",
		summary: `${report.summary.error} error / ${report.summary.warn} warn / ${report.summary.info} info`,
		metrics: {
			error: report.summary.error,
			warn: report.summary.warn,
			info: report.summary.info,
			findings: report.findings.length
		}
	}).catch(() => void 0);
	const result = {
		report,
		findings,
		context,
		markdown,
		reportPath
	};
	cache.set(key, {
		at: Date.now(),
		result
	});
	return result;
}
function agentId(agent) {
	if (typeof agent !== "object" || agent === null) return "";
	const id = agent.id;
	return typeof id === "string" ? id : "";
}
function clampInteger(value, min, max) {
	if (!Number.isFinite(value)) return min;
	return Math.min(max, Math.max(min, Math.trunc(value)));
}
function errorText(error) {
	return error instanceof Error ? error.message : String(error);
}
// src/score.ts
const WEIGHTS = {
	taskMatch: .35,
	usage: .25,
	overlapPenalty: .2,
	costPenalty: .15
};
/** Names of enabled bundles whose descriptions substantially overlap another enabled bundle. */
function computeOverlapSet(scan) {
	const bundles = scan.bundles.filter((bundle) => bundle.enabled && typeof bundle.description === "string" && bundle.description.length > 20);
	const overlap = /* @__PURE__ */ new Set();
	for (let i = 0; i < bundles.length; i++) {
		const left = bundles[i];
		if (left?.description === void 0) continue;
		const leftShingles = shingles(wordTokens(left.description), 3);
		for (let j = i + 1; j < bundles.length; j++) {
			const right = bundles[j];
			if (right?.description === void 0) continue;
			if (jaccard(leftShingles, shingles(wordTokens(right.description), 3)) < .55) continue;
			overlap.add(left.name);
			overlap.add(right.name);
		}
	}
	return overlap;
}
function scoreBundle(scan, task, bundle, overlap) {
	return scoreCommon({
		scan,
		task,
		overlap,
		id: `bundle:${bundle.name}`,
		kind: "bundle",
		name: bundle.name,
		bundleName: bundle.name,
		enabled: bundle.enabled,
		protectedItem: bundle.protected,
		guardStatus: bundle.guardStatus,
		contextTokens: bundle.contextTokens,
		usageCalls: bundle.usage.calls,
		usageSuccesses: bundle.usage.successes,
		usageSessionCalls: bundle.usage.sessionCalls,
		description: bundle.description,
		findings: bundle.findings
	});
}
function scoreEntry(scan, task, entry, overlap) {
	const parent = scan.bundles.find((bundle) => bundle.name === entry.bundleName);
	return scoreCommon({
		scan,
		task,
		overlap,
		id: `entry:${entry.entryId}`,
		kind: "entry",
		name: entry.entryId,
		bundleName: entry.bundleName,
		enabled: entry.enabled,
		protectedItem: entry.protected || parent?.protected === true || entry.patchId === void 0,
		guardStatus: entry.guardStatus,
		contextTokens: entry.contextTokens,
		usageCalls: entry.usage.calls,
		usageSuccesses: entry.usage.successes,
		usageSessionCalls: entry.usage.sessionCalls,
		description: parent?.description,
		findings: entry.findings,
		moduleName: entry.moduleName,
		fiberPhase: entry.fiberPhase
	});
}
function scoreCommon(input) {
	const evidence = [];
	if (input.protectedItem) return {
		id: input.id,
		kind: input.kind,
		name: input.name,
		bundleName: input.bundleName,
		action: "keep",
		risk: "low",
		score: 1,
		evidence: [{
			kind: "user-pref",
			summary: "核心/管理/preset/用户锁定项，受保护",
			weight: 1
		}],
		observedEnabled: input.enabled,
		protected: true,
		reason: "受保护项不参与裁剪",
		findings: []
	};
	if (input.guardStatus === "incompatible") return {
		id: input.id,
		kind: input.kind,
		name: input.name,
		bundleName: input.bundleName,
		action: "review",
		risk: "high",
		score: -1,
		evidence: [{
			kind: "guard",
			summary: "运行时不兼容或启动失败；不自动启用/禁用",
			weight: 1
		}, ...compatEvidence(input.findings)],
		observedEnabled: input.enabled,
		protected: false,
		reason: "先处理兼容性 error，再考虑启用或禁用",
		findings: []
	};
	const text = `${input.name} ${input.description ?? ""} ${input.moduleName ?? ""}`.toLowerCase();
	const matched = input.task.tag === "unknown" ? [] : input.task.keywords.filter((keyword) => text.includes(keyword));
	const taskMatch = clamp(matched.length * .4, 0, 1);
	if (matched.length > 0) evidence.push({
		kind: "task-match",
		summary: `匹配任务关键词：${matched.slice(0, 5).join("、")}`,
		weight: WEIGHTS.taskMatch * taskMatch
	});
	const successRate = input.usageCalls > 0 ? input.usageSuccesses / input.usageCalls : .5;
	const historical = Math.min(1, input.usageCalls / 20) * successRate;
	const session = Math.min(1, input.usageSessionCalls / 5) * .8;
	const usage = Math.max(historical, session);
	if (input.usageCalls > 0 || input.usageSessionCalls > 0) evidence.push({
		kind: "usage",
		summary: `历史调用 ${input.usageCalls}，会话内 ${input.usageSessionCalls}，成功率 ${round(successRate, 2)}`,
		weight: WEIGHTS.usage * usage
	});
	else evidence.push({
		kind: "usage",
		summary: "没有可用使用记录",
		weight: 0
	});
	const overlap = input.overlap.has(input.name) || input.bundleName !== void 0 && input.overlap.has(input.bundleName);
	if (overlap) evidence.push({
		kind: "overlap",
		summary: "描述/能力与其他插件重叠",
		weight: -WEIGHTS.overlapPenalty
	});
	const cost = Math.min(1, input.contextTokens / 4e3);
	if (input.contextTokens > 0) evidence.push({
		kind: "cost",
		summary: `可归属上下文约 ${input.contextTokens} tokens`,
		weight: -WEIGHTS.costPenalty * cost
	});
	else evidence.push({
		kind: "cost",
		summary: "没有可归属的 host 上下文成本",
		weight: 0
	});
	for (const finding of input.findings.slice(0, 4)) evidence.push({
		kind: "compat",
		summary: `${finding.code}: ${finding.title}`,
		weight: finding.severity === "error" ? .5 : .2
	});
	let score = WEIGHTS.taskMatch * taskMatch + WEIGHTS.usage * usage - WEIGHTS.overlapPenalty * (overlap ? 1 : 0) - WEIGHTS.costPenalty * cost;
	score = round(clamp(score, -1, 1), 3);
	let action;
	const hasError = input.findings.some((finding) => finding.severity === "error");
	if (input.enabled) {
		if (taskMatch >= .8 && !hasError) action = "keep";
		else if (score >= .5) action = "keep";
		else if (score >= .25) action = "disable-if-unused";
		else if (score >= .05) action = "review";
		else action = "suggest-disable";
	} else {
		const enableScore = taskMatch * .8 + usage * .2;
		action = taskMatch > 0 && enableScore >= .6 ? "enable" : "review";
	}
	let risk = "low";
	if (input.task.confidence < .6) risk = "high";
	else if (hasError) risk = "medium";
	else if (input.guardStatus === "warn") risk = "medium";
	else if (input.fiberPhase === "pending" || input.fiberPhase === "failed") risk = "medium";
	if (action === "suggest-disable" && risk !== "low") action = "review";
	if (action === "enable" && risk === "high") action = "review";
	if (action === "enable" && hasError) action = "review";
	if (input.task.tag === "unknown" && action === "suggest-disable") action = "review";
	if (input.task.confidence < .6 && action === "suggest-disable") action = "review";
	return {
		id: input.id,
		kind: input.kind,
		name: input.name,
		bundleName: input.bundleName,
		action,
		risk,
		score,
		evidence,
		observedEnabled: input.enabled,
		protected: false,
		reason: reasonFor(action, input, taskMatch, usage, cost),
		findings: []
	};
}
function compatEvidence(findings) {
	return findings.slice(0, 4).map((finding) => ({
		kind: "compat",
		summary: `${finding.code}: ${finding.title}`,
		weight: .5
	}));
}
function reasonFor(action, input, taskMatch, usage, cost) {
	switch (action) {
		case "keep": return `任务匹配 ${round(taskMatch, 2)}、使用 ${round(usage, 2)}、成本 ${round(cost, 2)}，收益可覆盖成本`;
		case "enable": return "已禁用但与当前任务强相关；可在确认后启用";
		case "suggest-disable": return `任务匹配低、使用 ${round(usage, 2)}、成本 ${round(cost, 2)}，建议临时禁用`;
		case "disable-if-unused": return "边际收益偏低；若本任务未使用可禁用";
		default: return input.task.confidence < .6 ? "任务识别置信度不足，只建议人工复核" : "证据不足或存在兼容性风险，建议人工复核";
	}
}
// src/draft.ts
/** Build a local, reversible slim-profile draft. Does not change plugin state. */
function buildSlimProfile(scan, task, config, options = {}) {
	const overlap = computeOverlapSet(scan);
	const items = [];
	for (const bundle of scan.bundles) {
		if (!bundle.enabled && bundle.availability === "missing") continue;
		items.push(scoreBundle(scan, task, bundle, overlap));
	}
	for (const entry of scan.entries) {
		if (entry.bundleName === void 0 || entry.patchId === void 0) continue;
		items.push(scoreEntry(scan, task, entry, overlap));
	}
	const bundleDisables = new Set(items.filter((item) => item.kind === "bundle" && item.action === "suggest-disable").map((item) => item.bundleName).filter((name) => name !== void 0));
	let filtered = items.filter((item) => !(item.kind === "entry" && item.bundleName !== void 0 && bundleDisables.has(item.bundleName)));
	if (options.includeReview === false) filtered = filtered.filter((item) => item.action !== "review");
	const maxDisable = Math.max(0, options.maxDisable ?? 20);
	let disableCount = 0;
	filtered = filtered.filter((item) => {
		if (item.action !== "suggest-disable") return true;
		disableCount++;
		return disableCount <= maxDisable;
	});
	filtered.sort(compareItems);
	const summary = {
		keep: filtered.filter((item) => item.action === "keep").length,
		enable: filtered.filter((item) => item.action === "enable").length,
		disable: filtered.filter((item) => item.action === "suggest-disable").length,
		review: filtered.filter((item) => item.action === "review").length,
		protected: filtered.filter((item) => item.protected).length
	};
	return {
		schemaVersion: 1,
		id: newId("slim"),
		createdAt: (/* @__PURE__ */ new Date()).toISOString(),
		task,
		mode: options.mode ?? config.mode,
		items: filtered,
		dedupe: scan.dedupe,
		summary,
		status: "draft"
	};
}
/** Items eligible for apply: low-risk disables/enables and not protected. */
function applicableItems(profile) {
	return profile.items.filter((item) => item.protected === false && item.risk === "low" && (item.action === "suggest-disable" || item.action === "enable"));
}
const ACTION_RANK = {
	"suggest-disable": 0,
	enable: 1,
	review: 2,
	"disable-if-unused": 3,
	keep: 4
};
function compareItems(a, b) {
	const action = ACTION_RANK[a.action] - ACTION_RANK[b.action];
	if (action !== 0) return action;
	const risk = riskRank(a.risk) - riskRank(b.risk);
	if (risk !== 0) return risk;
	return a.name.localeCompare(b.name);
}
function riskRank(risk) {
	return risk === "low" ? 0 : risk === "medium" ? 1 : 2;
}
/** Keep the compat findings attached to an item for rendering. */
function attachFindings(profile, scan) {
	const byId = new Map(scan.bundles.map((bundle) => [`bundle:${bundle.name}`, bundle.findings]));
	for (const entry of scan.entries) byId.set(`entry:${entry.entryId}`, entry.findings);
	return {
		...profile,
		items: profile.items.map((item) => ({
			...item,
			findings: sortFindings(byId.get(item.id) ?? [])
		}))
	};
}
// src/task.ts
const TASK_KEYWORDS = {
	bugfix: [
		"bug",
		"fix",
		"修复",
		"报错",
		"错误",
		"崩溃",
		"debug",
		"调试",
		"失败",
		"failing",
		"regression",
		"异常",
		"问题",
		"排查",
		"crash"
	],
	feature: [
		"实现",
		"新增",
		"开发",
		"feature",
		"implement",
		"add",
		"重构",
		"refactor",
		"迁移",
		"migrate",
		"支持",
		"设计",
		"build",
		"create",
		"编写"
	],
	review: [
		"审查",
		"review",
		"代码审查",
		"pr",
		"合并",
		"merge",
		"diff",
		"评审",
		"检查代码",
		"code review"
	],
	docs: [
		"文档",
		"docs",
		"documentation",
		"说明",
		"readme",
		"注释",
		"写文档",
		"注释",
		"guide",
		"教程"
	],
	release: [
		"发布",
		"release",
		"版本",
		"version",
		"changelog",
		"打包",
		"publish",
		"发版",
		"上线",
		"部署"
	],
	report: [
		"周报",
		"日报",
		"报告",
		"report",
		"总结",
		"summarize",
		"汇总",
		"周会",
		"月报",
		"汇报",
		"简报"
	],
	research: [
		"调研",
		"research",
		"搜索",
		"search",
		"资料",
		"对比",
		"compare",
		"分析",
		"研究",
		"查找",
		"调查"
	]
};
const TOOL_HINTS = {
	web_search: ["research"],
	web_fetch: ["research"],
	write: [
		"docs",
		"report",
		"feature"
	],
	edit: ["bugfix", "feature"],
	bash: [
		"bugfix",
		"feature",
		"release"
	],
	schedule_create: ["report"],
	present: ["report", "docs"],
	read: [
		"review",
		"docs",
		"bugfix"
	],
	grep: ["review", "bugfix"],
	glob: ["review", "bugfix"]
};
/** Detect the current task with explainable keyword/tool evidence. */
function detectTask(input) {
	if (input.explicit !== void 0 && input.explicit !== "unknown") return {
		tag: input.explicit,
		confidence: 1,
		keywords: [],
		source: "explicit",
		evidence: [{
			kind: "task-match",
			summary: `用户指定任务类型 ${input.explicit}`,
			weight: 1
		}]
	};
	const extracted = input.messages === void 0 ? extractFromAgent(input.agent) : void 0;
	const messages = input.messages ?? extracted?.messages ?? [];
	const toolNames = input.toolNames ?? extracted?.toolNames ?? [];
	const text = buildText(input.goal, messages);
	if (text.trim().length === 0) return unknownTask("没有足够的会话文本；请显式传入 taskTag 或 goal");
	const scores = /* @__PURE__ */ new Map();
	for (const [tag, keywords] of Object.entries(TASK_KEYWORDS)) {
		const matched = [];
		let score = 0;
		for (const keyword of keywords) {
			if (!text.includes(keyword)) continue;
			matched.push(keyword);
			score += keyword.length >= 4 ? 1.5 : 1;
		}
		if (matched.length > 0) scores.set(tag, {
			score,
			keywords: matched
		});
	}
	for (const toolName of toolNames) for (const tag of TOOL_HINTS[toolName] ?? []) {
		const current = scores.get(tag) ?? {
			score: 0,
			keywords: []
		};
		current.score += .5;
		scores.set(tag, current);
	}
	if (scores.size === 0) return unknownTask("没有匹配到任务关键词", text);
	const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
	const [tag, best] = ranked[0];
	const second = ranked[1];
	const ambiguity = second !== void 0 && best.score - second[1].score < 1 ? .1 : 0;
	let confidence = .55;
	if (best.score >= 4) confidence = .9;
	else if (best.score >= 2.5) confidence = .75;
	else if (best.score >= 1.5) confidence = .65;
	confidence = Math.max(.2, Math.min(.95, confidence - ambiguity));
	const evidence = [{
		kind: "task-match",
		summary: `匹配关键词：${best.keywords.slice(0, 6).join("、")}`,
		weight: confidence
	}];
	if (toolNames.length > 0) evidence.push({
		kind: "context",
		summary: `本会话工具：${toolNames.slice(0, 8).join(", ")}`,
		weight: .2
	});
	return {
		tag,
		confidence,
		keywords: best.keywords,
		evidence,
		source: input.goal !== void 0 && input.goal.trim().length > 0 ? "goal" : "session"
	};
}
function unknownTask(summary, text) {
	return {
		tag: "unknown",
		confidence: .2,
		keywords: [],
		source: "unknown",
		evidence: [{
			kind: "task-match",
			summary: text === void 0 ? summary : `${summary}（文本长度 ${text.length}）`,
			weight: .2
		}]
	};
}
function buildText(goal, messages) {
	const parts = [];
	if (goal !== void 0 && goal.trim().length > 0) parts.push(goal);
	const userMessages = messages.filter((message) => message.role === "user").slice(-6);
	for (const message of userMessages) {
		const text = flattenTextBlocks(message.content);
		if (text.length > 0) parts.push(text);
	}
	const assistantMessages = messages.filter((message) => message.role === "assistant").slice(-4);
	for (const message of assistantMessages) {
		const text = flattenTextBlocks(message.content);
		if (text.length > 0) parts.push(text);
	}
	return truncate(parts.join("\n"), 8e3).toLowerCase();
}
/** Extract recent messages and tool-call names from a live Agent without importing DSH types. */
function extractFromAgent(agent) {
	if (typeof agent !== "object" || agent === null) return {
		messages: [],
		toolNames: []
	};
	const session = agent.session;
	if (typeof session !== "object" || session === null) return {
		messages: [],
		toolNames: []
	};
	const derive = session.deriveMessages;
	if (typeof derive !== "function") return {
		messages: [],
		toolNames: []
	};
	let messages;
	try {
		messages = derive.call(session);
	} catch {
		return {
			messages: [],
			toolNames: []
		};
	}
	const recent = messages.slice(-40).filter(isMessageLike);
	const toolNames = [];
	for (const message of recent) {
		if (message.role !== "assistant" || !Array.isArray(message.content)) continue;
		for (const block of message.content) if (typeof block === "object" && block !== null && block.type === "tool-call" && typeof block.name === "string") toolNames.push(block.name);
	}
	return {
		messages: recent,
		toolNames: [...new Set(toolNames)].slice(-30)
	};
}
function isMessageLike(value) {
	return typeof value === "object" && value !== null && typeof value.role === "string" && "content" in value;
}
// src/protect.ts
const PROTECTED_PACKAGES = /* @__PURE__ */ new Set([
	"dsh-plugin-trim",
	"dsh-plugin-recipe",
	"dsh-shared-meta",
	"@deepseek-ai/dsh-plugin-manager",
	"@deepseek-ai/dsh-plugin-manager/tools",
	"@deepseek-ai/dsh-tools",
	"@deepseek-ai/dsh-system-prompt",
	"@deepseek-ai/dsh-agent",
	"@deepseek-ai/dsh-agent-loop",
	"@deepseek-ai/dsh-session",
	"@deepseek-ai/dsh-session-projection",
	"@deepseek-ai/dsh-llm",
	"@deepseek-ai/dsh-host-webserver",
	"@deepseek-ai/dsh-api-gateway",
	"@deepseek-ai/dsh-client-modules",
	"@deepseek-ai/dsh-hmr",
	"@deepseek-ai/dsh-base",
	"@deepseek-ai/dsh-web-app",
	"@deepseek-ai/dsh-headless",
	"@deepseek-ai/dsh-sdk-app",
	"@deepseek-ai/dsh-sdk-minimal",
	"@deepseek-ai/dsh-persona",
	"@deepseek-ai/dsh-agent-preset",
	"@deepseek-ai/dsh-agent-preset-registry",
	"@deepseek-ai/cordis-plugin-loader",
	"@deepseek-ai/cordis-plugin-include"
]);
const PROTECTED_PREFIXES = [
	"@deepseek-ai/dsh-agent-",
	"@deepseek-ai/dsh-session-",
	"@deepseek-ai/dsh-llm-",
	"@deepseek-ai/dsh-client-",
	"@deepseek-ai/dsh-api-"
];
const PROTECTED_ENTRY_PREFIX = /^preset[-:]/;
/** Build the conservative protection policy for trim suggestions and apply. */
function buildProtection(input) {
	const protectedModules = new Set(PROTECTED_PACKAGES);
	for (const preset of input.inventory?.agentPresets ?? []) for (const row of preset.rows) protectedModules.add(row.moduleName);
	for (const extra of [...input.extraProtect ?? [], ...input.pinned ?? []]) protectedModules.add(extra);
	const protectedBundles = /* @__PURE__ */ new Set();
	for (const bundle of input.bundles) {
		if (bundle.readOnlyReason !== void 0) {
			protectedBundles.add(bundle.name);
			continue;
		}
		if (isProtectedModule(bundle.name)) {
			protectedBundles.add(bundle.name);
			continue;
		}
		if (protectedModules.has(bundle.name)) {
			protectedBundles.add(bundle.name);
			continue;
		}
		if (bundle.rows.some((row) => isProtectedModule(row.moduleName) || protectedModules.has(row.moduleName))) protectedBundles.add(bundle.name);
	}
	return {
		protectedModules,
		protectedEntryPredicate: (entry) => {
			if (entry.readOnlyReason !== void 0) return true;
			if (PROTECTED_ENTRY_PREFIX.test(entry.entryId)) return true;
			if (protectedModules.has(entry.moduleName)) return true;
			if (isProtectedModule(entry.moduleName)) return true;
			if (entry.moduleName.includes("agent-preset")) return true;
			if (entry.moduleName.includes("dsh-persona")) return true;
			return false;
		},
		protectedBundlePredicate: (bundle) => protectedBundles.has(bundle.name) || protectedModules.has(bundle.name) || bundle.readOnlyReason !== void 0 || isProtectedModule(bundle.name) || bundle.rows.some((row) => protectedModules.has(row.moduleName) || isProtectedModule(row.moduleName))
	};
}
/** Whether a module/package name falls under the core protection policy. */
function isProtectedModule(moduleName) {
	const root = moduleName.replace(/\/.*$/, "");
	if (PROTECTED_PACKAGES.has(moduleName) || PROTECTED_PACKAGES.has(root)) return true;
	return PROTECTED_PREFIXES.some((prefix) => moduleName.startsWith(prefix));
}
// src/tool-owners.ts
/** Built-in tool name to owning package mapping, conservative and overridable. */
const DEFAULT_TOOL_OWNERS = {
	bash: "@deepseek-ai/dsh-tool-bash",
	pwsh: "@deepseek-ai/dsh-tool-pwsh",
	read: "@deepseek-ai/dsh-tool-fs",
	read_image: "@deepseek-ai/dsh-tool-fs",
	write: "@deepseek-ai/dsh-tool-fs",
	edit: "@deepseek-ai/dsh-tool-fs",
	apply_patch: "@deepseek-ai/dsh-tool-fs",
	glob: "@deepseek-ai/dsh-tool-fs-search",
	grep: "@deepseek-ai/dsh-tool-fs-search",
	todo_write: "@deepseek-ai/dsh-tool-todo",
	schedule_create: "@deepseek-ai/dsh-tool-schedule",
	schedule_list: "@deepseek-ai/dsh-tool-schedule",
	schedule_view: "@deepseek-ai/dsh-tool-schedule",
	schedule_edit: "@deepseek-ai/dsh-tool-schedule",
	web_search: "@deepseek-ai/dsh-tool-web",
	web_fetch: "@deepseek-ai/dsh-tool-web",
	present: "@deepseek-ai/dsh-tool-present",
	subagent: "@deepseek-ai/dsh-tool-subagent",
	subagent_fork: "@deepseek-ai/dsh-tool-subagent",
	workflow: "@deepseek-ai/dsh-tool-workflow",
	ask_user_question: "@deepseek-ai/dsh-tool-ask-user",
	job_list: "@deepseek-ai/dsh-tool-jobs",
	job_output: "@deepseek-ai/dsh-tool-jobs",
	job_kill: "@deepseek-ai/dsh-tool-jobs",
	goal_create: "@deepseek-ai/dsh-tool-goal",
	goal_get: "@deepseek-ai/dsh-tool-goal",
	goal_update: "@deepseek-ai/dsh-tool-goal",
	skill: "@deepseek-ai/dsh-tool-skill",
	session_query: "@deepseek-ai/dsh-tool-session-query",
	working_directory: "@deepseek-ai/dsh-tool-working-directory",
	terminal_create: "@deepseek-ai/dsh-tool-terminal",
	terminal_write: "@deepseek-ai/dsh-tool-terminal",
	terminal_read: "@deepseek-ai/dsh-tool-terminal",
	terminal_list: "@deepseek-ai/dsh-tool-terminal",
	terminal_kill: "@deepseek-ai/dsh-tool-terminal",
	ralph: "@deepseek-ai/dsh-tool-ralph"
};
/** Built-in prompt section/context name to owning package mapping. */
const DEFAULT_SECTION_OWNERS = {
	"tool-bash": "@deepseek-ai/dsh-tool-bash",
	"tool-pwsh": "@deepseek-ai/dsh-tool-pwsh",
	"tool-read": "@deepseek-ai/dsh-tool-fs",
	"tool-write": "@deepseek-ai/dsh-tool-fs",
	"tool-edit": "@deepseek-ai/dsh-tool-fs",
	"tool-apply-patch": "@deepseek-ai/dsh-tool-fs",
	"tool-glob": "@deepseek-ai/dsh-tool-fs-search",
	"tool-grep": "@deepseek-ai/dsh-tool-fs-search",
	"tool-jobs": "@deepseek-ai/dsh-tool-jobs",
	"tool-pty": "@deepseek-ai/dsh-tool-terminal",
	"tool-web-search": "@deepseek-ai/dsh-tool-web",
	"tool-web-fetch": "@deepseek-ai/dsh-tool-web",
	"tool-goal": "@deepseek-ai/dsh-tool-goal",
	"tool-schedule": "@deepseek-ai/dsh-tool-schedule",
	"tool-workflow": "@deepseek-ai/dsh-tool-workflow",
	"tool-ralph": "@deepseek-ai/dsh-tool-ralph",
	"tool-subagent": "@deepseek-ai/dsh-tool-subagent",
	"tool-skill": "@deepseek-ai/dsh-tool-skill",
	"tool-session-query": "@deepseek-ai/dsh-tool-session-query",
	"tool-computer-use": "@deepseek-ai/dsh-tool-computer-use",
	"working-directory": "@deepseek-ai/dsh-tool-working-directory",
	"sandbox-policy": "@deepseek-ai/dsh-sandbox-policy",
	"approval-policy": "@deepseek-ai/dsh-user-approval",
	"subagent-delegation": "@deepseek-ai/dsh-subagent",
	"web-surface": "@deepseek-ai/dsh-web"
};
/** Resolve an owning package, preferring user overrides. */
function ownerOfTool(toolName, overrides = {}) {
	return overrides[toolName] ?? DEFAULT_TOOL_OWNERS[toolName];
}
/** Resolve an owning package for a prompt section/context. */
function ownerOfSection(name) {
	return DEFAULT_SECTION_OWNERS[name];
}
// src/dedupe.ts
/** Find exact and near-duplicate prompt paragraphs across sections. */
function dedupeSections(sections, options) {
	const paragraphs = [];
	for (const section of sections.slice(0, 200)) for (const text of splitParagraphs(section.text).slice(0, 20)) {
		const normalized = normalizeLine(text);
		if (normalized.length < 20) continue;
		paragraphs.push({
			section: section.name,
			owner: ownerOfSection(section.name),
			text,
			normalized,
			shingles: shingles(wordTokens(text), 3)
		});
	}
	if (paragraphs.length < 2) return [];
	const groups = [];
	const used = /* @__PURE__ */ new Set();
	const threshold = options.similarityThreshold ?? .8;
	for (let i = 0; i < paragraphs.length; i++) {
		if (used.has(i)) continue;
		const base = paragraphs[i];
		const group = [base];
		used.add(i);
		for (let j = i + 1; j < paragraphs.length; j++) {
			if (used.has(j)) continue;
			const candidate = paragraphs[j];
			if ((base.normalized === candidate.normalized ? 1 : jaccard(base.shingles, candidate.shingles)) < threshold) continue;
			group.push(candidate);
			used.add(j);
		}
		if (uniq(group.map((item) => item.section)).length > 1) groups.push(group);
		if (groups.length >= 20) break;
	}
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	for (const group of groups) {
		const sectionsInGroup = uniq(group.map((item) => item.section)).sort();
		const key = sectionsInGroup.join("|");
		if (seen.has(key)) continue;
		seen.add(key);
		const members = sectionsInGroup.map((section) => {
			const first = group.find((item) => item.section === section);
			return {
				section,
				owner: first?.owner,
				textLength: first?.text.length ?? 0
			};
		});
		const authority = pickAuthority(members);
		const conflict = hasConflict(group.map((item) => item.text));
		out.push({
			fingerprint: shortHash(key),
			members,
			authority,
			conflict,
			reason: conflict ? "疑似语义冲突，仅标记不合并" : "保留权威来源，其余建议改为引用或摘要",
			excerpt: options.persistExcerpts ? truncate(group[0]?.text ?? "", 160) : void 0
		});
	}
	return out;
}
function pickAuthority(members) {
	return [...members].sort((a, b) => {
		const aCore = isAuthoritativeOwner(a.owner) ? 1 : 0;
		const bCore = isAuthoritativeOwner(b.owner) ? 1 : 0;
		if (aCore !== bCore) return bCore - aCore;
		if (a.textLength !== b.textLength) return b.textLength - a.textLength;
		return a.section.localeCompare(b.section);
	})[0]?.section ?? "";
}
function isAuthoritativeOwner(owner) {
	if (owner === void 0) return false;
	return owner.includes("dsh-tool-fs") || owner.includes("dsh-tool-bash") || owner.includes("dsh-system-prompt");
}
function hasConflict(texts) {
	const negation = /(?:^|\s)(not|never|no|禁止|不得|不要|必须|always|must)(?:\s|$)/i;
	const numberSets = texts.map((text) => new Set(text.match(/\d+/g) ?? []));
	const first = numberSets[0] ?? /* @__PURE__ */ new Set();
	for (const current of numberSets.slice(1)) {
		if (current.size !== first.size) return true;
		for (const value of first) if (!current.has(value)) return true;
	}
	const firstNegation = negation.test(texts[0] ?? "");
	for (const text of texts.slice(1)) if (negation.test(text) !== firstNegation) return true;
	return false;
}
// src/usage.ts
/** Append-only local usage ledger. Records tool names, success, and time only. */
var UsageLedger = class {
	path;
	retentionDays;
	maxBytes;
	enabled;
	buffer = [];
	timer;
	flushPromise;
	constructor(options = {}) {
		this.path = options.path ?? dataDir("trim", "usage.jsonl");
		this.retentionDays = options.retentionDays ?? 30;
		this.maxBytes = options.maxBytes ?? 1048576;
		this.enabled = options.enabled ?? true;
	}
	record(toolName, ok) {
		if (!this.enabled || toolName.length === 0) return;
		this.buffer.push({
			t: (/* @__PURE__ */ new Date()).toISOString(),
			n: toolName,
			ok
		});
		if (this.timer === void 0) {
			this.timer = setTimeout(() => {
				this.timer = void 0;
				this.flush();
			}, 2e3);
			this.timer.unref?.();
		}
	}
	async flush() {
		if (this.flushPromise !== void 0) return this.flushPromise;
		if (this.buffer.length === 0) return;
		const lines = this.buffer;
		this.buffer = [];
		this.flushPromise = (async () => {
			try {
				await appendJsonl(this.path, lines);
				await this.compactIfNeeded();
			} finally {
				this.flushPromise = void 0;
			}
		})();
		return this.flushPromise;
	}
	async dispose() {
		if (this.timer !== void 0) {
			clearTimeout(this.timer);
			this.timer = void 0;
		}
		await this.flush();
	}
	/** Aggregate retained lines by tool name. */
	async aggregate() {
		await this.flush();
		const lines = await readJsonl(this.path);
		const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1e3;
		const map = /* @__PURE__ */ new Map();
		for (const line of lines) {
			if (typeof line.t !== "string" || typeof line.n !== "string") continue;
			const at = Date.parse(line.t);
			if (!Number.isFinite(at) || at < cutoff) continue;
			const current = map.get(line.n) ?? {
				calls: 0,
				successes: 0,
				sessionCalls: 0
			};
			current.calls += 1;
			if (line.ok === true) current.successes += 1;
			if (current.lastUsedAt === void 0 || line.t > current.lastUsedAt) current.lastUsedAt = line.t;
			map.set(line.n, current);
		}
		return map;
	}
	/** Add current-session tool calls to an aggregate without pretending to know success. */
	addSessionUsage(aggregate, toolNames) {
		const counts = /* @__PURE__ */ new Map();
		for (const name of toolNames) counts.set(name, (counts.get(name) ?? 0) + 1);
		for (const [name, count] of counts) {
			const current = aggregate.get(name) ?? {
				calls: 0,
				successes: 0,
				sessionCalls: 0
			};
			current.sessionCalls += count;
			aggregate.set(name, current);
		}
		return aggregate;
	}
	async compactIfNeeded() {
		try {
			if ((await stat(this.path)).size <= this.maxBytes) return;
			const lines = await readJsonl(this.path);
			const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1e3;
			const text = lines.filter((line) => {
				const at = typeof line.t === "string" ? Date.parse(line.t) : NaN;
				return Number.isFinite(at) && at >= cutoff;
			}).slice(-5e4).map((line) => JSON.stringify(line)).join("\n");
			await writeTextAtomic(this.path, text.length === 0 ? "" : `${text}\n`);
		} catch {}
	}
};
function mergeUsage(a, b) {
	return {
		calls: a.calls + b.calls,
		successes: a.successes + b.successes,
		sessionCalls: a.sessionCalls + b.sessionCalls,
		lastUsedAt: latest(a.lastUsedAt, b.lastUsedAt)
	};
}
function usageForOwner(usage, owner, toolNames) {
	let total = {
		calls: 0,
		successes: 0,
		sessionCalls: 0
	};
	for (const toolName of toolNames) {
		const stats = usage.get(toolName);
		if (stats !== void 0) total = mergeUsage(total, stats);
	}
	return total;
}
function latest(a, b) {
	if (a === void 0) return b;
	if (b === void 0) return a;
	return a > b ? a : b;
}
// src/scan.ts
/** Normalize plugin metadata, prompt costs, usage, and compat findings into one scan result. */
async function scanPlugins(options) {
	const { config, compat } = options;
	const protection = buildProtection({
		bundles: compat.context.bundles,
		entries: compat.context.entriesInfo,
		inventory: options.inventory,
		extraProtect: config.protect,
		pinned: config.pinned
	});
	const findingsMap = findingsBySubject(compat.findings);
	const sections = [...(compat.context.prompt?.sections ?? []).map((section) => ({
		name: section.name,
		owner: ownerOfSection(section.name) ?? "unattributed",
		tokens: estimateTokens(section.text),
		chars: section.text.length,
		source: "section"
	})), ...(compat.context.prompt?.contexts ?? []).map((section) => ({
		name: section.name,
		owner: ownerOfSection(section.name) ?? "unattributed",
		tokens: estimateTokens(section.text),
		chars: section.text.length,
		source: "context"
	}))];
	const tools = (compat.context.prompt?.tools ?? []).map((tool) => ({
		name: tool.name,
		owner: ownerOfTool(tool.name, config.toolOwners) ?? "unattributed",
		tokens: estimateTokens(JSON.stringify(tool.parameters ?? {}) + (tool.description ?? ""))
	}));
	const byOwner = {};
	for (const section of sections) addCost(byOwner, section.owner ?? "unattributed", section.tokens);
	for (const tool of tools) addCost(byOwner, tool.owner ?? "unattributed", tool.tokens);
	const totalTokens = Object.values(byOwner).reduce((sum, value) => sum + value, 0);
	const toolsByOwner = /* @__PURE__ */ new Map();
	for (const tool of tools) {
		if (tool.owner === void 0) continue;
		const list = toolsByOwner.get(tool.owner) ?? [];
		list.push(tool.name);
		toolsByOwner.set(tool.owner, list);
	}
	const usageAggregate = options.usageLedger === void 0 ? /* @__PURE__ */ new Map() : await options.usageLedger.aggregate();
	const sessionToolNames = options.sessionToolNames ?? extractFromAgent(options.agent).toolNames;
	options.usageLedger?.addSessionUsage(usageAggregate, sessionToolNames);
	const usageByTool = Object.fromEntries(usageAggregate);
	const usageByOwner = {};
	for (const [owner, names] of toolsByOwner) usageByOwner[owner] = usageForOwner(usageAggregate, owner, names);
	const bundles = compat.context.bundles.map((bundle) => {
		const rowModuleNames = uniq(bundle.rows.map((row) => rootPackageName(row.moduleName)));
		const findings = uniqFindings([...findingsMap.get(bundle.name) ?? [], ...rowModuleNames.flatMap((name) => findingsMap.get(name) ?? [])]);
		const usage = mergeBundleUsage(usageByOwner, rowModuleNames);
		return {
			name: bundle.name,
			version: bundle.version,
			description: bundle.description,
			enabled: bundle.enabled,
			installed: bundle.installed,
			availability: bundle.availability,
			official: bundle.official,
			optional: bundle.optional,
			removable: bundle.removable,
			readOnlyReason: bundle.readOnlyReason,
			guardStatus: guardStatusFor(findings, protection.protectedBundlePredicate(bundle)),
			rowModuleNames,
			contextTokens: rowModuleNames.reduce((sum, name) => sum + (byOwner[name] ?? 0), 0),
			usage,
			protected: protection.protectedBundlePredicate(bundle),
			findings
		};
	});
	const bundleByEntry = /* @__PURE__ */ new Map();
	for (const bundle of compat.context.bundles) for (const row of bundle.rows) if (row.entryId !== void 0) bundleByEntry.set(row.entryId, bundle.name);
	const entries = compat.context.entriesInfo.map((entry) => {
		const root = rootPackageName(entry.moduleName);
		const findings = findingsMap.get(entry.moduleName) ?? findingsMap.get(root) ?? [];
		const usage = mergeBundleUsage(usageByOwner, [root]);
		return {
			entryId: entry.entryId,
			moduleName: entry.moduleName,
			bundleName: bundleByEntry.get(entry.entryId),
			enabled: entry.enabled,
			fiberPhase: entry.fiberPhase,
			diagnostic: entry.diagnostic,
			patchId: entry.patchId,
			readOnlyReason: entry.readOnlyReason,
			guardStatus: guardStatusFor(findings, protection.protectedEntryPredicate(entry)),
			contextTokens: byOwner[root] ?? 0,
			usage,
			protected: protection.protectedEntryPredicate(entry),
			findings
		};
	});
	const presetModules = uniq([...(options.inventory?.agentPresets ?? []).flatMap((preset) => preset.rows.map((row) => row.moduleName)), ...compat.context.loaderEntries.filter((entry) => entry.source === "preset").map((entry) => entry.moduleName)]);
	const dedupe = config.enableDedupe && compat.context.prompt !== void 0 ? dedupeSections([...compat.context.prompt.sections, ...compat.context.prompt.contexts], { persistExcerpts: config.persistExcerpts }) : [];
	return {
		managementAvailable: options.pluginManager !== void 0,
		compat: {
			summary: compat.report.summary,
			topFindings: compat.findings.slice(0, 5),
			reportPath: compat.reportPath
		},
		bundles,
		entries,
		context: {
			totalTokens,
			byOwner,
			sections,
			tools,
			unattributedTokens: byOwner.unattributed ?? 0
		},
		presetModules,
		usage: {
			byTool: usageByTool,
			byOwner: usageByOwner
		},
		dedupe,
		diagnostics: [...compat.context.diagnostics]
	};
}
function addCost(map, owner, tokens) {
	map[owner] = (map[owner] ?? 0) + tokens;
}
function mergeBundleUsage(usageByOwner, owners) {
	let total = {
		calls: 0,
		successes: 0,
		sessionCalls: 0
	};
	for (const owner of owners) {
		const stats = usageByOwner[owner];
		if (stats !== void 0) total = mergeUsage(total, stats);
	}
	return total;
}
function guardStatusFor(findings, protectedItem) {
	if (protectedItem) return "protected";
	if (findings.some((finding) => finding.severity === "error" && finding.code.startsWith("RT_"))) return "incompatible";
	if (findings.some((finding) => finding.severity === "error")) return "warn";
	if (findings.some((finding) => finding.severity === "warn")) return "warn";
	return "ok";
}
function uniqFindings(items) {
	const map = /* @__PURE__ */ new Map();
	for (const item of items) map.set(item.id, item);
	return [...map.values()];
}
// src/store.ts
function draftPath(profileId) {
	return dataDir("trim", "profiles", `${safeId(profileId)}.json`);
}
function snapshotPath(token) {
	return dataDir("trim", "snapshots", `${safeId(token)}.json`);
}
async function saveDraft(profile, maxDrafts) {
	await writeJsonAtomic(draftPath(profile.id), profile);
	await pruneToCount(dataDir("trim", "profiles"), maxDrafts);
}
async function loadDraft(profileId) {
	return readJson(draftPath(profileId));
}
async function saveSnapshot(snapshot, maxDrafts) {
	await writeJsonAtomic(snapshotPath(snapshot.token), snapshot);
	await pruneToCount(dataDir("trim", "snapshots"), maxDrafts);
}
async function loadSnapshot(token) {
	return readJson(snapshotPath(token));
}
async function listSnapshots() {
	return listJsonFiles(dataDir("trim", "snapshots"));
}
function safeId(value) {
	return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
// src/apply.ts
var ApplyRefusedError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "ApplyRefusedError";
	}
};
const CONFLICT_FIX_CODES = /* @__PURE__ */ new Set([
	"PP_SERVICE_DUPLICATE",
	"PP_ROW_DUPLICATE",
	"PP_MCP_SERVER_DUPLICATE",
	"PP_RUNTIME_REGISTRATION_FAILED",
	"RT_PLATFORM_UNSUPPORTED",
	"RT_ENGINE_UNMET",
	"RT_PEER_UNMET",
	"RT_PREFLIGHT_DENIED"
]);
/** Apply low-risk items from a saved draft, with a crash-safe snapshot and automatic rollback. */
async function applySlimProfile(profileId, options) {
	if (options.confirm !== true) throw new ApplyRefusedError("apply requires confirm: true; ask the user to explicitly approve the exact profileId and items first");
	const draft = await loadDraft(profileId);
	if (draft === void 0) throw new Error(`unknown slim profile: ${profileId}`);
	const desiredIds = options.items === void 0 ? void 0 : new Set(options.items);
	let candidates = applicableItems(draft).filter((item) => desiredIds === void 0 || desiredIds.has(item.id));
	if (candidates.length === 0) return {
		profileId,
		items: []
	};
	const [bundles, entries] = await Promise.all([options.manager.listBundles(), options.manager.listPlugins()]);
	const bundleEnabled = new Map(bundles.map((bundle) => [bundle.name, bundle.enabled]));
	const entryEnabled = new Map(entries.map((entry) => [entry.entryId, entry.enabled]));
	const freshFindings = findingsBySubject(options.findings ?? []);
	const disabledBundles = new Set(candidates.filter((item) => item.kind === "bundle" && item.action === "suggest-disable").map((item) => item.bundleName).filter((name) => name !== void 0));
	candidates = candidates.filter((item) => !(item.kind === "entry" && item.bundleName !== void 0 && disabledBundles.has(item.bundleName)));
	const token = randomToken();
	const snapshot = {
		schemaVersion: 1,
		token,
		profileId,
		profileName: options.profileName,
		createdAt: (/* @__PURE__ */ new Date()).toISOString(),
		status: "pending",
		items: candidates.map((item) => ({
			id: item.id,
			kind: item.kind,
			name: item.name,
			previousEnabled: currentEnabled(item, bundleEnabled, entryEnabled),
			desiredEnabled: item.action === "enable",
			status: "pending"
		}))
	};
	await saveSnapshot(snapshot, options.maxDrafts);
	const results = [];
	let restartRequired = false;
	let failed = false;
	for (let index = 0; index < candidates.length; index++) {
		const item = candidates[index];
		const snapshotItem = snapshot.items[index];
		if (snapshotItem === void 0) continue;
		const current = currentEnabled(item, bundleEnabled, entryEnabled);
		if (current !== item.observedEnabled) {
			results.push({
				id: item.id,
				kind: item.kind,
				name: item.name,
				status: "stale",
				error: "plugin state changed since the draft was created"
			});
			snapshotItem.status = "skipped";
			await saveSnapshot(snapshot, options.maxDrafts);
			continue;
		}
		if (current === snapshotItem.desiredEnabled) {
			results.push({
				id: item.id,
				kind: item.kind,
				name: item.name,
				status: "skipped",
				error: "already in the desired state"
			});
			snapshotItem.status = "skipped";
			await saveSnapshot(snapshot, options.maxDrafts);
			continue;
		}
		if (item.protected) {
			results.push({
				id: item.id,
				kind: item.kind,
				name: item.name,
				status: "skipped",
				error: "protected"
			});
			snapshotItem.status = "skipped";
			await saveSnapshot(snapshot, options.maxDrafts);
			continue;
		}
		const blocked = blockedByCompat(item, [...freshFindings.get(item.name) ?? [], ...item.bundleName === void 0 ? [] : freshFindings.get(item.bundleName) ?? []]);
		if (blocked !== void 0) {
			results.push({
				id: item.id,
				kind: item.kind,
				name: item.name,
				status: "blocked-by-compat",
				error: blocked
			});
			snapshotItem.status = "skipped";
			await saveSnapshot(snapshot, options.maxDrafts);
			continue;
		}
		let change;
		try {
			change = await applyOne(item, options.manager);
		} catch (error) {
			change = {
				changed: false,
				application: "failed",
				error: { diagnostic: error instanceof Error ? error.message : String(error) }
			};
		}
		const status = mapStatus(change);
		if (status === "failed") {
			failed = true;
			snapshotItem.status = "failed";
			snapshotItem.application = change.application;
			snapshotItem.error = change.error?.diagnostic ?? change.error?.code;
			results.push({
				id: item.id,
				kind: item.kind,
				name: item.name,
				status: "failed",
				application: change.application,
				error: snapshotItem.error
			});
		} else {
			snapshotItem.status = "applied";
			snapshotItem.application = change.application;
			results.push({
				id: item.id,
				kind: item.kind,
				name: item.name,
				status,
				application: change.application,
				fixKind: fixKindFor(item, [...freshFindings.get(item.name) ?? [], ...item.bundleName === void 0 ? [] : freshFindings.get(item.bundleName) ?? []])
			});
			if (change.application === "restart-required") restartRequired = true;
			if (item.kind === "bundle") bundleEnabled.set(item.name, snapshotItem.desiredEnabled);
			else entryEnabled.set(item.name, snapshotItem.desiredEnabled);
		}
		await saveSnapshot(snapshot, options.maxDrafts);
		if (failed) break;
	}
	if (failed) {
		await autoRollback(snapshot, options.manager);
		snapshot.status = "partial";
		await saveSnapshot(snapshot, options.maxDrafts);
		draft.status = "partial";
		await saveDraft(draft, options.maxDrafts).catch(() => void 0);
		await audit$1(profileId, "apply", "fail", "applied then rolled back after a failure", results.length);
		return {
			profileId,
			token,
			items: results,
			rolledBack: true,
			restartRequired
		};
	}
	snapshot.status = "applied";
	await saveSnapshot(snapshot, options.maxDrafts);
	draft.status = "applied";
	await saveDraft(draft, options.maxDrafts).catch(() => void 0);
	await audit$1(profileId, "apply", "ok", `applied ${results.filter((item) => item.status !== "skipped").length} items`, results.length);
	return {
		profileId,
		token,
		items: results,
		restartRequired
	};
}
async function applyOne(item, manager) {
	const enabled = item.action === "enable";
	if (item.kind === "bundle") {
		if (typeof manager.setBundleEnabled !== "function") throw new Error("plugin manager cannot set bundles");
		return manager.setBundleEnabled(item.name, enabled);
	}
	if (typeof manager.setPluginEnabled !== "function") throw new Error("plugin manager cannot set plugins");
	return manager.setPluginEnabled(item.name, enabled);
}
async function autoRollback(snapshot, manager) {
	for (const item of [...snapshot.items].reverse()) {
		if (item.status !== "applied") continue;
		try {
			if (item.kind === "bundle") await manager.setBundleEnabled?.(item.name, item.previousEnabled);
			else await manager.setPluginEnabled?.(item.name, item.previousEnabled);
			item.status = "skipped";
			item.error = "rolled back after a later failure";
		} catch {}
	}
}
function mapStatus(change) {
	if (change.application === "applied") return "applied";
	if (change.application === "restart-required") return "applied-pending-restart";
	return "failed";
}
function currentEnabled(item, bundles, entries) {
	return item.kind === "bundle" ? bundles.get(item.name) ?? item.observedEnabled : entries.get(item.name) ?? item.observedEnabled;
}
function blockedByCompat(item, findings) {
	const errors = [...item.findings, ...findings].filter((finding) => finding.severity === "error");
	if (errors.length === 0) return void 0;
	if (item.action === "enable") return `enabling would collide with ${errors.map((finding) => finding.code).join(", ")}`;
	if (errors.every((finding) => CONFLICT_FIX_CODES.has(finding.code))) return void 0;
	return `compatibility error is not safe to auto-resolve: ${errors.map((finding) => finding.code).join(", ")}`;
}
function fixKindFor(item, findings) {
	if (item.action !== "suggest-disable") return void 0;
	const combined = [...item.findings, ...findings];
	if (combined.some((finding) => finding.code.startsWith("PP_"))) return "conflict";
	if (combined.some((finding) => finding.code.startsWith("RT_"))) return "workaround";
}
async function audit$1(subject, action, result, summary, count) {
	await new AuditLog().append({
		t: (/* @__PURE__ */ new Date()).toISOString(),
		actor: "trim",
		action,
		subject,
		result,
		summary,
		metrics: { items: count }
	}).catch(() => void 0);
}
// src/rollback.ts
/** Restore a previous apply snapshot, skipping state changed outside trim. */
async function rollbackSlimProfile(options) {
	const token = options.token ?? await latestToken(options.profileName);
	if (token === void 0) throw new Error("no rollback snapshot found");
	const snapshot = await loadSnapshot(token);
	if (snapshot === void 0) throw new Error(`unknown rollback token: ${token}`);
	const [bundles, entries] = await Promise.all([options.manager.listBundles(), options.manager.listPlugins()]);
	const bundleEnabled = new Map(bundles.map((bundle) => [bundle.name, bundle.enabled]));
	const entryEnabled = new Map(entries.map((entry) => [entry.entryId, entry.enabled]));
	const results = [];
	for (const item of [...snapshot.items].reverse()) {
		if (item.status !== "applied" && item.status !== "failed") {
			results.push({
				id: item.id,
				kind: item.kind,
				name: item.name,
				status: "skipped"
			});
			continue;
		}
		const current = item.kind === "bundle" ? bundleEnabled.get(item.name) ?? item.desiredEnabled : entryEnabled.get(item.name) ?? item.desiredEnabled;
		const pendingRestart = item.application === "restart-required";
		const matchesPrevious = current === item.previousEnabled;
		const matchesDesired = current === item.desiredEnabled;
		if (matchesPrevious && !pendingRestart) {
			results.push({
				id: item.id,
				kind: item.kind,
				name: item.name,
				status: "already-restored"
			});
			continue;
		}
		if (!matchesPrevious && !matchesDesired) {
			results.push({
				id: item.id,
				kind: item.kind,
				name: item.name,
				status: "externally-changed"
			});
			continue;
		}
		try {
			if (item.kind === "bundle") {
				if (typeof options.manager.setBundleEnabled !== "function") throw new Error("plugin manager cannot set bundles");
				await options.manager.setBundleEnabled(item.name, item.previousEnabled);
				bundleEnabled.set(item.name, item.previousEnabled);
			} else {
				if (typeof options.manager.setPluginEnabled !== "function") throw new Error("plugin manager cannot set plugins");
				await options.manager.setPluginEnabled(item.name, item.previousEnabled);
				entryEnabled.set(item.name, item.previousEnabled);
			}
			results.push({
				id: item.id,
				kind: item.kind,
				name: item.name,
				status: "restored"
			});
			item.status = "skipped";
		} catch (error) {
			results.push({
				id: item.id,
				kind: item.kind,
				name: item.name,
				status: "failed",
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
	snapshot.status = "rolled-back";
	await saveSnapshot(snapshot, options.maxDrafts);
	const draft = await loadDraft(snapshot.profileId);
	if (draft !== void 0) {
		draft.status = "rolled-back";
		await saveDraft(draft, options.maxDrafts).catch(() => void 0);
	}
	await new AuditLog().append({
		t: (/* @__PURE__ */ new Date()).toISOString(),
		actor: "trim",
		action: "rollback",
		subject: snapshot.profileId,
		result: results.some((item) => item.status === "failed") ? "fail" : "ok",
		summary: `restored ${results.filter((item) => item.status === "restored").length} items`,
		metrics: { items: results.length }
	}).catch(() => void 0);
	return {
		token,
		items: results
	};
}
async function latestToken(profileName) {
	const files = await listSnapshots();
	for (const file of files) {
		const token = file.replace(/\.json$/, "").split(/[\\/]/).pop();
		if (token === void 0) continue;
		if (profileName === void 0) return token;
		try {
			if ((await loadSnapshot(token))?.profileName === profileName) return token;
		} catch {}
	}
}
// src/tools.ts
const TASK_TAGS = [
	"bugfix",
	"feature",
	"review",
	"docs",
	"release",
	"report",
	"research",
	"unknown"
];
/** Register all trim model-facing tools. */
function registerTrimTools(ctx, deps) {
	registerScanTool(ctx, deps);
	registerSuggestTool(ctx, deps);
	registerApplyTool(ctx, deps);
	registerRollbackTool(ctx, deps);
}
function registerScanTool(ctx, deps) {
	ctx.tools.register(defineTool({
		name: "trim_scan_plugins",
		description: "Read-only scan of installed DSH bundles/entries, current prompt context cost, usage, dedupe groups, and a compatibility summary. Use when the user asks which plugins are consuming context or wants a plugin inventory. Does not change plugin state.",
		parameters: {
			detail: {
				type: "string",
				enum: ["summary", "full"],
				description: "summary shows top rows; full shows more entries. Default summary."
			},
			maxRows: {
				type: "integer",
				description: "Maximum rows per table, 1..100. Default 20."
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute(args, exec) {
			const compat = await analyzeCompatibility(ctx, deps.config, {
				scope: "current",
				includeInfo: true,
				writeReport: false,
				agent: exec.agent,
				toolSet: exec.toolSet
			});
			const sessionToolNames = extractFromAgent(exec.agent).toolNames;
			const scan = await scanPlugins({
				config: deps.config,
				compat,
				pluginManager: getPluginManager(ctx),
				inventory: await inventoryOf(ctx),
				usageLedger: deps.ledger,
				agent: exec.agent,
				sessionToolNames
			});
			await audit("scan_plugins", "ok", `scanned ${scan.bundles.length} bundles`);
			return renderScan(scan, args.detail === "full" ? 100 : Math.min(100, Math.max(1, args.maxRows ?? 20)));
		},
		presentCall: () => ({
			card: "generic",
			title: "Scan plugin context",
			kind: "read"
		})
	}));
}
function registerSuggestTool(ctx, deps) {
	ctx.tools.register(defineTool({
		name: "trim_suggest_profile",
		description: "Build a read-only slim-profile draft for the current task: which plugins to keep, enable, disable, or review, with explainable evidence, compatibility findings, and dedupe suggestions. Writes only a local draft; never changes plugin enablement. Call trim_apply_profile only after the user explicitly approves the returned profileId.",
		parameters: {
			taskTag: {
				type: "string",
				enum: TASK_TAGS,
				description: "Optional explicit task tag; overrides text detection."
			},
			goal: {
				type: "string",
				description: "Optional task goal when the user states it explicitly."
			},
			includeReview: {
				type: "boolean",
				description: "Include review-only items. Default true."
			},
			maxDisable: {
				type: "integer",
				description: "Maximum disable suggestions, 0..100. Default 20."
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute(args, exec) {
			const task = detectTask({
				explicit: args.taskTag,
				goal: args.goal,
				agent: exec.agent
			});
			const compat = await analyzeCompatibility(ctx, deps.config, {
				scope: "current",
				includeInfo: true,
				writeReport: true,
				agent: exec.agent,
				toolSet: exec.toolSet
			});
			const scan = await scanPlugins({
				config: deps.config,
				compat,
				pluginManager: getPluginManager(ctx),
				inventory: await inventoryOf(ctx),
				usageLedger: deps.ledger,
				task,
				agent: exec.agent
			});
			let profile = buildSlimProfile(scan, task, deps.config, {
				includeReview: args.includeReview,
				maxDisable: args.maxDisable
			});
			profile = attachFindings(profile, scan);
			let saved = true;
			try {
				await saveDraft(profile, deps.config.maxDrafts);
			} catch {
				saved = false;
			}
			await audit("suggest_profile", saved ? "ok" : "fail", `draft ${profile.id}: ${profile.summary.disable} disable / ${profile.summary.enable} enable / ${profile.summary.review} review`);
			return renderSuggest(profile, scan, saved);
		},
		presentCall: () => ({
			card: "generic",
			title: "Suggest slim profile",
			kind: "read"
		})
	}));
}
function registerApplyTool(ctx, deps) {
	ctx.tools.register(defineTool({
		name: "trim_apply_profile",
		description: "Apply low-risk keep/enable/disable items from a saved slim-profile draft. Requires confirm: true and must be called only after the user explicitly approved the exact profileId and items in this conversation. Protected/core/preset items are never changed. Returns a rollback token. Only low-risk disables/enables are applied; compatibility errors can block an item.",
		parameters: {
			profileId: {
				type: "string",
				required: true,
				description: "The profileId returned by trim_suggest_profile."
			},
			confirm: {
				type: "boolean",
				required: true,
				description: "Must be true only after explicit user approval of the exact draft."
			},
			items: {
				type: "array",
				items: { type: "string" },
				description: "Optional subset of item ids to apply. Omit to apply all eligible items."
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute(args, exec) {
			if (args.confirm !== true) return "❌ 应用精简方案需要用户明确确认：请先让用户批准具体的 profileId 与 items，再调用 `trim_apply_profile({ profileId, confirm: true })`。";
			const manager = getPluginManager(ctx);
			if (manager === void 0) return "❌ 当前 profile 没有可用的 pluginManager，无法应用精简方案。请改用 `trim_scan_plugins` 只读查看。";
			const compat = await analyzeCompatibility(ctx, deps.config, {
				scope: "current",
				includeInfo: true,
				writeReport: true,
				force: true,
				agent: exec.agent,
				toolSet: exec.toolSet
			});
			try {
				const result = await applySlimProfile(args.profileId, {
					confirm: args.confirm,
					items: args.items,
					manager,
					maxDrafts: deps.config.maxDrafts,
					findings: compat.findings,
					profileName: resolveProfileFacts(ctx, exec.agent).name
				});
				await audit("apply_profile", "ok", `applied ${result.items.length} items`);
				return renderApply(result);
			} catch (error) {
				if (error instanceof ApplyRefusedError) return `❌ ${error.message}`;
				return `❌ 应用失败：${error instanceof Error ? error.message : String(error)}`;
			}
		},
		presentCall: () => ({
			card: "generic",
			title: "Apply slim profile",
			kind: "other"
		})
	}));
}
function registerRollbackTool(ctx, deps) {
	ctx.tools.register(defineTool({
		name: "trim_rollback_profile",
		description: "Restore plugin enablement from a previous trim apply snapshot. Omit token to use the latest snapshot. Skips items already restored or changed outside trim. Returns per-item results.",
		parameters: { token: {
			type: "string",
			description: "Rollback token returned by trim_apply_profile. Omit for the latest snapshot."
		} },
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute(args) {
			const manager = getPluginManager(ctx);
			if (manager === void 0) return "❌ 当前 profile 没有可用的 pluginManager，无法回滚。";
			try {
				const result = await rollbackSlimProfile({
					token: args.token,
					manager,
					maxDrafts: deps.config.maxDrafts,
					profileName: resolveProfileFacts(ctx).name
				});
				await audit("rollback_profile", "ok", `restored ${result.items.filter((item) => item.status === "restored").length} items`);
				return renderRollback(result);
			} catch (error) {
				return `❌ 回滚失败：${error instanceof Error ? error.message : String(error)}`;
			}
		},
		presentCall: () => ({
			card: "generic",
			title: "Rollback slim profile",
			kind: "other"
		})
	}));
}
async function inventoryOf(ctx) {
	const adapter = getInventory(ctx);
	if (adapter === void 0) return void 0;
	try {
		return await adapter.list();
	} catch {
		return;
	}
}
async function audit(action, result, summary) {
	await new AuditLog().append({
		t: (/* @__PURE__ */ new Date()).toISOString(),
		actor: "trim",
		action,
		subject: "trim",
		result,
		summary
	}).catch(() => void 0);
}
function renderScan(scan, maxRows) {
	const lines = [];
	lines.push("# 插件与上下文扫描");
	lines.push("");
	lines.push(`- 管理可用：${scan.managementAvailable ? "是" : "否（只读模式）"}`);
	lines.push(`- 兼容性：${scan.compat.summary.error} error / ${scan.compat.summary.warn} warn / ${scan.compat.summary.info} info`);
	lines.push(`- 可归属上下文：${scan.context.totalTokens} tokens（未归属 ${scan.context.unattributedTokens}）`);
	lines.push("");
	if (scan.compat.topFindings.length > 0) {
		lines.push("## 兼容性摘要");
		lines.push("");
		for (const finding of scan.compat.topFindings) lines.push(`- **${finding.severity.toUpperCase()} ${finding.code}** ${finding.title}`);
		lines.push("");
	}
	lines.push("## 上下文成本 Top");
	lines.push("");
	lines.push("| 名称 | 类型 | owner | tokens |");
	lines.push("|---|---|---|---|");
	const costs = [...scan.context.sections.map((section) => ({
		name: section.name,
		kind: section.source,
		owner: section.owner ?? "unattributed",
		tokens: section.tokens
	})), ...scan.context.tools.map((tool) => ({
		name: tool.name,
		kind: "tool",
		owner: tool.owner ?? "unattributed",
		tokens: tool.tokens
	}))].sort((a, b) => b.tokens - a.tokens).slice(0, maxRows);
	for (const cost of costs) lines.push(`| ${escapeMarkdownCell(cost.name)} | ${cost.kind} | ${escapeMarkdownCell(cost.owner)} | ${cost.tokens} |`);
	if (costs.length === 0) lines.push("| （无可归属项） | — | — | 0 |");
	lines.push("");
	lines.push("## Bundles");
	lines.push("");
	lines.push("| bundle | enabled | protected | guard | tokens | calls | 描述 |");
	lines.push("|---|---|---|---|---|---|---|");
	const sortedBundles = [...scan.bundles].sort((a, b) => b.contextTokens - a.contextTokens || Number(b.enabled) - Number(a.enabled));
	for (const bundle of sortedBundles.slice(0, maxRows)) lines.push(`| ${escapeMarkdownCell(bundle.name)} | ${bundle.enabled ? "yes" : "no"} | ${bundle.protected ? "yes" : "no"} | ${bundle.guardStatus} | ${bundle.contextTokens} | ${bundle.usage.calls + bundle.usage.sessionCalls} | ${escapeMarkdownCell(truncate(bundle.description ?? "", 80))} |`);
	if (scan.bundles.length === 0) lines.push("| （无） | — | — | — | 0 | 0 | — |");
	lines.push("");
	lines.push("## Entries");
	lines.push("");
	lines.push("| entry | module | enabled | phase | guard | tokens |");
	lines.push("|---|---|---|---|---|---|");
	const sortedEntries = [...scan.entries].sort((a, b) => b.contextTokens - a.contextTokens);
	for (const entry of sortedEntries.slice(0, maxRows)) lines.push(`| ${escapeMarkdownCell(entry.entryId)} | ${escapeMarkdownCell(entry.moduleName)} | ${entry.enabled ? "yes" : "no"} | ${entry.fiberPhase ?? "—"} | ${entry.guardStatus} | ${entry.contextTokens} |`);
	if (scan.entries.length === 0) lines.push("| （无） | — | — | — | — | 0 |");
	lines.push("");
	if (scan.presetModules.length > 0) {
		lines.push("## Agent preset 提供（trim 不可单独开关）");
		lines.push("");
		lines.push(`- ${scan.presetModules.slice(0, 30).join(", ")}${scan.presetModules.length > 30 ? ` … 共 ${scan.presetModules.length} 个` : ""}`);
		lines.push("");
	}
	if (scan.dedupe.length > 0) {
		lines.push("## 跨插件 prompt 重复");
		lines.push("");
		lines.push("| 权威 section | 其他 section | 冲突 | 说明 |");
		lines.push("|---|---|---|---|");
		for (const group of scan.dedupe.slice(0, 10)) {
			const others = group.members.filter((member) => member.section !== group.authority).map((member) => member.section);
			lines.push(`| ${escapeMarkdownCell(group.authority)} | ${escapeMarkdownCell(others.join(", "))} | ${group.conflict ? "yes" : "no"} | ${escapeMarkdownCell(group.reason)} |`);
		}
		lines.push("");
	}
	if (scan.diagnostics.length > 0) {
		lines.push("## 诊断");
		lines.push("");
		for (const diagnostic of scan.diagnostics.slice(0, 20)) lines.push(`- ${diagnostic}`);
		lines.push("");
	}
	lines.push(jsonBlock({
		bundles: scan.bundles.length,
		entries: scan.entries.length,
		totalTokens: scan.context.totalTokens,
		unattributedTokens: scan.context.unattributedTokens,
		compat: scan.compat.summary,
		dedupeGroups: scan.dedupe.length
	}, 4e3));
	lines.push("");
	lines.push("> 未修改任何插件状态。需要可执行建议时调用 `trim_suggest_profile`。");
	return lines.join("\n");
}
function renderSuggest(profile, scan, saved = true) {
	const lines = [];
	lines.push("# 精简方案草稿");
	lines.push("");
	if (!saved) {
		lines.push("⚠️ 草稿未能写入本地数据目录；以下建议仍可阅读，但无法通过 trim_apply_profile 应用。请检查 DSH_HOME 权限。");
		lines.push("");
	}
	lines.push(`- 任务：**${profile.task.tag}**（置信度 ${profile.task.confidence.toFixed(2)}，来源 ${profile.task.source}）`);
	lines.push(`- 摘要：保留 ${profile.summary.keep} / 启用 ${profile.summary.enable} / 禁用 ${profile.summary.disable} / 复核 ${profile.summary.review} / 受保护 ${profile.summary.protected}`);
	lines.push(`- 兼容性：${scan.compat.summary.error} error / ${scan.compat.summary.warn} warn / ${scan.compat.summary.info} info`);
	if (!scan.managementAvailable) {
		lines.push("");
		lines.push("⚠️ 当前 profile 没有可用的 pluginManager；本方案仅供只读参考，无法通过 trim_apply_profile 应用。");
	}
	lines.push("");
	lines.push("## 任务证据");
	lines.push("");
	for (const evidence of profile.task.evidence.slice(0, 6)) lines.push(`- ${evidence.summary}`);
	lines.push("");
	const actionable = profile.items.filter((item) => item.action !== "keep").slice(0, 30);
	if (actionable.length > 0) {
		lines.push("## 建议");
		lines.push("");
		lines.push("| item | action | risk | score | 关键证据 |");
		lines.push("|---|---|---|---|---|");
		for (const item of actionable) lines.push(`| ${escapeMarkdownCell(item.id)} | ${item.action} | ${item.risk} | ${item.score} | ${escapeMarkdownCell(item.evidence.slice(0, 3).map((evidence) => evidence.summary).join("；"))} |`);
		lines.push("");
	} else {
		lines.push("没有需要变更的项；当前插件集合看起来已经合适。");
		lines.push("");
	}
	if (profile.dedupe.length > 0) {
		lines.push("## 去重建议");
		lines.push("");
		for (const group of profile.dedupe.slice(0, 10)) lines.push(`- 保留 **${group.authority}**；其余 ${group.members.filter((member) => member.section !== group.authority).map((member) => member.section).join(", ")}（${group.conflict ? "存在冲突，仅标记" : "建议引用/摘要"}）`);
		lines.push("");
	}
	lines.push("## 可应用项");
	lines.push("");
	const eligible = profile.items.filter((item) => item.protected === false && item.risk === "low" && (item.action === "suggest-disable" || item.action === "enable"));
	if (eligible.length === 0) lines.push("没有低风险可应用项；以上建议仅供人工复核。");
	else for (const item of eligible) lines.push(`- ${item.id}：${item.action}`);
	lines.push("");
	lines.push(`profileId: \`${profile.id}\``);
	lines.push("");
	lines.push("> 未修改任何插件状态。仅在用户明确同意上述 profileId 与具体 items 后，才调用 `trim_apply_profile({ profileId, confirm: true })`。");
	lines.push("");
	lines.push(jsonBlock({
		profileId: profile.id,
		task: profile.task,
		summary: profile.summary,
		eligible: eligible.map((item) => ({
			id: item.id,
			action: item.action
		})),
		compat: scan.compat.summary
	}, 6e3));
	return lines.join("\n");
}
function renderApply(result) {
	const lines = [];
	lines.push("# 应用结果");
	lines.push("");
	lines.push("| item | status | application | 说明 |");
	lines.push("|---|---|---|---|");
	for (const item of result.items) lines.push(`| ${escapeMarkdownCell(item.id)} | ${item.status} | ${item.application ?? "—"} | ${escapeMarkdownCell(item.error ?? item.fixKind ?? "")} |`);
	if (result.items.length === 0) lines.push("| （无可应用项） | — | — | — |");
	lines.push("");
	if (result.token !== void 0) lines.push(`rollbackToken: \`${result.token}\``);
	if (result.rolledBack === true) lines.push("⚠️ 应用中途失败，已自动回滚本次已成功项。");
	if (result.restartRequired === true) lines.push("⚠️ 部分变更需要重启 DSH 后生效。");
	lines.push("");
	if (result.token !== void 0) lines.push("如需恢复：`trim_rollback_profile({ token })`。");
	return lines.join("\n");
}
function renderRollback(result) {
	const lines = [];
	lines.push("# 回滚结果");
	lines.push("");
	lines.push("| item | status | 说明 |");
	lines.push("|---|---|---|");
	for (const item of result.items) lines.push(`| ${escapeMarkdownCell(item.id)} | ${item.status} | ${escapeMarkdownCell(item.error ?? "")} |`);
	if (result.items.length === 0) lines.push("| （无） | — | — |");
	lines.push("");
	lines.push(`token: \`${result.token}\``);
	return lines.join("\n");
}
// src/compat/tool.ts
/** Register the read-only compatibility analysis tool. */
function registerCompatTool(ctx, config) {
	ctx.tools.register(defineTool({
		name: "trim_analyze_compatibility",
		description: "Read-only compatibility analysis for the current DSH profile: plugin-plugin conflicts (services, rows, configs, MCP namespaces, registrations), plugin-runtime mismatches (engines, peers, Node, platform, exemptions), and profile/workspace drift. Returns a compatibility matrix and writes a local JSON report. Never changes plugin enablement, grants exemptions, or edits patches.",
		parameters: {
			scope: {
				type: "string",
				enum: [
					"current",
					"profiles",
					"all"
				],
				description: "current: this profile only; profiles: also compare all profiles under $DSH_HOME/profiles; all: profiles plus workspace instruction overlap."
			},
			includeInfo: {
				type: "boolean",
				description: "Include info-level findings in the Markdown matrix; the JSON report always keeps them."
			},
			maxFindings: {
				type: "integer",
				description: "Maximum findings in the report, 1..500. Defaults to the configured limit."
			},
			writeReport: {
				type: "boolean",
				description: "Write the JSON report to $DSH_HOME/experience-optimizer/compat/report.json. Default true."
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute(args, exec) {
			const result = await analyzeCompatibility(ctx, config, {
				scope: args.scope ?? "current",
				includeInfo: args.includeInfo,
				maxFindings: args.maxFindings,
				writeReport: args.writeReport,
				agent: exec.agent,
				toolSet: exec.toolSet
			});
			return `${[
				"> 兼容性分析为只读操作，未修改任何插件、patch 或豁免。",
				result.reportPath === void 0 ? "" : `> 报告文件：${result.reportPath}`,
				""
			].filter((line) => line.length > 0).join("\n")}\n\n${result.markdown}`;
		},
		presentCall: () => ({
			card: "generic",
			title: "Analyze plugin compatibility",
			kind: "read"
		})
	}));
}
// src/index.ts
const name = "dsh-plugin-trim";
const inject = ["tools"];
/** Register trim tools and the local usage observer. */
function apply(ctx, config) {
	const resolved = normalizeConfig(config);
	const ledger = new UsageLedger({
		retentionDays: resolved.usageRetentionDays,
		enabled: resolved.trackUsage
	});
	if (resolved.trackUsage) ctx.on("tools/result", (exec, result) => {
		if (exec.name.startsWith("trim_") || exec.name.startsWith("recipe_")) return;
		try {
			ledger.record(exec.name, !result.isError);
		} catch {}
	});
	ctx.effect(() => () => ledger.dispose(), "trim.usage.flush");
	registerTrimTools(ctx, {
		config: resolved,
		ledger
	});
	registerCompatTool(ctx, resolved);
}
export { Config, analyzeCompatibility, apply, applySlimProfile, buildReport, buildSlimProfile, collectCompatContext, detectTask, inject, name, renderReport, rollbackSlimProfile, runCompatibilityRules, scanPlugins };
