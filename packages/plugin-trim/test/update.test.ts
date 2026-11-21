import { describe, expect, it } from 'vitest'
import { compareVersions } from '../src/api.ts'

describe('update check', () => {
  it('compares semantic versions without semver dependencies', () => {
    expect(compareVersions('0.3.6', '0.3.5')).toBe(1)
    expect(compareVersions('0.3.5', '0.3.6')).toBe(-1)
    expect(compareVersions('v0.3.6', '0.3.6')).toBe(0)
    expect(compareVersions('0.4.0', '0.3.99')).toBe(1)
  })
})
