export class ContactCategoryEntity {
  id?: number
  value?: string
  label?: string
  sort_order?: number
  is_active?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: ContactCategoryEntity): ContactCategoryDto {
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

  static toDtos(entities: ContactCategoryEntity[]): ContactCategoryDto[] {
    return entities.map(ContactCategoryEntity.toDto)
  }

  static fromDto(dto: ContactCategoryDto): ContactCategoryEntity {
    const e = new ContactCategoryEntity()
    e.id = dto.id
    e.value = dto.value
    e.label = dto.label
    e.sort_order = dto.sort_order
    e.is_active = dto.is_active ? 1 : 0
    e.created_at = dto.created_at
    e.updated_at = dto.updated_at
    return e
  }

  static documentType(): string { return 'ContactCategory' }
  static documentSchema(): any { return {} }
  static register(): void {}
}

export interface ContactCategoryDto {
  id: number
  value: string
  label: string
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ContactCategoryCreateDto {
  value: string
  label: string
  sort_order?: number
}

export interface ContactCategoryUpdateDto {
  id: number
  value?: string
  label?: string
  sort_order?: number
  is_active?: boolean
}
