import type { EmailConfigDto, EmailConfigSaveDto } from '../dto/email-config.dto'

export class EmailConfigEntity {
  id?: number
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_pass_encrypted?: string
  sender_email?: string
  sender_name?: string
  is_configured?: number
  created_at?: string
  updated_at?: string

  static toDto(entity: EmailConfigEntity): EmailConfigDto {
    return {
      smtp_host: entity.smtp_host!,
      smtp_port: entity.smtp_port!,
      smtp_user: entity.smtp_user!,
      sender_email: entity.sender_email!,
      sender_name: entity.sender_name!,
      is_configured: entity.is_configured === 1,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    }
  }

  static toDtos(entities: EmailConfigEntity[]): EmailConfigDto[] {
    return entities.map(EmailConfigEntity.toDto)
  }

  static fromDto(dto: EmailConfigDto | EmailConfigSaveDto): EmailConfigEntity {
    const e = new EmailConfigEntity()
    e.id = 'id' in dto && dto.id != null ? (dto as any).id : undefined
    e.smtp_host = dto.smtp_host
    e.smtp_port = dto.smtp_port
    e.smtp_user = dto.smtp_user
    e.sender_email = dto.sender_email
    e.sender_name = dto.sender_name
    if ('smtp_pass' in dto) e.smtp_pass_encrypted = dto.smtp_pass
    if ('is_configured' in dto) e.is_configured = dto.is_configured ? 1 : 0
    return e
  }

  static documentType(): string { return 'EmailConfig' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
