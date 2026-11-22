#!/usr/bin/env node
/**
 * Build a short GitHub Release body from CHANGELOG.md.
 *
 * Usage: node scripts/release-notes.mjs v0.5.9 > release-notes.md
 * Output is capped at 10 lines: up to 6 bullets + blank + install command.
 */
import { readFileSync } from 'node:fs'

const tag = (process.argv[2] || '').trim()
if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  console.error('usage: node scripts/release-notes.mjs vX.Y.Z')
  process.exit(2)
}
const version = tag.slice(1)
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')
const start = changelog.indexOf(`## [${version}]`)
if (start < 0) {
  console.error(`CHANGELOG.md has no section for ${version}`)
  process.exit(1)
}
const rest = changelog.slice(start)
const next = rest.indexOf('\n## [', 1)
const section = next < 0 ? rest : rest.slice(0, next)

const bullets = []
for (const chunk of section.split(/\n(?=- )/)) {
  if (!chunk.startsWith('- ')) continue
  const text = chunk
    .split(/\n#{2,3} /)[0]
    .replace(/^-\s+/, '')
    .replace(/\s+- /g, '; ')
    .replace(/:\s*;/g, ': ')
    .replace(/;\s*;/g, '; ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text) bullets.push(text.length > 180 ? text.slice(0, 177) + '…' : text)
}

const shown = bullets.slice(0, 6)
if (bullets.length > shown.length) {
  shown.push(`其余 ${bullets.length - shown.length} 项见 CHANGELOG.md`)
}
if (shown.length === 0) shown.push(`版本 ${version}`)

console.log(shown.map((line) => `- ${line}`).join('\n'))
console.log('')
console.log(`安装：\`dsh plugin --profile web add dsh-plugin-trim@${version}\``)
