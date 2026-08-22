import { ipcMain } from 'electron'
import { container } from 'tsyringe'
import { RemoteSyncService } from '../automerge/remote-sync.service'
import { DEFAULT_SERVER_URL } from '../automerge/sync-config'

export function registerSyncHandlers(): void {
  ipcMain.handle('sync:configure-session', (_event, { userId, role }: { userId: number | string; role?: string }) => {
    const service = container.resolve(RemoteSyncService)
    service.configureSession(userId, role)
    return true
  })

  ipcMain.handle('sync:status', async () => {
    const service = container.resolve(RemoteSyncService)
    return service.getStatus()
  })

  ipcMain.handle('sync:start', async (_event, serverUrl?: string) => {
    const service = container.resolve(RemoteSyncService)
    if (serverUrl && serverUrl !== DEFAULT_SERVER_URL) {
      console.warn(`[Sync] Ignoring renderer-supplied server URL '${serverUrl}'; using default '${DEFAULT_SERVER_URL}'`)
    }
    await service.start()
    return service.getStatus()
  })

  ipcMain.handle('sync:stop', async () => {
    const service = container.resolve(RemoteSyncService)
    await service.stop()
    return service.getStatus()
  })
}