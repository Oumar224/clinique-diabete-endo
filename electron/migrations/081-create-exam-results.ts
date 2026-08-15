import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE exam_results (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_request_id   INTEGER NOT NULL REFERENCES exam_requests(id) ON DELETE CASCADE,
      parameter_id      INTEGER NOT NULL REFERENCES exam_parameters(id) ON DELETE CASCADE,
      value             TEXT,
      is_normal         INTEGER,
      filled_by         INTEGER REFERENCES user(id),
      filled_at         TEXT,
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT,
      UNIQUE(exam_request_id, parameter_id)
    )
  `.execute(db)

  await sql`CREATE INDEX idx_exam_results_request ON exam_results(exam_request_id)`.execute(db)
  await sql`CREATE INDEX idx_exam_results_param ON exam_results(parameter_id)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_exam_results_param`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_exam_results_request`.execute(db)
  await sql`DROP TABLE IF EXISTS exam_results`.execute(db)
}
