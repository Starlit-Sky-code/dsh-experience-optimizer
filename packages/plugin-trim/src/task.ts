import type { Evidence, TaskProfile, TaskTag } from 'dsh-shared-meta'
import { flattenTextBlocks, truncate } from 'dsh-shared-meta'

const TASK_KEYWORDS: Record<Exclude<TaskTag, 'unknown'>, string[]> = {
  bugfix: [
    'bug', 'fix', '修复', '报错', '错误', '崩溃', 'debug', '调试', '失败', 'failing', 'regression',
    '异常', '问题', '排查', 'crash',
  ],
  feature: [
    '实现', '新增', '开发', 'feature', 'implement', 'add', '重构', 'refactor', '迁移', 'migrate',
    '支持', '设计', 'build', 'create', '编写',
  ],
  review: [
    '审查', 'review', '代码审查', 'pr', '合并', 'merge', 'diff', '评审', '检查代码', 'code review',
  ],
  docs: [
    '文档', 'docs', 'documentation', '说明', 'readme', '注释', '写文档', '注释', 'guide', '教程',
  ],
  release: [
    '发布', 'release', '版本', 'version', 'changelog', '打包', 'publish', '发版', '上线', '部署',
  ],
  report: [
    '周报', '日报', '报告', 'report', '总结', 'summarize', '汇总', '周会', '月报', '汇报', '简报',
  ],
  research: [
    '调研', 'research', '搜索', 'search', '资料', '对比', 'compare', '分析', '研究', '查找', '调查',
  ],
}

const TOOL_HINTS: Record<string, TaskTag[]> = {
  web_search: ['research'],
  web_fetch: ['research'],
  write: ['docs', 'report', 'feature'],
  edit: ['bugfix', 'feature'],
  bash: ['bugfix', 'feature', 'release'],
  schedule_create: ['report'],
  present: ['report', 'docs'],
  read: ['review', 'docs', 'bugfix'],
  grep: ['review', 'bugfix'],
  glob: ['review', 'bugfix'],
}

export interface TaskInput {
  explicit?: TaskTag
  goal?: string
  agent?: unknown
  messages?: Array<{ role: string; content: unknown }>
  toolNames?: string[]
}

/** Detect the current task with explainable keyword/tool evidence. */
export function detectTask(input: TaskInput): TaskProfile {
  if (input.explicit !== undefined && input.explicit !== 'unknown') {
    return {
      tag: input.explicit,
      confidence: 1,
      keywords: [],
      source: 'explicit',
      evidence: [
        { kind: 'task-match', summary: `用户指定任务类型 ${input.explicit}`, weight: 1 },
      ],
    }
  }

  const extracted = input.messages === undefined ? extractFromAgent(input.agent) : undefined
  const messages = input.messages ?? extracted?.messages ?? []
  const toolNames = input.toolNames ?? extracted?.toolNames ?? []
  const text = buildText(input.goal, messages)
  if (text.trim().length === 0) {
    return unknownTask('没有足够的会话文本；请显式传入 taskTag 或 goal')
  }

  const scores = new Map<TaskTag, { score: number; keywords: string[] }>()
  for (const [tag, keywords] of Object.entries(TASK_KEYWORDS) as Array<
    [Exclude<TaskTag, 'unknown'>, string[]]
  >) {
    const matched: string[] = []
    let score = 0
    for (const keyword of keywords) {
      if (!text.includes(keyword)) continue
      matched.push(keyword)
      score += keyword.length >= 4 ? 1.5 : 1
    }
    if (matched.length > 0) scores.set(tag, { score, keywords: matched })
  }

  for (const toolName of toolNames) {
    for (const tag of TOOL_HINTS[toolName] ?? []) {
      const current = scores.get(tag) ?? { score: 0, keywords: [] }
      current.score += 0.5
      scores.set(tag, current)
    }
  }

  if (scores.size === 0) {
    return unknownTask('没有匹配到任务关键词', text)
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score)
  const [tag, best] = ranked[0]!
  const second = ranked[1]
  const ambiguity = second !== undefined && best.score - second[1].score < 1 ? 0.1 : 0

  let confidence = 0.55
  if (best.score >= 4) confidence = 0.9
  else if (best.score >= 2.5) confidence = 0.75
  else if (best.score >= 1.5) confidence = 0.65
  confidence = Math.max(0.2, Math.min(0.95, confidence - ambiguity))

  const evidence: Evidence[] = [
    {
      kind: 'task-match',
      summary: `匹配关键词：${best.keywords.slice(0, 6).join('、')}`,
      weight: confidence,
    },
  ]
  if (toolNames.length > 0) {
    evidence.push({
      kind: 'context',
      summary: `本会话工具：${toolNames.slice(0, 8).join(', ')}`,
      weight: 0.2,
    })
  }

  return {
    tag,
    confidence,
    keywords: best.keywords,
    evidence,
    source: input.goal !== undefined && input.goal.trim().length > 0 ? 'goal' : 'session',
  }
}

function unknownTask(summary: string, text?: string): TaskProfile {
  return {
    tag: 'unknown',
    confidence: 0.2,
    keywords: [],
    source: 'unknown',
    evidence: [
      {
        kind: 'task-match',
        summary: text === undefined ? summary : `${summary}（文本长度 ${text.length}）`,
        weight: 0.2,
      },
    ],
  }
}

function buildText(goal: string | undefined, messages: Array<{ role: string; content: unknown }>): string {
  const parts: string[] = []
  if (goal !== undefined && goal.trim().length > 0) parts.push(goal)
  const userMessages = messages.filter((message) => message.role === 'user').slice(-6)
  for (const message of userMessages) {
    const text = flattenTextBlocks(message.content)
    if (text.length > 0) parts.push(text)
  }
  const assistantMessages = messages.filter((message) => message.role === 'assistant').slice(-4)
  for (const message of assistantMessages) {
    const text = flattenTextBlocks(message.content)
    if (text.length > 0) parts.push(text)
  }
  return truncate(parts.join('\n'), 8000).toLowerCase()
}

/** Extract recent messages and tool-call names from a live Agent without importing DSH types. */
export function extractFromAgent(agent: unknown): {
  messages: Array<{ role: string; content: unknown }>
  toolNames: string[]
} {
  if (typeof agent !== 'object' || agent === null) return { messages: [], toolNames: [] }
  const session = (agent as { session?: unknown }).session
  if (typeof session !== 'object' || session === null) return { messages: [], toolNames: [] }
  const derive = (session as { deriveMessages?: () => unknown }).deriveMessages
  if (typeof derive !== 'function') return { messages: [], toolNames: [] }
  let messages: unknown[]
  try {
    messages = derive.call(session) as unknown[]
  } catch {
    return { messages: [], toolNames: [] }
  }
  const recent = messages.slice(-40).filter(isMessageLike)
  const toolNames: string[] = []
  for (const message of recent) {
    if (message.role !== 'assistant' || !Array.isArray(message.content)) continue
    for (const block of message.content) {
      if (
        typeof block === 'object' &&
        block !== null &&
        (block as { type?: unknown }).type === 'tool-call' &&
        typeof (block as { name?: unknown }).name === 'string'
      ) {
        toolNames.push((block as { name: string }).name)
      }
    }
  }
  return { messages: recent, toolNames: [...new Set(toolNames)].slice(-30) }
}

function isMessageLike(value: unknown): value is { role: string; content: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { role?: unknown }).role === 'string' &&
    'content' in value
  )
}
