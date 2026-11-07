import { ipcMain } from 'electron'
import { ServiceControllerUtils } from './service-controller-utils'
import { authorize } from '../services/auth/authorization.service'
import type { AppRole, AuthenticatedActor } from './authorization'

/**
 * Handler IPC.
 *
 * @param params paramètres de l'appel (source : renderer)
 * @param actor  acteur authentifié, fourni par le processus principal.
 *               `undefined` pour les canaux sans contrôle de rôle.
 */
export type IpcHandler<T = unknown> = (params: T, actor?: AuthenticatedActor) => Promise<unknown>

export interface HandlerOptions {
  /**
   * Liste blanche de rôles autorisés à appeler le canal.
   * Absent ou vide ⇒ aucun contrôle de rôle (compatibilité ascendante).
   */
  roles?: readonly AppRole[]
}

/**
 * Enregistre un handler IPC.
 *
 * Point de contrôle unique (choke point) de l'autorisation : lorsqu'une liste
 * de rôles est fournie, l'appel est refusé si l'utilisateur authentifié du
 * processus principal n'a pas le rôle requis. L'identité provient toujours de
 * la session validée en base, jamais de la charge utile du renderer.
 */
export function createHandler<T = unknown>(
  ipcChannel: string,
  fn: IpcHandler<T>,
  options: HandlerOptions = {},
): void {
  ipcMain.handle(ipcChannel, async (_event, params: T) =>
    ServiceControllerUtils.controllerAdvice(async () => {
      const actor = options.roles?.length
        ? await authorize(ipcChannel, options.roles)
        : undefined
      return fn(params ?? ({} as T), actor)
    })
  )
}
