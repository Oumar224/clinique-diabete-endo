import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE patient DROP COLUMN mutuelle`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {}
