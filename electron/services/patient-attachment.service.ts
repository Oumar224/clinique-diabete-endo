import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { NoResultError } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { PatientAttachmentEntity } from '../entities/patient-attachment.entity'
import { getBase64DecodedSize } from '../utils/file-utils'

@singleton()
export class PatientAttachmentService {
  private db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByPatient(patientId: number, category?: string): Promise<PatientAttachmentEntity[]> {
    let query = this.db
      .selectFrom('patient_attachments')
      .select([
        'id',
        'patient_id',
        'display_name',
        'file_name',
        'mime_type',
        'file_size',
        'category',
        'attachment_type_id',
        'created_at',
      ])
      .where('patient_id', '=', patientId)
    if (category !== undefined) {
      query = query.where('category', '=', category)
    }
    return await query.orderBy('created_at', 'desc').execute() as unknown as PatientAttachmentEntity[]
  }

  async create(entity: PatientAttachmentEntity): Promise<PatientAttachmentEntity> {
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

    if (entity.file_size != null && entity.file_size > MAX_FILE_SIZE) {
      throw new Error('La taille du fichier ne doit pas dépasser 10 Mo')
    }

    if (entity.file_data && getBase64DecodedSize(entity.file_data) > MAX_FILE_SIZE) {
      throw new Error('La taille du fichier décodé ne doit pas dépasser 10 Mo')
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
      .insertInto('patient_attachments')
      .values({
        patient_id: entity.patient_id!,
        display_name: displayName ?? entity.display_name,
        file_name: entity.file_name!,
        mime_type: entity.mime_type ?? null,
        file_size: entity.file_size ?? null,
        file_data: entity.file_data!,
        category: entity.category ?? 'patient',
        attachment_type_id: entity.attachment_type_id ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  async update(entity: PatientAttachmentEntity): Promise<PatientAttachmentEntity> {
    const existing = await this.db
      .selectFrom('patient_attachments')
      .selectAll()
      .where('id', '=', entity.id!)
      .executeTakeFirst()
    if (!existing) throw new Error('Pièce jointe introuvable')

    const updateData: Record<string, unknown> = {}
    if (entity.display_name !== undefined) updateData.display_name = entity.display_name
    if (entity.file_name !== undefined) updateData.file_name = entity.file_name
    if (entity.mime_type !== undefined) updateData.mime_type = entity.mime_type
    if (entity.file_size !== undefined) updateData.file_size = entity.file_size
    if (entity.file_data !== undefined) updateData.file_data = entity.file_data
    if (entity.category !== undefined) updateData.category = entity.category
    if (entity.attachment_type_id !== undefined) {
      updateData.attachment_type_id = entity.attachment_type_id
    }

    await this.db
      .updateTable('patient_attachments')
      .set(updateData as any)
      .where('id', '=', entity.id!)
      .execute()

    const updated = await this.db
      .selectFrom('patient_attachments')
      .select([
        'id',
        'patient_id',
        'display_name',
        'file_name',
        'mime_type',
        'file_size',
        'category',
        'attachment_type_id',
        'created_at',
      ])
      .where('id', '=', entity.id!)
      .executeTakeFirstOrThrow()
    return updated as unknown as PatientAttachmentEntity
  }

  async delete(id: number): Promise<void> {
    const result = await this.db
      .deleteFrom('patient_attachments')
      .where('id', '=', id)
      .executeTakeFirst()
    if (!result || result.numDeletedRows === 0n) {
      throw new Error('Pièce jointe introuvable')
    }
  }

  async getById(id: number): Promise<PatientAttachmentEntity> {
    try {
      const row = await this.db
        .selectFrom('patient_attachments')
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
