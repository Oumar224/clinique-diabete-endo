import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export interface VitalSignEntity {
  id?: number
  patient_id: number
  date: string
  ta_systolique: number | null
  ta_diastolique: number | null
  frequence_cardiaque: number | null
  temperature: number | null
  glycemie: number | null
  cetonemie: number | null
  glucosurie: string | null
  cetonurie: string | null
  sa_o2: number | null
  diurese: number | null
  poids: number | null
  created_by: number
  created_at?: string
  updated_at?: string
}

export class VitalSignEntity {
  static async createSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS vital_signs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        ta_systolique INTEGER,
        ta_diastolique INTEGER,
        frequence_cardiaque INTEGER,
        temperature REAL,
        glycemie REAL,
        cetonemie REAL,
        glucosurie TEXT,
        cetonurie TEXT,
        sa_o2 INTEGER,
        diurese INTEGER,
        poids REAL,
        created_by INTEGER NOT NULL REFERENCES user(id),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_date ON vital_signs(patient_id, date)'))
  }

  static async dropSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS vital_signs'))
  }

  static async recreateSchema(db: Kysely<unknown>): Promise<void> {
    await this.dropSchema(db)
    await this.createSchema(db)
  }
}
