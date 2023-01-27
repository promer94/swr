import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'index.ts',
    'immutable.ts',
    'infinite.ts',
    'mutation.ts',
    '_internal.ts'
  ],
  format: ['cjs', 'esm'],
  target: 'es2018',
  clean: true,
  dts: true,
  external: ['swr', 'swr/_internal']
})
