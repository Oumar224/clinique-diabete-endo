import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS stays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient(id),
      admission_date TEXT NOT NULL,
      mode_admission TEXT NOT NULL CHECK(mode_admission IN ('urgences','programmee','transfert')),
      service_id INTEGER NOT NULL REFERENCES services(id),
      chambre TEXT,
      lit TEXT,
      medecin_id INTEGER REFERENCES user(id),
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'en_cours' CHECK(status IN ('en_cours','cloture','transfere')),
      sortie_date TEXT,
      created_by INTEGER REFERENCES user(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_stays_patient ON stays(patient_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_stays_status ON stays(status)`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS stay_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stay_id INTEGER NOT NULL REFERENCES stays(id),
      movement_type TEXT NOT NULL CHECK(movement_type IN ('admission','transfert_chambre','transfert_service','sortie')),
      from_service_id INTEGER REFERENCES services(id),
      to_service_id INTEGER REFERENCES services(id),
      chambre TEXT,
      lit TEXT,
      moved_at TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_stay_movements_stay ON stay_movements(stay_id)`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS stay_movements`.execute(db)
  await sql`DROP TABLE IF EXISTS stays`.execute(db)
}
