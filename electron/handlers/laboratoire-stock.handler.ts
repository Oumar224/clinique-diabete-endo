import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { LaboratoireStockService } from '../services/laboratoire-stock.service'
import {
  LaboArticleEntity,
  LaboStockLotEntity,
  LaboMouvementStockEntity,
  LaboCommandeEntity,
} from '../entities/laboratoire.entity'
import type { LaboArticleDto, LaboCommandeDto, LaboCommandeStatut } from '../dto/laboratoire.dto'
import { LABO_REQUEST_ROLES, LABO_VALIDATE_ROLES } from '../utils/authorization'

export function registerLaboratoireStockHandlers(): void {
  // ── Articles ─────────────────────────────────────────────────
  createHandler('labo-stock:stats', async () =>
    container.resolve(LaboratoireStockService).stats(), { roles: LABO_REQUEST_ROLES })

  createHandler('labo-stock:articles-list', async (filters: { search?: string; categorie?: string; actif?: boolean }) => {
    const rows = await container.resolve(LaboratoireStockService).listArticles(filters ?? {})
    return LaboArticleEntity.toDtos(rows)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo-stock:article-create', async (dto: LaboArticleDto) => {
    const created = await container.resolve(LaboratoireStockService).createArticle(dto ?? {})
    return LaboArticleEntity.toDto(created)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo-stock:article-update', async (dto: LaboArticleDto & { id: number }) => {
    if (!dto?.id) throw new Error('id requis')
    const updated = await container.resolve(LaboratoireStockService).updateArticle(dto.id, dto)
    return LaboArticleEntity.toDto(updated)
  }, { roles: LABO_REQUEST_ROLES })

  // ── Lots / mouvements ────────────────────────────────────────
  createHandler('labo-stock:lots', async (filters: { articleId?: number; includeEmpty?: boolean }) => {
    const rows = await container.resolve(LaboratoireStockService).listLots(filters ?? {})
    return LaboStockLotEntity.toDtos(rows)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo-stock:mouvements', async (filters: { articleId?: number; limit?: number }) => {
    const rows = await container.resolve(LaboratoireStockService).listMouvements(filters ?? {})
    return LaboMouvementStockEntity.toDtos(rows)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo-stock:alertes', async () => {
    const rows = await container.resolve(LaboratoireStockService).listAlertes()
    return LaboArticleEntity.toDtos(rows)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo-stock:entree', async (payload: Parameters<LaboratoireStockService['entreeStock']>[0]) => {
    const lot = await container.resolve(LaboratoireStockService).entreeStock(payload)
    return LaboStockLotEntity.toDto(lot)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo-stock:sortie', async (payload: Parameters<LaboratoireStockService['sortieStock']>[0]) => {
    await container.resolve(LaboratoireStockService).sortieStock(payload)
    return { success: true }
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo-stock:ajustement', async (payload: Parameters<LaboratoireStockService['ajustementStock']>[0]) => {
    await container.resolve(LaboratoireStockService).ajustementStock(payload)
    return { success: true }
  }, { roles: LABO_VALIDATE_ROLES })

  // ── Commandes ────────────────────────────────────────────────
  createHandler('labo-commande:list', async (filters: { statut?: string; search?: string }) => {
    const rows = await container.resolve(LaboratoireStockService).listCommandes(filters ?? {})
    return LaboCommandeEntity.toDtos(rows)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo-commande:get', async ({ id }: { id: number }) => {
    if (!id) throw new Error('id requis')
    return container.resolve(LaboratoireStockService).getCommande(id)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo-commande:create', async (dto: LaboCommandeDto) => {
    return container.resolve(LaboratoireStockService).createCommande(dto ?? {}, dto?.createdBy ?? undefined)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo-commande:statut', async (params: { id: number; statut: LaboCommandeStatut }) => {
    if (!params?.id) throw new Error('id requis')
    return container.resolve(LaboratoireStockService).updateStatutCommande(params.id, params.statut)
  }, { roles: LABO_VALIDATE_ROLES })

  createHandler('labo-commande:receptions', async ({ commandeId }: { commandeId: number }) => {
    if (!commandeId) throw new Error('commandeId requis')
    return container.resolve(LaboratoireStockService).listReceptions(commandeId)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo-commande:reception-create', async (dto: Parameters<LaboratoireStockService['enregistrerReception']>[0]) => {
    return container.resolve(LaboratoireStockService).enregistrerReception(dto, dto?.createdBy ?? undefined)
  }, { roles: LABO_VALIDATE_ROLES })
}
