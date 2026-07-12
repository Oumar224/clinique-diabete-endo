import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { NoResultError } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { UserAttachmentEntity } from '../entities/user-attachment.entity'

@singleton()
export class UserAttachmentService {
  private db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByUser(userId: number): Promise<UserAttachmentEntity[]> {
    const query = this.db
      .selectFrom('user_attachments')
      .select([
        'id',
        'user_id',
        'display_name',
        'file_name',
        'mime_type',
        'file_size',
        'attachment_type_id',
        'created_at',
      ])
      .where('user_id', '=', userId)
    const rows = await query.orderBy('created_at', 'desc').execute()
    return rows as unknown as UserAttachmentEntity[]
  }

  async create(entity: UserAttachmentEntity): Promise<UserAttachmentEntity> {
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

    if (entity.file_size != null && entity.file_size > MAX_FILE_SIZE) {
      throw new Error('La taille du fichier ne doit pas dépasser 10 Mo')
    }

    if (entity.file_data) {
      const base64Data = entity.file_data.includes('base64,')
        ? entity.file_data.substring(entity.file_data.indexOf('base64,') + 7)
        : entity.file_data
      const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0
      const decodedSize = (base64Data.length * 3) / 4 - padding
      if (decodedSize > MAX_FILE_SIZE) {
        throw new Error('La taille du fichier décodé ne doit pas dépasser 10 Mo')
      }
    }

    let displayName = entity.display_name
    if (entity.attachment_type_id != null) {
      const typeRow = await this.db
        .selectFrom('attachment_types')
        .select('name')
        .where('id', '=', entity.attachment_type_id)
        .executeTakeFirst()
      if (typeRow?.name) {
        displayName = typeRow.name
      }
    }

    return await this.db
      .insertInto('user_attachments')
      .values({
        user_id: entity.user_id!,
        display_name: displayName ?? entity.display_name,
        file_name: entity.file_name!,
        mime_type: entity.mime_type ?? null,
        file_size: entity.file_size ?? null,
        file_data: entity.file_data!,
        attachment_type_id: entity.attachment_type_id ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
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

  async getById(id: number): Promise<UserAttachmentEntity> {
    try {
      const row = await this.db
        .selectFrom('user_attachments')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirstOrThrow()
      return row
    } catch (error) {
      if (error instanceof NoResultError) {
        throw new Error('Pièce jointe introuvable')
      }
      throw error
    }
  }

}
