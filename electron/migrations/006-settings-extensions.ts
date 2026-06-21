import { type Kysely, sql, CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // ── Medical units ──
  await sql`
    CREATE TABLE IF NOT EXISTS medical_units (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      code       TEXT    NOT NULL UNIQUE,
      name       TEXT    NOT NULL,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_medical_units_active ON medical_units(is_active)`.execute(db)

  // ── Sites (clinic locations) ──
  await sql`
    CREATE TABLE IF NOT EXISTS sites (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      address    TEXT,
      phone      TEXT,
      email      TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_sites_active ON sites(is_active)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_sites_default ON sites(is_default)`.execute(db)

  // ── Specialties ──
  await sql`
    CREATE TABLE IF NOT EXISTS specialties (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL UNIQUE,
      code         TEXT    NOT NULL UNIQUE,
      title_prefix TEXT    NOT NULL DEFAULT 'Dr',
      is_active    INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_specialties_active ON specialties(is_active)`.execute(db)

  // ── Junction: user ↔ specialties ──
  await sql`
    CREATE TABLE IF NOT EXISTS user_specialties (
      user_id      INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      specialty_id INTEGER NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, specialty_id)
    )
  `.execute(db)

  // ── Junction: user ↔ sites ──
  await sql`
    CREATE TABLE IF NOT EXISTS user_sites (
      user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, site_id)
    )
  `.execute(db)

  // ── Junction: user ↔ services ──
  await sql`
    CREATE TABLE IF NOT EXISTS user_services (
      user_id    INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, service_id)
    )
  `.execute(db)

  // ── Alter user table: add new columns ──
  // NOTE: CHECK constraints for type_contrat IN ('CDD', 'CDI') and
  // statut_resiliation IN ('resilie') cannot be added via ALTER TABLE in SQLite.
  // These are validated at the service layer (AuthService.computeStatutContrat
  // and AuthService.terminateContract) instead.
  const alterStatements = [
    'ALTER TABLE user ADD COLUMN photo TEXT',
    'ALTER TABLE user ADD COLUMN telephone TEXT',
    "ALTER TABLE user ADD COLUMN telephone_country_code TEXT DEFAULT '+224'",
    'ALTER TABLE user ADD COLUMN fonction TEXT',
    'ALTER TABLE user ADD COLUMN date_debut_contrat TEXT',
    'ALTER TABLE user ADD COLUMN date_fin_contrat TEXT',
    "ALTER TABLE user ADD COLUMN type_contrat TEXT DEFAULT 'CDI'",
    'ALTER TABLE user ADD COLUMN statut_resiliation TEXT',
    'ALTER TABLE user ADD COLUMN motif_resiliation TEXT',
    'ALTER TABLE user ADD COLUMN date_resiliation TEXT',
    'ALTER TABLE user ADD COLUMN resilie_par INTEGER REFERENCES user(id)',
  ]

  for (const stmt of alterStatements) {
    try {
      await db.executeQuery(CompiledQuery.raw(stmt))
    } catch {
      // Column already exists — safe to ignore
    }
  }

  // ── Seed medical units ──
  const seededUnits = [
    { code: 'MG', name: 'Milligramme' },
    { code: 'G', name: 'Gramme' },
    { code: 'KG', name: 'Kilogramme' },
    { code: 'ML', name: 'Millilitre' },
    { code: 'L', name: 'Litre' },
    { code: 'UI', name: 'Unité Internationale' },
    { code: 'MMOL-L', name: 'Millimole par litre' },
    { code: 'G-L', name: 'Gramme par litre' },
    { code: 'MG-DL', name: 'Milligramme par décilitre' },
    { code: 'UG', name: 'Microgramme' },
    { code: 'MEQ', name: 'Milliéquivalent' },
    { code: 'PH', name: 'Potentiel hydrogène' },
    { code: 'PCT', name: 'Pourcentage' },
    { code: 'CPR', name: 'Comprimé' },
    { code: 'GEL', name: 'Gélule' },
    { code: 'AMP', name: 'Ampoule' },
    { code: 'FLC', name: 'Flacon' },
    { code: 'TUB', name: 'Tube' },
    { code: 'BTE', name: 'Boîte' },
    { code: 'PIP', name: 'Pipette' },
    { code: 'SAC', name: 'Sachet' },
    { code: 'SUP', name: 'Suppositoire' },
    { code: 'POM', name: 'Pommade' },
    { code: 'SOL', name: 'Solution' },
    { code: 'SUSP', name: 'Suspension' },
  ]

  for (const u of seededUnits) {
    await sql`
      INSERT OR IGNORE INTO medical_units (code, name, is_active)
      VALUES (${u.code}, ${u.name}, 1)
    `.execute(db)
  }

  // ── Seed default site ──
  await sql`
    INSERT OR IGNORE INTO sites (name, is_default)
    VALUES ('Site principal', 1)
  `.execute(db)

  // ── Seed specialties ──
  const specialties = [
    { name: 'Médecine Générale', code: 'MED-GEN', title_prefix: 'Dr' },
    { name: 'Endocrinologie', code: 'ENDO', title_prefix: 'Dr' },
    { name: 'Diabétologie', code: 'DIAB', title_prefix: 'Dr' },
    { name: 'Cardiologie', code: 'CARDIO', title_prefix: 'Dr' },
    { name: 'Pédiatrie', code: 'PED', title_prefix: 'Dr' },
    { name: 'Gynécologie', code: 'GYNECO', title_prefix: 'Dr' },
    { name: 'Chirurgie', code: 'CHIR', title_prefix: 'Dr' },
    { name: 'Pharmacie', code: 'PHARM', title_prefix: 'Ph' },
    { name: 'Biologie', code: 'BIO', title_prefix: 'Dr' },
    { name: 'Radiologie', code: 'RADIO', title_prefix: 'Dr' },
  ]

  for (const s of specialties) {
    await sql`
      INSERT OR IGNORE INTO specialties (name, code, title_prefix)
      VALUES (${s.name}, ${s.code}, ${s.title_prefix})
    `.execute(db)
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS user_services`.execute(db)
  await sql`DROP TABLE IF EXISTS user_sites`.execute(db)
  await sql`DROP TABLE IF EXISTS user_specialties`.execute(db)
  await sql`DROP TABLE IF EXISTS specialties`.execute(db)
  await sql`DROP TABLE IF EXISTS sites`.execute(db)
  await sql`DROP TABLE IF EXISTS medical_units`.execute(db)
}
