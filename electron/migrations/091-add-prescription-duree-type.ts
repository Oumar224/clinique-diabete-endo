import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  const pragmaResult = await sql<{ name: string }>`
    SELECT name FROM pragma_table_info('prescriptions') WHERE name = 'duree_type'
  `.execute(db)

  if (pragmaResult.rows.length === 0) {
    console.log('[Migration 091] Adding column duree_type to prescriptions...')
    await sql`
      ALTER TABLE prescriptions ADD COLUMN duree_type TEXT NOT NULL DEFAULT 'courte'
        CHECK (duree_type IN ('courte', 'longue'))
    `.execute(db)
    console.log('[Migration 091] Column duree_type added successfully')
  } else {
    console.log('[Migration 091] Column duree_type already exists, skipping')
  }

  await sql`UPDATE prescriptions SET duree_type = 'courte' WHERE duree_type IS NULL`.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_prescriptions_duree_type ON prescriptions(duree_type)`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`DROP INDEX IF EXISTS idx_prescriptions_duree_type`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}
