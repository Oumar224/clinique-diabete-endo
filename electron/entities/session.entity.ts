import type { SessionDto } from '../dto/auth.dto'

export class SessionEntity {
  id?: string
  user_id?: number
  created_at?: string
  expires_at?: string
  last_activity?: string
  remember_me?: number

  static toDto(entity: SessionEntity): SessionDto {
    return {
      id: entity.id,
      user_id: entity.user_id!,
      created_at: entity.created_at,
      expires_at: entity.expires_at!,
      last_activity: entity.last_activity,
      remember_me: entity.remember_me === 1,
    }
  }

  static toDtos(entities: SessionEntity[]): SessionDto[] {
    return entities.map(SessionEntity.toDto)
  }

  static fromDto(dto: SessionDto): SessionEntity {
    const e = new SessionEntity()
    e.id = dto.id
    e.user_id = dto.user_id
    e.created_at = dto.created_at
    e.expires_at = dto.expires_at
    e.last_activity = dto.last_activity
    if (dto.remember_me !== undefined) e.remember_me = dto.remember_me ? 1 : 0
    return e
  }

  static documentType(): string { return 'Session' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
