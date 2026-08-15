import { ipcMain } from 'electron'
import { container } from 'tsyringe'
import { RemoteSyncService } from '../automerge/remote-sync.service'

export function registerSyncHandlers(): void {
  ipcMain.handle('sync:status', async () => {
    const service = container.resolve(RemoteSyncService)
    return service.getStatus()
  })

  ipcMain.handle('sync:start', async (_event, serverUrl?: string) => {
    const service = container.resolve(RemoteSyncService)
    if (serverUrl && !serverUrl.startsWith('wss://') && !serverUrl.startsWith('ws://')) {
      throw new Error('Invalid server URL: must start with wss:// or ws://')
    }
    await service.start(serverUrl)
    return service.getStatus()
  })

  ipcMain.handle('sync:stop', async () => {
    const service = container.resolve(RemoteSyncService)
    await service.stop()
    return service.getStatus()
  })
}
