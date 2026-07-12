import type { MedicalActDto } from '../dto/settings.dto'

export class MedicalActEntity {
  id?: number
  code?: string
  label?: string
  service_id?: number
  is_active?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: MedicalActEntity): MedicalActDto {
    return { id: entity.id, code: entity.code as string, label: entity.label as string, service_id: entity.service_id as number, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: MedicalActEntity[]): MedicalActDto[] { return entities.map(MedicalActEntity.toDto) }
  static fromDto(dto: MedicalActDto): MedicalActEntity {
    const e = new MedicalActEntity()
    e.id = dto.id; e.code = dto.code; e.label = dto.label; e.service_id = dto.service_id; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'MedicalAct' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
