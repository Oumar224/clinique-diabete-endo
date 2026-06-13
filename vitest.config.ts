import { defineConfig } from 'vitest/config'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * Virtual module proxy for `node:sqlite` (Node 22+ experimental built-in).
 *
 * Vite 5.x does not recognize `node:sqlite` as a Node.js built-in. Its SSR
 * resolver strips the `node:` prefix and tries (and fails) to load `sqlite`
 * as a file-system path. This plugin provides a virtual proxy that uses
 * `createRequire` to load the real built-in at runtime, bypassing Vite's
 * SSR resolution entirely.
 */
function nodeSqlitePlugin(): Plugin {
  const VIRTUAL_MODULE_ID = '\0virtual:node-sqlite'

  return {
    name: 'node-sqlite-external',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'node:sqlite' || id === 'sqlite') {
        return VIRTUAL_MODULE_ID
      }
      return null
    },
    load(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return `
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const mod = require('node:sqlite')
export const DatabaseSync = mod.DatabaseSync
export const StatementSync = mod.StatementSync
export const { constants, backup } = mod
export default mod
`
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [nodeSqlitePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '_electron': path.resolve(__dirname, './electron'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    root: '.',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'dist-electron', '.idea', '.git'],
  },
})
