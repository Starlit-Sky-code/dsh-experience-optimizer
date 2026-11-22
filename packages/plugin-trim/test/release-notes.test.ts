import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

describe('release notes', () => {
  it('keeps a release body under ten lines and points at the install command', () => {
    const output = execFileSync(
      process.execPath,
      [resolve(process.cwd(), 'scripts/release-notes.mjs'), 'v0.5.9'],
      { encoding: 'utf8' },
    )
    const lines = output.trimEnd().split('\n')
    expect(lines.length).toBeLessThanOrEqual(10)
    expect(lines[0]).toMatch(/^- /)
    expect(output).not.toContain('Full Changelog')
    expect(output).toContain('dsh plugin --profile web add dsh-plugin-trim@0.5.9')
  })
})
