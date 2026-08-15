/// <reference types="vite/client" />

interface UpdateInfo {
  version: string
  releaseNotes?: string
  releaseDate?: string
}

interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  total: number
  transferred: number
}

interface ElectronAPI {
  getVersion: () => Promise<string>
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  onEntityChanged?(callback: (event: {
    entityType: string
    action: 'created' | 'updated' | 'deleted'
    id: number | string
    source: 'local' | 'remote'
    timestamp: number
  }) => void): () => void
  onSyncProgress?(callback: (event: {
    phase: 'started' | 'progress' | 'completed' | 'error'
    entityType: string
    processed: number
    total: number
    timestamp: number
    error?: string
  }) => void): () => void
  autoUpdater: {
    checkForUpdates(): Promise<{ updateInfo: UpdateInfo }>
    downloadUpdate(): Promise<void>
    installUpdate(): Promise<void>
    onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void
    onUpdateDownloaded(callback: (info: UpdateInfo) => void): () => void
    onDownloadProgress(callback: (progress: DownloadProgress) => void): () => void
    onError(callback: (error: Error) => void): () => void
  }
}

interface Window {
  electronAPI?: ElectronAPI
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
