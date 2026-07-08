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

  // ── Seed demo prescriptions for patient #1 ──────────────────────
  // Prescription 1: Furosémide 40mg PO Matin,Soir for 7 days
  await sql`
    INSERT OR IGNORE INTO prescriptions (id, patient_id, medicament, dosage, voie, duree, frequence, prn, instructions, date_prescription, prescripteur_id, statut)
    VALUES (1, 1, 'Furosémide', '40 mg', 'PO', 7, 'Matin,Soir', 0, 'À prendre après le repas', date('now'), 1, 'active')
  `.execute(db)

  // Prescription 2: Metformine 500mg PO Matin,Midi,Soir for 7 days
  await sql`
    INSERT OR IGNORE INTO prescriptions (id, patient_id, medicament, dosage, voie, duree, frequence, prn, instructions, date_prescription, prescripteur_id, statut)
    VALUES (2, 1, 'Metformine', '500 mg', 'PO', 7, 'Matin,Midi,Soir', 0, NULL, date('now'), 1, 'active')
  `.execute(db)

  // Prescription 3: Insuline NOVORAPID 10 UI SC Matin,Midi,Soir for 7 days
  await sql`
    INSERT OR IGNORE INTO prescriptions (id, patient_id, medicament, dosage, voie, duree, frequence, prn, instructions, date_prescription, prescripteur_id, statut)
    VALUES (3, 1, 'Insuline NOVORAPID', '10 UI', 'SC', 7, 'Matin,Midi,Soir', 0, 'Injecter 15 min avant le repas', date('now'), 1, 'active')
  `.execute(db)

  // ── Generate plan_soins_items for each prescription ─────────────
  // Helper: for each day from date_prescription to date_prescription + duree - 1,
  // for each frequency entry, insert a plan_soins_items row.
  //
  // We use a recursive CTE to generate date series.
  // Frequency-to-time mapping: Matin→08h00, Midi→12h00, Soir→18h00, Nuit→22h00

  // ── Prescription 1: Furosémide Matin,Soir ───────────────────────
  await sql`
    WITH RECURSIVE dates(d) AS (
      SELECT date('now') UNION ALL SELECT date(d, '+1 day') FROM dates WHERE d < date('now', '+6 days')
    )
    INSERT OR IGNORE INTO plan_soins_items (plan_soins_id, bloc_heure, medicament, dosage, voie, statut, prescription_id)
    SELECT
      COALESCE((SELECT id FROM plan_soins WHERE patient_id = 1 AND date = d), 1),
      bt.bloc,
      'Furosémide', '40 mg', 'PO', 'en_attente', 1
    FROM dates d
    CROSS JOIN (
      SELECT '08h00' AS bloc WHERE 'Matin' IN (SELECT value FROM json_each('["Matin","Soir"]'))
      UNION ALL
      SELECT '18h00' AS bloc WHERE 'Soir' IN (SELECT value FROM json_each('["Matin","Soir"]'))
    ) bt
    WHERE d IS NOT NULL
  `.execute(db)

  // ── Prescription 2: Metformine Matin,Midi,Soir ──────────────────
  await sql`
    WITH RECURSIVE dates(d) AS (
      SELECT date('now') UNION ALL SELECT date(d, '+1 day') FROM dates WHERE d < date('now', '+6 days')
    )
    INSERT OR IGNORE INTO plan_soins_items (plan_soins_id, bloc_heure, medicament, dosage, voie, statut, prescription_id)
    SELECT
      COALESCE((SELECT id FROM plan_soins WHERE patient_id = 1 AND date = d), 1),
      bt.bloc,
      'Metformine', '500 mg', 'PO', 'en_attente', 2
    FROM dates d
    CROSS JOIN (
      SELECT '08h00' AS bloc WHERE 'Matin' IN (SELECT value FROM json_each('["Matin","Midi","Soir"]'))
      UNION ALL
      SELECT '12h00' AS bloc WHERE 'Midi' IN (SELECT value FROM json_each('["Matin","Midi","Soir"]'))
      UNION ALL
      SELECT '18h00' AS bloc WHERE 'Soir' IN (SELECT value FROM json_each('["Matin","Midi","Soir"]'))
    ) bt
    WHERE d IS NOT NULL
  `.execute(db)

  // ── Prescription 3: Insuline NOVORAPID Matin,Midi,Soir ──────────
  await sql`
    WITH RECURSIVE dates(d) AS (
      SELECT date('now') UNION ALL SELECT date(d, '+1 day') FROM dates WHERE d < date('now', '+6 days')
    )
    INSERT OR IGNORE INTO plan_soins_items (plan_soins_id, bloc_heure, medicament, dosage, voie, statut, prescription_id)
    SELECT
      COALESCE((SELECT id FROM plan_soins WHERE patient_id = 1 AND date = d), 1),
      bt.bloc,
      'Insuline NOVORAPID', '10 UI', 'SC', 'en_attente', 3
    FROM dates d
    CROSS JOIN (
      SELECT '08h00' AS bloc WHERE 'Matin' IN (SELECT value FROM json_each('["Matin","Midi","Soir"]'))
      UNION ALL
      SELECT '12h00' AS bloc WHERE 'Midi' IN (SELECT value FROM json_each('["Matin","Midi","Soir"]'))
      UNION ALL
      SELECT '18h00' AS bloc WHERE 'Soir' IN (SELECT value FROM json_each('["Matin","Midi","Soir"]'))
    ) bt
    WHERE d IS NOT NULL
  `.execute(db)

  // ── Re-enable FK checks ────────────────────────────────────────
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
