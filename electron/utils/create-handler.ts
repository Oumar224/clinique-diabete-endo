import { ipcMain } from 'electron'
import { ServiceControllerUtils } from './service-controller-utils'

type IpcHandler<T = unknown> = (params: T) => Promise<unknown>

export function createHandler<T = unknown>(ipcChannel: string, fn: IpcHandler<T>): void {
  ipcMain.handle(ipcChannel, async (_event, params: T) =>
    ServiceControllerUtils.controllerAdvice(() => fn(params ?? ({} as T)))
  )
}
