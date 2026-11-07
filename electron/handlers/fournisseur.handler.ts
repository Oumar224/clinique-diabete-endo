import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { FournisseurService } from '../services/fournisseur.service'
import { FournisseurEntity } from '../entities/fournisseur.entity'
import type { FournisseurDto } from '../dto/fournisseur.dto'

export function registerFournisseurHandlers() {
  createHandler('fournisseur:list', async (params: { actif?: boolean; search?: string; estPharmacieCentrale?: boolean }) => {
    const service = container.resolve(FournisseurService)
    const entities = await service.list(params ?? {})
    return FournisseurEntity.toDtos(entities)
  })

  createHandler('fournisseur:get', async (params: { id: number }) => {
    const { id } = params
    if (!id) throw new Error('id requis')
    const service = container.resolve(FournisseurService)
    const entity = await service.getById(id)
    return entity ? FournisseurEntity.toDto(entity) : null
  })

  createHandler('fournisseur:create', async (dto: FournisseurDto) => {
    if (!dto?.nom?.trim()) throw new Error('Le nom du fournisseur est requis')
    const service = container.resolve(FournisseurService)
    const created = await service.create({
      nom: dto.nom,
      contact: dto.contact,
      telephone: dto.telephone,
      email: dto.email,
      adresse: dto.adresse,
      actif: dto.actif,
      estPharmacieCentrale: dto.estPharmacieCentrale,
    })
    return FournisseurEntity.toDto(created)
  })

  createHandler('fournisseur:update', async (dto: FournisseurDto) => {
    const { id } = dto
    if (!id) throw new Error('id requis')
    const service = container.resolve(FournisseurService)
    const payload: Record<string, unknown> = {}
    if (dto.nom !== undefined) payload.nom = dto.nom
    if (dto.contact !== undefined) payload.contact = dto.contact
    if (dto.telephone !== undefined) payload.telephone = dto.telephone
    if (dto.email !== undefined) payload.email = dto.email
    if (dto.adresse !== undefined) payload.adresse = dto.adresse
    if (dto.actif !== undefined) payload.actif = dto.actif
    if (dto.estPharmacieCentrale !== undefined) payload.estPharmacieCentrale = dto.estPharmacieCentrale
    const updated = await service.update(id, payload)
    return FournisseurEntity.toDto(updated)
  })
}
