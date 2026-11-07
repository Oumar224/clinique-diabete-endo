import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { ApportService } from '../services/apport.service'
import { APPORT_ROLES, withTrustedActor } from '../utils/authorization'
import type { ApportCreateDto, ApportListFiltres, ApportRemboursementCreateDto, ApportUpdateDto } from '../dto/apport.dto'

export function registerApportHandlers(): void {
  createHandler('apport:list', async (filters: ApportListFiltres = {}) => {
    return container.resolve(ApportService).list(filters)
  }, { roles: APPORT_ROLES })

  createHandler('apport:get', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return container.resolve(ApportService).getById(params.id)
  }, { roles: APPORT_ROLES })

  createHandler('apport:create', async (dto: ApportCreateDto, actor) => {
    return container.resolve(ApportService).create(withTrustedActor(dto, actor))
  }, { roles: APPORT_ROLES })

  createHandler('apport:update', async (dto: ApportUpdateDto & { id: number }) => {
    if (!dto?.id) throw new Error('id requis')
    const { id, ...payload } = dto
    return container.resolve(ApportService).update(id, payload)
  }, { roles: APPORT_ROLES })

  createHandler('apport:delete', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    await container.resolve(ApportService).delete(params.id)
    return { success: true }
  }, { roles: APPORT_ROLES })

  createHandler('apport:annuler', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return container.resolve(ApportService).annuler(params.id)
  }, { roles: APPORT_ROLES })

  createHandler('apport:rembourser', async (params: ApportRemboursementCreateDto & { id: number }, actor) => {
    if (!params?.id) throw new Error('id requis')
    const { id, ...dto } = params
    return container.resolve(ApportService).addRemboursement(id, withTrustedActor(dto, actor))
  }, { roles: APPORT_ROLES })

  createHandler('apport:delete-remboursement', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return container.resolve(ApportService).deleteRemboursement(params.id)
  }, { roles: APPORT_ROLES })
}
