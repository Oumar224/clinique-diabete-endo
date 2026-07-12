import { container } from 'tsyringe'
import { ConservateurService } from '../services/conservateur.service'
import { ConservateurStockageEntity } from '../entities/conservateur-stockage.entity'
import { ConservateurChampLocalisationEntity } from '../entities/conservateur-champ-localisation.entity'
import type { StockagePhysiqueDto } from '../dto/conservateur.dto'
import type { ChampLocalisationDto } from '../dto/conservateur.dto'
import { createHandler } from '../utils/create-handler'

export function registerConservateurHandlers(): void {
  // ════════════════════════════════════════════════════════════════
  // STOCKAGES PHYSIQUES
  // ════════════════════════════════════════════════════════════════

  createHandler('conservateurs:list', async ({ activeOnly }: { activeOnly?: boolean } = {}) => {
    const entities = await container.resolve(ConservateurService).listStockages(activeOnly)
    return ConservateurStockageEntity.toDtos(entities)
  })

  createHandler('conservateurs:get', async ({ id }: { id: number }) => {
    const entity = await container.resolve(ConservateurService).getStockageById(id)
    return entity ? ConservateurStockageEntity.toDto(entity) : null
  })

  createHandler('conservateurs:get-with-champs', async ({ id }: { id: number }) => {
    const result = await container.resolve(ConservateurService).getStockageWithChamps(id)
    return {
      stockage: result.stockage ? ConservateurStockageEntity.toDto(result.stockage) : null,
      champs: ConservateurChampLocalisationEntity.toDtos(result.champs),
    }
  })

  createHandler('conservateurs:create', async (dto: StockagePhysiqueDto) => {
    const entity = ConservateurStockageEntity.fromDto(dto)
    const created = await container.resolve(ConservateurService).createStockage(entity)
    return ConservateurStockageEntity.toDto(created)
  })

  createHandler('conservateurs:update', async (dto: StockagePhysiqueDto) => {
    const entity = ConservateurStockageEntity.fromDto(dto)
    const updated = await container.resolve(ConservateurService).updateStockage(entity)
    return ConservateurStockageEntity.toDto(updated)
  })

  createHandler('conservateurs:delete', async ({ id }: { id: number }) => {
    await container.resolve(ConservateurService).deleteStockage(id)
    return { success: true }
  })

  createHandler('conservateurs:toggle', async ({ id, is_active }: { id: number; is_active: boolean }) => {
    const entity = await container.resolve(ConservateurService).toggleStockage(id, is_active)
    return ConservateurStockageEntity.toDto(entity)
  })

  // ════════════════════════════════════════════════════════════════
  // CHAMPS DE LOCALISATION
  // ════════════════════════════════════════════════════════════════

  createHandler('conservateurs:champs-list', async ({ stockage_id }: { stockage_id: number }) => {
    const entities = await container.resolve(ConservateurService).listChampsByStockage(stockage_id)
    return ConservateurChampLocalisationEntity.toDtos(entities)
  })

  createHandler('conservateurs:champs-create', async (dto: ChampLocalisationDto) => {
    const entity = ConservateurChampLocalisationEntity.fromDto(dto)
    const created = await container.resolve(ConservateurService).createChamp(entity)
    return ConservateurChampLocalisationEntity.toDto(created)
  })

  createHandler('conservateurs:champs-update', async (dto: ChampLocalisationDto) => {
    const entity = ConservateurChampLocalisationEntity.fromDto(dto)
    const updated = await container.resolve(ConservateurService).updateChamp(entity)
    return ConservateurChampLocalisationEntity.toDto(updated)
  })

  createHandler('conservateurs:champs-delete', async ({ id }: { id: number }) => {
    await container.resolve(ConservateurService).deleteChamp(id)
    return { success: true }
  })
}
