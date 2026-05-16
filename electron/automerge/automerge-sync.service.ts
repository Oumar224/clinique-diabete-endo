import { singleton, inject, delay } from 'tsyringe'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import { EntityRegistry } from './entity-registry'
import { AutomergeSqliteStorageAdapter } from './storage/automerge-sqlite-storage'
import type { ChangeCallback } from './utils/entity-types'
import { randomUUID } from 'crypto'

@singleton()
export class AutomergeSyncService {
  private storageAdapter: AutomergeSqliteStorageAdapter
  private isInitialized = false
  private changeCallbacks: Map<string, ChangeCallback[]> = new Map()

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

    console.log(`[AutomergeSync] Initialized with ${registry.getAllTypes().length} entity types`)
    this.isInitialized = true
  }

  async create<T extends { id?: number; automerge_id?: string }>(
    entityType: string, entity: T
  ): Promise<string> {
    const registration = EntityRegistry.getInstance().get(entityType)
    if (!registration) throw new Error(`Unknown entity type: ${entityType}`)

    const doc = registration.converter.toDocument(entity)
    doc.automergeId = randomUUID()
    doc.lastModified = Date.now()
    doc.modifiedBy = 'local'

    await this.storageAdapter.save(doc.automergeId, new Uint8Array(Buffer.from(JSON.stringify(doc))))
    entity.automerge_id = doc.automergeId
    this.notifyChange(entityType, entity.id!, entity)
    return doc.automergeId
  }

  async update<T extends { automerge_id?: string }>(
    entityType: string, id: number, updates: Partial<T>
  ): Promise<void> {
    const registration = EntityRegistry.getInstance().get(entityType)
    if (!registration) throw new Error(`Unknown entity type: ${entityType}`)

    if (updates.automerge_id) {
      const existing = await this.storageAdapter.load(updates.automerge_id)
      if (existing) {
        const doc = JSON.parse(Buffer.from(existing).toString())
        for (const [key, value] of Object.entries(updates)) {
          if (key !== 'id' && key !== 'automerge_id') doc[key] = value
        }
        doc.lastModified = Date.now()
        await this.storageAdapter.save(doc.automergeId, new Uint8Array(Buffer.from(JSON.stringify(doc))))
      }
    }
    this.notifyChange(entityType, id, updates)
  }

  async delete<T extends { id?: number; automerge_id?: string }>(
    entityType: string, entity: T
  ): Promise<void> {
    if (entity.automerge_id) {
      await this.storageAdapter.remove(entity.automerge_id)
    }
    this.notifyChange(entityType, entity.id!, null)
  }

  watch(entityType: string, callback: ChangeCallback): () => void {
    if (!this.changeCallbacks.has(entityType)) {
      this.changeCallbacks.set(entityType, [])
    }
    this.changeCallbacks.get(entityType)!.push(callback)
    return () => {
      const cbs = this.changeCallbacks.get(entityType)
      if (cbs) {
        const idx = cbs.indexOf(callback)
        if (idx >= 0) cbs.splice(idx, 1)
      }
    }
  }

  private notifyChange(entityType: string, id: number, changes: unknown): void {
    const callbacks = this.changeCallbacks.get(entityType)
    if (callbacks) {
      callbacks.forEach(cb => cb(String(id), entityType, changes))
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
