import { type Kysely } from 'kysely'

export async function up(_db: Kysely<unknown>): Promise<void> {
  // No-op: previously seeded phantom demo data for non-existent patients (ids 1/2).
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // No-op: seed data removal not needed for rollback
}
