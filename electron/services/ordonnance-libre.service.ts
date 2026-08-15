import { inject, singleton } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'


export interface OrdonnanceLibreRecord {
  id: string
  contact_id: string
  document_type_id: string
  title: string | null
  status: string
  form_data: string | null
  source: string | null
  created_at: string | null
  updated_at: string | null
}

@singleton()
export class OrdonnanceLibreService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByPatient(patientId: number): Promise<any[]> {
    const rows = await this.db
      .selectFrom('patient_clinical_documents')
      .innerJoin('clinical_document_types', 'clinical_document_types.id', 'patient_clinical_documents.document_type_id')
      .innerJoin('encounters', 'encounters.id', 'patient_clinical_documents.contact_id')
      .leftJoin('user', 'user.id', 'encounters.medecin_id')
      .select([
        'patient_clinical_documents.id',
        'patient_clinical_documents.contact_id',
        'patient_clinical_documents.document_type_id',
        'patient_clinical_documents.title',
        'patient_clinical_documents.status',
        'patient_clinical_documents.form_data',
        'patient_clinical_documents.created_at',
        'patient_clinical_documents.updated_at',
        'clinical_document_types.code as document_type_code',
        'user.nom as medecin_nom',
        'user.prenom as medecin_prenom',
      ])
      .where('clinical_document_types.code', '=', 'ORDONNANCE_LIBRE')
      .where('encounters.patient_id', '=', patientId)
      .orderBy('patient_clinical_documents.created_at', 'desc')
      .execute()

    const results = []
    for (const row of rows) {
      let linkedPrescriptions: any[] = []
      if (row.form_data) {
        try {
          const fd = JSON.parse(row.form_data as string)
          if (fd.linkedPrescriptionIds?.length) {
            linkedPrescriptions = await this.db
              .selectFrom('prescriptions')
              .selectAll()
              .where('id', 'in', fd.linkedPrescriptionIds)
              .execute()
          }
        } catch { /* ignore parse errors */ }
      }
      results.push({ ...row, linkedPrescriptions })
    }
    return results
  }

  async getById(id: string): Promise<any | undefined> {
    const row = await this.db
      .selectFrom('patient_clinical_documents')
      .innerJoin('clinical_document_types', 'clinical_document_types.id', 'patient_clinical_documents.document_type_id')
      .select([
        'patient_clinical_documents.id',
        'patient_clinical_documents.contact_id',
        'patient_clinical_documents.document_type_id',
        'patient_clinical_documents.title',
        'patient_clinical_documents.status',
        'patient_clinical_documents.form_data',
        'patient_clinical_documents.created_at',
        'patient_clinical_documents.updated_at',
        'clinical_document_types.code as document_type_code',
      ])
      .where('patient_clinical_documents.id', '=', id)
      .executeTakeFirst()

    if (!row) return undefined

    let linkedPrescriptions: any[] = []
    if (row.form_data) {
      try {
        const fd = JSON.parse(row.form_data as string)
        if (fd.linkedPrescriptionIds?.length) {
          linkedPrescriptions = await this.db
            .selectFrom('prescriptions')
            .selectAll()
            .where('id', 'in', fd.linkedPrescriptionIds)
            .execute()
        }
      } catch { /* ignore */ }
    }
    return { ...row, linkedPrescriptions }
  }
}
