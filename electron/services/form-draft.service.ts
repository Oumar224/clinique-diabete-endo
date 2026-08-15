import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { FormDraftEntity } from '../entities/form-draft.entity'
import { entityEventBus } from '../automerge/event-bus'

@singleton()
export class FormDraftService {
  private db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async getByType(formType: string, patientId?: number): Promise<FormDraftEntity | null> {
    let query = this.db.selectFrom('form_drafts').selectAll().where('form_type', '=', formType)
    if (patientId !== undefined) {
      query = query.where('patient_id', '=', patientId)
    }
    return await query.executeTakeFirst() ?? null
  }

  async upsert(entity: FormDraftEntity): Promise<void> {
    const existing = await this.getByType(entity.form_type!, entity.patient_id ?? undefined)
    if (existing) {
      await this.db.updateTable('form_drafts')
        .set({ form_data: entity.form_data!, active_step: entity.active_step!, updated_at: new Date().toISOString() })
        .where('id', '=', existing.id!)
        .execute()
      entityEventBus.emitEntityChange({ entityType: 'form_draft', action: 'updated', id: existing.id!, entity, source: 'local', timestamp: Date.now() })
    } else {
      await this.db.insertInto('form_drafts')
        .values({
          form_type: entity.form_type!,
          form_data: entity.form_data!,
          patient_id: entity.patient_id ?? undefined,
          active_step: entity.active_step!,
        })
        .execute()
      entityEventBus.emitEntityChange({ entityType: 'form_draft', action: 'created', id: entity.form_type!, entity, source: 'local', timestamp: Date.now() })
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
