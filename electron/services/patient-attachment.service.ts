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
      .select(['id', 'patient_id', 'display_name', 'file_name', 'mime_type', 'file_size', 'category', 'created_at'])
      .where('patient_id', '=', patientId)
    if (category !== undefined) {
      query = query.where('category', '=', category)
    }
    const rows = await query.orderBy('created_at', 'desc').execute()
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

    const result = await this.db
      .insertInto('patient_attachments')
      .values({
        patient_id: dto.patientId,
        display_name: dto.displayName,
        file_name: dto.fileName,
        mime_type: dto.mimeType ?? null,
        file_size: dto.fileSize ?? null,
        file_data: dto.fileData,
        category: dto.category ?? 'patient',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return this.toDto(result)
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
    return {
      id: row.id as number,
      patientId: row.patient_id as number,
      displayName: row.display_name as string,
      fileName: row.file_name as string,
      mimeType: row.mime_type as string | null,
      fileSize: row.file_size as number | null,
      category: row.category as string | undefined,
      createdAt: row.created_at as string,
    }
  }
}
