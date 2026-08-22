import { type Kysely } from 'kysely'

export async function up(_db: Kysely<unknown>): Promise<void> {
  // No-op: previously seeded phantom demo data for non-existent patient (id 1).
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // No-op: seed data removal is not needed for rollback;
  // a full migration down from 031 already drops all tables.
}
