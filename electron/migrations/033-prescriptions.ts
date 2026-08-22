import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // ── Disable FK checks for ALTER TABLE safety ────────────────────
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // ── Create prescriptions table ──────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id        INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
      medicament        TEXT NOT NULL,
      dosage            TEXT NOT NULL,
      voie              TEXT NOT NULL CHECK(voie IN ('PO','SC','IV','IM','SL')),
      duree             INTEGER NOT NULL DEFAULT 7,
      frequence         TEXT NOT NULL DEFAULT 'Matin,Midi,Soir',
      prn               INTEGER NOT NULL DEFAULT 0,
      instructions      TEXT,
      date_prescription TEXT NOT NULL DEFAULT (date('now')),
      prescripteur_id   INTEGER REFERENCES user(id),
      statut            TEXT NOT NULL DEFAULT 'active' CHECK(statut IN ('active','completed','stopped')),
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  // ── Add prescription_id to plan_soins_items ─────────────────────
  // Check if the column already exists (idempotent migration)
  const pragmaResult = await sql<{ name: string }>`
    SELECT name FROM pragma_table_info('plan_soins_items') WHERE name = 'prescription_id'
  `.execute(db)

  if (pragmaResult.rows.length === 0) {
    await sql`
      ALTER TABLE plan_soins_items ADD COLUMN prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE SET NULL
    `.execute(db)
  }

  // ── Create indexes ──────────────────────────────────────────────
  await sql`CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_plan_soins_items_prescription ON plan_soins_items(prescription_id)`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // Remove prescription_id column from plan_soins_items (SQLite doesn't support DROP COLUMN easily,
  // but we can just drop the index and leave the column — or recreate the table).
  // For simplicity, we drop the index and the table.
  await sql`DROP INDEX IF EXISTS idx_plan_soins_items_prescription`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_prescriptions_patient`.execute(db)
  await sql`DROP TABLE IF EXISTS prescriptions`.execute(db)

  // Note: the prescription_id column on plan_soins_items stays; it's a no-op addition.
  // A full restore from a prior backup would be needed for a clean revert.

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}
