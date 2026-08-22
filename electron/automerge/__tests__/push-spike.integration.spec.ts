/**
 * Integration spike: real Automerge sync between this Electron client and the
 * automerge-sync-server (spawned as a child process).
 *
 * Proves the full push path needed for pushEntity():
 *   client A --WS(JWT)--> server (per-tenant repo + NodeFS storage)
 *   client B  --WS(JWT)--> server  --> receives A's doc updates
 *
 * Findings baked into this spec (verified against installed versions):
 *
 * 1. initSubduction() MUST be awaited before creating a Repo in Node.
 *    automerge-repo@2.6.0-subduction.15 internally uses
 *    `@automerge/automerge-subduction/slim`, whose wasm is NOT auto-initialized.
 *    initSubduction() dynamically imports the non-slim entry whose Node build
 *    calls initSync() as a side effect. The main "@automerge/automerge" wasm is
 *    auto-initialized via the package's fullfat entrypoint, so no manual step
 *    is needed for Automerge itself.
 *
 * 2. Raw UUIDs are NOT valid DocumentIds. DocumentId is base58check-encoded;
 *    '-' is not in the base58 alphabet, so isValidDocumentId(uuid) === false.
 *    import({ docId }) does NOT canonicalize, but find() DOES remap legacy UUIDs
 *    (interpretAsDocumentId), so a raw uuid used at import would be unaddressable
 *    by find(). Deterministic fix: canonicalize ONCE via interpretAsDocumentId()
 *    and use that exact string on every peer.
 *
 * 3. WebSocketClientAdapter.onError rethrows non-ECONNREFUSED socket errors
 *    (e.g. ECONNRESET on teardown) which crashes the process. It must be
 *    overridden (remote-sync.service.ts already does this in production code).
 *
 * 4. The server must be spawned through tsx: `npm run build` (tsc) preserves
 *    the "@config/*"-style path aliases in dist/, which bare Node cannot
 *    resolve ("npm start" fails with ERR_MODULE_NOT_FOUND). tsx resolves them
 *    via tsconfig paths.
 *
 * 5. Fresh-tenant race: on the FIRST WS connection to a tenant whose runtime
 *    is being lazily created, the server-side WebSocketServerAdapter registers
 *    its wss "connection" listener asynchronously (after the tenant Repo's
 *    storage id resolves). If the upgrade completes first, the client's join
 *    message is dropped and the peer handshake never completes. Mitigation
 *    without touching server source: perform one authenticated HTTP request
 *    (GET /documents) after startup - requireAuth -> TenantManager.getOrCreate()
 *    creates the tenant eagerly, so the adapter is fully wired before any WS
 *    client connects.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import path from 'node:path'

// --- Server configuration ---------------------------------------------------
const SERVER_REPO = path.resolve(__dirname, '../../../../automerge-sync-server')
const PORT = 3987 // uncommon port, reserved for this spike
const HOST = '127.0.0.1'
const APP_ID = 'clinique'
const APP_SECRET = 'spike-test-secret'
const BASE_URL = `http://${HOST}:${PORT}`
const WS_URL = `ws://${HOST}:${PORT}/`

// Must be set BEFORE importing ../sync-config (its dotenv load does not
// override existing env vars), so token signing matches AUTH_APP_SECRETS below.
process.env.CDE_APP_ID = APP_ID
process.env.CDE_SYNC_APP_SECRET = APP_SECRET

// --- Module-level state shared across sequential tests ----------------------
let serverProcess: ChildProcess | null = null
let serverDataDir = ''
let serverAvailable = false

// Dynamically imported in beforeAll (after env setup / wasm init decision)
let signSyncToken: (userId: number | string, role?: string) => Promise<string>
let Repo: typeof import('@automerge/automerge-repo').Repo
let interpretAsDocumentId: typeof import('@automerge/automerge-repo').interpretAsDocumentId
let isValidDocumentId: typeof import('@automerge/automerge-repo').isValidDocumentId
let WebSocketClientAdapter: typeof import('@automerge/automerge-repo-network-websocket').WebSocketClientAdapter
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Automerge: any

let repoA: InstanceType<typeof Repo> | null = null
let repoB: InstanceType<typeof Repo> | null = null
let adapterA: InstanceType<typeof WebSocketClientAdapter> | null = null
let adapterB: InstanceType<typeof WebSocketClientAdapter> | null = null

// --- Helpers -----------------------------------------------------------------
async function waitFor(
  condition: () => boolean | Promise<boolean>,
  label: string,
  timeoutMs = 10_000,
  intervalMs = 200,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await condition()) return
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(`timeout (${timeoutMs}ms) waiting for: ${label}`)
}

/** Swallow socket teardown noise (ECONNRESET etc.) instead of crashing. */
function ignoreWsError(tag: string) {
  return (event: { error?: { message?: string; code?: string }; message?: string }) => {
    console.info(`[spike] ${tag} ws error ignored:`, event?.error?.code ?? event?.message ?? event)
  }
}

