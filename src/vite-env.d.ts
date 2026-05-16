/// <reference types="vite/client" />

interface ElectronAPI {
  getVersion: () => Promise<string>
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
}

interface Window {
  electronAPI?: ElectronAPI
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
