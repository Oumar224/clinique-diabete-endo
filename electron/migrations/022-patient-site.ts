import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // Add site_id column to patient table referencing sites
  await sql`
    ALTER TABLE patient ADD COLUMN site_id INTEGER REFERENCES sites(id)
  `.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support DROP COLUMN in older versions
  // The column will remain but be unused on rollback
}
