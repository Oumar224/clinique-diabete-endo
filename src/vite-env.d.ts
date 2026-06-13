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
