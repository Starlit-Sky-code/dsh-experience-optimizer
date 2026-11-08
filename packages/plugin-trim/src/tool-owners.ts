/** Built-in tool name to owning package mapping, conservative and overridable. */
export const DEFAULT_TOOL_OWNERS: Record<string, string> = {
  bash: '@deepseek-ai/dsh-tool-bash',
  pwsh: '@deepseek-ai/dsh-tool-pwsh',
  read: '@deepseek-ai/dsh-tool-fs',
  read_image: '@deepseek-ai/dsh-tool-fs',
  write: '@deepseek-ai/dsh-tool-fs',
  edit: '@deepseek-ai/dsh-tool-fs',
  apply_patch: '@deepseek-ai/dsh-tool-fs',
  glob: '@deepseek-ai/dsh-tool-fs-search',
  grep: '@deepseek-ai/dsh-tool-fs-search',
  todo_write: '@deepseek-ai/dsh-tool-todo',
  schedule_create: '@deepseek-ai/dsh-tool-schedule',
  schedule_list: '@deepseek-ai/dsh-tool-schedule',
  schedule_view: '@deepseek-ai/dsh-tool-schedule',
  schedule_edit: '@deepseek-ai/dsh-tool-schedule',
  web_search: '@deepseek-ai/dsh-tool-web',
  web_fetch: '@deepseek-ai/dsh-tool-web',
  present: '@deepseek-ai/dsh-tool-present',
  subagent: '@deepseek-ai/dsh-tool-subagent',
  subagent_fork: '@deepseek-ai/dsh-tool-subagent',
  workflow: '@deepseek-ai/dsh-tool-workflow',
  ask_user_question: '@deepseek-ai/dsh-tool-ask-user',
  job_list: '@deepseek-ai/dsh-tool-jobs',
  job_output: '@deepseek-ai/dsh-tool-jobs',
  job_kill: '@deepseek-ai/dsh-tool-jobs',
  goal_create: '@deepseek-ai/dsh-tool-goal',
  goal_get: '@deepseek-ai/dsh-tool-goal',
  goal_update: '@deepseek-ai/dsh-tool-goal',
  skill: '@deepseek-ai/dsh-tool-skill',
  session_query: '@deepseek-ai/dsh-tool-session-query',
  working_directory: '@deepseek-ai/dsh-tool-working-directory',
  terminal_create: '@deepseek-ai/dsh-tool-terminal',
  terminal_write: '@deepseek-ai/dsh-tool-terminal',
  terminal_read: '@deepseek-ai/dsh-tool-terminal',
  terminal_list: '@deepseek-ai/dsh-tool-terminal',
  terminal_kill: '@deepseek-ai/dsh-tool-terminal',
  ralph: '@deepseek-ai/dsh-tool-ralph',
}

/** Built-in prompt section/context name to owning package mapping. */
export const DEFAULT_SECTION_OWNERS: Record<string, string> = {
  'tool-bash': '@deepseek-ai/dsh-tool-bash',
  'tool-pwsh': '@deepseek-ai/dsh-tool-pwsh',
  'tool-read': '@deepseek-ai/dsh-tool-fs',
  'tool-write': '@deepseek-ai/dsh-tool-fs',
  'tool-edit': '@deepseek-ai/dsh-tool-fs',
  'tool-apply-patch': '@deepseek-ai/dsh-tool-fs',
  'tool-glob': '@deepseek-ai/dsh-tool-fs-search',
  'tool-grep': '@deepseek-ai/dsh-tool-fs-search',
  'tool-jobs': '@deepseek-ai/dsh-tool-jobs',
  'tool-pty': '@deepseek-ai/dsh-tool-terminal',
  'tool-web-search': '@deepseek-ai/dsh-tool-web',
  'tool-web-fetch': '@deepseek-ai/dsh-tool-web',
  'tool-goal': '@deepseek-ai/dsh-tool-goal',
  'tool-schedule': '@deepseek-ai/dsh-tool-schedule',
  'tool-workflow': '@deepseek-ai/dsh-tool-workflow',
  'tool-ralph': '@deepseek-ai/dsh-tool-ralph',
  'tool-subagent': '@deepseek-ai/dsh-tool-subagent',
  'tool-skill': '@deepseek-ai/dsh-tool-skill',
  'tool-session-query': '@deepseek-ai/dsh-tool-session-query',
  'tool-computer-use': '@deepseek-ai/dsh-tool-computer-use',
  'working-directory': '@deepseek-ai/dsh-tool-working-directory',
  'sandbox-policy': '@deepseek-ai/dsh-sandbox-policy',
  'approval-policy': '@deepseek-ai/dsh-user-approval',
  'subagent-delegation': '@deepseek-ai/dsh-subagent',
  'web-surface': '@deepseek-ai/dsh-web',
}

/** Resolve an owning package, preferring user overrides. */
export function ownerOfTool(
  toolName: string,
  overrides: Record<string, string> = {},
): string | undefined {
  return overrides[toolName] ?? DEFAULT_TOOL_OWNERS[toolName]
}

/** Resolve an owning package for a prompt section/context. */
export function ownerOfSection(name: string): string | undefined {
  return DEFAULT_SECTION_OWNERS[name]
}
