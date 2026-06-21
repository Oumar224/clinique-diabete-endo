import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
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
    const rows = await this.db
      .selectFrom('user_attachments')
      .select(['id', 'user_id', 'display_name', 'file_name', 'mime_type', 'file_size', 'created_at'])
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute()
    return rows.map(r => this.toDto(r))
  }

  async create(dto: CreateAttachmentDto): Promise<UserAttachmentDto> {
    const result = await this.db
      .insertInto('user_attachments')
      .values({
        user_id: dto.userId,
        display_name: dto.displayName,
        file_name: dto.fileName,
        mime_type: dto.mimeType,
        file_size: dto.fileSize,
        file_data: dto.fileData,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return this.toDto(result)
  }

  async delete(id: number): Promise<void> {
    await this.db
      .deleteFrom('user_attachments')
      .where('id', '=', id)
      .execute()
  }

  async getById(id: number): Promise<UserAttachmentDto> {
    const row = await this.db
      .selectFrom('user_attachments')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow()
    return {
      ...this.toDto(row),
      fileData: row.file_data,
    }
  }

  private toDto(row: Record<string, unknown>): UserAttachmentDto {
    return {
      id: row.id as number,
      userId: row.user_id as number,
      displayName: row.display_name as string,
      fileName: row.file_name as string,
      mimeType: row.mime_type as string | null,
      fileSize: row.file_size as number | null,
      createdAt: row.created_at as string,
    }
  }
}
