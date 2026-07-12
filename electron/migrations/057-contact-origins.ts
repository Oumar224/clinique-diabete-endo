import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS contact_origins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`.execute(db)

  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS encounters_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient(id),
      contact_type TEXT NOT NULL CHECK(contact_type IN ('consultation','urgence','soin_externe','autre')),
      contact_type_precision TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      service_id INTEGER NOT NULL REFERENCES services(id),
      medecin_id INTEGER REFERENCES user(id),
      origin TEXT NOT NULL DEFAULT 'auto_refere',
      origin_precision TEXT,
      zone_situation TEXT NOT NULL DEFAULT 'zone_responsabilite' CHECK(zone_situation IN ('zone_responsabilite','hors_zone','rural','urbain','autre')),
      zone_precision TEXT,
      prise_en_charge TEXT NOT NULL DEFAULT 'maladie_naturelle' CHECK(prise_en_charge IN ('maladie_naturelle','maladie_professionnelle','accident_travail','accident_circulation','autre_accident','autre')),
      prise_en_charge_precision TEXT,
      sinistre_info TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','closed')),
      created_by INTEGER REFERENCES user(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`INSERT INTO encounters_new SELECT * FROM encounters`.execute(db)
  await sql`DROP TABLE IF EXISTS encounters`.execute(db)
  await sql`ALTER TABLE encounters_new RENAME TO encounters`.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_service ON encounters(service_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_start_date ON encounters(start_date)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status)`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)

  await sql`
    INSERT INTO contact_origins (value, label, sort_order) VALUES
      ('auto_refere', 'Auto-référé / De lui-même', 1),
      ('oriente_par_patient', 'Orienté par un patient', 2),
      ('centre_sante', 'Centre de santé', 3),
      ('poste_sante', 'Poste de santé', 4),
      ('clinique_privee', 'Clinique / Cabinet privé', 5),
      ('domicile', 'Domicile / Voie publique', 6),
      ('maladie_chronique', 'Maladie chronique', 7),
      ('maladie_courante', 'Maladie courante', 8),
      ('maladie_rare', 'Maladie rare', 9),
      ('assurance', 'Assurance', 10),
      ('autre', 'Autre', 99)
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS encounters_old (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patient(id),
      contact_type TEXT NOT NULL CHECK(contact_type IN ('consultation','urgence','soin_externe','autre')),
      contact_type_precision TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      service_id INTEGER NOT NULL REFERENCES services(id),
      medecin_id INTEGER REFERENCES user(id),
      origin TEXT NOT NULL DEFAULT 'auto_refere' CHECK(origin IN ('auto_refere','centre_sante','poste_sante','clinique_privee','domicile','autre')),
      origin_precision TEXT,
      zone_situation TEXT NOT NULL DEFAULT 'zone_responsabilite' CHECK(zone_situation IN ('zone_responsabilite','hors_zone','rural','urbain','autre')),
      zone_precision TEXT,
      prise_en_charge TEXT NOT NULL DEFAULT 'maladie_naturelle' CHECK(prise_en_charge IN ('maladie_naturelle','maladie_professionnelle','accident_travail','accident_circulation','autre_accident','autre')),
      prise_en_charge_precision TEXT,
      sinistre_info TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','closed')),
      created_by INTEGER REFERENCES user(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`INSERT INTO encounters_old SELECT * FROM encounters`.execute(db)
  await sql`DROP TABLE IF EXISTS encounters`.execute(db)
  await sql`ALTER TABLE encounters_old RENAME TO encounters`.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_service ON encounters(service_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_start_date ON encounters(start_date)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status)`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)

  await sql`DROP TABLE IF EXISTS contact_origins`.execute(db)
}
