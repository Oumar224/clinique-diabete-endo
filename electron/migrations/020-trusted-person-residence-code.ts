import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE trusted_persons ADD COLUMN residence_code TEXT`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
}
