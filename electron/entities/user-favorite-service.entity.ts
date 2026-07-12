import type { ServiceFavoriteDto } from '../dto/settings.dto'

export class UserFavoriteServiceEntity {
  user_id?: number
  service_id?: number
  created_at?: string

  static toDto(entity: UserFavoriteServiceEntity): ServiceFavoriteDto {
    return {
      user_id: entity.user_id!,
      service_id: entity.service_id!,
      created_at: entity.created_at,
    }
  }

  static toDtos(entities: UserFavoriteServiceEntity[]): ServiceFavoriteDto[] {
    return entities.map(UserFavoriteServiceEntity.toDto)
  }

  static fromDto(dto: ServiceFavoriteDto): UserFavoriteServiceEntity {
    const e = new UserFavoriteServiceEntity()
    e.user_id = dto.user_id
    e.service_id = dto.service_id
    e.created_at = dto.created_at
    return e
  }

  static documentType(): string { return 'UserFavoriteService' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
