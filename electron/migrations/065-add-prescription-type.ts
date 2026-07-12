import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  const pragmaResult = await sql<{ name: string }>`
    SELECT name FROM pragma_table_info('prescriptions') WHERE name = 'prescription_type'
  `.execute(db)

  if (pragmaResult.rows.length === 0) {
    console.log('[Migration 065] Adding column prescription_type to prescriptions...')
    await sql`
      ALTER TABLE prescriptions ADD COLUMN prescription_type TEXT NOT NULL DEFAULT 'medicament'
    `.execute(db)
    console.log('[Migration 065] Column prescription_type added successfully')
  } else {
    console.log('[Migration 065] Column prescription_type already exists, skipping')
  }

  await sql`UPDATE prescriptions SET prescription_type = 'medicament' WHERE prescription_type IS NULL`.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_prescriptions_prescription_type ON prescriptions(prescription_type)`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`DROP INDEX IF EXISTS idx_prescriptions_prescription_type`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}
