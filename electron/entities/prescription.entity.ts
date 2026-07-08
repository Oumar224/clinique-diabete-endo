import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export interface PrescriptionEntity {
  id?: number
  patient_id: number
  medicament: string
  dosage: string
  voie: string
  duree: number
  frequence: string
  prn: number
  instructions: string | null
  date_prescription: string
  prescripteur_id: number
  statut: string
  created_at?: string
  updated_at?: string
}

export class PrescriptionEntity {
  static async createSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id        INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
        medicament        TEXT NOT NULL,
        dosage            TEXT NOT NULL,
        voie              TEXT NOT NULL CHECK(voie IN ('PO','SC','IV','IM','SL')),
        duree             INTEGER NOT NULL DEFAULT 7,
        frequence         TEXT NOT NULL DEFAULT 'Matin,Midi,Soir',
        prn               INTEGER NOT NULL DEFAULT 0,
        instructions      TEXT,
        date_prescription TEXT NOT NULL DEFAULT (date('now')),
        prescripteur_id   INTEGER REFERENCES user(id),
        statut            TEXT NOT NULL DEFAULT 'active' CHECK(statut IN ('active','completed','stopped')),
        created_at        TEXT DEFAULT (datetime('now')),
        updated_at        TEXT DEFAULT (datetime('now'))
      )
    `))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id)'))
  }

  static async dropSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS prescriptions'))
  }

  static async recreateSchema(db: Kysely<unknown>): Promise<void> {
    await this.dropSchema(db)
    await this.createSchema(db)
  }
}
