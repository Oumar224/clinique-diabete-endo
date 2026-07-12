import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // ── Disable FK checks for ALTER TABLE safety ────────────────────
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // ── Add frequence_type column to prescriptions ──────────────────
  // Supports 3 modes:
  //   'moments'      : Matin, Midi, Soir, Nuit (default for backward compat)
  //   'fixed-times'  : explicit hours like "08h00,12h00,18h00"
  //   'interval'     : every N hours like "Toutes les 8h"
  try {
    await sql`
      ALTER TABLE prescriptions ADD COLUMN frequence_type TEXT NOT NULL DEFAULT 'moments'
    `.execute(db)
  } catch {
    // Column may already exist from a previous run; log and continue
    console.log('[Migration 060] Column frequence_type may already exist, skipping ALTER TABLE')
  }

  // ── Backfill existing NULL rows to the default value ────────────
  // Safety net for rows created before the column was added
  await sql`
    UPDATE prescriptions SET frequence_type = 'moments' WHERE frequence_type IS NULL
  `.execute(db)

  // ── Index on frequence_type (useful for filtering by mode) ─────
  await sql`
    CREATE INDEX IF NOT EXISTS idx_prescriptions_frequence_type ON prescriptions(frequence_type)
  `.execute(db)

  // ── Re-enable FK checks ────────────────────────────────────────
  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // SQLite does not support DROP COLUMN directly.
  // To revert: recreate the table without the column.
  // pragma_table_info approach: we just drop the index here.
  await sql`DROP INDEX IF EXISTS idx_prescriptions_frequence_type`.execute(db)

  // The column stays; a full restore from a prior backup would be needed.
  // This is a no-op down migration.

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}
