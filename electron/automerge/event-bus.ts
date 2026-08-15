import { EventEmitter } from 'events'

export type EntityChangeAction = 'created' | 'updated' | 'deleted'
export type EventSource = 'local' | 'remote'

export interface EntityChangeEvent {
  entityType: string
  action: EntityChangeAction
  id: number | string
  entity: unknown
  source: EventSource
  timestamp: number
}

export interface SyncProgressEvent {
  phase: 'started' | 'progress' | 'completed' | 'error'
  entityType: string
  processed: number
  total: number
  timestamp: number
  error?: string
}

class EntityEventBusImpl extends EventEmitter {
  emitEntityChange(event: EntityChangeEvent): void {
    this.emit('entity:changed', event)
    this.emit(`entity:${event.entityType}:${event.action}`, event)
  }

  emitSyncProgress(event: SyncProgressEvent): void {
    this.emit('sync:progress', event)
  }
}

export const entityEventBus = new EntityEventBusImpl()
