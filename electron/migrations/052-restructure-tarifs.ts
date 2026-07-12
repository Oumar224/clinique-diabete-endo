import { type Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // ─── Config tarifs (pricing table) ────────────────────────────
  await db.executeQuery(CompiledQuery.raw(`
    CREATE TABLE IF NOT EXISTS config_tarifs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      acte_id         INTEGER NOT NULL REFERENCES medical_acts(id) ON DELETE CASCADE,
      code_tarif      TEXT NOT NULL DEFAULT 'TARIF.STANDARD',
      prix_unitaire   REAL NOT NULL CHECK(prix_unitaire >= 0),
      date_application TEXT NOT NULL DEFAULT (date('now')),
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    )
  `))

  await db.executeQuery(CompiledQuery.raw(
    'CREATE INDEX IF NOT EXISTS idx_config_tarifs_acte ON config_tarifs(acte_id)'
  ))
  await db.executeQuery(CompiledQuery.raw(
    'CREATE INDEX IF NOT EXISTS idx_config_tarifs_acte_code ON config_tarifs(acte_id, code_tarif)'
  ))

  // ─── Patient actes (prescribed acts during encounters) ────────
  await db.executeQuery(CompiledQuery.raw(`
    CREATE TABLE IF NOT EXISTS patient_actes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      encounter_id    INTEGER REFERENCES encounters(id) ON DELETE SET NULL,
      patient_id      INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
      acte_id         INTEGER NOT NULL REFERENCES medical_acts(id) ON DELETE RESTRICT,
      tarif_id        INTEGER REFERENCES config_tarifs(id) ON DELETE SET NULL,
      quantite        INTEGER NOT NULL DEFAULT 1,
      statut_paiement TEXT NOT NULL DEFAULT 'A_PAYER' CHECK(statut_paiement IN ('A_PAYER','PAYE')),
      created_at      TEXT DEFAULT (datetime('now'))
    )
  `))

  await db.executeQuery(CompiledQuery.raw(
    'CREATE INDEX IF NOT EXISTS idx_patient_actes_encounter ON patient_actes(encounter_id)'
  ))
  await db.executeQuery(CompiledQuery.raw(
    'CREATE INDEX IF NOT EXISTS idx_patient_actes_patient ON patient_actes(patient_id)'
  ))
  await db.executeQuery(CompiledQuery.raw(
    'CREATE INDEX IF NOT EXISTS idx_patient_actes_acte ON patient_actes(acte_id)'
  ))
  await db.executeQuery(CompiledQuery.raw(
    'CREATE INDEX IF NOT EXISTS idx_patient_actes_tarif ON patient_actes(tarif_id)'
  ))

  // ─── Check if config_tarifs already has data (idempotency) ────
  const existingCount = await db.executeQuery(CompiledQuery.raw(
    "SELECT COUNT(*) as cnt FROM config_tarifs"
  ))
  const hasData = (existingCount.rows as any[])[0]?.cnt > 0

  if (!hasData) {
    // ─── Only migrate from medical_acts.price if the column still exists ────
    const hasPriceCol = await db.executeQuery(CompiledQuery.raw(
      "SELECT name FROM pragma_table_info('medical_acts') WHERE name = 'price'"
    ))
    if ((hasPriceCol.rows as any[]).length > 0) {
      await db.executeQuery(CompiledQuery.raw(`
        INSERT INTO config_tarifs (acte_id, code_tarif, prix_unitaire, date_application)
        SELECT id, 'TARIF.STANDARD', price, date('now')
        FROM medical_acts
        WHERE price IS NOT NULL
      `))
    }
  }

  // ─── Migrate act_price_history into config_tarifs (if not already done) ────
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO config_tarifs (acte_id, code_tarif, prix_unitaire, date_application)
    SELECT aph.acte_id, 'TARIF.STANDARD', aph.new_price, date(aph.changed_at)
    FROM act_price_history aph
    WHERE NOT EXISTS (
      SELECT 1 FROM config_tarifs ct
      WHERE ct.acte_id = aph.acte_id
        AND ct.prix_unitaire = aph.new_price
        AND date(ct.date_application) = date(aph.changed_at)
    )
  `))

  // ─── Drop pricing columns from medical_acts ───────────────────
  // SQLite 3.35+ supports ALTER TABLE DROP COLUMN
  const columnsExist = await db.executeQuery(CompiledQuery.raw(
    "SELECT name FROM pragma_table_info('medical_acts') WHERE name IN ('price', 'currency_code')"
  ))
  const rows = columnsExist.rows as { name: string }[]
  const colNames = rows.map(r => r.name)

  if (colNames.includes('price')) {
    try {
      await db.executeQuery(CompiledQuery.raw('ALTER TABLE medical_acts DROP COLUMN price'))
    } catch (_e) {
      // column may have been dropped already
    }
  }
  if (colNames.includes('currency_code')) {
    try {
      await db.executeQuery(CompiledQuery.raw('ALTER TABLE medical_acts DROP COLUMN currency_code'))
    } catch (_e) {
      // column may have been dropped already
    }
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Restore columns (SQLite cannot re-add columns with constraints easily)
  try {
    await db.executeQuery(CompiledQuery.raw('ALTER TABLE medical_acts ADD COLUMN price REAL'))
  } catch (_e) { /* column may already exist */ }
  try {
    await db.executeQuery(CompiledQuery.raw("ALTER TABLE medical_acts ADD COLUMN currency_code TEXT NOT NULL DEFAULT 'GNF'"))
  } catch (_e) { /* column may already exist */ }

  await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS patient_actes'))
  await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS config_tarifs'))

  // act_price_history is kept as-is for backward compatibility; it was not dropped in up()
}
