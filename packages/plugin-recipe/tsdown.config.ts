import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  fixedExtension: false,
  platform: 'node',
  target: 'node20',
  deps: {
    neverBundle: [/^@deepseek-ai\//],
    alwaysBundle: ['dsh-shared-meta'],
  },
})
