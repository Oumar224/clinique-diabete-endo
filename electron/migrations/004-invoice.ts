import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS invoice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT NOT NULL UNIQUE,
    patient_id INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    montant_total REAL NOT NULL DEFAULT 0,
    montant_restant REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'en_attente' CHECK(status IN ('payé','en_attente','annulé','partiel')),
    notes TEXT,
    created_by INTEGER REFERENCES user(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_invoice_numero ON invoice(numero)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_invoice_patient ON invoice(patient_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_invoice_date ON invoice(date)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoice(status)`.execute(db)

  await sql`CREATE TABLE IF NOT EXISTS invoice_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
    libelle TEXT NOT NULL,
    quantite INTEGER NOT NULL DEFAULT 1,
    prix_unitaire REAL NOT NULL,
    montant REAL NOT NULL,
    type TEXT NOT NULL DEFAULT 'autre' CHECK(type IN ('consultation','acte','medicament','autre')),
    created_at TEXT DEFAULT (datetime('now'))
  )`.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_invoice_item_invoice ON invoice_item(invoice_id)`.execute(db)

  await sql`CREATE TABLE IF NOT EXISTS invoice_payment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
    montant REAL NOT NULL,
    mode_paiement TEXT NOT NULL CHECK(mode_paiement IN ('espèces','carte_bancaire','chèque','virement','autre')),
    date_paiement TEXT NOT NULL,
    reference TEXT,
    created_by INTEGER REFERENCES user(id),
    created_at TEXT DEFAULT (datetime('now'))
  )`.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_invoice_payment_invoice ON invoice_payment(invoice_id)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS invoice_payment`.execute(db)
  await sql`DROP TABLE IF EXISTS invoice_item`.execute(db)
  await sql`DROP TABLE IF EXISTS invoice`.execute(db)
}
