import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  const pragmaResult = await sql<{ name: string }>`
    SELECT name FROM pragma_table_info('patient_clinical_documents') WHERE name = 'site_id'
  `.execute(db)

  if (pragmaResult.rows.length === 0) {
    console.log('[Migration 092] Adding column site_id to patient_clinical_documents...')
    await sql`
      ALTER TABLE patient_clinical_documents ADD COLUMN site_id INTEGER REFERENCES sites(id)
    `.execute(db)
    console.log('[Migration 092] Column site_id added successfully')
  } else {
    console.log('[Migration 092] Column site_id already exists, skipping')
  }

  await sql`CREATE INDEX IF NOT EXISTS idx_pcd_site_id ON patient_clinical_documents(site_id)`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`DROP INDEX IF EXISTS idx_pcd_site_id`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}