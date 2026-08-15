import { BrowserWindow } from 'electron'
import { entityEventBus } from './event-bus'
import type { EntityChangeEvent, SyncProgressEvent } from './event-bus'

let isSetup = false

export function setupIpcDispatcher(): void {
  if (isSetup) return
  isSetup = true
  entityEventBus.on('entity:changed', (event: EntityChangeEvent) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('entity:changed', {
          entityType: event.entityType,
          action: event.action,
          id: event.id,
          source: event.source,
          timestamp: event.timestamp,
        })
      }
    })
  })

  entityEventBus.on('sync:progress', (event: SyncProgressEvent) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('sync:progress', {
          phase: event.phase,
          entityType: event.entityType,
          processed: event.processed,
          total: event.total,
          timestamp: event.timestamp,
          error: event.error,
        })
      }
    })
  })

  console.log('[IpcDispatcher] Listening to entity:changed + sync:progress events')
}
