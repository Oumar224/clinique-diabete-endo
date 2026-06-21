import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { type PatientAttachmentDto, type CreatePatientAttachmentDto } from '../dto/patient-attachment.dto'

@singleton()
export class PatientAttachmentService {
  private db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByPatient(patientId: number): Promise<PatientAttachmentDto[]> {
    const rows = await this.db
      .selectFrom('patient_attachments')
      .select(['id', 'patient_id', 'display_name', 'file_name', 'mime_type', 'file_size', 'created_at'])
      .where('patient_id', '=', patientId)
      .orderBy('created_at', 'desc')
      .execute()
    return rows.map(r => this.toDto(r))
  }

  async create(dto: CreatePatientAttachmentDto): Promise<PatientAttachmentDto> {
    const result = await this.db
      .insertInto('patient_attachments')
      .values({
        patient_id: dto.patientId,
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
      .deleteFrom('patient_attachments')
      .where('id', '=', id)
      .execute()
  }

  async getById(id: number): Promise<PatientAttachmentDto> {
    const row = await this.db
      .selectFrom('patient_attachments')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow()
    return {
      ...this.toDto(row),
      fileData: row.file_data,
    }
  }

  private toDto(row: Record<string, unknown>): PatientAttachmentDto {
    return {
      id: row.id as number,
      patientId: row.patient_id as number,
      displayName: row.display_name as string,
      fileName: row.file_name as string,
      mimeType: row.mime_type as string | null,
      fileSize: row.file_size as number | null,
      createdAt: row.created_at as string,
    }
  }
}
