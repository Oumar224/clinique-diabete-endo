export class InsuranceEntity {
  id?: number
  name?: string
  code?: string
  is_active?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: InsuranceEntity): InsuranceDto {
    return {
      id: entity.id!,
      name: entity.name!,
      code: entity.code!,
      is_active: entity.is_active === 1,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }

  static toDtos(entities: InsuranceEntity[]): InsuranceDto[] {
    return entities.map(InsuranceEntity.toDto)
  }

  static fromDto(dto: InsuranceDto): InsuranceEntity {
    const e = new InsuranceEntity()
    e.id = dto.id
    e.name = dto.name
    e.code = dto.code
    e.is_active = dto.is_active ? 1 : 0
    e.created_at = dto.created_at
    e.updated_at = dto.updated_at
    return e
  }

  static documentType(): string { return 'Insurance' }
  static documentSchema(): any { return {} }
  static register(): void {}
}

export interface InsuranceDto {
  id: number
  name: string
  code: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface InsuranceCreateDto {
  name: string
  code: string
}

export interface InsuranceUpdateDto {
  id: number
  name?: string
  code?: string
  is_active?: boolean
}
