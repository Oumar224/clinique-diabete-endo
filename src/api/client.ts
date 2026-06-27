import { ipcInvoke } from '@/utils/ipc'

/**
 * Generic typed IPC API client.
 *
 * All methods call `window.electronAPI.invoke(channel, params)` under the hood
 * via the existing `ipcInvoke` helper, which:
 *  - sanitizes params for `structuredClone`
 *  - unwraps the `{ success, data, message }` envelope
 *  - throws on `success === false`
 */
export const apiClient = {
  get<T = unknown>(channel: string, params?: Record<string, unknown>): Promise<T> {
    return ipcInvoke<T>(channel, params)
  },

  post<T = unknown>(channel: string, data?: Record<string, unknown>): Promise<T> {
    return ipcInvoke<T>(channel, data)
  },

  put<T = unknown>(channel: string, data?: Record<string, unknown>): Promise<T> {
    return ipcInvoke<T>(channel, data)
  },

  delete<T = void>(channel: string, params?: Record<string, unknown>): Promise<T> {
    return ipcInvoke<T>(channel, params)
  },
}
