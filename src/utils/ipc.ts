import { ElMessage } from 'element-plus'

interface ServiceControllerResult<T = any> {
  success: boolean
  data: T
  message: string
}

/**
 * Convertit un objet en une version "safe" pour structured clone IPC.
 * - Supprime les valeurs `undefined`
 * - Débarrasse les proxies Vue
 * - Convertit les types spéciaux (Date, BigInt, etc.) en leurs équivalents JSON
 */
function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj, (_key, val) =>
    val === undefined ? null : val
  ))
}

/**
 * Appelle une méthode du backend via le pont IPC d'Electron.
 *
 * @param channel - Canal IPC (ex. `'sites:list'`).
 * @param params - Paramètres optionnels transmis à la méthode.
 * @returns Les données renvoyées par le backend (propriété `data`).
 * @throws Si `electronAPI` n'est pas disponible ou si le backend
 *         a répondu avec `success: false`.
 */
export async function ipcInvoke<T = any>(channel: string, params?: any): Promise<T> {
  if (!window.electronAPI) {
    throw new Error('electronAPI non disponible')
  }
  const safe = params && typeof params === 'object' && !Array.isArray(params)
    ? sanitize(params)
    : params
  const result = await window.electronAPI.invoke(channel, safe) as ServiceControllerResult<T>
  if (!result.success) {
    ElMessage({ type: 'error', message: result.message })
    throw new Error(result.message)
  }
  return result.data
}
