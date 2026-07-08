import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.executeQuery(CompiledQuery.raw(`
    ALTER TABLE vital_signs ADD COLUMN cetonemie REAL
  `))
  await db.executeQuery(CompiledQuery.raw(`
    ALTER TABLE vital_signs ADD COLUMN glucosurie TEXT
  `))
  await db.executeQuery(CompiledQuery.raw(`
    ALTER TABLE vital_signs ADD COLUMN cetonurie TEXT
  `))
  await db.executeQuery(CompiledQuery.raw(`
    ALTER TABLE vital_signs ADD COLUMN sa_o2 INTEGER
  `))
  await db.executeQuery(CompiledQuery.raw(`
    ALTER TABLE vital_signs ADD COLUMN diurese INTEGER
  `))
  await db.executeQuery(CompiledQuery.raw(`
    ALTER TABLE vital_signs ADD COLUMN poids REAL
  `))
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite does not support DROP COLUMN; this is a no-op for rollback
}
