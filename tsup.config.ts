import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'core/index.ts',
    'immutable/index.ts',
    'infinite/index.ts',
    'mutation/index.ts',
    '_internal/index.ts'
  ],
  format: ['cjs', 'esm'],
  target: 'es2018',
  clean: true,
  dts: true,
  external: ['swr', 'swr/_internal']
})
