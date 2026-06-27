import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_trusted_persons_patient_id_unique ON trusted_persons(patient_id)`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {}
