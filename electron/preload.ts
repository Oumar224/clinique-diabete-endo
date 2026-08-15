import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
  autoUpdater: {
    checkForUpdates() {
      return ipcRenderer.invoke('check-for-updates')
    },
    downloadUpdate() {
      return ipcRenderer.invoke('download-update')
    },
    installUpdate() {
      return ipcRenderer.invoke('install-update')
    },
    onUpdateAvailable(callback: (info: any) => void) {
      const subscription = (_event: any, info: any) => callback(info)
      ipcRenderer.on('update_available', subscription)
      return () => {
        ipcRenderer.removeListener('update_available', subscription)
      }
    },
    onUpdateDownloaded(callback: (info: any) => void) {
      const subscription = (_event: any, info: any) => callback(info)
      ipcRenderer.on('update_downloaded', subscription)
      return () => {
        ipcRenderer.removeListener('update_downloaded', subscription)
      }
    },
    onDownloadProgress(callback: (progress: any) => void) {
      const subscription = (_event: any, progress: any) => callback(progress)
      ipcRenderer.on('download_progress', subscription)
      return () => {
        ipcRenderer.removeListener('download_progress', subscription)
      }
    },
    onError(callback: (error: Error) => void) {
      const subscription = (_event: any, error: Error) => callback(error)
      ipcRenderer.on('update_error', subscription)
      return () => {
        ipcRenderer.removeListener('update_error', subscription)
      }
    },
  },
  onEntityChanged(callback: (event: { entityType: string; action: string; id: number | string; source: string; timestamp: number }) => void) {
    const subscription = (_event: any, data: any) => callback(data)
    ipcRenderer.on('entity:changed', subscription)
    return () => {
      ipcRenderer.removeListener('entity:changed', subscription)
    }
  },
  onSyncProgress(callback: (event: { phase: string; entityType: string; processed: number; total: number; timestamp: number; error?: string }) => void) {
    const subscription = (_event: any, data: any) => callback(data)
    ipcRenderer.on('sync:progress', subscription)
    return () => {
      ipcRenderer.removeListener('sync:progress', subscription)
    }
  },
})
