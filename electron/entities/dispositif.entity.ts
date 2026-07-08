import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export interface DispositifEntity {
  id?: number
  patient_id: number
  type: string
  date_pose: string
  aspect: string
  volume_ml: number | null
  created_by: number
  created_at?: string
  updated_at?: string
}

export class DispositifEntity {
  static async createSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS dispositifs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        date_pose TEXT NOT NULL,
        aspect TEXT NOT NULL CHECK(aspect IN ('Sain','Rouge','Douloureux')),
        volume_ml INTEGER,
        created_by INTEGER NOT NULL REFERENCES user(id),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_dispositifs_patient ON dispositifs(patient_id)'))
  }

  static async dropSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS dispositifs'))
  }

  static async recreateSchema(db: Kysely<unknown>): Promise<void> {
    await this.dropSchema(db)
    await this.createSchema(db)
  }
}
