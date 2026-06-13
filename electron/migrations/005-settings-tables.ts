import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // ── Currency (supported currencies for pricing) ──
  await sql`
    CREATE TABLE IF NOT EXISTS currency (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      decimals INTEGER NOT NULL DEFAULT 0 CHECK(decimals >= 0),
      is_active INTEGER NOT NULL DEFAULT 1
    )
  `.execute(db)

  // ── Services (clinique services: reception, endocrinology, etc.) ──
  await sql`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      duration INTEGER NOT NULL DEFAULT 30,
      color TEXT DEFAULT '#0E5C5B',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_services_sort ON services(sort_order)`.execute(db)

  // ── Medical acts (CCAM-like: code, label, price, service, currency) ──
  await sql`
    CREATE TABLE IF NOT EXISTS medical_acts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      currency_code TEXT NOT NULL DEFAULT 'GNF' REFERENCES currency(code),
      service_id INTEGER NOT NULL REFERENCES services(id),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_medical_acts_service ON medical_acts(service_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_medical_acts_code ON medical_acts(code)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_medical_acts_active ON medical_acts(is_active)`.execute(db)

  // ── Act price history (tracks every price change) ──
  await sql`
    CREATE TABLE IF NOT EXISTS act_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      act_id INTEGER NOT NULL REFERENCES medical_acts(id),
      old_price REAL,
      new_price REAL NOT NULL,
      change_reason TEXT,
      changed_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_act_price_history_act ON act_price_history(act_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_act_price_history_date ON act_price_history(changed_at)`.execute(db)

  // ── Seed currencies ──
  await sql`
    INSERT OR IGNORE INTO currency (code, name, symbol, decimals) VALUES
      ('GNF', 'Franc Guinéen', 'FG', 0),
      ('EUR', 'Euro', '€', 2),
      ('XOF', 'Franc CFA', 'FCFA', 0)
  `.execute(db)

  // ── Seed default clinic services ──
  const defaultServices = [
    { name: 'Accueil', description: 'Service d\'accueil et enregistrement', duration: 15, sort_order: 1, color: '#409EFF' },
    { name: 'Consultation Générale', description: 'Consultation médicale générale', duration: 30, sort_order: 2, color: '#67C23A' },
    { name: 'Endocrinologie', description: 'Consultation spécialisée', duration: 30, sort_order: 3, color: '#E6A23C' },
    { name: 'Diabétologie', description: 'Suivi des patients diabétiques', duration: 45, sort_order: 4, color: '#F56C6C' },
    { name: 'Pharmacie', description: 'Dispensation des médicaments', duration: 10, sort_order: 5, color: '#909399' },
  ]

  for (const svc of defaultServices) {
    await sql`
      INSERT OR IGNORE INTO services (name, description, duration, color, sort_order)
      VALUES (${svc.name}, ${svc.description}, ${svc.duration}, ${svc.color}, ${svc.sort_order})
    `.execute(db)
  }

  // ── Seed example medical acts ──
  await sql`
    INSERT OR IGNORE INTO medical_acts (code, label, price, currency_code, service_id)
    SELECT 'CONS-GEN-001', 'Consultation générale', 50000, 'GNF', id FROM services WHERE name = 'Consultation Générale'
  `.execute(db)

  await sql`
    INSERT OR IGNORE INTO medical_acts (code, label, price, currency_code, service_id)
    SELECT 'CONS-ENDO-001', 'Consultation endocrinologie', 75000, 'GNF', id FROM services WHERE name = 'Endocrinologie'
  `.execute(db)

  await sql`
    INSERT OR IGNORE INTO medical_acts (code, label, price, currency_code, service_id)
    SELECT 'CONS-ENDO-002', 'Échographie thyroïdienne', 150000, 'GNF', id FROM services WHERE name = 'Endocrinologie'
  `.execute(db)

  // ── Seed price history for seeded acts ──
  await sql`
    INSERT OR IGNORE INTO act_price_history (act_id, old_price, new_price, change_reason)
    SELECT id, NULL, price, 'Prix initial' FROM medical_acts
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS act_price_history`.execute(db)
  await sql`DROP TABLE IF EXISTS medical_acts`.execute(db)
  await sql`DROP TABLE IF EXISTS services`.execute(db)
  await sql`DROP TABLE IF EXISTS currency`.execute(db)
}
