#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const dshHome = resolve(process.env.DSH_HOME?.trim() || join(homedir(), '.dsh'))
const data = join(dshHome, 'experience-optimizer')

const audit = await readJsonl(join(data, 'audit.jsonl'))
const usage = await readJsonl(join(data, 'trim', 'usage.jsonl'))

console.log('# DSH 体验优化验收报告')
console.log('')
console.log(`数据目录：${data}`)
console.log(`审计记录：${audit.length}`)
console.log(`使用记录：${usage.length}`)
console.log('')

const byAction = new Map()
const byResult = new Map()
for (const record of audit) {
  const action = typeof record.action === 'string' ? record.action : 'unknown'
  const result = typeof record.result === 'string' ? record.result : 'unknown'
  byAction.set(action, (byAction.get(action) ?? 0) + 1)
  byResult.set(result, (byResult.get(result) ?? 0) + 1)
}
console.log('## 按动作')
for (const [action, count] of [...byAction].sort((a, b) => b[1] - a[1])) {
  console.log(`- ${action}: ${count}`)
}
console.log('')
console.log('## 按结果')
for (const [result, count] of [...byResult].sort((a, b) => b[1] - a[1])) {
  console.log(`- ${result}: ${count}`)
}
console.log('')

const tools = new Map()
for (const line of usage) {
  if (typeof line.n !== 'string') continue
  const current = tools.get(line.n) ?? { calls: 0, ok: 0 }
  current.calls += 1
  if (line.ok === true) current.ok += 1
  tools.set(line.n, current)
}
console.log('## 工具使用 Top')
for (const [name, stats] of [...tools].sort((a, b) => b[1].calls - a[1].calls).slice(0, 15)) {
  console.log(`- ${name}: ${stats.calls} 次，成功 ${stats.ok}`)
}
if (tools.size === 0) console.log('- （暂无记录）')
console.log('')

console.log('## 最近审计')
for (const record of audit.slice(-10)) {
  console.log(
    `- ${record.t ?? ''} ${record.actor ?? ''}/${record.action ?? ''} ${record.result ?? ''} ${record.summary ?? ''}`,
  )
}

async function readJsonl(path) {
  try {
    const text = await readFile(path, 'utf8')
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .flatMap((line) => {
        try {
          return [JSON.parse(line)]
        } catch {
          return []
        }
      })
  } catch {
    return []
  }
}
