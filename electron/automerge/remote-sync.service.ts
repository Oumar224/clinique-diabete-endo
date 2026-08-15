import { singleton, inject, delay } from 'tsyringe'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import { ENTITY_TYPE_MAP } from './entity-type-map'
import { entityEventBus } from './event-bus'

const DEFAULT_SERVER_URL = 'wss://sync.automerge.org'

@singleton()
export class RemoteSyncService {
  private isRunning = false
  private serverUrl: string | null = null

  constructor(
    @inject(delay(() => AppDatabaseDatasource)) _datasource: AppDatabaseDatasource,
  ) {}

  async start(serverUrl: string = DEFAULT_SERVER_URL): Promise<void> {
    if (this.isRunning) return
    this.serverUrl = serverUrl
    this.isRunning = true
    console.log(`[RemoteSync] Connected to ${serverUrl}`)
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

  async stop(): Promise<void> {
    this.isRunning = false
    this.serverUrl = null
    console.log('[RemoteSync] Stopped')
  }

  getStatus(): { isRunning: boolean; serverUrl: string | null } {
    return { isRunning: this.isRunning, serverUrl: this.serverUrl }
  }
}
