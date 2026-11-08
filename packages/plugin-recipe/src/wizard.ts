import type { WizardAnswers, WizardQuestion } from 'dsh-shared-meta'

const AUTOMATION_RE = /每周|每天|每日|定时|自动|周期|weekly|daily|schedule|cron|recurring/i
const WORKFLOW_RE =
  /周报|日报|报告|汇总|总结|自动|定时|每周|每天|周期|流程|编排|workflow|report|summar|collect|发送|通知|调研/i

export interface WizardOptions {
  forceBlueprint?: boolean
}

/** Whether a goal looks like an automatable workflow rather than ordinary Q&A. */
export function isWorkflowGoal(goal: string): boolean {
  return WORKFLOW_RE.test(goal)
}

/** Whether the goal or answers imply a schedule. */
export function isAutomated(goal: string, answers: WizardAnswers): boolean {
  return AUTOMATION_RE.test(`${goal} ${answers.frequency ?? ''}`)
}

/** Fill defaults for the fields the user has not answered. */
export function defaultsFor(goal: string, answers: WizardAnswers): WizardAnswers {
  const automated = isAutomated(goal, answers)
  return {
    goal,
    scope: answers.scope ?? '当前工作区',
    frequency: answers.frequency ?? (automated ? '每周一 09:00' : '手动触发'),
    sources: answers.sources ?? (automated || /git|commit|代码|变更/i.test(goal) ? ['Git log'] : ['当前工作区文件']),
    outputFormat: answers.outputFormat ?? 'Markdown',
    delivery: answers.delivery ?? '对话内交付（present）',
    onFailure: answers.onFailure ?? '保留草稿并在对话中通知',
    acceptance: answers.acceptance ?? ['时间范围正确', '输出内容可读', '失败可恢复'],
  }
}

/** Return the next question group, or null when enough answers exist. */
export function nextQuestion(
  goal: string,
  answers: WizardAnswers,
  options: WizardOptions = {},
): WizardQuestion | null {
  if (options.forceBlueprint === true) return null
  if (!isWorkflowGoal(goal)) return null
  if (answers.scope === undefined || answers.frequency === undefined) {
    return {
      step: 'scope-frequency',
      question: '这个工作流覆盖哪个项目、什么时间范围，手动还是定时？',
      defaults: [
        answers.scope ?? '当前工作区',
        answers.frequency ?? (isAutomated(goal, answers) ? '每周一 09:00' : '手动触发'),
      ],
      allowSkip: false,
      fields: ['scope', 'frequency'],
    }
  }
  if (answers.sources === undefined) {
    return {
      step: 'sources',
      question: '数据从哪来？例如 Git log、当前工作区文件、网页资料。',
      defaults: answers.sources ?? (isAutomated(goal, answers) ? ['Git log'] : ['当前工作区文件']),
      allowSkip: false,
      fields: ['sources'],
    }
  }
  if (answers.outputFormat === undefined || answers.delivery === undefined) {
    return {
      step: 'output-delivery',
      question: '输出什么格式、交付到哪里？',
      defaults: [answers.outputFormat ?? 'Markdown', answers.delivery ?? '对话内交付（present）'],
      allowSkip: true,
      fields: ['outputFormat', 'delivery'],
    }
  }
  if (answers.onFailure === undefined || answers.acceptance === undefined) {
    return {
      step: 'failure-acceptance',
      question: '失败时怎么处理，怎样算验收通过？',
      defaults: [
        answers.onFailure ?? '保留草稿并在对话中通知',
        '时间范围正确；输出内容可读；失败可恢复',
      ],
      allowSkip: true,
      fields: ['onFailure', 'acceptance'],
    }
  }
  return null
}

/** Merge user answers over defaults without dropping explicit values. */
export function mergeAnswers(goal: string, answers: Partial<WizardAnswers>): WizardAnswers {
  const base: WizardAnswers = { goal, ...answers }
  return defaultsFor(goal, base)
}

/** Whether the wizard has all fields it needs. */
export function isComplete(goal: string, answers: WizardAnswers): boolean {
  return nextQuestion(goal, answers) === null
}
