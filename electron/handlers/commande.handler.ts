import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { CommandeService } from '../services/commande.service'
import { PHARMACY_ORDER_ROLES, withTrustedActor } from '../utils/authorization'
import type {
  CommandeCreateDto,
  CommandeListFiltres,
  CommandePrefillDto,
  CommandeReceptionAttachmentInputDto,
  CommandeReceptionInputDto,
  CommandeUpdateDto,
  FournisseursSeriesFiltres,
} from '../dto/commande.dto'

export function registerCommandeHandlers(): void {
  createHandler('commande:list', async (filters: CommandeListFiltres = {}) => {
    return container.resolve(CommandeService).list(filters)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:get', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return container.resolve(CommandeService).getById(params.id)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:series-fournisseurs', async (filtres: FournisseursSeriesFiltres) => {
    return container.resolve(CommandeService).seriesFournisseurs(filtres)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:prefill', async (dto: CommandePrefillDto) => {
    if (!dto?.medicamentIds?.length) throw new Error('medicamentIds requis')
    return container.resolve(CommandeService).prefill(dto)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:create', async (dto: CommandeCreateDto, actor) => {
    const service = container.resolve(CommandeService)
    return service.create(withTrustedActor(dto, actor))
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:update', async (dto: CommandeUpdateDto & { id: number }) => {
    if (!dto?.id) throw new Error('id requis')
    const { id, ...payload } = dto
    return container.resolve(CommandeService).update(id, payload)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:envoyer', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return container.resolve(CommandeService).envoyer(params.id)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:receptionner', async (params: { id: number } & CommandeReceptionInputDto, actor) => {
    if (!params?.id) throw new Error('id requis')
    const { id, ...dto } = params
    return container.resolve(CommandeService).receptionner(id, withTrustedActor(dto, actor))
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:cloturer', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return container.resolve(CommandeService).cloturer(params.id)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:annuler', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    return container.resolve(CommandeService).annuler(params.id)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:delete', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    await container.resolve(CommandeService).delete(params.id)
    return { success: true }
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:reception-attachments:list', async (params: { receptionId: number }) => {
    if (!params?.receptionId) throw new Error('receptionId requis')
    return container.resolve(CommandeService).listReceptionAttachments(params.receptionId)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:reception-attachments:get', async (params: { receptionId: number; id: number }) => {
    if (!params?.receptionId) throw new Error('receptionId requis')
    if (!params?.id) throw new Error('id requis')
    return container.resolve(CommandeService).getReceptionAttachment(params.receptionId, params.id)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:reception-attachments:download', async (params: { receptionId: number; id: number }) => {
    if (!params?.receptionId) throw new Error('receptionId requis')
    if (!params?.id) throw new Error('id requis')
    return container.resolve(CommandeService).downloadReceptionAttachment(params.receptionId, params.id)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:reception-attachments:create', async (
    params: CommandeReceptionAttachmentInputDto & { receptionId: number },
    actor,
  ) => {
    if (!params?.receptionId) throw new Error('receptionId requis')
    const { receptionId, ...dto } = params
    return container.resolve(CommandeService).createReceptionAttachment(receptionId, dto, actor?.userId)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('commande:reception-attachments:delete', async (params: { receptionId: number; id: number }) => {
    if (!params?.receptionId) throw new Error('receptionId requis')
    if (!params?.id) throw new Error('id requis')
    await container.resolve(CommandeService).deleteReceptionAttachment(params.receptionId, params.id)
    return { success: true }
  }, { roles: PHARMACY_ORDER_ROLES })
}
