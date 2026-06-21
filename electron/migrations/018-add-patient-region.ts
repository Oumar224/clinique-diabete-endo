import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`ALTER TABLE patient ADD COLUMN region TEXT`.execute(db)

  // Backfill region for existing patients — traverse parent chain up to region node
  // Uses type='region' (not localites.region which may be NULL) as the anchor
  await sql`
    UPDATE patient SET region = (
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, name, type, 0 AS depth
        FROM localites WHERE code = patient.residence_code
        UNION ALL
        SELECT l.id, l.parent_id, l.name, l.type, a.depth + 1
        FROM localites l
        INNER JOIN ancestors a ON a.parent_id = l.id
        WHERE a.type != 'region' AND a.parent_id IS NOT NULL
      )
      SELECT name FROM ancestors WHERE type = 'region' LIMIT 1
    )
    WHERE residence_code IS NOT NULL AND region IS NULL
  `.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
}
