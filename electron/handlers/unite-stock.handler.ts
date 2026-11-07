import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { UniteStockService } from '../services/unite-stock.service'
import { UniteStockEntity } from '../entities/unite-stock.entity'
import type { UniteStockCreateDto } from '../dto/unite-stock.dto'

export function registerUniteStockHandlers(): void {
  createHandler('unites-stock:list', async () => {
    const entities = await container.resolve(UniteStockService).list()
    return UniteStockEntity.toDtos(entities)
  })

  createHandler('unites-stock:create', async (dto: UniteStockCreateDto) => {
    const created = await container.resolve(UniteStockService).create(dto?.nom ?? '')
    return UniteStockEntity.toDto(created)
  })
}
