import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { randomUUID } from "node:crypto";
import { appendFile, chmod, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
// src/config.ts
const Config = z.object({
	maxSteps: z.natural().min(1).max(100).default(12),
	allowExport: z.boolean().default(true),
	capabilitiesFile: z.string().default(""),
	defaultDelivery: z.string().default("present")
});
/** Defaults used when the loader starts the plugin without an explicit config. */
const DEFAULT_CONFIG = {
	maxSteps: 12,
	allowExport: true,
	capabilitiesFile: "",
	defaultDelivery: "present"
};
/** Merge a partial/undefined loader config over the defaults. */
function normalizeConfig(config) {
	return {
		...DEFAULT_CONFIG,
		...config ?? {}
	};
}
// ../shared-meta/src/ids.ts
/** Create a sortable, readable id such as `trim-20261108-091500-ab12cd34`. */
function newId(prefix, date = /* @__PURE__ */ new Date()) {
	const pad = (n, width = 2) => String(n).padStart(width, "0");
	return `${prefix}-${`${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`}-${randomUUID().slice(0, 8)}`;
}
// ../shared-meta/src/text.ts
/** Truncate without splitting surrogate pairs. */
function truncate(text, max) {
	if (text.length <= max) return text;
	if (max <= 1) return text.slice(0, max);
	return `${text.slice(0, max - 1)}…`;
}
/** Filesystem/URL-safe slug with a bounded length. */
function slugify(text, max = 48) {
	return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, max) || "untitled";
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function uniq(values) {
	return [...new Set(values)];
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
// src/capabilities.ts
/** Built-in capability seams. Tools are checked against the current agent scope at planning time. */
const BUILT_IN_CAPABILITIES = [
	{
		id: "git-history",
		name: "读取 Git 历史",
		purpose: "读取指定范围/分支的 commit、diff 与变更统计",
		tools: ["bash"],
		trigger: "manual",
		permissions: ["shell"],
		needsConfirm: false,
		keywords: [
			"git",
			"commit",
			"log",
			"diff",
			"分支",
			"变更",
			"提交"
		],
		pluginIds: ["@deepseek-ai/dsh-tool-bash"]
	},
	{
		id: "file-read",
		name: "读取文件",
		purpose: "读取、搜索和汇总工作区文件",
		tools: [
			"read",
			"glob",
			"grep"
		],
		trigger: "manual",
		permissions: ["fs-read"],
		needsConfirm: false,
		keywords: [
			"读取",
			"查看",
			"文件",
			"read",
			"grep",
			"搜索文件"
		],
		pluginIds: ["@deepseek-ai/dsh-tool-fs", "@deepseek-ai/dsh-tool-fs-search"]
	},
	{
		id: "file-write",
		name: "写入文件",
		purpose: "生成或修改 Markdown/文本产物",
		tools: ["write", "edit"],
		trigger: "manual",
		permissions: ["fs-write"],
		needsConfirm: false,
		keywords: [
			"生成",
			"写入",
			"保存",
			"markdown",
			"文档",
			"报告",
			"文件"
		],
		pluginIds: ["@deepseek-ai/dsh-tool-fs"]
	},
	{
		id: "web-research",
		name: "联网检索",
		purpose: "搜索网页并抓取资料",
		tools: ["web_search", "web_fetch"],
		trigger: "manual",
		permissions: ["network"],
		needsConfirm: false,
		keywords: [
			"搜索",
			"调研",
			"网页",
			"资料",
			"search",
			"fetch",
			"research"
		],
		pluginIds: ["@deepseek-ai/dsh-tool-web"]
	},
	{
		id: "schedule",
		name: "定时触发",
		purpose: "按周期创建并运行计划任务",
		tools: ["schedule_create"],
		trigger: "schedule",
		permissions: ["schedule"],
		needsConfirm: true,
		keywords: [
			"每周",
			"每天",
			"定时",
			"自动",
			"周期",
			"cron",
			"schedule"
		],
		pluginIds: ["@deepseek-ai/dsh-tool-schedule"]
	},
	{
		id: "present",
		name: "交付文件",
		purpose: "把生成的文件作为交付物展示/下载",
		tools: ["present"],
		trigger: "manual",
		permissions: [],
		needsConfirm: false,
		keywords: [
			"交付",
			"展示",
			"文件",
			"下载",
			"present"
		],
		pluginIds: ["@deepseek-ai/dsh-tool-present"]
	},
	{
		id: "subagent",
		name: "并行/汇总",
		purpose: "把独立分析委派给子代理并汇总",
		tools: ["subagent", "subagent_fork"],
		trigger: "manual",
		permissions: ["delegation"],
		needsConfirm: false,
		keywords: [
			"汇总",
			"总结",
			"并行",
			"分析",
			"subagent"
		],
		pluginIds: ["@deepseek-ai/dsh-tool-subagent"]
	},
	{
		id: "workflow",
		name: "批量编排",
		purpose: "用脚本编排多个子任务",
		tools: ["workflow"],
		trigger: "manual",
		permissions: ["delegation"],
		needsConfirm: false,
		keywords: [
			"批量",
			"多步",
			"编排",
			"workflow"
		],
		pluginIds: ["@deepseek-ai/dsh-tool-workflow"]
	},
	{
		id: "model-summary",
		name: "模型汇总",
		purpose: "由模型直接阅读材料并生成汇总（不新增工具）",
		tools: [],
		trigger: "manual",
		permissions: [],
		needsConfirm: false,
		keywords: [
			"汇总",
			"总结",
			"摘要",
			"生成"
		],
		pluginIds: [],
		modelOnly: true
	}
];
/** Load built-ins plus an optional user catalog from disk. */
async function loadCapabilities(path) {
	const diagnostics = [];
	const catalog = new Map(BUILT_IN_CAPABILITIES.map((capability) => [capability.id, capability]));
	const file = path !== void 0 && path.length > 0 ? path : dataDir("capabilities.json");
	const custom = await readJson(file).catch((error) => {
		diagnostics.push(`capabilities file unreadable: ${error instanceof Error ? error.message : String(error)}`);
	});
	if (custom !== void 0) {
		const list = Array.isArray(custom) ? custom : isRecord(custom) && Array.isArray(custom.capabilities) ? custom.capabilities : [];
		if (list.length === 0) diagnostics.push(`capabilities file has no capabilities array: ${file}`);
		for (const raw of list) {
			const capability = normalizeCapability(raw);
			if (capability === void 0) {
				diagnostics.push(`ignored malformed capability in ${file}`);
				continue;
			}
			catalog.set(capability.id, capability);
		}
	}
	return {
		capabilities: [...catalog.values()],
		diagnostics
	};
}
function normalizeCapability(value) {
	if (!isRecord(value)) return void 0;
	if (typeof value.id !== "string" || typeof value.name !== "string") return void 0;
	return {
		id: value.id,
		name: value.name,
		purpose: typeof value.purpose === "string" ? value.purpose : value.name,
		tools: Array.isArray(value.tools) ? value.tools.filter((item) => typeof item === "string") : [],
		trigger: value.trigger === "schedule" || value.trigger === "event" ? value.trigger : "manual",
		permissions: Array.isArray(value.permissions) ? value.permissions.filter((item) => typeof item === "string") : [],
		needsConfirm: value.needsConfirm === true,
		keywords: Array.isArray(value.keywords) ? value.keywords.filter((item) => typeof item === "string") : [],
		pluginIds: Array.isArray(value.pluginIds) ? value.pluginIds.filter((item) => typeof item === "string") : [],
		modelOnly: value.modelOnly === true
	};
}
/** Capabilities whose tools are currently available; model-only seams are always available. */
function availableCapabilities(capabilities, toolExists) {
	return capabilities.filter((capability) => capability.modelOnly === true || capability.tools.length === 0 || capability.tools.some((tool) => toolExists(tool)));
}
// src/wizard.ts
const AUTOMATION_RE = /每周|每天|每日|定时|自动|周期|weekly|daily|schedule|cron|recurring/i;
const WORKFLOW_RE = /周报|日报|报告|汇总|总结|自动|定时|每周|每天|周期|流程|编排|workflow|report|summar|collect|发送|通知|调研/i;
/** Whether a goal looks like an automatable workflow rather than ordinary Q&A. */
function isWorkflowGoal(goal) {
	return WORKFLOW_RE.test(goal);
}
/** Whether the goal or answers imply a schedule. */
function isAutomated(goal, answers) {
	return AUTOMATION_RE.test(`${goal} ${answers.frequency ?? ""}`);
}
/** Fill defaults for the fields the user has not answered. */
function defaultsFor(goal, answers) {
	const automated = isAutomated(goal, answers);
	return {
		goal,
		scope: answers.scope ?? "当前工作区",
		frequency: answers.frequency ?? (automated ? "每周一 09:00" : "手动触发"),
		sources: answers.sources ?? (automated || /git|commit|代码|变更/i.test(goal) ? ["Git log"] : ["当前工作区文件"]),
		outputFormat: answers.outputFormat ?? "Markdown",
		delivery: answers.delivery ?? "对话内交付（present）",
		onFailure: answers.onFailure ?? "保留草稿并在对话中通知",
		acceptance: answers.acceptance ?? [
			"时间范围正确",
			"输出内容可读",
			"失败可恢复"
		]
	};
}
/** Return the next question group, or null when enough answers exist. */
function nextQuestion(goal, answers, options = {}) {
	if (options.forceBlueprint === true) return null;
	if (!isWorkflowGoal(goal)) return null;
	if (answers.scope === void 0 || answers.frequency === void 0) return {
		step: "scope-frequency",
		question: "这个工作流覆盖哪个项目、什么时间范围，手动还是定时？",
		defaults: [answers.scope ?? "当前工作区", answers.frequency ?? (isAutomated(goal, answers) ? "每周一 09:00" : "手动触发")],
		allowSkip: false,
		fields: ["scope", "frequency"]
	};
	if (answers.sources === void 0) return {
		step: "sources",
		question: "数据从哪来？例如 Git log、当前工作区文件、网页资料。",
		defaults: answers.sources ?? (isAutomated(goal, answers) ? ["Git log"] : ["当前工作区文件"]),
		allowSkip: false,
		fields: ["sources"]
	};
	if (answers.outputFormat === void 0 || answers.delivery === void 0) return {
		step: "output-delivery",
		question: "输出什么格式、交付到哪里？",
		defaults: [answers.outputFormat ?? "Markdown", answers.delivery ?? "对话内交付（present）"],
		allowSkip: true,
		fields: ["outputFormat", "delivery"]
	};
	if (answers.onFailure === void 0 || answers.acceptance === void 0) return {
		step: "failure-acceptance",
		question: "失败时怎么处理，怎样算验收通过？",
		defaults: [answers.onFailure ?? "保留草稿并在对话中通知", "时间范围正确；输出内容可读；失败可恢复"],
		allowSkip: true,
		fields: ["onFailure", "acceptance"]
	};
	return null;
}
// src/translate.ts
/** Translate a business goal plus answers into a workflow blueprint. */
function translateGoal(goal, answers, capabilities, options) {
	const filled = defaultsFor(goal, answers);
	const weekly = /周报|weekly|report|汇报/i.test(goal) && /git|commit|代码|变更|项目/i.test(goal);
	const steps = weekly ? weeklyReportSteps(filled, capabilities, options) : genericSteps(filled, capabilities, options);
	const uncertainties = collectUncertainties(filled, steps, capabilities, options);
	const permissions = uniq(capabilities.filter((capability) => steps.some((step) => step.capabilityId === capability.id)).flatMap((capability) => capability.permissions));
	const acceptance = uniq([...filled.acceptance ?? [], ...weekly ? ["包含指定分支与时间范围", "发送前人工确认"] : []]);
	return {
		schemaVersion: 1,
		id: newId("wf"),
		createdAt: (/* @__PURE__ */ new Date()).toISOString(),
		goal,
		template: weekly ? "weekly-report" : "generic",
		answers: filled,
		steps,
		minPluginSet: uniq(steps.flatMap((step) => step.pluginIds)),
		suggestedDisable: [...options.suggestedDisable ?? []],
		permissions,
		failurePolicy: [filled.onFailure ?? "保留草稿并在对话中通知", "采集步骤最多重试一次；外部发送不静默重试"].join("；"),
		acceptance,
		rollback: weekly ? "停用 schedule 任务；保留已生成的周报文件；不修改仓库；恢复原插件配置。" : "停用 schedule 任务；保留已生成文件；恢复原插件配置。",
		uncertainties
	};
}
function weeklyReportSteps(answers, capabilities, options) {
	const steps = [];
	const git = find(capabilities, "git-history");
	if (git !== void 0 && options.available.has(git.id)) steps.push(toolStep("s1", "读取指定时间范围与分支的 Git log/diff", git, [], false, ["时间范围", "分支"], ["commit 列表", "diff 统计"]));
	const summary = find(capabilities, "model-summary");
	if (summary !== void 0) steps.push({
		id: "s2",
		intent: "按模块/作者汇总 commit、风险与待办",
		kind: "model",
		capabilityId: summary.id,
		toolNames: [],
		pluginIds: [],
		dependsOn: steps.map((step) => step.id),
		needsConfirm: false,
		inputs: ["commit 列表", "diff 统计"],
		outputs: ["周报正文草稿"],
		onFailure: "保留上下文，提示用户补充数据"
	});
	const write = find(capabilities, "file-write");
	if (write !== void 0 && options.available.has(write.id)) steps.push(toolStep("s3", "生成 Markdown 周报文件", write, lastIds(steps), false, ["周报正文草稿"], ["Markdown 文件"]));
	const delivery = chooseDelivery(answers, capabilities, options);
	if (delivery !== void 0) steps.push(toolStep("s4", "交付/发送周报", delivery, lastIds(steps), true, ["Markdown 文件"], ["交付结果"]));
	if (isAutomated(answers.goal, answers)) {
		const schedule = find(capabilities, "schedule");
		if (schedule !== void 0 && options.available.has(schedule.id)) steps.push(toolStep("s5", "创建每周定时任务", schedule, lastIds(steps), true, ["完整工作流"], ["schedule 任务 id"]));
	}
	return steps;
}
function genericSteps(answers, capabilities, options) {
	const steps = [];
	const selected = capabilities.filter((capability) => capability.id !== "schedule" && capability.id !== "model-summary" && options.available.has(capability.id) && capability.keywords.some((keyword) => answers.goal.toLowerCase().includes(keyword.toLowerCase())));
	for (const capability of selected.slice(0, 6)) steps.push(toolStep(`s${steps.length + 1}`, capability.purpose, capability, lastIds(steps), capability.needsConfirm, ["工作区/输入数据"], [capability.name]));
	if (steps.length > 0 && /汇总|总结|报告|summary|report/i.test(answers.goal)) {
		const summary = find(capabilities, "model-summary");
		if (summary !== void 0) steps.push({
			id: `s${steps.length + 1}`,
			intent: "汇总上一步结果并生成可读内容",
			kind: "model",
			capabilityId: summary.id,
			toolNames: [],
			pluginIds: [],
			dependsOn: lastIds(steps),
			needsConfirm: false,
			inputs: ["上一步输出"],
			outputs: ["汇总文本"],
			onFailure: "保留中间结果并提示用户"
		});
	}
	if (isAutomated(answers.goal, answers)) {
		const schedule = find(capabilities, "schedule");
		if (schedule !== void 0 && options.available.has(schedule.id)) steps.push(toolStep(`s${steps.length + 1}`, "创建定时任务", schedule, lastIds(steps), true, ["完整工作流"], ["schedule 任务 id"]));
	}
	return steps;
}
function toolStep(id, intent, capability, dependsOn, needsConfirm, inputs, outputs) {
	return {
		id,
		intent,
		kind: capability.trigger === "schedule" ? "schedule" : "tool",
		capabilityId: capability.id,
		toolNames: [...capability.tools],
		pluginIds: [...capability.pluginIds],
		dependsOn: [...dependsOn],
		needsConfirm: needsConfirm || capability.needsConfirm,
		inputs,
		outputs,
		onFailure: capability.trigger === "schedule" ? "停用本次运行并通知用户" : "保留草稿；采集步骤最多重试一次"
	};
}
function collectUncertainties(answers, steps, capabilities, options) {
	const uncertainties = [];
	if (steps.length === 0) uncertainties.push("没有匹配到可用能力；请补充目标、数据来源或安装对应工具插件");
	if (find(capabilities, "git-history") === void 0 || !options.available.has("git-history")) {
		if (/git|commit|代码|变更/i.test(answers.goal)) uncertainties.push("缺少 Git 读取能力（bash 工具不可用）");
	}
	if (find(capabilities, "file-write") === void 0 || !options.available.has("file-write")) {
		if (/markdown|文档|报告|周报/i.test(answers.goal)) uncertainties.push("缺少文件写入能力（write/edit 工具不可用）");
	}
	if (isAutomated(answers.goal, answers) && !steps.some((step) => step.kind === "schedule")) uncertainties.push("用户要求自动化，但当前没有可用的 schedule 能力");
	if (!steps.some((step) => step.needsConfirm) && /发送|通知|邮件|钉钉|delivery/i.test(answers.delivery ?? "")) uncertainties.push("外部发送步骤缺少人工确认");
	uncertainties.push("agent preset 自带的工具由 preset 提供，trim 不能单独开关；蓝图按“当前可用”生成");
	return uniq(uncertainties);
}
function chooseDelivery(answers, capabilities, options) {
	const requested = (answers.delivery ?? "").toLowerCase();
	const custom = capabilities.find((capability) => capability.id !== "present" && (requested.includes(capability.id.toLowerCase()) || requested.includes(capability.name.toLowerCase()) || capability.keywords.some((keyword) => requested.includes(keyword.toLowerCase()))));
	if (custom !== void 0 && options.available.has(custom.id)) return custom;
	const present = find(capabilities, "present");
	if (present !== void 0 && options.available.has(present.id)) return present;
}
function find(capabilities, id) {
	return capabilities.find((capability) => capability.id === id);
}
function lastIds(steps) {
	if (steps.length === 0) return [];
	const last = steps[steps.length - 1];
	return last === void 0 ? [] : [last.id];
}
// src/validate.ts
/** Validate a blueprint for dependencies, capabilities, permissions, failure handling, and compat. */
function validateBlueprint(blueprint, deps) {
	const issues = [];
	const steps = Array.isArray(blueprint.steps) ? blueprint.steps : [];
	if (steps.length === 0) issues.push({
		level: "error",
		code: "EMPTY_STEPS",
		message: "蓝图没有步骤"
	});
	if (steps.length > deps.maxSteps) issues.push({
		level: "warn",
		code: "TOO_MANY_STEPS",
		message: `步骤数 ${steps.length} 超过上限 ${deps.maxSteps}，建议拆分`
	});
	const ids = /* @__PURE__ */ new Set();
	for (const step of steps) {
		if (ids.has(step.id)) issues.push({
			level: "error",
			code: "DUPLICATE_STEP_ID",
			message: `重复步骤 id ${step.id}`,
			stepId: step.id
		});
		ids.add(step.id);
	}
	const capabilityIds = new Set(deps.capabilities.map((capability) => capability.id));
	for (const step of steps) {
		for (const dependency of step.dependsOn) if (!ids.has(dependency)) issues.push({
			level: "error",
			code: "BAD_DEP",
			message: `${step.id} 依赖不存在的 ${dependency}`,
			stepId: step.id
		});
		if (step.capabilityId !== null && !capabilityIds.has(step.capabilityId)) issues.push({
			level: "error",
			code: "MISSING_CAPABILITY",
			message: `${step.id} 使用未知能力 ${step.capabilityId}`,
			stepId: step.id
		});
		for (const tool of step.toolNames) if (!deps.toolExists(tool)) issues.push({
			level: "error",
			code: "MISSING_TOOL",
			message: `${step.id} 需要的工具 ${tool} 在当前 scope 不可用`,
			stepId: step.id
		});
		for (const plugin of step.pluginIds) if (!deps.pluginKnown(plugin)) issues.push({
			level: "warn",
			code: "PLUGIN_NOT_FOUND",
			message: `${step.id} 的插件 ${plugin} 不在当前 profile 中（可能由 preset 提供）`,
			stepId: step.id
		});
	}
	if (hasCycle(steps)) issues.push({
		level: "error",
		code: "CYCLE",
		message: "步骤依赖存在环"
	});
	if (steps.some((step) => step.kind === "schedule") && !deps.scheduleAvailable) issues.push({
		level: "error",
		code: "NO_SCHEDULE_SERVICE",
		message: "蓝图包含定时步骤，但当前 profile 没有 schedule 服务"
	});
	if (steps.some((step) => step.kind === "schedule") && blueprint.failurePolicy.trim().length === 0) issues.push({
		level: "warn",
		code: "SCHEDULE_NO_FAILURE",
		message: "定时任务缺少失败策略"
	});
	if (steps.some((step) => /发送|交付|deliver|send|notify/i.test(step.intent)) && !steps.some((step) => step.needsConfirm)) issues.push({
		level: "warn",
		code: "SEND_NO_CONFIRM",
		message: "发送/交付步骤建议人工确认"
	});
	if (steps.some((step) => /写入|生成|write|render/i.test(step.intent)) && blueprint.rollback.trim().length === 0) issues.push({
		level: "warn",
		code: "WRITE_NO_ROLLBACK",
		message: "写文件步骤缺少回滚说明"
	});
	if (blueprint.acceptance.length === 0) issues.push({
		level: "warn",
		code: "NO_ACCEPTANCE",
		message: "缺少验收标准"
	});
	if (blueprint.permissions.some((permission) => ["external-send", "shell"].includes(permission)) && !steps.some((step) => step.needsConfirm)) issues.push({
		level: "warn",
		code: "HIGH_RISK_PERMISSION",
		message: "存在高权限步骤但没有人工确认点"
	});
	for (const finding of deps.compatFindings ?? []) {
		if (!steps.some((step) => step.pluginIds.some((plugin) => finding.subjects.includes(plugin)) || step.toolNames.some((tool) => finding.subjects.includes(tool)))) continue;
		issues.push({
			level: finding.severity === "error" ? "error" : "warn",
			code: finding.severity === "error" ? "COMPAT_CONFLICT" : "COMPAT_WARN",
			message: `${finding.code}: ${finding.title}`
		});
	}
	return issues;
}
function hasCycle(steps) {
	const byId = new Map(steps.map((step) => [step.id, step]));
	const state = /* @__PURE__ */ new Map();
	const visit = (id) => {
		const current = state.get(id);
		if (current === "visiting") return true;
		if (current === "done") return false;
		const step = byId.get(id);
		if (step === void 0) return false;
		state.set(id, "visiting");
		for (const dependency of step.dependsOn) if (visit(dependency)) return true;
		state.set(id, "done");
		return false;
	};
	for (const step of steps) if (visit(step.id)) return true;
	return false;
}
/** Render a validation result as a compact Markdown report. */
function renderValidation(issues) {
	if (issues.length === 0) return "✅ 校验通过：未发现 error 或 warn。";
	const errors = issues.filter((issue) => issue.level === "error");
	const warnings = issues.filter((issue) => issue.level === "warn");
	const lines = [];
	lines.push(`> ${errors.length} error / ${warnings.length} warn`);
	lines.push("");
	lines.push("| level | code | step | message |");
	lines.push("|---|---|---|---|");
	for (const issue of issues.slice(0, 50)) lines.push(`| ${issue.level} | ${issue.code} | ${issue.stepId ?? "—"} | ${issue.message.replace(/\|/g, "\\|")} |`);
	return lines.join("\n");
}
// src/export.ts
/** Write a blueprint to the DSH data directory. */
async function exportBlueprint(blueprint, format = "both") {
	const base = `${slugify(blueprint.id)}`;
	const directory = dataDir("recipe", "blueprints");
	const result = { id: blueprint.id };
	if (format === "markdown" || format === "both") {
		const path = `${directory}/${base}.md`;
		await writeTextAtomic(path, renderBlueprintMarkdown(blueprint));
		result.markdownPath = path;
	}
	if (format === "json" || format === "both") {
		const path = `${directory}/${base}.json`;
		await writeJsonAtomic(path, blueprint);
		result.jsonPath = path;
	}
	return result;
}
/** Render the human runbook plus a machine-readable JSON block. */
function renderBlueprintMarkdown(blueprint) {
	const lines = [];
	lines.push(`# 工作流蓝图：${blueprint.goal}`);
	lines.push("");
	lines.push(`- 蓝图 id：\`${blueprint.id}\``);
	lines.push(`- 模板：${blueprint.template}`);
	lines.push(`- 生成时间：${blueprint.createdAt}`);
	lines.push("");
	lines.push("## 1. 目标复述");
	lines.push("");
	lines.push(blueprint.goal);
	lines.push("");
	lines.push("## 2. 步骤");
	lines.push("");
	lines.push("| # | 意图 | 类型 | 能力 | 工具/插件 | 依赖 | 人工确认 | 失败处理 |");
	lines.push("|---|---|---|---|---|---|---|---|");
	for (const step of blueprint.steps) lines.push(stepRow(step));
	lines.push("");
	lines.push("## 3. 数据流");
	lines.push("");
	for (const step of blueprint.steps) lines.push(`- ${step.id}：${step.inputs.join(" + ") || "—"} → ${step.outputs.join(" + ") || "—"}`);
	lines.push("");
	lines.push("## 4. 最小插件集");
	lines.push("");
	if (blueprint.minPluginSet.length === 0) lines.push("- （无）");
	for (const plugin of blueprint.minPluginSet) lines.push(`- ${plugin}`);
	lines.push("");
	if (blueprint.suggestedDisable.length > 0) {
		lines.push("### 建议禁用");
		lines.push("");
		for (const item of blueprint.suggestedDisable) lines.push(`- ${item}`);
		lines.push("");
	}
	lines.push("## 5. 权限与风险");
	lines.push("");
	if (blueprint.permissions.length === 0) lines.push("- （无额外权限）");
	for (const permission of blueprint.permissions) lines.push(`- ${permission}`);
	lines.push("");
	lines.push("## 6. 运行手册");
	lines.push("");
	lines.push("1. 确认上表的人工确认点与权限。");
	lines.push("2. 先手动运行一次采集与生成步骤，检查时间范围、分支与输出内容。");
	lines.push("3. 确认无误后再创建/启用定时任务。");
	lines.push("4. 失败时按“失败处理”保留草稿并在对话中通知，不静默重试外部发送。");
	lines.push("");
	lines.push("## 7. 验收清单");
	lines.push("");
	for (const item of blueprint.acceptance) lines.push(`- [ ] ${item}`);
	lines.push("");
	lines.push("## 8. 回滚");
	lines.push("");
	lines.push(blueprint.rollback);
	lines.push("");
	lines.push("## 9. 不确定性");
	lines.push("");
	for (const item of blueprint.uncertainties) lines.push(`- ${item}`);
	lines.push("");
	lines.push("## 10. 机器可读蓝图");
	lines.push("");
	lines.push(jsonBlock(blueprint, 2e4));
	return lines.join("\n");
}
function stepRow(step) {
	const tools = step.toolNames.length > 0 ? step.toolNames.join(", ") : "（模型步骤）";
	const plugins = step.pluginIds.length > 0 ? ` / ${step.pluginIds.join(", ")}` : "";
	return `| ${step.id} | ${escapeMarkdownCell(step.intent)} | ${step.kind} | ${step.capabilityId ?? "—"} | ${escapeMarkdownCell(tools + plugins)} | ${step.dependsOn.join(", ") || "—"} | ${step.needsConfirm ? "yes" : "no"} | ${escapeMarkdownCell(step.onFailure)} |`;
}
// src/tools.ts
/** Register the recipe model-facing tools. */
function registerRecipeTools(ctx, config) {
	ctx.tools.register(defineTool({
		name: "recipe_plan_workflow",
		description: "Translate a business goal into a validated DSH workflow blueprint through at most four concise questions. Returns one question at a time until enough answers exist, then a blueprint with steps, capability seams, minimum plugin set, permissions, failure policy, acceptance checklist, rollback, and uncertainties. Do not invent missing capabilities; report them in uncertainties. Read-only; never creates schedules or edits plugins.",
		parameters: {
			goal: {
				type: "string",
				required: true,
				description: "The user business goal, in their own words."
			},
			answers: {
				type: "json",
				description: "Answers gathered so far: { scope?, frequency?, sources?, outputFormat?, delivery?, onFailure?, acceptance? }. Reuse the same goal across calls."
			},
			trimProfileId: {
				type: "string",
				description: "Optional trim slim-profile id whose suggested disables should be attached."
			},
			forceBlueprint: {
				type: "boolean",
				description: "Skip remaining questions and emit a draft with assumptions and uncertainties."
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
			const goal = args.goal.trim();
			if (!isWorkflowGoal(goal) && args.forceBlueprint !== true) return [
				"# 不需要编排",
				"",
				"这个目标更像普通问答或单步任务，建议直接在当前会话完成，不必生成工作流。",
				"如果确实需要自动化，请补充“周期、数据来源、输出、交付方式”后重试。"
			].join("\n");
			const partial = readAnswers(args.answers);
			const question = nextQuestion(goal, {
				goal,
				...partial
			}, { forceBlueprint: args.forceBlueprint });
			if (question !== null) return renderQuestion(goal, question, partial);
			const catalog = await loadCapabilities(config.capabilitiesFile);
			const toolExists = (name) => ctx.tools.get(name, exec.agent) !== void 0;
			const known = await knownPlugins(ctx, catalog.capabilities, toolExists);
			const compat = await readCompatReport();
			const blocked = blockedSubjects(compat);
			const capabilities = availableCapabilities(catalog.capabilities, toolExists).filter((capability) => !capability.pluginIds.some((plugin) => blocked.has(plugin)) && !capability.tools.some((tool) => blocked.has(tool)));
			const available = new Set(capabilities.map((capability) => capability.id));
			const filled = defaultsFor(goal, {
				goal,
				...partial
			});
			const suggestedDisable = await readSuggestedDisable(args.trimProfileId);
			const blueprint = translateGoal(goal, filled, catalog.capabilities, {
				available,
				suggestedDisable
			});
			if (blocked.size > 0) blueprint.uncertainties.push(`兼容性报告存在 error，以下主体被排除：${[...blocked].slice(0, 10).join(", ")}`);
			for (const diagnostic of catalog.diagnostics) blueprint.uncertainties.push(diagnostic);
			blueprint.uncertainties = [...new Set(blueprint.uncertainties)];
			const issues = validateBlueprint(blueprint, {
				toolExists,
				pluginKnown: (name) => known.has(name),
				scheduleAvailable: ctx.get("schedule") !== void 0,
				maxSteps: config.maxSteps,
				capabilities: catalog.capabilities,
				compatFindings: compat?.findings
			});
			await audit("plan_workflow", "ok", `blueprint ${blueprint.id}: ${blueprint.steps.length} steps`);
			return renderBlueprint(blueprint, issues);
		},
		presentCall: () => ({
			card: "generic",
			title: "Plan workflow",
			kind: "read"
		})
	}));
	ctx.tools.register(defineTool({
		name: "recipe_validate_workflow",
		description: "Validate a workflow blueprint for missing tools/capabilities, dependency cycles, schedule service availability, human confirmation, rollback, acceptance criteria, and compatibility conflicts. Read-only.",
		parameters: { blueprint: {
			type: "json",
			required: true,
			description: "The blueprint object returned by recipe_plan_workflow."
		} },
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute(args, exec) {
			if (!isWorkflowBlueprint(args.blueprint)) return "❌ blueprint 缺少必要字段（schemaVersion/id/goal/steps）。";
			const catalog = await loadCapabilities(config.capabilitiesFile);
			const toolExists = (name) => ctx.tools.get(name, exec.agent) !== void 0;
			const known = await knownPlugins(ctx, catalog.capabilities, toolExists);
			const compat = await readCompatReport();
			const issues = validateBlueprint(args.blueprint, {
				toolExists,
				pluginKnown: (name) => known.has(name),
				scheduleAvailable: ctx.get("schedule") !== void 0,
				maxSteps: config.maxSteps,
				capabilities: catalog.capabilities,
				compatFindings: compat?.findings
			});
			await audit("validate_workflow", issues.some((issue) => issue.level === "error") ? "fail" : "ok", `${issues.length} issues`);
			return `# 蓝图校验\n\n${renderValidation(issues)}`;
		},
		presentCall: () => ({
			card: "generic",
			title: "Validate workflow",
			kind: "read"
		})
	}));
	ctx.tools.register(defineTool({
		name: "recipe_export_workflow",
		description: "Write a workflow blueprint and runbook to $DSH_HOME/experience-optimizer/recipe/blueprints as Markdown and/or JSON. Call only when the user asks to export. Does not create schedules or modify plugins.",
		parameters: {
			blueprint: {
				type: "json",
				required: true,
				description: "The blueprint object returned by recipe_plan_workflow."
			},
			format: {
				type: "string",
				enum: [
					"markdown",
					"json",
					"both"
				],
				description: "Export format. Default both."
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		async execute(args) {
			if (config.allowExport !== true) return "❌ 当前配置禁止导出蓝图（allowExport: false）。";
			if (!isWorkflowBlueprint(args.blueprint)) return "❌ blueprint 缺少必要字段（schemaVersion/id/goal/steps）。";
			const format = args.format ?? "both";
			const result = await exportBlueprint(args.blueprint, format);
			await audit("export_workflow", "ok", `exported ${args.blueprint.id}`);
			return [
				"# 蓝图已导出",
				"",
				result.markdownPath === void 0 ? "" : `- Markdown：${result.markdownPath}`,
				result.jsonPath === void 0 ? "" : `- JSON：${result.jsonPath}`,
				"",
				"可用 `present` 工具把 Markdown 文件交付给用户。"
			].filter((line) => line.length > 0).join("\n");
		},
		presentCall: () => ({
			card: "generic",
			title: "Export workflow",
			kind: "other"
		})
	}));
}
function renderQuestion(goal, question, partial) {
	const answered = Object.entries(partial).filter(([, value]) => value !== void 0).map(([key]) => key);
	return [
		"# 还需要确认",
		"",
		`目标：${goal}`,
		"",
		`**${question.question}**`,
		"",
		"默认推测（可直接确认或修正）：",
		...question.defaults.map((defaultValue) => `- ${defaultValue}`),
		"",
		`已回答字段：${answered.length === 0 ? "无" : answered.join(", ")}`,
		"",
		"请把用户回答填入 answers 后再次调用 `recipe_plan_workflow`；同一 goal 复用即可。"
	].join("\n");
}
function renderBlueprint(blueprint, issues) {
	const lines = [];
	lines.push(`# 工作流蓝图：${blueprint.goal}`);
	lines.push("");
	lines.push(`- 模板：${blueprint.template}`);
	lines.push(`- 蓝图 id：\`${blueprint.id}\``);
	lines.push(`- 最小插件集：${blueprint.minPluginSet.length === 0 ? "（无）" : blueprint.minPluginSet.join(", ")}`);
	lines.push("");
	lines.push("## 步骤");
	lines.push("");
	lines.push("| # | 意图 | 类型 | 能力 | 工具 | 依赖 | 确认 |");
	lines.push("|---|---|---|---|---|---|---|");
	for (const step of blueprint.steps) lines.push(`| ${step.id} | ${escapeMarkdownCell(step.intent)} | ${step.kind} | ${step.capabilityId ?? "—"} | ${escapeMarkdownCell(step.toolNames.join(", "))} | ${step.dependsOn.join(", ") || "—"} | ${step.needsConfirm ? "yes" : "no"} |`);
	lines.push("");
	lines.push("## 权限与失败策略");
	lines.push("");
	lines.push(`- 权限：${blueprint.permissions.join(", ") || "无"}`);
	lines.push(`- 失败策略：${blueprint.failurePolicy}`);
	lines.push(`- 回滚：${blueprint.rollback}`);
	lines.push("");
	lines.push("## 验收");
	lines.push("");
	for (const item of blueprint.acceptance) lines.push(`- [ ] ${item}`);
	lines.push("");
	if (blueprint.uncertainties.length > 0) {
		lines.push("## 不确定性");
		lines.push("");
		for (const item of blueprint.uncertainties) lines.push(`- ${item}`);
		lines.push("");
	}
	lines.push("## 校验");
	lines.push("");
	lines.push(renderValidation(issues));
	lines.push("");
	lines.push("## 机器可读蓝图");
	lines.push("");
	lines.push(jsonBlock(blueprint, 2e4));
	lines.push("");
	lines.push("下一步：可以调用 `recipe_validate_workflow` 重新校验，或调用 `recipe_export_workflow` 导出运行手册。");
	return lines.join("\n");
}
function readAnswers(raw) {
	if (!isRecord(raw)) return {};
	const out = {};
	if (typeof raw.scope === "string") out.scope = raw.scope;
	if (typeof raw.frequency === "string") out.frequency = raw.frequency;
	if (Array.isArray(raw.sources)) out.sources = raw.sources.filter((item) => typeof item === "string");
	if (typeof raw.outputFormat === "string") out.outputFormat = raw.outputFormat;
	if (typeof raw.delivery === "string") out.delivery = raw.delivery;
	if (typeof raw.onFailure === "string") out.onFailure = raw.onFailure;
	if (Array.isArray(raw.acceptance)) out.acceptance = raw.acceptance.filter((item) => typeof item === "string");
	return out;
}
function isWorkflowBlueprint(value) {
	if (!isRecord(value)) return false;
	return value.schemaVersion === 1 && typeof value.id === "string" && typeof value.goal === "string" && Array.isArray(value.steps);
}
async function readCompatReport() {
	return readJson(dataDir("compat", "report.json")).catch(() => void 0);
}
async function knownPlugins(ctx, capabilities, toolExists) {
	const known = /* @__PURE__ */ new Set();
	for (const capability of capabilities) {
		if (!capability.tools.some((tool) => toolExists(tool))) continue;
		for (const plugin of capability.pluginIds) known.add(plugin);
	}
	const manager = ctx.get("pluginManager");
	if (typeof manager?.listBundles === "function") try {
		for (const bundle of await manager.listBundles()) if (typeof bundle.name === "string") known.add(bundle.name);
	} catch {}
	return known;
}
function blockedSubjects(report) {
	const set = /* @__PURE__ */ new Set();
	for (const finding of report?.findings ?? []) {
		if (finding.severity !== "error") continue;
		for (const subject of finding.subjects) set.add(subject);
	}
	return set;
}
async function readSuggestedDisable(profileId) {
	if (profileId === void 0 || profileId.length === 0) return [];
	const profile = await readJson(dataDir("trim", "profiles", `${profileId.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`)).catch(() => void 0);
	if (profile === void 0) return [];
	return profile.items.filter((item) => item.action === "suggest-disable").map((item) => item.name);
}
async function audit(action, result, summary) {
	await new AuditLog().append({
		t: (/* @__PURE__ */ new Date()).toISOString(),
		actor: "recipe",
		action,
		subject: "recipe",
		result,
		summary
	}).catch(() => void 0);
}
// src/index.ts
const name = "dsh-plugin-recipe";
const inject = ["tools"];
/** Register the workflow planner tools. */
function apply(ctx, config) {
	registerRecipeTools(ctx, normalizeConfig(config));
}
export { BUILT_IN_CAPABILITIES, Config, apply, defaultsFor, exportBlueprint, inject, isWorkflowGoal, loadCapabilities, name, nextQuestion, renderBlueprintMarkdown, renderValidation, translateGoal, validateBlueprint };
