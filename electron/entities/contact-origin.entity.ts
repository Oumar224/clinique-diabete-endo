export class ContactOriginEntity {
  id?: number
  value?: string
  label?: string
  sort_order?: number
  is_active?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: ContactOriginEntity): ContactOriginDto {
    return {
      id: entity.id!,
      value: entity.value!,
      label: entity.label!,
      sort_order: entity.sort_order!,
      is_active: entity.is_active === 1,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }

  static toDtos(entities: ContactOriginEntity[]): ContactOriginDto[] {
    return entities.map(ContactOriginEntity.toDto)
  }

  static fromDto(dto: ContactOriginDto): ContactOriginEntity {
    const e = new ContactOriginEntity()
    e.id = dto.id
    e.value = dto.value
    e.label = dto.label
    e.sort_order = dto.sort_order
    e.is_active = dto.is_active ? 1 : 0
    e.created_at = dto.created_at
    e.updated_at = dto.updated_at
    return e
  }

  static documentType(): string { return 'ContactOrigin' }
  static documentSchema(): any { return {} }
  static register(): void {}
}

export interface ContactOriginDto {
  id: number
  value: string
  label: string
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ContactOriginCreateDto {
  value: string
  label: string
  sort_order?: number
}

export interface ContactOriginUpdateDto {
  id: number
  value?: string
  label?: string
  sort_order?: number
  is_active?: boolean
}
