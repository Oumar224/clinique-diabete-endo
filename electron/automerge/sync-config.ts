import { config as loadEnv } from 'dotenv'
import { join } from 'path'

// Load .env explicitly: `import 'dotenv/config'` reads CWD, which is wrong for
// packaged apps. In dev __dirname is <root>/dist-electron/automerge (or
// <root>/electron/automerge under vitest), so ../../.env resolves to the project
// root. Packaged builds do not ship .env, so the secret must be provided via
// process.env (external injection or electron-builder extraResources).
loadEnv({ path: join(__dirname, '../../.env') })

export const APP_ID = process.env.CDE_APP_ID ?? 'clinique'
export const APP_SECRET = process.env.CDE_SYNC_APP_SECRET ?? ''
export const DEFAULT_SERVER_URL = process.env.CDE_AUTO_SYNC_SERVER
  ?? process.env.VITE_AUTO_SYNC_SERVER
  ?? 'ws://localhost:3030'
export const TOKEN_TTL_SECONDS = 300