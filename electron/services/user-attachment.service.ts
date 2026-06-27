import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { NoResultError } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { type UserAttachmentDto, type CreateAttachmentDto } from '../dto/user-attachment.dto'

@singleton()
export class UserAttachmentService {
  private db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByUser(userId: number): Promise<UserAttachmentDto[]> {
    let query = this.db
      .selectFrom('user_attachments')
      .leftJoin('attachment_types', 'attachment_types.id', 'user_attachments.attachment_type_id')
      .select([
        'user_attachments.id',
        'user_attachments.user_id',
        'user_attachments.display_name',
        'user_attachments.file_name',
        'user_attachments.mime_type',
        'user_attachments.file_size',
        'user_attachments.attachment_type_id',
        'user_attachments.created_at',
        'attachment_types.name as attachment_type_name',
      ])
      .where('user_attachments.user_id', '=', userId)
    const rows = await query.orderBy('user_attachments.created_at', 'desc').execute()
    return rows.map(r => this.toDto(r))
  }

  async create(dto: CreateAttachmentDto): Promise<UserAttachmentDto> {
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

    // Validation de la taille fournie dans le DTO
    if (dto.fileSize != null && dto.fileSize > MAX_FILE_SIZE) {
      throw new Error('La taille du fichier ne doit pas dépasser 10 Mo')
    }

    // Validation de la taille réelle depuis le base64 (seconde couche de sécurité)
    const base64Data = dto.fileData.includes('base64,')
      ? dto.fileData.substring(dto.fileData.indexOf('base64,') + 7)
      : dto.fileData
    const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0
    const decodedSize = (base64Data.length * 3) / 4 - padding
    if (decodedSize > MAX_FILE_SIZE) {
      throw new Error('La taille du fichier décodé ne doit pas dépasser 10 Mo')
    }

    // Derive display_name from attachment type if attachmentTypeId is provided
    let displayName = dto.displayName
    if (dto.attachmentTypeId != null) {
      const typeRow = await this.db
        .selectFrom('attachment_types')
        .select('name')
        .where('id', '=', dto.attachmentTypeId)
        .executeTakeFirst()
      if (typeRow) {
        displayName = typeRow.name
      }
    }

    const result = await this.db
      .insertInto('user_attachments')
      .values({
        user_id: dto.userId,
        display_name: displayName,
        file_name: dto.fileName,
        mime_type: dto.mimeType ?? null,
        file_size: dto.fileSize ?? null,
        file_data: dto.fileData,
        attachment_type_id: dto.attachmentTypeId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return this.toDto(result)
  }

  async delete(id: number): Promise<void> {
    const result = await this.db
      .deleteFrom('user_attachments')
      .where('id', '=', id)
      .executeTakeFirst()
    if (!result || result.numDeletedRows === 0n) {
      throw new Error('Pièce jointe introuvable')
    }
  }

  async getById(id: number): Promise<UserAttachmentDto> {
    try {
      const row = await this.db
        .selectFrom('user_attachments')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirstOrThrow()
      return {
        ...this.toDto(row),
        fileData: row.file_data,
      }
    } catch (error) {
      if (error instanceof NoResultError) {
        throw new Error('Pièce jointe introuvable')
      }
      throw error
    }
  }

  private toDto(row: Record<string, unknown>): UserAttachmentDto {
    if (row.created_at == null) {
      throw new Error('Erreur interne : date de création manquante')
    }
    const displayName = (row.display_name as string) || (row.attachment_type_name as string) || ''
    const dto: UserAttachmentDto = {
      id: row.id as number,
      userId: row.user_id as number,
      displayName,
      fileName: row.file_name as string,
      mimeType: row.mime_type as string | null,
      fileSize: row.file_size as number | null,
      createdAt: row.created_at as string,
    }
    if (row.attachment_type_id != null) {
      dto.attachmentTypeId = row.attachment_type_id as number
    }
    if (row.attachment_type_name != null) {
      dto.attachmentTypeName = row.attachment_type_name as string
    }
    return dto
  }
}
