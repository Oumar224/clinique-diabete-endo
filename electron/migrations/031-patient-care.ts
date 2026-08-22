import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS plan_soins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES user(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS plan_soins_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_soins_id INTEGER NOT NULL REFERENCES plan_soins(id) ON DELETE CASCADE,
      bloc_heure TEXT NOT NULL,
      medicament TEXT NOT NULL,
      dosage TEXT NOT NULL,
      voie TEXT NOT NULL CHECK(voie IN ('PO','SC','IV','IM','SL')),
      statut TEXT NOT NULL DEFAULT 'en_attente' CHECK(statut IN ('en_attente','valide','suspendu')),
      valide_par TEXT,
      valide_a TEXT,
      motif_suspension TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`
    CREATE INDEX IF NOT EXISTS idx_plan_soins_patient_date ON plan_soins(patient_id, date)
  `.execute(db)

  await sql`
    CREATE INDEX IF NOT EXISTS idx_plan_soins_items_plan ON plan_soins_items(plan_soins_id)
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS vital_signs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      ta_systolique INTEGER,
      ta_diastolique INTEGER,
      frequence_cardiaque INTEGER,
      temperature REAL,
      glycemie REAL,
      created_by INTEGER NOT NULL REFERENCES user(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`
    CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_date ON vital_signs(patient_id, date)
  `.execute(db)

  await sql`
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
  `.execute(db)

  await sql`
    CREATE INDEX IF NOT EXISTS idx_dispositifs_patient ON dispositifs(patient_id)
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS dispositifs`.execute(db)
  await sql`DROP TABLE IF EXISTS vital_signs`.execute(db)
  await sql`DROP TABLE IF EXISTS plan_soins_items`.execute(db)
  await sql`DROP TABLE IF EXISTS plan_soins`.execute(db)
}
