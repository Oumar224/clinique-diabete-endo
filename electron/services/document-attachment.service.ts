import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { NoResultError } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { DocumentAttachmentEntity } from '../entities/document-attachment.entity'
import { getBase64DecodedSize } from '../utils/file-utils'
import { validateForeignKeys } from './utils/fk-validator'
import type { CreateDocumentAttachmentDto } from '../dto/document-attachment.dto'

const DATA_URI_RE = /^data:[^;]+;base64,[A-Za-z0-9+/=]+$/

@singleton()
export class DocumentAttachmentService {
  private db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByDocument(documentId: string): Promise<DocumentAttachmentEntity[]> {
    return await this.db
      .selectFrom('document_attachments')
      .select([
        'id',
        'document_id',
        'display_name',
        'file_name',
        'mime_type',
        'file_size',
        'description',
        'created_at',
      ])
      .where('document_id', '=', documentId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .execute() as unknown as DocumentAttachmentEntity[]
  }

  async create(dto: CreateDocumentAttachmentDto): Promise<DocumentAttachmentEntity> {
    // Validate foreign keys before insert
    await validateForeignKeys(this.db as any, [
      { table: 'patient_clinical_documents', column: 'id', value: dto.document_id },
    ])

    if (dto.file_data && !DATA_URI_RE.test(dto.file_data)) {
      throw new Error('Format de fichier invalide')
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

    if (dto.file_size != null && dto.file_size > MAX_FILE_SIZE) {
      throw new Error('La taille du fichier ne doit pas dépasser 10 Mo')
    }

    if (dto.file_data && getBase64DecodedSize(dto.file_data) > MAX_FILE_SIZE) {
      throw new Error('La taille du fichier décodé ne doit pas dépasser 10 Mo')
    }

    return await this.db
      .insertInto('document_attachments')
      .values({
        document_id: dto.document_id!,
        display_name: dto.display_name!,
        file_name: dto.file_name!,
        mime_type: dto.mime_type ?? undefined,
        file_size: dto.file_size ?? undefined,
        file_data: dto.file_data!,
        description: dto.description ?? undefined,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async update(id: number, description: string): Promise<DocumentAttachmentEntity> {
    const existing = await this.db
      .selectFrom('document_attachments')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst()
    if (!existing) throw new Error('Pièce jointe introuvable')

    await this.db
      .updateTable('document_attachments')
      .set({ description })
      .where('id', '=', id)
      .execute()

    const updated = await this.db
      .selectFrom('document_attachments')
      .select([
        'id',
        'document_id',
        'display_name',
        'file_name',
        'mime_type',
        'file_size',
        'description',
        'created_at',
      ])
      .where('id', '=', id)
      .executeTakeFirstOrThrow()
    return updated as unknown as DocumentAttachmentEntity
  }

  async delete(id: number): Promise<void> {
    const result = await this.db
      .deleteFrom('document_attachments')
      .where('id', '=', id)
      .executeTakeFirst()
    if (!result || result.numDeletedRows === 0n) {
      throw new Error('Pièce jointe introuvable')
    }
  }

  async getById(id: number): Promise<DocumentAttachmentEntity> {
    try {
      const row = await this.db
        .selectFrom('document_attachments')
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
