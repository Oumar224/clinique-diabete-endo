import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE patient_attachments ADD COLUMN category TEXT NOT NULL DEFAULT 'patient'`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {}
