import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { NoResultError } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { type PatientAttachmentDto, type CreatePatientAttachmentDto } from '../dto/patient-attachment.dto'
import { getBase64DecodedSize } from '../utils/file-utils'

@singleton()
export class PatientAttachmentService {
  private db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByPatient(patientId: number, category?: string): Promise<PatientAttachmentDto[]> {
    let query = this.db
      .selectFrom('patient_attachments')
      .leftJoin('attachment_types', 'attachment_types.id', 'patient_attachments.attachment_type_id')
      .select([
        'patient_attachments.id',
        'patient_attachments.patient_id',
        'patient_attachments.display_name',
        'patient_attachments.file_name',
        'patient_attachments.mime_type',
        'patient_attachments.file_size',
        'patient_attachments.category',
        'patient_attachments.attachment_type_id',
        'patient_attachments.created_at',
        'attachment_types.name as attachment_type_name',
      ])
      .where('patient_attachments.patient_id', '=', patientId)
    if (category !== undefined) {
      query = query.where('patient_attachments.category', '=', category)
    }
    const rows = await query.orderBy('patient_attachments.created_at', 'desc').execute()
    return rows.map(r => this.toDto(r))
  }

  async create(dto: CreatePatientAttachmentDto): Promise<PatientAttachmentDto> {
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

    // Validation de la taille fournie dans le DTO
    if (dto.fileSize != null && dto.fileSize > MAX_FILE_SIZE) {
      throw new Error('La taille du fichier ne doit pas dépasser 10 Mo')
    }

    // Validation de la taille réelle depuis le base64 (seconde couche de sécurité)
    if (getBase64DecodedSize(dto.fileData) > MAX_FILE_SIZE) {
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
      .insertInto('patient_attachments')
      .values({
        patient_id: dto.patientId,
        display_name: displayName,
        file_name: dto.fileName,
        mime_type: dto.mimeType ?? null,
        file_size: dto.fileSize ?? null,
        file_data: dto.fileData,
        category: dto.category ?? 'patient',
        attachment_type_id: dto.attachmentTypeId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return this.toDto(result)
  }

  async update(id: number, dto: Partial<CreatePatientAttachmentDto>): Promise<PatientAttachmentDto> {
    const existing = await this.db
      .selectFrom('patient_attachments')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    if (!existing) throw new Error('Pièce jointe introuvable')

    const updateData: Record<string, unknown> = {}
    if (dto.displayName !== undefined) updateData.display_name = dto.displayName
    if (dto.fileName !== undefined) updateData.file_name = dto.fileName
    if (dto.mimeType !== undefined) updateData.mime_type = dto.mimeType
    if (dto.fileSize !== undefined) updateData.file_size = dto.fileSize
    if (dto.fileData !== undefined) updateData.file_data = dto.fileData
    if (dto.category !== undefined) updateData.category = dto.category
    if (dto.attachmentTypeId !== undefined) {
      updateData.attachment_type_id = dto.attachmentTypeId
    }

    await this.db
      .updateTable('patient_attachments')
      .set(updateData as any)
      .where('id', '=', id)
      .execute()

    const updated = await this.db
      .selectFrom('patient_attachments')
      .leftJoin('attachment_types', 'attachment_types.id', 'patient_attachments.attachment_type_id')
      .select([
        'patient_attachments.id',
        'patient_attachments.patient_id',
        'patient_attachments.display_name',
        'patient_attachments.file_name',
        'patient_attachments.mime_type',
        'patient_attachments.file_size',
        'patient_attachments.category',
        'patient_attachments.attachment_type_id',
        'patient_attachments.created_at',
        'attachment_types.name as attachment_type_name',
      ])
      .where('patient_attachments.id', '=', id)
      .executeTakeFirstOrThrow()
    return this.toDto(updated)
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

  async getById(id: number): Promise<PatientAttachmentDto> {
    try {
      const row = await this.db
        .selectFrom('patient_attachments')
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

  private toDto(row: Record<string, unknown>): PatientAttachmentDto {
    if (row.created_at == null) {
      throw new Error('Erreur interne : date de création manquante')
    }
    const displayName = (row.display_name as string) || (row.attachment_type_name as string) || ''
    const dto: PatientAttachmentDto = {
      id: row.id as number,
      patientId: row.patient_id as number,
      displayName,
      fileName: row.file_name as string,
      mimeType: row.mime_type as string | null,
      fileSize: row.file_size as number | null,
      category: row.category as string | undefined,
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
