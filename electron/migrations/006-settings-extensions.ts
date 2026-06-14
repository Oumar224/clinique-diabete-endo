import { type Kysely, sql, CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // ── Medical units (mesure & prescription) ──
  await sql`
    CREATE TABLE IF NOT EXISTS medical_units (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      code       TEXT    NOT NULL UNIQUE,
      name       TEXT    NOT NULL,
      category   TEXT    NOT NULL CHECK(category IN ('mesure', 'prescription')),
      symbol     TEXT    NOT NULL,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_medical_units_category ON medical_units(category)`.execute(db)
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

  // ── Seed medical units: mesure ──
  const mesureUnits = [
    { code: 'MG', name: 'Milligramme', category: 'mesure', symbol: 'mg' },
    { code: 'G', name: 'Gramme', category: 'mesure', symbol: 'g' },
    { code: 'KG', name: 'Kilogramme', category: 'mesure', symbol: 'kg' },
    { code: 'ML', name: 'Millilitre', category: 'mesure', symbol: 'ml' },
    { code: 'L', name: 'Litre', category: 'mesure', symbol: 'L' },
    { code: 'UI', name: 'Unité Internationale', category: 'mesure', symbol: 'UI' },
    { code: 'MMOL-L', name: 'Millimole par litre', category: 'mesure', symbol: 'mmol/L' },
    { code: 'G-L', name: 'Gramme par litre', category: 'mesure', symbol: 'g/L' },
    { code: 'MG-DL', name: 'Milligramme par décilitre', category: 'mesure', symbol: 'mg/dL' },
    { code: 'UG', name: 'Microgramme', category: 'mesure', symbol: 'µg' },
    { code: 'MEQ', name: 'Milliéquivalent', category: 'mesure', symbol: 'mEq' },
    { code: 'PH', name: 'Potentiel hydrogène', category: 'mesure', symbol: 'pH' },
    { code: 'PCT', name: 'Pourcentage', category: 'mesure', symbol: '%' },
  ]

  for (const u of mesureUnits) {
    await sql`
      INSERT OR IGNORE INTO medical_units (code, name, category, symbol)
      VALUES (${u.code}, ${u.name}, ${u.category}, ${u.symbol})
    `.execute(db)
  }

  // ── Seed medical units: prescription ──
  const prescriptionUnits = [
    { code: 'CPR', name: 'Comprimé', category: 'prescription', symbol: 'comprimé' },
    { code: 'GEL', name: 'Gélule', category: 'prescription', symbol: 'gélule' },
    { code: 'AMP', name: 'Ampoule', category: 'prescription', symbol: 'ampoule' },
    { code: 'FLC', name: 'Flacon', category: 'prescription', symbol: 'flacon' },
    { code: 'TUB', name: 'Tube', category: 'prescription', symbol: 'tube' },
    { code: 'BTE', name: 'Boîte', category: 'prescription', symbol: 'boîte' },
    { code: 'PIP', name: 'Pipette', category: 'prescription', symbol: 'pipette' },
    { code: 'SAC', name: 'Sachet', category: 'prescription', symbol: 'sachet' },
    { code: 'SUP', name: 'Suppositoire', category: 'prescription', symbol: 'suppositoire' },
    { code: 'POM', name: 'Pommade', category: 'prescription', symbol: 'pommade' },
    { code: 'SOL', name: 'Solution', category: 'prescription', symbol: 'solution' },
    { code: 'SUSP', name: 'Suspension', category: 'prescription', symbol: 'suspension' },
  ]

  for (const u of prescriptionUnits) {
    await sql`
      INSERT OR IGNORE INTO medical_units (code, name, category, symbol)
      VALUES (${u.code}, ${u.name}, ${u.category}, ${u.symbol})
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
