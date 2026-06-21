import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE localites ADD COLUMN region TEXT`.execute(db)

  await sql`ALTER TABLE patient ADD COLUMN lieu_naissance TEXT`.execute(db)
  await sql`ALTER TABLE patient ADD COLUMN residence_code TEXT`.execute(db)
  await sql`ALTER TABLE patient ADD COLUMN complement_adresse TEXT`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
}
