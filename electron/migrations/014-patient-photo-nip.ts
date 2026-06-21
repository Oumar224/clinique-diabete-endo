import { type Kysely, CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.executeQuery(CompiledQuery.raw(`ALTER TABLE patient ADD COLUMN photo TEXT`))
  await db.executeQuery(CompiledQuery.raw(`ALTER TABLE patient ADD COLUMN nip TEXT`))
  await db.executeQuery(CompiledQuery.raw(`CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_nip ON patient(nip)`))
}

export async function down(_db: Kysely<unknown>): Promise<void> {}
