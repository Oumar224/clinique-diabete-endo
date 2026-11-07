import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { StockService } from '../services/stock.service'
import { StockLotEntity } from '../entities/stock-lot.entity'
import { PHARMACY_ORDER_ROLES, PHARMACY_SERVICE_ROLES } from '../utils/authorization'

export function registerStockHandlers() {
  createHandler('stock:niveaux', async () => {
    const service = container.resolve(StockService)
    return service.niveaux()
  }, { roles: PHARMACY_SERVICE_ROLES })

  createHandler('stock:lots', async (params: { medicamentId: number }) => {
    const { medicamentId } = params
    if (!medicamentId) throw new Error('medicamentId requis')
    const service = container.resolve(StockService)
    const lots = await service.lots(medicamentId)
    return StockLotEntity.toDtos(lots)
  }, { roles: PHARMACY_SERVICE_ROLES })

  createHandler('stock:mouvements', async (params: {
    medicamentId?: number
    type?: 'entree' | 'sortie_manuelle' | 'delivrance' | 'administration' | 'ajustement'
    limit?: number
    offset?: number
  }) => {
    const { medicamentId, type, limit, offset } = params ?? {}
    if (type != null && !['entree', 'sortie_manuelle', 'delivrance', 'administration', 'ajustement'].includes(type)) {
      throw new Error('type invalide')
    }
    const service = container.resolve(StockService)
    return service.mouvements({ medicamentId, type, limit, offset })
  }, { roles: PHARMACY_SERVICE_ROLES })

  createHandler('stock:entree', async (params: {
    medicamentId: number
    quantite: number
    numeroLot?: string
    datePeremption?: string
    dateEntree?: string
    userId?: number | string
    fournisseurId?: number | null
    prixAchat?: number | null
    refBl?: string
    refFacture?: string
  }, actor) => {
    const { medicamentId, quantite } = params
    if (!medicamentId) throw new Error('medicamentId requis')
    if (quantite == null) throw new Error('quantite requise')
    const service = container.resolve(StockService)
    // L'identité d'audit provient toujours de la session, jamais du payload.
    const lot = await service.entree({ ...params, userId: actor?.userId })
    return StockLotEntity.toDto(lot)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('stock:sortie-manuelle', async (params: {
    medicamentId: number
    quantite: number
    motif: string
    userId?: number | string
  }, actor) => {
    const { medicamentId, quantite, motif } = params
    if (!medicamentId) throw new Error('medicamentId requis')
    if (quantite == null) throw new Error('quantite requise')
    if (!motif?.trim()) throw new Error('motif requis')
    const service = container.resolve(StockService)
    return service.sortieManuelle({ ...params, userId: actor?.userId })
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('stock:ajustement', async (params: {
    medicamentId: number
    lotId?: number
    quantiteNouvelle: number
    motif: string
    userId?: number | string
  }, actor) => {
    const { medicamentId, quantiteNouvelle, motif } = params
    if (!medicamentId) throw new Error('medicamentId requis')
    if (quantiteNouvelle == null) throw new Error('quantiteNouvelle requise')
    if (!motif?.trim()) throw new Error('motif requis')
    const service = container.resolve(StockService)
    const lot = await service.ajustement({ ...params, userId: actor?.userId })
    return StockLotEntity.toDto(lot)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('stock:alertes', async (params: { peremptionMois?: number }) => {
    const service = container.resolve(StockService)
    return service.alertes(params ?? {})
  }, { roles: PHARMACY_SERVICE_ROLES })

  createHandler('stock:lot-attachments:list', async (params: { stockLotId: number }) => {
    if (!params?.stockLotId) throw new Error('stockLotId requis')
    return container.resolve(StockService).listLotAttachments(params.stockLotId)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('stock:lot-attachments:get', async (params: { stockLotId: number; id: number }) => {
    if (!params?.stockLotId) throw new Error('stockLotId requis')
    if (!params?.id) throw new Error('id requis')
    return container.resolve(StockService).getLotAttachment(params.stockLotId, params.id)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('stock:lot-attachments:download', async (params: { stockLotId: number; id: number }) => {
    if (!params?.stockLotId) throw new Error('stockLotId requis')
    if (!params?.id) throw new Error('id requis')
    return container.resolve(StockService).downloadLotAttachment(params.stockLotId, params.id)
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('stock:lot-attachments:create', async (params: {
    stockLotId: number
    fileName: string
    fileType: string
    fileSize?: number
    fileData: string
  }, actor) => {
    if (!params?.stockLotId) throw new Error('stockLotId requis')
    return container.resolve(StockService).createLotAttachment({ ...params, uploadedBy: actor?.userId })
  }, { roles: PHARMACY_ORDER_ROLES })

  createHandler('stock:lot-attachments:delete', async (params: { stockLotId: number; id: number }) => {
    if (!params?.stockLotId) throw new Error('stockLotId requis')
    if (!params?.id) throw new Error('id requis')
    await container.resolve(StockService).deleteLotAttachment(params.stockLotId, params.id)
    return { success: true }
  }, { roles: PHARMACY_ORDER_ROLES })
}
