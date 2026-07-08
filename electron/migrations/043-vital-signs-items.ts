import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.executeQuery(CompiledQuery.raw(`
    CREATE TABLE IF NOT EXISTS vital_signs_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      hour INTEGER NOT NULL,
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
  await db.executeQuery(CompiledQuery.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_vital_signs_items_patient_date_hour ON vital_signs_items(patient_id, date, hour)'
  ))
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS vital_signs_items'))
}
