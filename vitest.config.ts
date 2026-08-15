import { defineConfig } from 'vitest/config'
import path from 'node:path'
import vue from '@vitejs/plugin-vue'
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
  plugins: [nodeSqlitePlugin(), vue()],
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
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: [
        'src/composables/useSyncStatus.ts',
        'src/composables/useDispositifs.ts',
        'src/composables/usePrescriptions.ts',
        'src/composables/usePlanSoins.ts',
        'src/composables/useVitalSigns.ts',
        'src/composables/usePatients.ts',
        'src/composables/useEncounters.ts',
        'src/composables/useStays.ts',
        'src/composables/useTrustedPerson.ts',
        'src/composables/useUsers.ts',
        'src/composables/useMedicalStaff.ts',
        'src/composables/useEmailConfig.ts',
        'src/components/layout/SyncStatusIndicator.vue',
        'src/components/SyncProgressDialog.vue',
        'electron/automerge/event-bus.ts',
        'electron/automerge/entity-type-map.ts',
        'electron/automerge/ipc-dispatcher.ts',
        'electron/automerge/remote-sync.service.ts',
        'electron/automerge/automerge-sync.service.ts',
        'electron/handlers/sync.handler.ts',
        'electron/services/vital-signs.service.ts',
        'electron/services/plan-soins.service.ts',
        'electron/services/prescription.service.ts',
        'electron/services/dispositif.service.ts',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'electron/**/*.spec.ts',
        'electron/**/__tests__/**',
        'node_modules/**',
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
})
