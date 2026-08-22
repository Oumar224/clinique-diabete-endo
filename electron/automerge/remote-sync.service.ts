import { singleton, inject } from 'tsyringe'
import { Repo } from '@automerge/automerge-repo'
import { WebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket'
import type { DocHandle } from '@automerge/automerge-repo'
import { ENTITY_TYPE_MAP } from './entity-type-map'
import { entityEventBus } from './event-bus'
import { AutomergeSqliteStorageAdapter } from './storage/automerge-sqlite-storage'
import { signSyncToken } from './sync-token'
import { DEFAULT_SERVER_URL, TOKEN_TTL_SECONDS } from './sync-config'

@singleton()
export class RemoteSyncService {
  private isRunning = false
  private generation = 0
  private refreshInFlight = false
  private serverUrl: string | null = null
  private repo: Repo | null = null
  private adapter: WebSocketClientAdapter | null = null
  private session: { userId: number | string; role?: string } | null = null
  private refreshTimer: NodeJS.Timeout | null = null
  private readonly docIdToEntityType = new Map<string, string>()
  private readonly seenRemoteDocs = new Set<string>()
  private readonly storage: AutomergeSqliteStorageAdapter

  constructor(
    @inject(AutomergeSqliteStorageAdapter) storage: AutomergeSqliteStorageAdapter,
  ) {
    this.storage = storage
  }

  configureSession(userId: number | string, role?: string): void {
    this.session = { userId, role }
    if (this.isRunning) {
      void this.refreshToken().catch((error) => {
        console.error('[RemoteSync] Token refresh error:', error)
      })
    }
  }

  async start(serverUrl?: string): Promise<{ isRunning: boolean; serverUrl: string | null }> {
    if (this.isRunning) return this.getStatus()
    const session = this.session
    if (!session) {
      throw new Error('No active session: call configureSession() before start()')
    }

    const gen = this.generation
    await this.storage.initialize()

    const base = (serverUrl ?? DEFAULT_SERVER_URL).replace(/\/+$/, '')
    const token = await signSyncToken(session.userId, session.role)
    if (gen !== this.generation) {
      return this.getStatus()
    }
    const wsUrl = `${base}?token=${token}`

    const adapter = new WebSocketClientAdapter(wsUrl)
    const repoGen = gen
    adapter.onError = (event: any) => {
      console.debug('[RemoteSync] WS error:', event?.message ?? event?.error?.message ?? event)
    }
    const realConnect = adapter.connect.bind(adapter)
    adapter.connect = (peerId: any, metadata?: any) => {
      if (repoGen !== this.generation || this.adapter !== adapter) return
      realConnect(peerId, metadata)
    }
    this.adapter = adapter

    const repo = new Repo({ storage: this.storage, network: [adapter] })
    repo.on('document', ({ handle }) => void this.handleRepoDocument(handle))
    repo.on('delete-document', ({ documentId }) => void this.handleRepoDocumentDeleted(documentId))
    this.repo = repo

    this.isRunning = true
    this.serverUrl = base
    console.log(`[RemoteSync] Connected to ${base} (user ${session.userId})`)

    this.startRefreshTimer()
    return this.getStatus()
  }

  async refreshToken(): Promise<void> {
    if (this.refreshInFlight) return
    this.refreshInFlight = true
    try {
      const target = this.serverUrl
      await this.teardown()
      if (target && this.session) {
        await this.start(target)
      }
    } finally {
      this.refreshInFlight = false
    }
  }

  async stop(): Promise<void> {
    this.generation++
    this.session = null
    await this.teardown()
    this.serverUrl = null
    console.log('[RemoteSync] Stopped')
  }

  getStatus(): { isRunning: boolean; serverUrl: string | null } {
    return { isRunning: this.isRunning, serverUrl: this.serverUrl }
  }

  async handleIncomingDocument(
    entityType: string,
    automergeId: string,
    document: Record<string, unknown>,
    action: 'created' | 'updated' | 'deleted',
  ): Promise<void> {
    const registration = ENTITY_TYPE_MAP[entityType]
    if (!registration) return

    entityEventBus.emitSyncProgress({
      phase: 'started', entityType, processed: 0, total: 1, timestamp: Date.now(),
    })

    try {
      const entity = action !== 'deleted'
        ? registration.converter.toEntity({ ...document, automergeId })
        : null

      entityEventBus.emitEntityChange({
        entityType, action,
        id: (entity as any)?.id ?? automergeId,
        entity, source: 'remote', timestamp: Date.now(),
      })

      entityEventBus.emitSyncProgress({
        phase: 'completed', entityType, processed: 1, total: 1, timestamp: Date.now(),
      })
    } catch (error) {
      entityEventBus.emitSyncProgress({
        phase: 'error', entityType, processed: 0, total: 1, timestamp: Date.now(),
        error: (error as Error).message,
      })
    }
  }

  private async teardown(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
    try {
      this.adapter?.disconnect()
    } catch (error) {
      console.error('[RemoteSync] Adapter disconnect error:', error)
    }
    if (this.repo) {
      try {
        await this.repo.shutdown()
      } catch (error) {
        console.error('[RemoteSync] Repo shutdown error:', error)
      }
    }
    this.repo = null
    this.adapter = null
    this.isRunning = false
  }

  private startRefreshTimer(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer)
    this.refreshTimer = setInterval(() => {
      if (!this.isRunning) return
      void this.refreshToken().catch((error) => {
        console.error('[RemoteSync] Token refresh error:', error)
      })
    }, TOKEN_TTL_SECONDS * 800)
  }

  private async handleRepoDocument(handle: DocHandle<unknown>): Promise<void> {
    try {
      let entityType = this.docIdToEntityType.get(handle.documentId)
      let doc: Record<string, unknown> | undefined
      try {
        doc = handle.doc() as Record<string, unknown>
      } catch {
        doc = undefined
      }

      if (!entityType && doc) {
        const candidate = typeof doc.entityType === 'string'
          ? doc.entityType
          : typeof doc.type === 'string'
            ? doc.type
            : undefined
        if (candidate && ENTITY_TYPE_MAP[candidate]) entityType = candidate
      }

      if (!entityType || !doc) {
        if (!entityType) {
          console.log(`[RemoteSync] No entity type for remote document ${handle.documentId}, skipping`)
        }
        return
      }

      this.docIdToEntityType.set(handle.documentId, entityType)
      const action = this.seenRemoteDocs.has(handle.documentId) ? 'updated' : 'created'
      this.seenRemoteDocs.add(handle.documentId)
      await this.handleIncomingDocument(entityType, handle.documentId, doc, action)
    } catch (error) {
      console.error('[RemoteSync] Error handling remote document:', error)
    }
  }

  private async handleRepoDocumentDeleted(documentId: string): Promise<void> {
    const entityType = this.docIdToEntityType.get(documentId)
    if (!entityType) return
    try {
      await this.handleIncomingDocument(entityType, documentId, {}, 'deleted')
      this.docIdToEntityType.delete(documentId)
      this.seenRemoteDocs.delete(documentId)
    } catch (error) {
      console.error('[RemoteSync] Error handling remote document deletion:', error)
    }
  }
}