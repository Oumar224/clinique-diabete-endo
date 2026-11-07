import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { MedicamentService } from '../services/medicament.service'
import { MedicamentEntity } from '../entities/medicament.entity'
import type { MedicamentDto } from '../dto/medicament.dto'

export function registerMedicamentHandlers() {
  createHandler('medicament:list', async (params: { actif?: boolean; search?: string; typeProduit?: MedicamentDto['typeProduit'] }) => {
    const service = container.resolve(MedicamentService)
    const entities = await service.list(params ?? {})
    return MedicamentEntity.toDtos(entities)
  })

  createHandler('medicament:get', async (params: { id: number }) => {
    const { id } = params
    if (!id) throw new Error('id requis')
    const service = container.resolve(MedicamentService)
    const entity = await service.getById(id)
    return entity ? MedicamentEntity.toDto(entity) : null
  })

  createHandler('medicament:create', async (dto: MedicamentDto) => {
    if (!dto?.dci?.trim()) throw new Error('La DCI du médicament est requise')
    const service = container.resolve(MedicamentService)
    const created = await service.create({
      dci: dto.dci,
      nomCommercial: dto.nomCommercial,
      dosage: dto.dosage,
      forme: dto.forme,
      uniteStock: dto.uniteStock,
      seuilAlerte: dto.seuilAlerte,
      actif: dto.actif,
      typeProduit: dto.typeProduit,
      conditionnement: dto.conditionnement,
      contenanceQte: dto.contenanceQte,
      uniteContenance: dto.uniteContenance,
      autreUnitePrecision: dto.autreUnitePrecision,
      prixAchat: dto.prixAchat,
      prixVente: dto.prixVente,
      fournisseurPrincipalId: dto.fournisseurPrincipalId,
    })
    return MedicamentEntity.toDto(created)
  })

  createHandler('medicament:update', async (dto: MedicamentDto) => {
    const { id } = dto
    if (!id) throw new Error('id requis')
    const service = container.resolve(MedicamentService)
    const payload: Record<string, unknown> = {}
    if (dto.dci !== undefined) payload.dci = dto.dci
    if (dto.nomCommercial !== undefined) payload.nomCommercial = dto.nomCommercial
    if (dto.dosage !== undefined) payload.dosage = dto.dosage
    if (dto.forme !== undefined) payload.forme = dto.forme
    if (dto.uniteStock !== undefined) payload.uniteStock = dto.uniteStock
    if (dto.seuilAlerte !== undefined) payload.seuilAlerte = dto.seuilAlerte
    if (dto.actif !== undefined) payload.actif = dto.actif
    if (dto.typeProduit !== undefined) payload.typeProduit = dto.typeProduit
    if (dto.conditionnement !== undefined) payload.conditionnement = dto.conditionnement
    if (dto.contenanceQte !== undefined) payload.contenanceQte = dto.contenanceQte
    if (dto.uniteContenance !== undefined) payload.uniteContenance = dto.uniteContenance
    if (dto.autreUnitePrecision !== undefined) payload.autreUnitePrecision = dto.autreUnitePrecision
    if (dto.prixAchat !== undefined) payload.prixAchat = dto.prixAchat
    if (dto.prixVente !== undefined) payload.prixVente = dto.prixVente
    if (dto.fournisseurPrincipalId !== undefined) payload.fournisseurPrincipalId = dto.fournisseurPrincipalId
    const updated = await service.update(id, payload)
    return MedicamentEntity.toDto(updated)
  })

  createHandler('medicament:deactivate', async (params: { id: number }) => {
    const { id } = params
    if (!id) throw new Error('id requis')
    const service = container.resolve(MedicamentService)
    const deactivated = await service.deactivate(id)
    return MedicamentEntity.toDto(deactivated)
  })
}
