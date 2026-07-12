import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`
    CREATE TABLE encounters_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient(id),
      contact_type TEXT NOT NULL,
      contact_type_precision TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      service_id INTEGER NOT NULL REFERENCES services(id),
      medecin_id INTEGER REFERENCES user(id),
      responsable_id INTEGER REFERENCES user(id),
      origin TEXT NOT NULL,
      origin_precision TEXT,
      zone_situation TEXT NOT NULL,
      zone_precision TEXT,
      prise_en_charge TEXT NOT NULL,
      prise_en_charge_precision TEXT,
      contact_category_id INTEGER REFERENCES contact_categories(id),
      sinistre_info TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_by INTEGER REFERENCES user(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  const tableInfo = await sql<{ name: string; type: string }>`
    PRAGMA table_info('encounters')
  `.execute(db)
  const columns = tableInfo.rows.map(r => r.name)

  const colList = [
    'id', 'patient_id', 'contact_type', 'contact_type_precision',
    'start_date', 'end_date', 'service_id', 'medecin_id',
    'responsable_id', 'origin', 'origin_precision',
    'zone_situation', 'zone_precision',
    'prise_en_charge', 'prise_en_charge_precision',
    'contact_category_id', 'sinistre_info',
    'notes', 'status', 'created_by', 'created_at', 'updated_at',
  ].filter(c => columns.includes(c))

  if (colList.length > 0) {
    await sql`
      INSERT INTO encounters_new (${sql.raw(colList.join(', '))})
      SELECT ${sql.raw(colList.join(', '))} FROM encounters
    `.execute(db)
  }

  await sql`DROP TABLE IF EXISTS encounters`.execute(db)
  await sql`ALTER TABLE encounters_new RENAME TO encounters`.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_service ON encounters(service_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_start_date ON encounters(start_date)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status)`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
}
