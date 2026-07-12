import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  try {
    await sql`PRAGMA foreign_keys = OFF`.execute(db)

    await sql`
      CREATE TABLE IF NOT EXISTS encounters (
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

    await sql`CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id)`.execute(db)
    await sql`CREATE INDEX IF NOT EXISTS idx_encounters_service ON encounters(service_id)`.execute(db)
    await sql`CREATE INDEX IF NOT EXISTS idx_encounters_start_date ON encounters(start_date)`.execute(db)
    await sql`CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status)`.execute(db)

    await sql`
      CREATE TABLE IF NOT EXISTS encounter_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        encounter_id INTEGER NOT NULL REFERENCES encounters(id),
        service_id INTEGER REFERENCES services(id),
        step_label TEXT NOT NULL,
        entered_at TEXT NOT NULL,
        exited_at TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `.execute(db)

    await sql`CREATE INDEX IF NOT EXISTS idx_encounter_movements_encounter ON encounter_movements(encounter_id)`.execute(db)

    await sql`PRAGMA foreign_keys = ON`.execute(db)
  } catch (err) {
    console.error('[Migration 050] Error during migration (table may already exist with different schema):', err)
    await sql`PRAGMA foreign_keys = ON`.execute(db).catch(() => {})
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS encounter_movements`.execute(db)
  await sql`DROP TABLE IF EXISTS encounters`.execute(db)
}
