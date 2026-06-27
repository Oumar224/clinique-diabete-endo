import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { FormDraftEntity, type FormDraftRow } from '../entities/form-draft.entity'
import type { FormDraftDto } from '../dto/form-draft.dto'

@singleton()
export class FormDraftService {
  private db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async getByType(formType: string, patientId?: number): Promise<FormDraftDto | null> {
    let query = this.db.selectFrom('form_drafts').selectAll().where('form_type', '=', formType)
    if (patientId !== undefined) {
      query = query.where('patient_id', '=', patientId)
    }
    const result = await query.executeTakeFirst()
    return result ? FormDraftEntity.toDto(FormDraftEntity.fromRow(result as FormDraftRow)) : null
  }

  async upsert(dto: FormDraftDto): Promise<void> {
    const existing = await this.getByType(dto.formType, dto.patientId ?? undefined)
    if (existing) {
      await this.db.updateTable('form_drafts')
        .set({ form_data: dto.formData, active_step: dto.activeStep, updated_at: new Date().toISOString() })
        .where('id', '=', existing.id!)
        .execute()
    } else {
      await this.db.insertInto('form_drafts')
        .values({
          form_type: dto.formType,
          form_data: dto.formData,
          patient_id: dto.patientId ?? null,
          active_step: dto.activeStep,
        })
        .execute()
    }
  }

  async deleteByType(formType: string, patientId?: number): Promise<void> {
    let query = this.db.deleteFrom('form_drafts').where('form_type', '=', formType)
    if (patientId !== undefined) {
      query = query.where('patient_id', '=', patientId)
    }
    await query.execute()
  }
}
