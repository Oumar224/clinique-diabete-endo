import { type Kysely, sql } from 'kysely'

// Recovery for databases whose migration history stopped before 070–086
// Generic over the DB type so every caller can pass its Kysely instance
// directly. `Kysely<unknown>` is not assignable from `Kysely<DB>` in Kysely
// 0.28 (KyselyTypeError machinery), which is why a cast was needed before.
export async function repairCriticalSchema<DB>(db: Kysely<DB>): Promise<void> {
  try {
    const hasMovements = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='encounter_movements'
    `.execute(db)
    if (hasMovements.rows.length > 0) {
      const movementColumns = await sql<{ name: string }>`
        SELECT name FROM pragma_table_info('encounter_movements')
      `.execute(db)
      const movementCols = movementColumns.rows.map(r => r.name)

      if (!movementCols.includes('created_by')) {
        await sql`ALTER TABLE encounter_movements ADD COLUMN created_by INTEGER REFERENCES user(id)`.execute(db)
      }
      if (!movementCols.includes('from_service_id')) {
        await sql`ALTER TABLE encounter_movements ADD COLUMN from_service_id INTEGER REFERENCES services(id)`.execute(db)
      }
      if (!movementCols.includes('motif')) {
        await sql`ALTER TABLE encounter_movements ADD COLUMN motif TEXT`.execute(db)
      }
    }

    const hasEncounters = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='encounters'
    `.execute(db)
    if (hasEncounters.rows.length > 0) {
      const encounterColumns = await sql<{ name: string }>`
        SELECT name FROM pragma_table_info('encounters')
      `.execute(db)
      const encounterCols = encounterColumns.rows.map(r => r.name)

      if (!encounterCols.includes('care_unit_id')) {
        await sql`ALTER TABLE encounters ADD COLUMN care_unit_id INTEGER REFERENCES care_units(id)`.execute(db)
      }
    }

    const hasAppointment = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='appointment'
    `.execute(db)
    if (hasAppointment.rows.length > 0) {
      const appointmentColumns = await sql<{ name: string }>`
        SELECT name FROM pragma_table_info('appointment')
      `.execute(db)
      const appointmentCols = appointmentColumns.rows.map(r => r.name)

      if (!appointmentCols.includes('service_id')) {
        await sql`ALTER TABLE appointment ADD COLUMN service_id INTEGER REFERENCES services(id)`.execute(db)
      }
      if (!appointmentCols.includes('care_unit_id')) {
        await sql`ALTER TABLE appointment ADD COLUMN care_unit_id INTEGER REFERENCES care_units(id)`.execute(db)
      }
    }

    const hasLabExams = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='lab_exams'
    `.execute(db)
    if (hasLabExams.rows.length > 0) {
      const labExamColumns = await sql<{ name: string }>`
        SELECT name FROM pragma_table_info('lab_exams')
      `.execute(db)
      const labExamCols = labExamColumns.rows.map(r => r.name)

      if (!labExamCols.includes('parent_id')) {
        await sql`ALTER TABLE lab_exams ADD COLUMN parent_id INTEGER REFERENCES lab_exams(id)`.execute(db)
      }
    }

    // patient_clinical_documents: columns added by migration 078 and queried on
    // the dossier-clinic hot path (clinical-document.service.ts selects
    // source/pdf_path). Same definitions as 078, applied idempotently.
    const hasClinicalDocs = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='patient_clinical_documents'
    `.execute(db)
    if (hasClinicalDocs.rows.length > 0) {
      const docColumns = await sql<{ name: string }>`
        SELECT name FROM pragma_table_info('patient_clinical_documents')
      `.execute(db)
      const docCols = docColumns.rows.map(r => r.name)

      if (!docCols.includes('source')) {
        await sql`ALTER TABLE patient_clinical_documents ADD COLUMN source TEXT NOT NULL DEFAULT 'created'`.execute(db)
      }
      if (!docCols.includes('pdf_path')) {
        await sql`ALTER TABLE patient_clinical_documents ADD COLUMN pdf_path TEXT`.execute(db)
      }
    }
  } catch (err) {
    console.error('[CDE] Échec de la réparation du schéma critique:', err)
  }
}
