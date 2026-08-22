import { singleton, inject, delay } from 'tsyringe'
import { randomUUID } from 'crypto'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import { EntityRegistry } from './entity-registry'
import { AutomergeSqliteStorageAdapter } from './storage/automerge-sqlite-storage'
import { entityEventBus } from './event-bus'
import type { EntityChangeEvent } from './event-bus'

@singleton()
export class AutomergeSyncService {
  private storageAdapter: AutomergeSqliteStorageAdapter
  private isInitialized = false

  constructor(
    @inject(delay(() => AppDatabaseDatasource)) _datasource: AppDatabaseDatasource,
    @inject(AutomergeSqliteStorageAdapter) storageAdapter: AutomergeSqliteStorageAdapter,
  ) {
    this.storageAdapter = storageAdapter
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[AutomergeSync] Already initialized')
      return
    }

    await this.storageAdapter.initialize()
    console.log('[AutomergeSync] Storage adapter initialized')

    const registry = EntityRegistry.getInstance()
    const registeredCount = registry.getAllTypes().length

    if (registeredCount === 0) {
      console.log('[AutomergeSync] No entities registered yet, triggering registration...')
      await this.triggerEntityRegistration()
    }

    entityEventBus.on('entity:changed', (event: EntityChangeEvent) => {
      if (event.source === 'remote') return
      this.handleEntityChange(event)
    })

    console.log(`[AutomergeSync] Initialized with ${registry.getAllTypes().length} entity types`)
    this.isInitialized = true
  }

  private async handleEntityChange(event: EntityChangeEvent): Promise<void> {
    const registration = EntityRegistry.getInstance().get(event.entityType)
    if (!registration) return

    try {
      if (event.action === 'deleted') {
        const entity = event.entity as { automerge_id?: string } | null
        if (entity?.automerge_id) {
          await this.storageAdapter.remove([entity.automerge_id])
        }
        return
      }

      const entity = event.entity as { id?: number; automerge_id?: string } | null
      if (!entity) return

      const doc = registration.converter.toDocument(entity)
      if (!doc.automergeId) {
        doc.automergeId = randomUUID()
      }
      doc.lastModified = Date.now()
      doc.modifiedBy = 'local'

      await this.storageAdapter.save(
        [doc.automergeId],
        new Uint8Array(Buffer.from(JSON.stringify(doc))),
      )
    } catch (error) {
      console.error(`[AutomergeSync] Error handling ${event.action} for ${event.entityType}:`, error)
    }
  }

  private async triggerEntityRegistration(): Promise<void> {
    const { ENTITIES } = await import('../entities/database')
    for (const Entity of ENTITIES) {
      if (Entity.register) {
        Entity.register()
      }
    }
  }
}