function tail(buffer: string[], lines = 25): string {
  return buffer.slice(-lines).join('\n')
}

// --- Suite -------------------------------------------------------------------
describe('push spike: Electron client <-> automerge-sync-server', () => {
  beforeAll(async () => {
    // 1. Ensure the server is built (acts as a compile gate; we still spawn via
    //    tsx because tsc's dist output keeps path aliases Node cannot resolve).
    const { execSync } = await import('node:child_process')
    try {
      execSync('npm run build', { cwd: SERVER_REPO, stdio: 'pipe', timeout: 120_000 })
      console.info('[spike] server built OK (npm run build)')
    } catch (error) {
      console.warn('[spike] server build failed:', (error as Error).message)
      return // serverAvailable stays false -> suite skips
    }

    // 2. Fresh data dir per run.
    serverDataDir = await mkdtemp(join(tmpdir(), 'cde-push-spike-'))

    // 3. Spawn the server.
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(PORT),
      HOST,
      DATA_DIR: serverDataDir,
      AUTH_ENABLED: 'true',
      AUTH_APP_SECRETS: JSON.stringify({ [APP_ID]: APP_SECRET }),
      LOG_LEVEL: 'info',
      LOG_PRETTY: 'false',
    }
    const serverLog: string[] = []
    serverProcess = spawn(
      process.execPath,
      [join(SERVER_REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'src/server/index.ts'],
      { cwd: SERVER_REPO, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    serverProcess.stdout?.on('data', (d: Buffer) => {
      serverLog.push(d.toString())
      if (serverLog.length > 400) serverLog.splice(0, serverLog.length - 400)
    })
    serverProcess.stderr?.on('data', (d: Buffer) => {
      serverLog.push(d.toString())
      if (serverLog.length > 400) serverLog.splice(0, serverLog.length - 400)
    })
    serverProcess.on('exit', (code, signal) => {
      console.info(`[spike] server exited code=${code} signal=${signal}`)
    })

    // 4. Wait for readiness via /health.
    try {
      await waitFor(async () => {
        try {
          const res = await fetch(`${BASE_URL}/health`)
          return res.ok
        } catch {
          return false
        }
      }, 'server /health readiness', 15_000, 250)
    } catch (error) {
      console.error('[spike] server never became healthy. Log tail:\n' + tail(serverLog))
      throw error
    }

    // 5. Warm up the tenant over HTTP so the WS gateway is fully wired before
    //    any automerge client connects (see fresh-tenant race note above).
    const { SignJWT } = await import('jose')
    const warmupToken = await new SignJWT({ appId: APP_ID })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('spike-warmup')
      .setIssuedAt()
      .setExpirationTime('300s')
      .sign(new TextEncoder().encode(APP_SECRET))
    const res = await fetch(`${BASE_URL}/documents`, {
      headers: { Authorization: `Bearer ${warmupToken}` },
    })
    if (!res.ok) {
      console.error('[spike] tenant warmup request failed:', res.status)
      return
    }
    console.info('[spike] tenant warmed up via GET /documents')

    // 6. Import client-side modules and initialize wasm.
    const repoModule = await import('@automerge/automerge-repo')
    Repo = repoModule.Repo
    interpretAsDocumentId = repoModule.interpretAsDocumentId
    isValidDocumentId = repoModule.isValidDocumentId
    ;({ WebSocketClientAdapter } = await import('@automerge/automerge-repo-network-websocket'))
    Automerge = (await import('@automerge/automerge')).next
    ;({ signSyncToken } = await import('../sync-token'))

    const { initSubduction } = repoModule
    await initSubduction() // REQUIRED before new Repo() (subduction wasm init)

    serverAvailable = true
    console.info('[spike] server ready at', BASE_URL, 'data dir:', serverDataDir)
  }, 60_000)

  afterAll(async () => {
    // Close repos / adapters first so sockets do not linger.
    for (const repo of [repoA, repoB]) {
      if (repo) await repo.shutdown().catch(() => {})
    }
    for (const adapter of [adapterA, adapterB]) {
      try {
        adapter?.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    repoA = repoB = null
    adapterA = adapterB = null

    // Kill the spawned server: SIGTERM (graceful) then SIGKILL fallback.
    if (serverProcess && serverProcess.exitCode === null && !serverProcess.killed) {
      const exited = new Promise<void>((resolve) => serverProcess!.once('exit', () => resolve()))
      serverProcess.kill('SIGTERM')
      const forceKill = setTimeout(() => {
        if (serverProcess && serverProcess.exitCode === null) serverProcess.kill('SIGKILL')
      }, 3_000)
      await Promise.race([exited, new Promise((r) => setTimeout(r, 3_500))])
      clearTimeout(forceKill)
    }
    serverProcess = null

    if (serverDataDir) {
      await rm(serverDataDir, { recursive: true, force: true }).catch(() => {})
    }
  }, 20_000)

  it('rejects raw UUID docIds and derives a deterministic base58check DocumentId', async () => {
    if (!serverAvailable) return console.info('[spike] skipped: server unavailable')

    const uuid = crypto.randomUUID()

    // Raw UUID cannot be a DocumentId ('-' not in base58 alphabet).
    expect(isValidDocumentId(uuid)).toBe(false)

    // The lib's canonical mapping (legacy UUID -> 16 bytes -> base58check) is
    // deterministic across processes, so both peers derive the SAME id.
    const id1 = interpretAsDocumentId(uuid)
    const id2 = interpretAsDocumentId(uuid)
    expect(id1).toBe(id2)
    expect(isValidDocumentId(id1)).toBe(true)
    expect(id1).not.toBe(uuid) // it was remapped, proving raw-uuid strategy is wrong

    console.info(
      `[spike] docId strategy: interpretAsDocumentId("${uuid}") -> "${id1}" (raw uuid rejected)`,
    )
  })

  it('syncs a pushed document from client A through the server to client B', async () => {
    if (!serverAvailable) return console.info('[spike] skipped: server unavailable')

    const uuid = crypto.randomUUID()
    const docId = interpretAsDocumentId(uuid) // deterministic, lib-valid DocumentId

    // --- Client A: connect, push, update -------------------------------------
    const tokenA = await signSyncToken('spike-user-a', 'admin')
    adapterA = new WebSocketClientAdapter(`${WS_URL}?token=${tokenA}`)
    adapterA.onError = ignoreWsError('A')
    repoA = new Repo({ network: [adapterA] }) // no storage: ephemeral peer

    await waitFor(() => repoA!.peers.length > 0, 'client A peer handshake')

    const doc = Automerge.from({ entityType: 'patient', name: 'Spike', automergeId: uuid })
    const bytes = Automerge.save(doc)
    const handleA = repoA.import(bytes, { docId })
    expect(handleA.documentId).toBe(docId)

    handleA.change((d: { name: string }) => {
      d.name = 'Spike-updated'
    })

    // --- Assert the server persisted the data on disk ------------------------
    const shardDir = join(serverDataDir, APP_ID, docId.slice(0, 2))
    await waitFor(async () => {
      try {
        return (await readdir(shardDir)).length > 0
      } catch {
        return false
      }
    }, `server disk write under ${shardDir}`, 15_000)
    console.info('[spike] server persisted doc shard:', shardDir, await readdir(shardDir))

    // --- Client B: separate peer, fresh token, pulls the doc ------------------
    const tokenB = await signSyncToken('spike-user-b')
    adapterB = new WebSocketClientAdapter(`${WS_URL}?token=${tokenB}`)
    adapterB.onError = ignoreWsError('B')
    repoB = new Repo({ network: [adapterB] })

    await waitFor(() => repoB!.peers.length > 0, 'client B peer handshake')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handleB: { doc(): any } | null = null
    for (let attempt = 0; attempt < 5 && !handleB; attempt++) {
      try {
        handleB = await repoB.find(docId)
      } catch (error) {
        // Transient "unavailable" can happen if find() races the handshake.
        console.info(`[spike] repoB.find attempt ${attempt + 1} failed: ${(error as Error).message}`)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
    expect(handleB).not.toBeNull()

    await waitFor(() => {
      const d = handleB!.doc() as { name?: string } | undefined
      return d?.name === 'Spike-updated'
    }, 'client B to receive Spike-updated', 15_000)

    const remoteDoc = handleB!.doc() as { entityType: string; name: string; automergeId: string }
    expect(remoteDoc.entityType).toBe('patient')
    expect(remoteDoc.name).toBe('Spike-updated')
    expect(remoteDoc.automergeId).toBe(uuid)
    console.info('[spike] end-to-end sync verified:', remoteDoc)
  })
})
