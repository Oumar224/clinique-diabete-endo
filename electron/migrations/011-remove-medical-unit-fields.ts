import { type Kysely, CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  try { await db.executeQuery(CompiledQuery.raw('ALTER TABLE medical_units DROP COLUMN symbol')) } catch {}
  try { await db.executeQuery(CompiledQuery.raw('ALTER TABLE medical_units DROP COLUMN category')) } catch {}
}

export async function down(_db: Kysely<unknown>): Promise<void> {
}
