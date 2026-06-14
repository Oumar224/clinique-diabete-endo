import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // ── Junction: user ↔ medical_units ──
  await sql`
    CREATE TABLE IF NOT EXISTS user_medical_units (
      user_id         INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      medical_unit_id INTEGER NOT NULL REFERENCES medical_units(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, medical_unit_id)
    )
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS user_medical_units`.execute(db)
}
