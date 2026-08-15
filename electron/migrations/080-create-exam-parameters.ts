import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE exam_parameters (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id           INTEGER NOT NULL REFERENCES lab_exams(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,
      unit              TEXT,
      input_type        TEXT NOT NULL CHECK(input_type IN ('numeric','text','select','boolean')),
      reference_values  TEXT NOT NULL DEFAULT '{}',
      sort_order        INTEGER NOT NULL DEFAULT 0,
      is_active         INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT
    )
  `.execute(db)

  await sql`CREATE INDEX idx_exam_parameters_exam_id ON exam_parameters(exam_id)`.execute(db)
  await sql`CREATE INDEX idx_exam_parameters_sort ON exam_parameters(exam_id, sort_order)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_exam_parameters_sort`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_exam_parameters_exam_id`.execute(db)
  await sql`DROP TABLE IF EXISTS exam_parameters`.execute(db)
}
