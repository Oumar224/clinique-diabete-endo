import type { ChampLocalisationDto } from '../dto/conservateur.dto'

export class ConservateurChampLocalisationEntity {
  id?: number
  stockage_id?: number
  cle?: string
  label?: string
  type?: string
  sort_order?: number
  created_at?: string

  static toDto(entity: ConservateurChampLocalisationEntity): ChampLocalisationDto {
    return {
      id: entity.id,
      stockage_id: entity.stockage_id!,
      cle: entity.cle!,
      label: entity.label!,
      type: entity.type!,
      sort_order: entity.sort_order!,
      created_at: entity.created_at,
    }
  }

  static toDtos(entities: ConservateurChampLocalisationEntity[]): ChampLocalisationDto[] {
    return entities.map(ConservateurChampLocalisationEntity.toDto)
  }

  static fromDto(dto: ChampLocalisationDto): ConservateurChampLocalisationEntity {
    const e = new ConservateurChampLocalisationEntity()
    e.id = dto.id
    e.stockage_id = dto.stockage_id
    e.cle = dto.cle
    e.label = dto.label
    e.type = dto.type
    e.sort_order = dto.sort_order
    e.created_at = dto.created_at
    return e
  }

  static documentType(): string { return 'ConservateurChampLocalisation' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
