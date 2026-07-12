import type { MedicalUnitDto } from '../dto/medical-unit.dto'

/**
 * Pharmaceutical/dosage measurement unit (mg, g, ml, UI, mmol/L).
 * Despite the name, this is NOT an organizational care unit.
 * @deprecated Will be renamed to `MeasurementUnit` in a future migration.
 */
export class MedicalUnitEntity {
  id?: number
  code?: string
  name?: string
  is_active?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: MedicalUnitEntity): MedicalUnitDto {
    return { id: entity.id, code: entity.code as string, name: entity.name as string, is_active: entity.is_active as unknown as boolean, created_at: entity.created_at, updated_at: entity.updated_at }
  }
  static toDtos(entities: MedicalUnitEntity[]): MedicalUnitDto[] { return entities.map(MedicalUnitEntity.toDto) }
  static fromDto(dto: MedicalUnitDto): MedicalUnitEntity {
    const e = new MedicalUnitEntity()
    e.id = dto.id; e.code = dto.code; e.name = dto.name; e.is_active = dto.is_active as unknown as number; e.created_at = dto.created_at; e.updated_at = dto.updated_at
    return e
  }
  static documentType(): string { return 'MedicalUnit' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
