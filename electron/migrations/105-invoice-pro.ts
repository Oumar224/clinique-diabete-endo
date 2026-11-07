import { type Kysely, sql } from 'kysely'

/**
 * Facturation pro — remise / TVA / assurance / reçu.
 * - invoice: remise_pct, tva_pct, assurance_id, part_assurance, part_patient, mode_paiement
 * - invoice_payment: numero_recu UNIQUE (format R-YYYYMMDD-0001)
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  const invoiceAlters = [
    `ALTER TABLE invoice ADD COLUMN remise_pct REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE invoice ADD COLUMN tva_pct REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE invoice ADD COLUMN assurance_id INTEGER REFERENCES insurances(id) ON DELETE SET NULL`,
    `ALTER TABLE invoice ADD COLUMN part_assurance REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE invoice ADD COLUMN part_patient REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE invoice ADD COLUMN mode_paiement TEXT`,
  ]
  for (const stmt of invoiceAlters) {
    try {
      await sql.raw(stmt).execute(db)
    } catch {
      console.log(`[Migration 105] Colonne déjà existante, ALTER ignoré: ${stmt}`)
    }
  }

  await sql`CREATE INDEX IF NOT EXISTS idx_invoice_assurance ON invoice(assurance_id)`.execute(db)

  try {
    await sql.raw(`ALTER TABLE invoice_payment ADD COLUMN numero_recu TEXT`).execute(db)
  } catch {
    console.log('[Migration 105] Colonne invoice_payment.numero_recu déjà existante')
  }

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_payment_numero_recu ON invoice_payment(numero_recu)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_invoice_payment_date ON invoice_payment(date_paiement)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_invoice_payment_mode ON invoice_payment(mode_paiement)`.execute(db)

  // Élargit le CHECK mode_paiement (espèces, mobile_money, assurance…) :
  // recrée la table sans perdre les données si l'ancien CHECK restrictif existe.
  try {
    const schema = await sql<{ sql: string }>`
      SELECT sql FROM sqlite_master WHERE type='table' AND name='invoice_payment'
    `.execute(db)
    const ddl: string = schema.rows[0]?.sql ?? ''
    if (ddl.includes(`'espèces','carte_bancaire'`) && !ddl.includes('mobile_money')) {
      await sql.raw(`PRAGMA foreign_keys = OFF`).execute(db)
      await sql.raw(`
        CREATE TABLE IF NOT EXISTS invoice_payment_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
          montant REAL NOT NULL,
          mode_paiement TEXT NOT NULL CHECK(mode_paiement IN ('espèces','carte_bancaire','chèque','virement','mobile_money','assurance','autre')),
          date_paiement TEXT NOT NULL,
          reference TEXT,
          numero_recu TEXT,
          created_by INTEGER REFERENCES user(id),
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).execute(db)
      await sql.raw(`
        INSERT OR IGNORE INTO invoice_payment_new (id, invoice_id, montant, mode_paiement, date_paiement, reference, numero_recu, created_by, created_at)
        SELECT id, invoice_id, montant, mode_paiement, date_paiement, reference, numero_recu, created_by, created_at FROM invoice_payment
      `).execute(db)
      await sql.raw(`DROP TABLE invoice_payment`).execute(db)
      await sql.raw(`ALTER TABLE invoice_payment_new RENAME TO invoice_payment`).execute(db)
      await sql.raw(`CREATE INDEX IF NOT EXISTS idx_invoice_payment_invoice ON invoice_payment(invoice_id)`).execute(db)
      await sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_payment_numero_recu ON invoice_payment(numero_recu)`).execute(db)
      await sql.raw(`PRAGMA foreign_keys = ON`).execute(db)
      console.log('[Migration 105] invoice_payment recréée avec modes étendus')
    }
  } catch (e) {
    console.log('[Migration 105] Élargissement CHECK ignoré:', (e as Error).message)
    try { await sql.raw(`PRAGMA foreign_keys = ON`).execute(db) } catch { /* noop */ }
  }

  // Backfill : part_patient = montant_total - déjà payé (ou montant_total si rien payé)
  // pour les factures historiques qui n'ont pas de part_patient.
  try {
    await sql.raw(`
      UPDATE invoice SET part_patient = montant_total - COALESCE(
        (SELECT SUM(montant) FROM invoice_payment WHERE invoice_payment.invoice_id = invoice.id), 0
      )
      WHERE part_patient = 0 AND montant_total > 0
    `).execute(db)
  } catch (e) {
    console.log('[Migration 105] Backfill part_patient ignoré:', (e as Error).message)
  }

  // Backfill numero_recu pour les paiements historiques sans numéro (R-<date>-NNNN)
  try {
    const rows = await sql<{ id: number; date_paiement: string }>`
      SELECT id, date_paiement FROM invoice_payment WHERE numero_recu IS NULL ORDER BY id ASC
    `.execute(db)
    const counters = new Map<string, number>()
    // Compte les existants par jour pour éviter les collisions
    const existing = await sql<{ numero_recu: string }>`
      SELECT numero_recu FROM invoice_payment WHERE numero_recu IS NOT NULL
    `.execute(db)
    for (const r of existing.rows) {
      const m = /^R-(\d{8})-(\d{4})$/.exec(r.numero_recu ?? '')
      if (m) {
        const cur = counters.get(m[1]) ?? 0
        counters.set(m[1], Math.max(cur, parseInt(m[2], 10)))
      }
    }
    for (const r of rows.rows) {
      const day = String(r.date_paiement ?? '').slice(0, 10).replace(/-/g, '')
      const key = /^\d{8}$/.test(day) ? day : new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const seq = (counters.get(key) ?? 0) + 1
      counters.set(key, seq)
      const numero = `R-${key}-${String(seq).padStart(4, '0')}`
      await sql.raw(`UPDATE invoice_payment SET numero_recu = '${numero}' WHERE id = ${r.id}`).execute(db)
    }
  } catch (e) {
    console.log('[Migration 105] Backfill numero_recu ignoré:', (e as Error).message)
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // SQLite ne supporte pas DROP COLUMN sur toutes les versions — recréation non nécessaire.
  // On supprime uniquement les index ajoutés.
  await sql`DROP INDEX IF EXISTS idx_invoice_payment_numero_recu`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_invoice_payment_date`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_invoice_payment_mode`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_invoice_assurance`.execute(db)
}
