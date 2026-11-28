import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('root manifest', () => {
  it('declares a resolvable dsh.bundle alias for marketplace scanners', () => {
    const root = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
      private?: boolean
      dsh?: { bundle?: { patch?: string } }
      dependencies?: Record<string, string>
    }
    expect(root.private).toBe(true)
    expect(root.dsh?.bundle?.patch).toBe('./packages/plugin-trim/cordis.patch.yml')
    expect(existsSync(resolve(process.cwd(), root.dsh!.bundle!.patch!))).toBe(true)
    expect(root.dependencies?.['dsh-plugin-trim']).toBeDefined()
  })
})
